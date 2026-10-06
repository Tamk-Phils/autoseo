import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ApexSEO - Autonomous AI SEO Optimization Engine',
  description: 'Analyze, optimize, monitor, and continuously improve your website search visibility with an autonomous AI-powered SEO engine.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

