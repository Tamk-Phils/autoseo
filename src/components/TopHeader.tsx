'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Play, Globe, ShieldCheck, Plus, User, LogOut, LogIn, UserPlus, Menu, HelpCircle, Home } from 'lucide-react';
import { resolveActiveProject, setActiveProjectId, getActiveProjectId } from '@/lib/activeProject';

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
    if (currentProject?.id) {
      setActiveId(currentProject.id);
    }
  }, [currentProject?.id]);

  useEffect(() => {
    // 1. Fetch current user session
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      })
      .catch(() => {});

    // 2. Fetch projects
    fetch('/api/projects')
      .then((r) => r.json())
      .then((data) => {
        if (data.projects && data.projects.length > 0) {
          setProjects(data.projects);
          if (!currentProject?.id) {
            const resolved = resolveActiveProject(data.projects);
            if (resolved?.id) {
              setActiveId(resolved.id);
            }
          }
        }
      })
      .catch(() => {});

    const handleProjectChanged = (e: any) => {
      const newId = e?.detail?.projectId || getActiveProjectId();
      if (newId) {
        setActiveId(newId);
      }
    };
    window.addEventListener('project-changed', handleProjectChanged);
    return () => window.removeEventListener('project-changed', handleProjectChanged);
  }, [currentProject?.id]);

  const handleSwitchProject = (newId: string) => {
    setActiveId(newId);
    setActiveProjectId(newId);
    const url = new URL(window.location.href);
    url.searchParams.set('projectId', newId);
    window.location.href = url.toString();
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      localStorage.removeItem('activeProjectId');
      document.cookie = 'activeProjectId=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      window.location.href = '/login';
    } catch {
      window.location.href = '/login';
    }
  };

  const selectedProj = projects.find((p) => p.id === activeId) || currentProject;
  const domain = selectedProj?.domain || 'Select Website';
  const name = selectedProj?.name || domain;
  const mode = selectedProj?.optimizationMode || 'AUTONOMOUS';

  return (
    <header className="top-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
        {/* Mobile Sidebar Hamburger Toggle */}
        <button
          type="button"
          className="mobile-toggle-btn"
          onClick={() => window.dispatchEvent(new Event('toggle-sidebar'))}
          aria-label="Open Navigation Menu"
        >
          <Menu size={18} />
        </button>

        {/* Interactive Project Switcher Dropdown */}
        <div className="project-picker" style={{ maxWidth: 'clamp(110px, 35vw, 220px)', minWidth: 0 }}>
          <Globe size={15} color="var(--accent-cyan)" style={{ flexShrink: 0 }} />
          {projects.length > 1 ? (
            <select
              value={activeId}
              onChange={(e) => handleSwitchProject(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontWeight: 600,
                fontSize: '0.82rem',
                outline: 'none',
                cursor: 'pointer',
                width: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id} style={{ background: '#0b1120', color: 'var(--text-primary)' }}>
                  {p.name || p.domain}
                </option>
              ))}
            </select>
          ) : (
            <span style={{ fontWeight: 600, fontSize: '0.82rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
              {name}
            </span>
          )}
        </div>

        <span className="badge badge-low hide-mobile" style={{ textTransform: 'capitalize', flexShrink: 0 }}>
          <ShieldCheck size={12} />
          {mode.toLowerCase()}
        </span>
      </div>

      <div className="header-actions">
        {user && (
          <Link href="/" className="btn btn-secondary btn-sm" title="Back to Home Page" style={{ borderColor: 'rgba(56, 189, 248, 0.3)', background: 'rgba(56, 189, 248, 0.05)' }}>
            <Home size={14} color="var(--accent-cyan)" />
            <span className="hide-mobile">Home</span>
          </Link>
        )}
        <Link href="/how-to-use" className="btn btn-secondary btn-sm" title="How to Use Guide">
          <HelpCircle size={14} color="var(--accent-primary)" />
          <span className="hide-mobile">How to Use</span>
        </Link>
        <Link href="/onboarding" className="btn btn-secondary btn-sm" title="Add Website">
          <Plus size={14} />
          <span className="hide-mobile">Add Website</span>
        </Link>
        <Link href="/live-crawl" className="btn btn-primary btn-sm" title="Run Live Crawl">
          <Play size={14} />
          <span className="hide-mobile">Run Crawl</span>
        </Link>

        {/* User Account State */}
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', paddingLeft: '0.35rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.3rem 0.55rem',
                background: 'rgba(56, 189, 248, 0.08)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8rem',
                color: 'var(--accent-cyan)',
              }}
              title={user.email}
            >
              <User size={13} />
              <span className="hide-mobile" style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                {user.name || user.email.split('@')[0]}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="btn btn-secondary btn-sm"
              style={{ padding: '0.35rem 0.55rem', color: 'var(--text-muted)' }}
              title="Sign Out"
            >
              <LogOut size={13} />
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Link href="/login" className="btn btn-secondary btn-sm" style={{ padding: '0.35rem 0.6rem' }}>
              <LogIn size={13} />
              <span className="hide-mobile">Sign In</span>
            </Link>
            <Link href="/signup" className="btn btn-primary btn-sm" style={{ padding: '0.35rem 0.6rem' }}>
              <UserPlus size={13} />
              <span className="hide-mobile">Register</span>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
