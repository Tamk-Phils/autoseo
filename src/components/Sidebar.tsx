'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Search,
  FileText,
  KeyRound,
  Network,
  Users2,
  Sparkles,
  Bot,
  BarChart3,
  FileCheck2,
  Settings,
  Flame,
  Globe2,
  History,
  Radio,
  Boxes,
  Zap,
  User,
  LogIn,
  X,
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<{ id: string; email: string; name?: string | null } | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
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

    const handleToggle = () => setIsOpen((prev) => !prev);
    const handleClose = () => setIsOpen(false);

    window.addEventListener('toggle-sidebar', handleToggle);
    window.addEventListener('close-sidebar', handleClose);

    return () => {
      window.removeEventListener('toggle-sidebar', handleToggle);
      window.removeEventListener('close-sidebar', handleClose);
    };
  }, []);

  // Automatically close sidebar when navigating to a new page
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Live Crawl', href: '/live-crawl', icon: Radio },
    { label: 'Site Audit', href: '/site-audit', icon: Search },
    { label: 'Pages Analyzer', href: '/pages', icon: FileText },
    { label: 'AI Opportunities', href: '/opportunities', icon: Flame },
    { label: 'Recommendations', href: '/recommendations', icon: Sparkles },
    { label: 'Keywords', href: '/keywords', icon: KeyRound },
    { label: 'Internal Links', href: '/internal-links', icon: Network },
    { label: 'Competitors', href: '/competitors', icon: Users2 },
    { label: 'Search Console', href: '/search-console', icon: BarChart3 },
    { label: 'SEO Autopilot', href: '/autopilot', icon: Bot },
    { label: 'Zero-Code Tag', href: '/activate', icon: Zap },
    { label: 'Change History', href: '/changes', icon: History },
    { label: 'Audit Reports', href: '/reports', icon: FileCheck2 },
    { label: 'Integrations', href: '/integrations', icon: Boxes },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <>
      {isOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <Link href="/" className="sidebar-logo" onClick={() => setIsOpen(false)}>
            <Globe2 className="sidebar-logo-accent" size={24} />
            <span>Apex<span className="sidebar-logo-accent">SEO</span></span>
          </Link>
          <button
            type="button"
            className="mobile-toggle-btn"
            style={{ width: '30px', height: '30px', padding: 0 }}
            onClick={() => setIsOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Engine Core</div>
          {navItems.slice(0, 6).map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setIsOpen(false)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div className="nav-section-label">Intelligence & Data</div>
          {navItems.slice(6, 10).map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setIsOpen(false)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div className="nav-section-label">Automation & Logs</div>
          {navItems.slice(10).map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setIsOpen(false)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', padding: '1rem', borderTop: '1px solid var(--border-color)' }}>
          {user ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: '0.5rem 0.65rem',
                background: 'rgba(56, 189, 248, 0.08)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(56, 189, 248, 0.15)',
              }}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'var(--accent-cyan)',
                  color: '#0b1120',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  flexShrink: 0,
                }}
              >
                {(user.name || user.email)[0].toUpperCase()}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.name || user.email.split('@')[0]}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.email}
                </div>
              </div>
            </div>
          ) : (
            <Link
              href="/login"
              onClick={() => setIsOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
                padding: '0.5rem',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.82rem',
                fontWeight: 600,
                color: 'var(--accent-cyan)',
                textDecoration: 'none',
              }}
            >
              <LogIn size={14} />
              <span>Sign In to Account</span>
            </Link>
          )}
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Autonomous Mode:</span>
            <span style={{ color: '#10b981', fontWeight: 600 }}>ACTIVE</span>
          </div>
        </div>
      </aside>
    </>
  );
}
