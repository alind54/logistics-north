'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button, cn } from '@request-tracker/ui';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { ThemeToggle } from '@/components/theme-toggle';

interface HeaderProps {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

const navItems = [
  { href: '/board', label: 'Board' },
  { href: '/requests', label: 'Requests' },
  { href: '/dashboard', label: 'Dashboard' },
];

const adminNavItems = [{ href: '/admin', label: 'Admin' }];

export function Header({ user }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdmin = user.role === 'ADMIN';
  const allNavItems = [...navItems, ...(isAdmin ? adminNavItems : [])];

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-card">
      <div className="container flex h-14 items-center justify-between">
        {/* Logo and Desktop Nav */}
        <div className="flex items-center gap-6">
          <Link href="/board" className="font-semibold">
            Request Tracker
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
            {allNavItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Desktop User Menu */}
        <div className="hidden items-center gap-4 md:flex">
          <ThemeToggle />
          <NotificationBell />
          <div className="text-right">
            <p className="text-sm font-medium">{user.email}</p>
            <p className="text-xs text-muted-foreground">{user.role}</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Sign Out
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle navigation menu"
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? (
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          ) : (
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="border-t bg-card md:hidden">
          <nav className="container space-y-1 py-3" aria-label="Mobile navigation">
            {allNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'block rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  pathname === item.href || pathname.startsWith(item.href + '/')
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="border-t px-4 py-3">
            <div className="mb-3">
              <p className="text-sm font-medium">{user.email}</p>
              <p className="text-xs text-muted-foreground">{user.role}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleLogout}
            >
              Sign Out
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
