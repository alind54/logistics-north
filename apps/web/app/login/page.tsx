import { redirect } from 'next/navigation';
import { getSession } from '@/server/auth/session';
import { LoginForm } from './login-form';

export default async function LoginPage() {
  try {
    const session = await getSession();
    if (session?.user) {
      redirect('/board');
    }
  } catch (error: unknown) {
    const digest = (error as { digest?: string })?.digest;
    if (typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT')) throw error;
    // Session error — show login form anyway
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Logistics North</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to manage your projects
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
