import { redirect } from 'next/navigation';
import { getSession } from '@/server/auth/session';

export default async function Home() {
  try {
    const session = await getSession();
    if (session?.user) {
      redirect('/board');
    }
  } catch (error: unknown) {
    // Re-throw Next.js redirect errors (redirect() works by throwing)
    const digest = (error as { digest?: string })?.digest;
    if (typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT')) throw error;
    // Session error (missing AUTH_SECRET, cookie corruption, etc.) — fall through to login
  }
  redirect('/login');
}
