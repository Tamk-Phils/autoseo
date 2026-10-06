'use client';

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
  FileSpreadsheet,
  Boxes,
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();

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
    { label: 'Change History', href: '/changes', icon: History },
    { label: 'Audit Reports', href: '/reports', icon: FileCheck2 },
    { label: 'Integrations', href: '/integrations', icon: Boxes },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <Link href="/" className="sidebar-logo">
          <Globe2 className="sidebar-logo-accent" size={24} />
          <span>Apex<span className="sidebar-logo-accent">SEO</span></span>
        </Link>
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
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div>Autonomous Mode: <span style={{ color: '#10b981', fontWeight: 600 }}>ACTIVE</span></div>
      </div>
    </aside>
  );
}

