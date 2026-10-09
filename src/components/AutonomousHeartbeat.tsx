'use client';

import { useEffect } from 'react';

export default function AutonomousHeartbeat() {
  useEffect(() => {
    // Pulse on mount
    fetch('/api/crawl/cron', { method: 'POST' }).catch(() => {});

    // Continuously pulse every 60 seconds (1 minute)
    const interval = setInterval(() => {
      fetch('/api/crawl/cron', { method: 'POST' }).catch(() => {});
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return null;
}
