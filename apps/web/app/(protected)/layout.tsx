import { redirect } from 'next/navigation';
import { getSession, isSessionExpired } from '@/server/auth/session';
import { Header } from '@/components/header';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    const session = await getSession();

    if (!session?.user) {
      redirect('/login');
    }

    if (await isSessionExpired(session)) {
      session.destroy();
      redirect('/login');
    }

    return (
      <div className="min-h-screen bg-background">
        <Header user={session.user} />
        <main id="main-content" className="container py-6">{children}</main>
      </div>
    );
  } catch (error: unknown) {
    const digest = (error as { digest?: string })?.digest;
    if (typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT')) throw error;
    // Session or DB error — redirect to login
    redirect('/login');
  }
}
