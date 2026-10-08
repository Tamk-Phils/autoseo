'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import TopHeader from '@/components/TopHeader';
import {
  Globe,
  Plus,
  ArrowRight,
  Sparkles,
  Search,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then((data) => {
        if (data.projects) {
          setProjects(data.projects);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-wrapper">
        <TopHeader currentProject={projects[0]} />

        <main className="page-container">
          <div className="page-header">
            <div>
              <h1 className="page-title">Projects Management</h1>
              <p className="page-subtitle">
                Manage multiple domain properties, audit histories, and autonomous SEO engine configurations.
              </p>
            </div>
            <Link href="/onboarding" className="btn btn-primary btn-sm">
              <Plus size={14} />
              Add Website Project
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
            {projects.map((proj) => (
              <div key={proj.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '8px', background: 'rgba(56, 189, 248, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-cyan)' }}>
                      <Globe size={20} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>{proj.name}</h3>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{proj.domain}</span>
                    </div>
                  </div>

                  <span className="badge badge-low">{proj.optimizationMode}</span>
                </div>

                <div className="grid-3" style={{ marginBottom: '1.25rem' }}>
                  <div style={{ background: 'var(--bg-input)', padding: '0.6rem', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>SEO Score</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-success)' }}>
                      {proj.seoScore || 0}/100
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-input)', padding: '0.6rem', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Indexed Pages</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {proj._count?.pages || 0}
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-input)', padding: '0.6rem', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Issues</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f97316' }}>
                      {proj._count?.issues || 0}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Last crawl: {proj.lastCrawlAt ? new Date(proj.lastCrawlAt).toLocaleDateString() : 'Never'}
                  </span>
                  <Link href="/dashboard" className="btn btn-secondary btn-sm">
                    Open Dashboard
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}

