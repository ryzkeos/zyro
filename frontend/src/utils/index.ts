// Utility functions for Zyro AI Chat Application

import type { Conversation } from '../types';
import { GUEST_LIMIT, GUEST_WINDOW_MS, MODEL_NAMES } from '../constants';

// Guest rate limiter module pattern
const guestRateLimiter = {
  timestamps: [] as number[],
  check(): boolean {
    const now = Date.now();
    this.timestamps = this.timestamps.filter(t => now - t < GUEST_WINDOW_MS);
    if (this.timestamps.length >= GUEST_LIMIT) return false;
    this.timestamps.push(now);
    return true;
  },
  reset(): void {
    this.timestamps = [];
  },
};

export function checkGuestRateLimit(): boolean {
  return guestRateLimiter.check();
}

export function resetGuestRateLimit(): void {
  guestRateLimiter.reset();
}

export function urlB64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

export function loadGuestConvs(): Conversation[] {
  try {
    const r = sessionStorage.getItem('zyro_guest');
    return r ? JSON.parse(r) : [];
  } catch {
    return [];
  }
}

export function saveGuestConvs(c: Conversation[]): void {
  const used = c.filter(conv => conv.messages.length > 0);
  try {
    sessionStorage.setItem('zyro_guest', JSON.stringify(used));
  } catch {
    // Storage full or unavailable
  }
}

export function makeLocalConv(title = 'New Conversation'): Conversation {
  return {
    id: Date.now().toString(),
    title,
    messages: [],
    lastUpdated: Date.now(),
    pinned: false,
  };
}

export function getAIDisplayName(model: string): string {
  return `Zyro — ${MODEL_NAMES[model] || model}`;
}