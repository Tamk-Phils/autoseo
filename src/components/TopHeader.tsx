'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Play, Globe, ShieldCheck, Plus, ChevronDown } from 'lucide-react';

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

  useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then((data) => {
        if (data.projects && data.projects.length > 0) {
          setProjects(data.projects);
          const saved = localStorage.getItem('activeProjectId');
          if (saved && data.projects.some((p: any) => p.id === saved)) {
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
    // Reload page to re-fetch all state for the selected project
    window.location.reload();
  };

  const selectedProj = projects.find((p) => p.id === activeId) || currentProject;
  const domain = selectedProj?.domain || 'Select Website';
  const name = selectedProj?.name || domain;
  const mode = selectedProj?.optimizationMode || 'AUTONOMOUS';

  return (
    <header className="top-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Interactive Project Switcher Dropdown */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <div
            className="project-picker"
            style={{
              padding: '0.35rem 0.65rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'var(--bg-card)',
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
