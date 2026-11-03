import { NextRequest, NextResponse } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';
import { eq } from 'drizzle-orm';
import { config, getSecretKey } from './config';
import { getDb } from './db';
import { users, type User } from './db/schema';

const key = () => new TextEncoder().encode(getSecretKey());

export async function signToken(userId: string): Promise<string> {
  return new SignJWT({ user_id: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${config.jwtExpirySeconds}s`)
    .sign(key());
}

export async function verifyToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ['HS256'] });
    return typeof payload.user_id === 'string' ? payload.user_id : null;
  } catch {
    return null;
  }
}

export async function getCurrentUser(req: NextRequest): Promise<User | null> {
  const token = req.cookies.get(config.jwtCookieName)?.value;
  if (!token) return null;
  const userId = await verifyToken(token);
  if (!userId) return null;
  const [user] = await getDb().select().from(users).where(eq(users.id, userId)).limit(1);
  return user ?? null;
}

export async function setAuthCookie(res: NextResponse, userId: string): Promise<void> {
  res.cookies.set(config.jwtCookieName, await signToken(userId), {
    maxAge: config.jwtExpirySeconds,
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: 'lax',
    path: '/',
  });
}

export function clearAuthCookie(res: NextResponse): void {
  res.cookies.set(config.jwtCookieName, '', {
    maxAge: 0, httpOnly: true, secure: config.cookieSecure, sameSite: 'lax', path: '/',
  });
}

export function userToDict(u: User) {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    ai_instructions: u.aiInstructions || '',
    email_verified: u.emailVerified,
    created_at: (u.createdAt ?? new Date()).toISOString(),
  };
}

export async function signPurposeToken(purpose: string, sub: string, expiresIn: string): Promise<string> {
  return new SignJWT({ purpose })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(key());
}

export async function verifyPurposeToken(token: string, purpose: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ['HS256'] });
    return payload.purpose === purpose && typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}
