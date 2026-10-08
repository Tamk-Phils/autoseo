'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import TopHeader from '@/components/TopHeader';
import {
  Network,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Link2,
  CheckCircle2,
  Search,
} from 'lucide-react';
import Link from 'next/link';

export default function InternalLinksPage() {
  const [project, setProject] = useState<any>(null);
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then(async (data) => {
        if (data.projects && data.projects.length > 0) {
          const savedId = typeof window !== 'undefined' ? (new URLSearchParams(window.location.search).get('projectId') || localStorage.getItem('activeProjectId')) : null;
          const current = (savedId && data.projects.find((p: any) => p.id === savedId)) || data.projects[0];
          setProject(current);
          const pRes = await fetch(`/api/pages?projectId=${current.id}`);
          const pData = await pRes.json();
          if (pData.pages) {
            setPages(pData.pages);
          }
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const totalInternalLinks = pages.reduce((acc, p) => acc + (p.internalLinksCount || 0), 0);
  const orphanPages = pages.filter((p) => p.internalLinksCount === 0 && p.path !== '/' && p.httpStatus === 200);
  const underLinkedPages = pages.filter((p) => p.internalLinksCount > 0 && p.internalLinksCount < 2 && p.path !== '/');

  // Real derived recommendations
  const linkRecommendations: any[] = [];
  if (pages.length > 1) {
    const hubPage = pages.find((p) => p.path === '/') || pages[0];
    const targets = [...orphanPages, ...underLinkedPages];
    targets.slice(0, 3).forEach((target, idx) => {
      linkRecommendations.push({
        id: `rec-link-${idx}`,
        sourcePage: hubPage.path,
        targetPage: target.path,
        suggestedAnchor: target.title ? target.title.slice(0, 40) : `Learn more about ${target.path}`,
        reason: `Target page has only ${target.internalLinksCount} internal links. Adding a contextual in-body link from the high-authority hub transfers internal PageRank.`,
        impact: 'HIGH',
      });
    });
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-wrapper">
        <TopHeader currentProject={project} />

        <main className="page-container">
          <div className="page-header">
            <div>
              <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Network color="var(--accent-cyan)" size={24} />
                Internal Linking & Topology Engine
              </h1>
              <p className="page-subtitle">
                {project ? (
                  <>Real link topology diagnostics for <strong style={{ color: 'var(--text-primary)' }}>{project.domain}</strong></>
                ) : (
                  'Inspect crawl depth hierarchy, detect orphan pages, and generate topical internal anchor link recommendations.'
                )}
              </p>
            </div>
            {project && (
              <Link href="/live-crawl" className="btn btn-secondary btn-sm">
                <Search size={14} />
                Re-crawl Site
              </Link>
            )}
          </div>

          {loading ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              Analyzing link topology...
            </div>
          ) : !project ? (
            <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
              <Search size={36} color="var(--accent-cyan)" style={{ margin: '0 auto 1rem' }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                No Website Configured
              </h3>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto 1.5rem', fontSize: '0.9rem' }}>
                Add your website URL to inspect internal link architecture.
              </p>
              <Link href="/onboarding" className="btn btn-primary btn-sm">
                Add Website
              </Link>
            </div>
          ) : pages.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
              <Network size={36} color="var(--accent-cyan)" style={{ margin: '0 auto 1rem' }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                No Crawl Data Available
              </h3>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto 1.5rem', fontSize: '0.9rem' }}>
                Start a live crawl to map out your internal link topology, crawl depth, and orphan pages.
              </p>
              <Link href="/live-crawl" className="btn btn-primary btn-sm">
                Run Live Crawl
              </Link>
            </div>
          ) : (
            <>
              {/* Metrics */}
              <div className="grid-3" style={{ marginBottom: '1.75rem' }}>
                <div className="stat-card">
                  <span className="stat-label">Total Internal Links</span>
                  <div className="stat-value" style={{ color: 'var(--accent-cyan)' }}>{totalInternalLinks}</div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Across {pages.length} crawled pages
                  </span>
                </div>

                <div className="stat-card">
                  <span className="stat-label">Under-Linked Pages</span>
                  <div className="stat-value" style={{ color: underLinkedPages.length > 0 ? '#f97316' : 'var(--color-success)' }}>
                    {underLinkedPages.length} Pages
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Receives fewer than 2 inbound links
                  </span>
                </div>

                <div className="stat-card">
                  <span className="stat-label">Detected Orphan Pages</span>
                  <div className="stat-value" style={{ color: orphanPages.length > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                    {orphanPages.length} Pages
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Zero detected internal link paths
                  </span>
                </div>
              </div>

              {/* AI Internal Link Recommendations */}
              {linkRecommendations.length > 0 && (
                <div className="card" style={{ marginBottom: '1.75rem' }}>
                  <div className="card-header">
                    <h3 className="card-title">
                      <Sparkles size={18} color="var(--accent-cyan)" />
                      AI Contextual Internal Linking Suggestions
                    </h3>
                    <span className="badge badge-low">Topical Search Intent</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {linkRecommendations.map((rec) => (
                      <div
                        key={rec.id}
                        style={{
                          padding: '1rem 1.25rem',
                          backgroundColor: 'var(--bg-input)',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-color)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            <span style={{ color: 'var(--accent-cyan)' }}>{rec.sourcePage}</span>
                            <ArrowRight size={14} color="var(--text-muted)" />
                            <span style={{ color: 'var(--color-success)' }}>{rec.targetPage}</span>
                          </div>
                          <span className="badge badge-high">Impact: {rec.impact}</span>
                        </div>

                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                          {rec.reason}
                        </p>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            Suggested Anchor Text: <strong style={{ color: 'var(--text-primary)' }}>&quot;{rec.suggestedAnchor}&quot;</strong>
                          </div>
                          <Link href="/recommendations" className="btn btn-secondary btn-sm">
                            <Link2 size={12} />
                            View Recommendation
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Page Link Topology Table */}
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">Page Link Distribution & Crawl Depth</h3>
                </div>

                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Page Path</th>
                        <th>Internal Links Count</th>
                        <th>External Links Count</th>
                        <th>Crawl Depth</th>
                        <th>Topology Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pages.map((p) => {
                        const isOrphan = p.internalLinksCount === 0 && p.path !== '/';
                        const isUnder = p.internalLinksCount > 0 && p.internalLinksCount < 2 && p.path !== '/';
                        return (
                          <tr key={p.id}>
                            <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.path}</td>
                            <td>
                              <span style={{ fontWeight: 700, color: p.internalLinksCount < 2 ? '#f97316' : '#fff' }}>
                                {p.internalLinksCount}
                              </span>
                            </td>
                            <td>{p.externalLinksCount}</td>
                            <td>Level {p.depth || 0}</td>
                            <td>
                              {isOrphan ? (
                                <span className="badge badge-critical">Orphan Detected</span>
                              ) : isUnder ? (
                                <span className="badge badge-medium">Under-Linked</span>
                              ) : (
                                <span className="badge badge-success">Healthy Distribution</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
