import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { WebVitalsReporter } from '@/components/web-vitals-reporter';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Request Tracker',
  description: 'Track and manage workflow requests',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          Skip to content
        </a>
        {children}
        <WebVitalsReporter />
      </body>
    </html>
  );
}
