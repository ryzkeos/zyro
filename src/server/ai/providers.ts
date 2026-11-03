import { config } from '@/server/config';
import { XENON_MODEL, YURUZU_MODEL } from '@/server/project';

export const XENON_MODELS = new Set(['xenon-1.0']);
export const YURUZU_MODELS = new Set(['yuruzu-1.0']);
export const DEFAULT_MODEL = 'xenon-1.0';

const YURUZU_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const XENON_BASE = 'https://api.groq.com/openai/v1/chat/completions';
const CONNECT_TIMEOUT_MS = 120_000;

export type ChatMessage = { role?: unknown; content?: unknown; image?: unknown; imageType?: unknown };
export type ChatEvent = { text: string } | { error: string } | { done: true };

class TerminalAPIError extends Error {}
class RetryableAPIError extends Error {}
class ConnectionError extends Error {}
class AbortedError extends Error {}

type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };
type GeminiContent = { role: 'user' | 'model'; parts: GeminiPart[] };
type GeminiPayload = {
  contents: GeminiContent[];
  generationConfig: { temperature?: number; maxOutputTokens: number; topP?: number };
  systemInstruction?: { parts: { text: string }[] };
};
type GeminiChunk = {
  promptFeedback?: { blockReason?: string };
  candidates?: { finishReason?: string; content?: { parts?: { text?: string }[] } }[];
};
type GroqChunk = { choices?: { delta?: { content?: string } }[] };
type GroqCompletion = { choices?: { message?: { content?: string } }[] };

const str = (v: unknown) => (v == null ? '' : String(v));
const parseJson = <T>(s: string): T | null => {
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
};

async function post(url: string, body: unknown, headers: Record<string, string>, signal?: AbortSignal): Promise<Response> {
  const ctrl = new AbortController();
  let timedOut = false;
  signal?.addEventListener('abort', () => ctrl.abort(), { once: true });
  const timer = setTimeout(() => {
    timedOut = true;
    ctrl.abort();
  }, CONNECT_TIMEOUT_MS);
  try {
    return await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal: ctrl.signal });
  } catch {
    if (timedOut) throw new RetryableAPIError('Request timed out.');
    if (signal?.aborted) throw new AbortedError();
    throw new ConnectionError();
  } finally {
    clearTimeout(timer);
  }
}

async function* sseData(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl).replace(/\r$/, '');
        buf = buf.slice(nl + 1);
        if (line.startsWith('data: ')) yield line.slice(6).trim();
      }
    }
    const tail = buf.replace(/\r$/, '');
    if (tail.startsWith('data: ')) yield tail.slice(6).trim();
  } finally {
    reader.cancel().catch(() => undefined);
  }
}

