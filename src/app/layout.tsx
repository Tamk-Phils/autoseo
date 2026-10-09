import type { Metadata, Viewport } from 'next';
import './globals.css';
import AutonomousHeartbeat from '@/components/AutonomousHeartbeat';

export const metadata: Metadata = {
  title: 'ApexSEO - Autonomous AI SEO Optimization Engine',
  description: 'Analyze, optimize, monitor, and continuously improve your website search visibility with an autonomous AI-powered SEO engine.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#070d19',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AutonomousHeartbeat />
        {children}
      </body>
    </html>
  );
}

