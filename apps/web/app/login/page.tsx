import { redirect } from 'next/navigation';
import { getSession } from '@/server/auth/session';
import { LoginForm } from './login-form';

export default async function LoginPage() {
  const session = await getSession();

  // Redirect to board if already logged in
  if (session?.user) {
    redirect('/board');
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
