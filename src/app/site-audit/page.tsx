'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import TopHeader from '@/components/TopHeader';
import {
  AlertTriangle,
  CheckCircle2,
  Filter,
  Layers,
  Sparkles,
  ArrowRight,
  Info,
  Search,
} from 'lucide-react';
import Link from 'next/link';

export default function SiteAuditPage() {
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [activeSeverity, setActiveSeverity] = useState<string>('ALL');
  const [project, setProject] = useState<any>(null);

  useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then(async (data) => {
        if (data.projects && data.projects.length > 0) {
          const current = data.projects[0];
          setProject(current);
          const res = await fetch(`/api/issues?projectId=${current.id}`);
          const issuesData = await res.json();
          if (issuesData.issues) {
            setIssues(issuesData.issues);
          }
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const categories = [
    'ALL',
    'Technical SEO',
    'On-Page SEO',
    'Content',
    'Images',
    'Internal Linking',
    'Structured Data',
    'Performance',
  ];

  const severities = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

  const filteredIssues = issues.filter((iss) => {
    if (activeCategory !== 'ALL' && iss.category !== activeCategory) return false;
    if (activeSeverity !== 'ALL' && iss.severity !== activeSeverity) return false;
    return true;
  });

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-wrapper">
        <TopHeader currentProject={project} />

        <main className="page-container">
          <div className="page-header">
            <div>
              <h1 className="page-title">Technical & On-Page Site Audit</h1>
              <p className="page-subtitle">
                {project ? (
                  <>Real audit issues detected on <strong style={{ color: '#fff' }}>{project.domain}</strong></>
                ) : (
                  'Comprehensive audit diagnostics structured by impact, severity, and implementation difficulty.'
                )}
              </p>
            </div>
            {project && (
              <Link href="/live-crawl" className="btn btn-secondary btn-sm">
                <Search size={14} />
                Re-crawl Website
              </Link>
            )}
          </div>

          {/* Category Filter Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: '0.45rem 0.9rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  backgroundColor: activeCategory === cat ? 'var(--accent-primary)' : 'var(--bg-input)',
                  color: activeCategory === cat ? '#fff' : 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                  whiteSpace: 'nowrap',
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Severity Badges Filter */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.75rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginRight: '0.5rem' }}>Filter Severity:</span>
            {severities.map((sev) => (
              <button
                key={sev}
                type="button"
                onClick={() => setActiveSeverity(sev)}
                style={{
                  padding: '0.3rem 0.7rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  border: activeSeverity === sev ? '1px solid #fff' : '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-input)',
                  color: sev === 'CRITICAL' ? 'var(--color-danger)' : sev === 'HIGH' ? '#f97316' : sev === 'MEDIUM' ? 'var(--color-warning)' : 'var(--text-primary)',
                }}
              >
                {sev}
              </button>
            ))}
          </div>

          {/* Issues List */}
          {loading ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              Loading audit diagnostics...
            </div>
          ) : !project ? (
            <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
              <Search size={36} color="var(--accent-cyan)" style={{ margin: '0 auto 1rem' }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
                No Website Configured
              </h3>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto 1.5rem', fontSize: '0.9rem' }}>
                Add your website URL to begin an automated crawl and discover technical SEO issues.
              </p>
              <Link href="/onboarding" className="btn btn-primary btn-sm">
                Add Website & Crawl
              </Link>
            </div>
          ) : filteredIssues.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
              <CheckCircle2 size={36} color="var(--color-success)" style={{ margin: '0 auto 1rem' }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
                No Audit Issues Found
              </h3>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto 1.5rem', fontSize: '0.9rem' }}>
                {issues.length === 0
                  ? 'No pages have been crawled yet. Start a live crawl to inspect your domain.'
                  : 'No issues match the selected category or severity filter.'}
              </p>
              {issues.length === 0 && (
                <Link href="/live-crawl" className="btn btn-primary btn-sm">
                  Run Website Crawl
                </Link>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {filteredIssues.map((iss) => (
                <div key={iss.id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
                        <span className={`badge badge-${iss.severity.toLowerCase()}`}>{iss.severity}</span>
                        <span className="badge badge-low">{iss.category}</span>
                      </div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>{iss.title}</h3>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem' }}>
                      <div style={{ background: 'var(--bg-input)', padding: '0.3rem 0.6rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                        Impact: <strong style={{ color: 'var(--color-success)' }}>{iss.estimatedImpact}</strong>
                      </div>
                      <div style={{ background: 'var(--bg-input)', padding: '0.3rem 0.6rem', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                        Difficulty: <strong style={{ color: '#fff' }}>{iss.difficulty}</strong>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', background: 'var(--bg-input)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                        Why It Matters
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{iss.whyItMatters}</p>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                        Evidence
                      </div>
                      <p style={{ fontSize: '0.85rem', color: '#fff', fontFamily: 'var(--font-mono)' }}>{iss.evidence || 'Detected during page HTML parse'}</p>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                        Recommended Solution
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{iss.solution}</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                    <Link href="/recommendations" className="btn btn-secondary btn-sm">
                      Generate AI Fix
                    </Link>
                    <Link href="/pages" className="btn btn-primary btn-sm">
                      Inspect Affected Pages
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
