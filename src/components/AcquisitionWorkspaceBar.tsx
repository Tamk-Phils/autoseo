'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Building2,
  Shield,
  Radar,
  Users,
  Send,
  CalendarClock,
  BarChart2,
  LayoutGrid,
  RefreshCw,
} from 'lucide-react';

interface WorkspaceInfo {
  id: string;
  name: string;
  type: 'SUBSCRIBER' | 'INTERNAL';
  plan: string;
}

interface WorkspaceBarProps {
  onWorkspaceChanged?: () => void;
}

export default function AcquisitionWorkspaceBar({ onWorkspaceChanged }: WorkspaceBarProps) {
  const pathname = usePathname();
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [usage, setUsage] = useState<any>(null);
  const [limits, setLimits] = useState<any>(null);
  const [switching, setSwitching] = useState(false);

  const loadWorkspace = async () => {
    try {
      const res = await fetch('/api/acquisition/workspace');
      const data = await res.json();
      if (data.success) {
        setWorkspace(data.workspace);
        setIsAdmin(Boolean(data.isAdmin));
        setUsage(data.usage);
        setLimits(data.limits);
      }
    } catch {}
  };

  useEffect(() => {
    loadWorkspace();
  }, []);

  const handleSwitch = async (targetType: 'SUBSCRIBER' | 'INTERNAL') => {
    if (switching || workspace?.type === targetType) return;
    setSwitching(true);
    try {
      const res = await fetch('/api/acquisition/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceType: targetType }),
      });
      const data = await res.json();
      if (data.success) {
        setWorkspace(data.workspace);
        setUsage(data.usage);
        setLimits(data.limits);
        window.dispatchEvent(new CustomEvent('acquisition-workspace-changed', { detail: { type: targetType } }));
        if (onWorkspaceChanged) onWorkspaceChanged();
      }
    } finally {
      setSwitching(false);
    }
  };

  const tabs = [
    { label: 'Overview', href: '/acquisition', icon: LayoutGrid },
    { label: 'Discover', href: '/acquisition/discover', icon: Radar },
    { label: 'Lead CRM', href: '/acquisition/leads', icon: Users },
    { label: 'Outreach', href: '/acquisition/outreach', icon: Send },
    { label: 'Follow-ups', href: '/acquisition/follow-ups', icon: CalendarClock },
    { label: 'Analytics', href: '/acquisition/analytics', icon: BarChart2 },
  ];

  const isInternal = workspace?.type === 'INTERNAL';

  return (
    <div
      className="card"
      style={{
        marginBottom: '1.25rem',
        padding: '0.95rem 1.15rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
        background: isInternal
          ? 'linear-gradient(135deg, rgba(147,51,234,0.06), #ffffff)'
          : 'linear-gradient(135deg, rgba(37,99,235,0.05), #ffffff)',
        borderColor: isInternal ? 'rgba(147,51,234,0.3)' : 'var(--border-color)',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', minWidth: 0 }}>
          <span
            className="badge"
            style={{
              background: isInternal ? 'rgba(147,51,234,0.12)' : 'rgba(37,99,235,0.1)',
              color: isInternal ? '#7e22ce' : '#1d4ed8',
              border: `1px solid ${isInternal ? 'rgba(147,51,234,0.3)' : 'rgba(37,99,235,0.25)'}`,
            }}
          >
            {isInternal ? <Shield size={13} /> : <Building2 size={13} />}
            {isInternal ? 'Internal AutoSEO' : 'Subscriber Workspace'}
          </span>
          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', wordBreak: 'break-word' }}>
            {workspace?.name || 'Loading workspace...'}
          </span>
          {workspace && (
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Plan: <strong style={{ color: 'var(--text-primary)' }}>{workspace.plan}</strong>
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', maxWidth: '100%' }}>
          {usage && limits && !isInternal && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.65rem',
                fontSize: '0.76rem',
                color: 'var(--text-secondary)',
                background: 'var(--bg-surface)',
                padding: '0.32rem 0.65rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
              }}
            >
              <span>
                Discovery: <strong style={{ color: 'var(--text-primary)' }}>{usage.DISCOVERY}/{limits.discoveryCreditsPerMonth}</strong>
              </span>
              <span>
                Audits: <strong style={{ color: 'var(--text-primary)' }}>{usage.AUDIT}/{limits.auditsPerMonth}</strong>
              </span>
              <span>
                Proposals: <strong style={{ color: 'var(--text-primary)' }}>{usage.PROPOSAL}/{limits.proposalsPerMonth}</strong>
              </span>
            </div>
          )}

          {isAdmin && (
            <div style={{ display: 'inline-flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`btn btn-sm ${!isInternal ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => handleSwitch('SUBSCRIBER')}
                disabled={switching}
              >
                Subscriber
              </button>
              <button
                type="button"
                className={`btn btn-sm ${isInternal ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => handleSwitch('INTERNAL')}
                disabled={switching}
                style={{
                  background: isInternal ? '#7e22ce' : undefined,
                  borderColor: isInternal ? '#7e22ce' : undefined,
                }}
              >
                {switching ? <RefreshCw size={12} className="animate-spin" /> : null}
                Internal AutoSEO
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active =
            tab.href === '/acquisition'
              ? pathname === '/acquisition'
              : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`btn btn-sm ${active ? 'btn-primary' : 'btn-secondary'}`}
              style={{ textDecoration: 'none' }}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