async function tryXenon(
  apiKey: string,
  model: string,
  messages: { role: string; content: string }[],
  opts: { maxTokens?: number; temperature?: number; stream?: boolean; signal?: AbortSignal } = {},
): Promise<Response> {
  const { maxTokens = 8192, temperature = 0.7, stream = true, signal } = opts;
  const resp = await post(
    XENON_BASE,
    { model, messages, stream, temperature, max_tokens: maxTokens, top_p: 0.95 },
    { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    signal,
  );
  if (resp.status === 401 || resp.status === 403) throw new TerminalAPIError('Invalid XENON_API_KEY.');
  if (resp.status === 404) throw new TerminalAPIError(`Model not found: ${model}`);
  if (resp.status === 429) throw new RetryableAPIError('Rate limit on this key.');
  if (!resp.ok) throw new RetryableAPIError(`API error ${resp.status}`);
  return resp;
}

async function* streamXenon(resp: Response): AsyncGenerator<ChatEvent> {
  if (resp.body) {
    for await (const payload of sseData(resp.body)) {
      if (payload === '[DONE]') break;
      const text = parseJson<GroqChunk>(payload)?.choices?.[0]?.delta?.content;
      if (typeof text === 'string' && text) yield { text };
    }
  }
  yield { done: true };
}

function buildYuruzuContents(messages: ChatMessage[]): GeminiContent[] {
  const contents: GeminiContent[] = [];
  for (const m of messages) {
    const role = m.role === 'user' ? 'user' : 'model';
    const text = str(m.content).trim();
    const parts: GeminiPart[] = [];

    if (m.image && typeof m.image === 'string') {
      if (m.image.startsWith('data:')) {
        const comma = m.image.indexOf(',');
        const mime = comma > 0 ? m.image.slice(0, comma).split(';')[0].split(':')[1] : undefined;
        if (mime) parts.push({ inlineData: { mimeType: mime, data: m.image.slice(comma + 1) } });
      } else {
        const mimeType = typeof m.imageType === 'string' && m.imageType ? m.imageType : 'image/jpeg';
        parts.push({ inlineData: { mimeType, data: Buffer.from(m.image, 'base64').toString('base64') } });
      }
    }
    if (text) parts.push({ text });
    if (!parts.length) continue;

    const last = contents[contents.length - 1];
    if (last && last.role === role) last.parts.push(...parts);
    else contents.push({ role, parts });
  }
  return contents;
}

async function tryYuruzu(apiKey: string, model: string, payload: GeminiPayload, stream = true, signal?: AbortSignal): Promise<Response> {
  const method = stream ? 'streamGenerateContent' : 'generateContent';
  const qs = stream ? '?alt=sse' : '?';
  const resp = await post(`${YURUZU_BASE}/${model}:${method}${qs}&key=${apiKey}`, payload, { 'Content-Type': 'application/json' }, signal);

  if (resp.status === 401 || resp.status === 403) throw new TerminalAPIError('Invalid YURUZU_API_KEY.');
  if (resp.status === 404) throw new TerminalAPIError('Yuruzu model not found or unavailable.');
  if (!resp.ok) {
    if (resp.status === 429) throw new RetryableAPIError('Rate limit on this key.');
    if (resp.status === 503) throw new RetryableAPIError('Yuruzu service unavailable.');
    let message = `API error ${resp.status}`;
    try {
      const body = (await resp.json()) as { error?: { message?: string } };
      if (body.error?.message) message = body.error.message;
    } catch {
    }
    throw new TerminalAPIError(`Yuruzu error: ${message}`);
  }
  return resp;
}

async function* streamYuruzu(resp: Response): AsyncGenerator<ChatEvent> {
  if (resp.body) {
    for await (const payload of sseData(resp.body)) {
      if (payload === '[DONE]') break;
      const chunk = parseJson<GeminiChunk>(payload);
      if (!chunk) continue;
      if (chunk.promptFeedback?.blockReason) {
        yield { error: `Prompt blocked: ${chunk.promptFeedback.blockReason}` };
        yield { done: true };
        return;
      }
      const cand = chunk.candidates?.[0];
      if (!cand) continue;
      const finish = cand.finishReason ?? '';
      if (finish === 'SAFETY' || finish === 'RECITATION') {
        yield { error: `Response blocked by Yuruzu: ${finish}` };
        yield { done: true };
        return;
      }
      for (const part of cand.content?.parts ?? []) {
        if (part.text) yield { text: part.text };
      }
    }
  }
  yield { done: true };
}

type ChatOptions = { systemPrompt: string; messages: ChatMessage[]; signal: AbortSignal };

async function* chatXenon({ systemPrompt, messages, signal }: ChatOptions): AsyncGenerator<ChatEvent> {
  const keys = config.xenonKeys;
  if (!keys.length) {
    yield { error: 'No XENON_API_KEY configured.' };
    return;
  }

  const msgs: { role: string; content: string }[] = [];
  if (systemPrompt.trim()) msgs.push({ role: 'system', content: systemPrompt });
  for (const m of messages) {
    const content = str(m.content).trim();
    if (content) msgs.push({ role: m.role === 'user' ? 'user' : 'assistant', content });
  }

  for (const key of keys) {
    let full = '';
    try {
      const resp = await tryXenon(key, XENON_MODEL, msgs, { signal });
      for await (const ev of streamXenon(resp)) {
        if ('text' in ev) full += ev.text;
        yield ev;
      }
      if (!full) yield { error: 'Xenon returned an empty response.' };
      return;
    } catch (e) {
      if (signal.aborted || e instanceof AbortedError) return;
      if (e instanceof TerminalAPIError) {
        yield { error: e.message };
        return;
      }
      if (e instanceof ConnectionError) {
        yield { error: 'Cannot connect to Xenon backend.' };
        return;
      }
    }
  }
  yield { error: 'Xenon rate limit reached. Try again shortly.' };
}

async function* chatYuruzu({ systemPrompt, messages, signal }: ChatOptions): AsyncGenerator<ChatEvent> {
  const keys = config.yuruzuKeys;
  if (!keys.length) {
    yield { error: 'No YURUZU_API_KEY configured.' };
    return;
  }

  const contents = buildYuruzuContents(messages);
  if (!contents.length) {
    yield { error: 'No valid message content.' };
    return;
  }

  const payload: GeminiPayload = {
    contents,
    generationConfig: { temperature: 0.9, maxOutputTokens: 8192, topP: 0.95 },
  };
  if (systemPrompt.trim()) payload.systemInstruction = { parts: [{ text: systemPrompt }] };

  for (const key of keys) {
    let full = '';
    try {
      const resp = await tryYuruzu(key, YURUZU_MODEL, payload, true, signal);
      for await (const ev of streamYuruzu(resp)) {
        if ('text' in ev) full += ev.text;
        yield ev;
      }
      if (!full) yield { error: 'Yuruzu returned an empty response. Check your prompt or quota.' };
      return;
    } catch (e) {
      if (signal.aborted || e instanceof AbortedError) return;
      if (e instanceof RetryableAPIError) continue;
      if (e instanceof ConnectionError) {
        yield { error: 'Cannot connect to Yuruzu backend.' };
        return;
      }
      yield { error: e instanceof TerminalAPIError ? e.message : `Yuruzu error: ${e instanceof Error ? e.message : String(e)}` };
      return;
    }
  }
  yield { error: 'Yuruzu rate limit reached on all keys. Try again shortly.' };
}

export function streamChat(modelKey: string, opts: ChatOptions): AsyncGenerator<ChatEvent> {
  return XENON_MODELS.has(modelKey) ? chatXenon(opts) : chatYuruzu(opts);
}

export async function generateTitle(prompt: string): Promise<string | null> {
  for (const key of config.xenonKeys) {
    try {
      const resp = await tryXenon(key, XENON_MODEL, [{ role: 'user', content: prompt }], { maxTokens: 20, temperature: 0.3, stream: false });
      const body = (await resp.json()) as GroqCompletion;
      const title = body.choices?.[0]?.message?.content;
      if (typeof title === 'string') return title.trim().slice(0, 100);
    } catch {
      continue;
    }
  }
  for (const key of config.yuruzuKeys) {
    try {
      const payload: GeminiPayload = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 20, temperature: 0.3 },
      };
      const resp = await tryYuruzu(key, YURUZU_MODEL, payload, false);
      const body = (await resp.json()) as GeminiChunk;
      const title = body.candidates?.[0]?.content?.parts?.[0]?.text;
      if (typeof title === 'string') return title.trim().slice(0, 100);
    } catch {
      continue;
    }
  }
  return null;
}
