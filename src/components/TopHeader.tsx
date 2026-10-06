'use client';

import Link from 'next/link';
import { Play, Globe, ShieldCheck, Plus } from 'lucide-react';

interface TopHeaderProps {
  currentProject?: {
    id: string;
    name: string;
    domain: string;
    optimizationMode: string;
    lastCrawlAt?: Date | string | null;
  };
}

export default function TopHeader({ currentProject }: TopHeaderProps) {
  const domain = currentProject?.domain || 'novatech-solutions.io';
  const name = currentProject?.name || 'NovaTech Digital';
  const mode = currentProject?.optimizationMode || 'ASSISTED';

  return (
    <header className="top-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div className="project-picker">
          <Globe size={16} color="var(--accent-cyan)" />
          <span style={{ fontWeight: 600 }}>{name}</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>({domain})</span>
        </div>

        <span className="badge badge-low" style={{ textTransform: 'capitalize' }}>
          <ShieldCheck size={12} />
          Mode: {mode.toLowerCase()}
        </span>
      </div>

      <div className="header-actions">
        <Link href="/onboarding" className="btn btn-secondary btn-sm">
          <Plus size={14} />
          New Project
        </Link>
        <Link href="/live-crawl" className="btn btn-primary btn-sm">
          <Play size={14} />
          Run Live Crawl
        </Link>
      </div>
    </header>
  );
}

