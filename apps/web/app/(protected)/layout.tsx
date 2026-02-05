import { redirect } from 'next/navigation';
import { getSession, isSessionExpired } from '@/server/auth/session';
import { Header } from '@/components/header';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  // Redirect to login if not authenticated
  if (!session?.user) {
    redirect('/login');
  }

  // Check for session expiry
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
}
