import { cookies } from 'next/headers';
import { getIronSession, IronSession } from 'iron-session';
import { SESSION_CONFIG } from '@request-tracker/shared';

export interface SessionData {
  user?: {
    id: string;
    email: string;
    role: string;
  };
  createdAt?: number;
  lastActiveAt?: number;
}

const sessionOptions = {
  password: process.env.AUTH_SECRET!,
  cookieName: SESSION_CONFIG.COOKIE_NAME,
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax' as const,
    maxAge: SESSION_CONFIG.MAX_AGE_SECONDS,
  },
};

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export async function createSession(user: {
  id: string;
  email: string;
  role: string;
}): Promise<void> {
  const session = await getSession();
  session.user = user;
  session.createdAt = Date.now();
  session.lastActiveAt = Date.now();
  await session.save();
}

export async function destroySession(): Promise<void> {
  const session = await getSession();
  session.destroy();
}

export async function updateSessionActivity(): Promise<void> {
  const session = await getSession();
  if (session.user) {
    session.lastActiveAt = Date.now();
    await session.save();
  }
}

export async function isSessionExpired(session: IronSession<SessionData>): Promise<boolean> {
  if (!session.user || !session.lastActiveAt) {
    return true;
  }

  const idleTimeoutMs = SESSION_CONFIG.IDLE_TIMEOUT_SECONDS * 1000;
  const now = Date.now();

  return now - session.lastActiveAt > idleTimeoutMs;
}

export async function requireAuth(): Promise<NonNullable<SessionData['user']>> {
  const session = await getSession();

  if (!session.user) {
    throw new Error('Unauthorized');
  }

  if (await isSessionExpired(session)) {
    session.destroy();
    throw new Error('Session expired');
  }

  // Update activity timestamp
  session.lastActiveAt = Date.now();
  await session.save();

  return session.user;
}
