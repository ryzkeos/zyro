import { NextRequest, NextResponse } from 'next/server';
import { config } from './config';
import { getCurrentUser } from './auth';
import type { User } from './db/schema';

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });
export const err = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

export async function readJson<T = Record<string, any>>(req: NextRequest): Promise<T> {
  try {
    const len = Number(req.headers.get('content-length') || 0);
    if (len > config.maxBodyBytes) return {} as T;
    return ((await req.json()) || {}) as T;
  } catch {
    return {} as T;
  }
}

type Ctx<P> = { params: Promise<P> };

export function withAuth<P = Record<string, string>>(
  handler: (req: NextRequest, user: User, ctx: Ctx<P>) => Promise<Response> | Response,
) {
  return async (req: NextRequest, ctx: Ctx<P>) => {
    const user = await getCurrentUser(req);
    if (!user) return err('Authentication required', 401);
    return handler(req, user, ctx);
  };
}

export function withOptionalAuth<P = Record<string, string>>(
  handler: (req: NextRequest, user: User | null, ctx: Ctx<P>) => Promise<Response> | Response,
) {
  return async (req: NextRequest, ctx: Ctx<P>) => {
    const user = await getCurrentUser(req);
    return handler(req, user, ctx);
  };
}
