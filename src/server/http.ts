import { NextRequest, NextResponse } from 'next/server';
import { config } from './config';
import { getCurrentUser } from './auth';
import type { User } from './db/schema';

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });
export const err = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

/** parse the json body, returns {} when the body is missing or invalid (same as flask `get_json() or {}`) */
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

/** like flask @login_required. injects the user, returns 401 when not signed in */
export function withAuth<P = Record<string, string>>(
  handler: (req: NextRequest, user: User, ctx: Ctx<P>) => Promise<Response> | Response,
) {
  return async (req: NextRequest, ctx: Ctx<P>) => {
    const user = await getCurrentUser(req);
    if (!user) return err('Authentication required', 401);
    return handler(req, user, ctx);
  };
}

/** like flask @optional_auth. user is null for guests */
export function withOptionalAuth<P = Record<string, string>>(
  handler: (req: NextRequest, user: User | null, ctx: Ctx<P>) => Promise<Response> | Response,
) {
  return async (req: NextRequest, ctx: Ctx<P>) => {
    const user = await getCurrentUser(req);
    return handler(req, user, ctx);
  };
}
