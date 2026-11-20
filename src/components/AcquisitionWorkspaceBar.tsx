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
    { label: 'Discover Businesses', href: '/acquisition/discover', icon: Radar },
    { label: 'Lead Database', href: '/acquisition/leads', icon: Users },
    { label: 'Outreach Centre', href: '/acquisition/outreach', icon: Send },
    { label: 'Follow-ups', href: '/acquisition/follow-ups', icon: CalendarClock },
    { label: 'Analytics', href: '/acquisition/analytics', icon: BarChart2 },
  ];

  return (
    <div
      className="card"
      style={{
        marginBottom: '1.25rem',
        padding: '0.9rem 1.15rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
        background:
          workspace?.type === 'INTERNAL'
            ? 'linear-gradient(135deg, rgba(168,85,247,0.12), rgba(15,23,42,0.95))'
            : 'linear-gradient(135deg, rgba(56,189,248,0.08), rgba(15,23,42,0.95))',
        borderColor:
          workspace?.type === 'INTERNAL' ? 'rgba(168,85,247,0.35)' : 'rgba(56,189,248,0.25)',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <span
            className="badge"
            style={{
              background:
                workspace?.type === 'INTERNAL' ? 'rgba(168,85,247,0.2)' : 'rgba(56,189,248,0.18)',
              color: workspace?.type === 'INTERNAL' ? '#d8b4fe' : '#38bdf8',
              border: '1px solid currentColor',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.28rem 0.65rem',
              fontSize: '0.75rem',
              fontWeight: 700,
            }}
          >
            {workspace?.type === 'INTERNAL' ? <Shield size={13} /> : <Building2 size={13} />}
            {workspace?.type === 'INTERNAL' ? 'INTERNAL AUTOSEO WORKSPACE' : 'SUBSCRIBER WORKSPACE'}
          </span>
          <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {workspace?.name || 'Loading workspace...'}
          </span>
          {workspace && (
            <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              Plan: <strong style={{ color: 'var(--text-primary)' }}>{workspace.plan}</strong>
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {usage && limits && workspace?.type !== 'INTERNAL' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                fontSize: '0.76rem',
                color: 'var(--text-secondary)',
                background: 'rgba(15,23,42,0.7)',
                padding: '0.32rem 0.65rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
              }}
            >
              <span>
                Discovery: <strong>{usage.DISCOVERY}/{limits.discoveryCreditsPerMonth}</strong>
              </span>
              <span>
                Audits: <strong>{usage.AUDIT}/{limits.auditsPerMonth}</strong>
              </span>
              <span>
                Proposals: <strong>{usage.PROPOSAL}/{limits.proposalsPerMonth}</strong>
              </span>
            </div>
          )}

          {isAdmin && (
            <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
              <button
                type="button"
                className={`btn btn-sm ${workspace?.type === 'SUBSCRIBER' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => handleSwitch('SUBSCRIBER')}
                disabled={switching}
                style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
              >
                Subscriber View
              </button>
              <button
                type="button"
                className={`btn btn-sm ${workspace?.type === 'INTERNAL' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => handleSwitch('INTERNAL')}
                disabled={switching}
                style={{
                  fontSize: '0.75rem',
                  padding: '0.3rem 0.65rem',
                  background: workspace?.type === 'INTERNAL' ? '#9333ea' : undefined,
                  borderColor: workspace?.type === 'INTERNAL' ? '#a855f7' : undefined,
                }}
              >
                {switching ? <RefreshCw size={12} className="spin" /> : null}
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
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.8rem',
                padding: '0.38rem 0.78rem',
                textDecoration: 'none',
              }}
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
