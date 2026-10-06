'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Play, Globe, ShieldCheck, Plus, User, LogOut, LogIn, UserPlus } from 'lucide-react';

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
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string>(currentProject?.id || '');
  const [user, setUser] = useState<{ id: string; email: string; name?: string | null } | null>(null);

  useEffect(() => {
    // 1. Fetch current user session
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setUser(data.user);
        }
      })
      .catch(() => {});

    // 2. Fetch projects
    fetch('/api/projects')
      .then((r) => r.json())
      .then((data) => {
        if (data.projects && data.projects.length > 0) {
          setProjects(data.projects);
          const urlParams = new URLSearchParams(window.location.search);
          const urlProjectId = urlParams.get('projectId');
          const saved = localStorage.getItem('activeProjectId');

          if (urlProjectId && data.projects.some((p: any) => p.id === urlProjectId)) {
            setActiveId(urlProjectId);
            localStorage.setItem('activeProjectId', urlProjectId);
          } else if (saved && data.projects.some((p: any) => p.id === saved)) {
            setActiveId(saved);
          } else if (currentProject?.id) {
            setActiveId(currentProject.id);
            localStorage.setItem('activeProjectId', currentProject.id);
          } else {
            setActiveId(data.projects[0].id);
            localStorage.setItem('activeProjectId', data.projects[0].id);
          }
        }
      })
      .catch(() => {});
  }, [currentProject?.id]);

  const handleSwitchProject = (newId: string) => {
    setActiveId(newId);
    localStorage.setItem('activeProjectId', newId);
    const url = new URL(window.location.href);
    url.searchParams.set('projectId', newId);
    window.location.href = url.toString();
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      localStorage.removeItem('activeProjectId');
      router.push('/login');
      router.refresh();
    } catch {
      router.push('/login');
    }
  };

  const selectedProj = projects.find((p) => p.id === activeId) || currentProject;
  const domain = selectedProj?.domain || 'Select Website';
  const name = selectedProj?.name || domain;
  const mode = selectedProj?.optimizationMode || 'AUTONOMOUS';

  return (
    <header className="top-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1.5rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Interactive Project Switcher Dropdown */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <div
            className="project-picker"
            style={{
              padding: '0.4rem 0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <Globe size={16} color="var(--accent-cyan)" />
            {projects.length > 1 ? (
              <select
                value={activeId}
                onChange={(e) => handleSwitchProject(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  outline: 'none',
                  cursor: 'pointer',
                  paddingRight: '0.5rem',
                }}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id} style={{ background: '#0b1120', color: '#fff' }}>
                    {p.name || p.domain} ({p.domain})
                  </option>
                ))}
              </select>
            ) : (
              <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{name}</span>
            )}
          </div>
        </div>

        <span className="badge badge-low" style={{ textTransform: 'capitalize' }}>
          <ShieldCheck size={12} />
          Mode: {mode.toLowerCase()}
        </span>
      </div>

      <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Link href="/onboarding" className="btn btn-secondary btn-sm">
          <Plus size={14} />
          Add Website
        </Link>
        <Link href="/live-crawl" className="btn btn-primary btn-sm">
          <Play size={14} />
          Run Live Crawl
        </Link>

        {/* User Account State */}
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginLeft: '0.5rem', paddingLeft: '0.75rem', borderLeft: '1px solid var(--border-color)' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.35rem 0.65rem',
                background: 'rgba(56, 189, 248, 0.08)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.82rem',
                color: 'var(--accent-cyan)',
              }}
              title={user.email}
            >
              <User size={14} />
              <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                {user.name || user.email.split('@')[0]}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="btn btn-secondary btn-sm"
              style={{ padding: '0.35rem 0.6rem', color: 'var(--text-muted)' }}
              title="Sign Out"
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '0.5rem', paddingLeft: '0.75rem', borderLeft: '1px solid var(--border-color)' }}>
            <Link href="/login" className="btn btn-secondary btn-sm" style={{ padding: '0.35rem 0.65rem' }}>
              <LogIn size={13} style={{ marginRight: '4px' }} />
              Sign In
            </Link>
            <Link href="/signup" className="btn btn-primary btn-sm" style={{ padding: '0.35rem 0.65rem' }}>
              <UserPlus size={13} style={{ marginRight: '4px' }} />
              Register
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
