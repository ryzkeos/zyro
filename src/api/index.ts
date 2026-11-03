// API layer for Zyro AI Chat Application

import { Conversation, Message, User, Settings, SearchResult, ChatMessage, PushSubscriptionData } from '../types';

const API = '';

// ── Auth API ──────────────────────────────────────────────────────────────────

export const authApi = {
  async me(): Promise<{ user: User | null }> {
    const res = await fetch(`${API}/api/auth/me`, { credentials: 'include' });
    return res.json();
  },

  async login(email: string, password: string): Promise<{ user: User; error?: string }> {
    const res = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return res.json();
  },

  async register(username: string, email: string, password: string): Promise<{ user: User; error?: string }> {
    const res = await fetch(`${API}/api/auth/register`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    });
    return res.json();
  },

  async logout(): Promise<void> {
    await fetch(`${API}/api/auth/logout`, { method: 'POST', credentials: 'include' });
  },

  async updateProfile(data: { username?: string; email?: string }): Promise<{ user: User; error?: string }> {
    const res = await fetch(`${API}/api/auth/profile`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ message?: string; error?: string }> {
    const res = await fetch(`${API}/api/auth/password`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    return res.json();
  },

  async deleteAccount(password: string): Promise<{ message?: string; error?: string }> {
    const res = await fetch(`${API}/api/auth/account`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    return res.json();
  },

  async getAiInstructions(): Promise<{ ai_instructions: string }> {
    const res = await fetch(`${API}/api/auth/ai-instructions`, { credentials: 'include' });
    return res.json();
  },

  async setAiInstructions(ai_instructions: string): Promise<void> {
    await fetch(`${API}/api/auth/ai-instructions`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ai_instructions }),
    });
  },

  async sendVerification(): Promise<{ message?: string; error?: string }> {
    const res = await fetch(`${API}/api/auth/send-verification`, {
      method: 'POST',
      credentials: 'include',
    });
    return res.json();
  },

  async verifyEmail(token: string): Promise<{ message?: string; error?: string }> {
    const res = await fetch(`${API}/api/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    return res.json();
  },

  async forgotPassword(email: string): Promise<{ message?: string; error?: string }> {
    const res = await fetch(`${API}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return res.json();
  },

  async resetPassword(token: string, password: string): Promise<{ message?: string; error?: string }> {
    const res = await fetch(`${API}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });
    return res.json();
  },
};

// ── Conversations API ────────────────────────────────────────────────────────

export const conversationsApi = {
  async list(): Promise<Conversation[]> {
    const res = await fetch(`${API}/api/conversations`, { credentials: 'include' });
    return res.json();
  },

  async create(title: string): Promise<Conversation> {
    const res = await fetch(`${API}/api/conversations`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    return res.json();
  },

  async delete(id: string): Promise<void> {
    await fetch(`${API}/api/conversations/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
  },

  async togglePin(id: string): Promise<Conversation> {
    const res = await fetch(`${API}/api/conversations/${id}/pin`, {
      method: 'PATCH',
      credentials: 'include',
    });
    return res.json();
  },

  async updateTitle(id: string, title: string): Promise<Conversation> {
    const res = await fetch(`${API}/api/conversations/${id}/title`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    return res.json();
  },

  async getMessages(id: string): Promise<Message[]> {
    const res = await fetch(`${API}/api/conversations/${id}/messages`, {
      credentials: 'include',
    });
    return res.json();
  },

  async saveMessage(convId: string, msg: Message): Promise<void> {
    await fetch(`${API}/api/conversations/${convId}/messages`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(msg),
    });
  },

  async branch(convId: string, messageId: string): Promise<Conversation & { messages: Message[] }> {
    const res = await fetch(`${API}/api/conversations/${convId}/branch`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message_id: messageId }),
    });
    return res.json();
  },
};

// ── AI API ───────────────────────────────────────────────────────────────────

export const aiApi = {
  async autoTitle(messages: { role: string; content: string }[]): Promise<{ title: string }> {
    const res = await fetch(`${API}/api/ai/auto-title`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });
    return res.json();
  },

  async resumeStream(streamId: string): Promise<{ text: string; error?: string }> {
    const res = await fetch(`${API}/api/ai/resume/${streamId}`, { credentials: 'include' });
    return res.json();
  },

  chat(messages: ChatMessage[], systemPrompt: string, model: string, streamId: string): {
    signal: AbortSignal;
    abort: () => void;
    stream: () => AsyncGenerator<{ text?: string; error?: string; done: boolean }>;
  } {
    const controller = new AbortController();
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), 30000);

    // Combine signals if AbortSignal.any is available
    const signal = typeof AbortSignal !== 'undefined' && 'any' in AbortSignal
      ? (AbortSignal as unknown as { any: (signals: AbortSignal[]) => AbortSignal }).any([controller.signal, timeoutController.signal])
      : controller.signal;

    const abort = () => {
      controller.abort();
      clearTimeout(timeoutId);
    };

    async function* stream(): AsyncGenerator<{ text?: string; error?: string; done: boolean }> {
      try {
        const res = await fetch(`${API}/api/ai/chat`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          signal,
          body: JSON.stringify({ messages, systemPrompt, model, stream_id: streamId }),
        });

        if (!res.ok || !res.body) {
          const error = `Server error ${res.status}`;
          try {
            const j = await res.json();
            yield { error: j.error || error, done: true };
          } catch {
            yield { error, done: true };
          }
          return;
        }

        clearTimeout(timeoutId);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split('\n')) {
            if (!line.startsWith('data: ')) continue;
            const payload = line.slice(6).trim();
            if (payload === '[DONE]') {
              yield { done: true };
              return;
            }
            try {
              const parsed = JSON.parse(payload);
              if (parsed.error) yield { error: parsed.error, done: false };
              if (parsed.text) yield { text: parsed.text, done: false };
            } catch {}
          }
        }
        yield { done: true };
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          yield { error: 'Request aborted', done: true };
        } else {
          yield { error: err?.message || 'Unknown error', done: true };
        }
      } finally {
        clearTimeout(timeoutId);
      }
    }

    return { signal, abort, stream };
  },
};

// ── Search API ───────────────────────────────────────────────────────────────

export const searchApi = {
  async search(query: string): Promise<SearchResult[]> {
    const res = await fetch(`${API}/api/search?q=${encodeURIComponent(query)}`, {
      credentials: 'include',
    });
    return res.json();
  },
};

// ── Push API ─────────────────────────────────────────────────────────────────

export const pushApi = {
  async getVapidPublicKey(): Promise<{ publicKey: string }> {
    const res = await fetch(`${API}/api/push/vapid-public-key`);
    return res.json();
  },

  async subscribe(subscription: PushSubscriptionData): Promise<void> {
    await fetch(`${API}/api/push/subscribe`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription),
    });
  },

  async unsubscribe(endpoint: string): Promise<void> {
    await fetch(`${API}/api/push/unsubscribe`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint }),
    });
  },
};

// ── Health API ──────────────────────────────────────────────────────────────

export const healthApi = {
  async check(): Promise<{ status: string; service: string; version: string }> {
    const res = await fetch(`${API}/api/health`);
    return res.json();
  },
};