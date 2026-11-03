import { err, readJson, withOptionalAuth } from '@/server/http';
import { rateLimit } from '@/server/ratelimit';
import { getCached, setCached, setStream } from '@/server/ai/cache';
import { DEFAULT_MODEL, streamChat, type ChatEvent, type ChatMessage } from '@/server/ai/providers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

type ChatBody = { messages?: unknown; systemPrompt?: unknown; model?: unknown; stream_id?: unknown };

const HEADERS = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache',
  'X-Accel-Buffering': 'no',
};

const frame = (ev: ChatEvent) => `data: ${'done' in ev ? '[DONE]' : JSON.stringify(ev)}\n\n`;

export const POST = withOptionalAuth(async (req, user) => {
  const blocked = await rateLimit(req, 'ai-chat', [{ limit: 40, windowSec: 60 }]);
  if (blocked) return blocked;

  const data = await readJson<ChatBody>(req);
  const messages = (Array.isArray(data.messages) ? data.messages : []).filter(
    (m): m is ChatMessage => typeof m === 'object' && m !== null,
  );
  if (!messages.length) return err('No messages provided', 400);

  const systemPrompt = typeof data.systemPrompt === 'string' ? data.systemPrompt : '';
  const modelKey = typeof data.model === 'string' ? data.model : DEFAULT_MODEL;
  const streamId = typeof data.stream_id === 'string' ? data.stream_id : '';
  const userId = user?.id ?? 'guest';
  const hasImage = messages.some((m) => Boolean(m.image));

  const encoder = new TextEncoder();
  const abort = new AbortController();
  req.signal.addEventListener('abort', () => abort.abort(), { once: true });

  const cached = hasImage ? null : await getCached(modelKey, systemPrompt, messages, userId);

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (s: string) => {
        try {
          controller.enqueue(encoder.encode(s));
        } catch {
          abort.abort();
        }
      };

      if (cached) {
        for (let i = 0; i < cached.length; i += 512) send(frame({ text: cached.slice(i, i + 512) }));
        send(frame({ done: true }));
        controller.close();
        return;
      }

      let full = '';
      let failed = false;
      try {
        for await (const ev of streamChat(modelKey, { systemPrompt, messages, signal: abort.signal })) {
          if (abort.signal.aborted) break;
          if ('text' in ev) full += ev.text;
          else if ('error' in ev) failed = true;
          send(frame(ev));
        }
        if (full && !failed && !abort.signal.aborted) {
          if (!hasImage) await setCached(modelKey, systemPrompt, messages, full, userId);
          if (streamId) await setStream(streamId, full);
        }
      } finally {
        try {
          controller.close();
        } catch {
          /* already closed by cancel */
        }
      }
    },
    cancel() {
      abort.abort();
    },
  });

  return new Response(body, { headers: HEADERS });
});
