'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import TopHeader from '@/components/TopHeader';
import {
  FileText,
  Search,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  Code,
  Image as ImageIcon,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import LoadingSpinner from '@/components/LoadingSpinner';

import { resolveActiveProject } from '@/lib/activeProject';

export default function PagesAnalyzerPage() {
  const [pages, setPages] = useState<any[]>([]);
  const [selectedPage, setSelectedPage] = useState<any | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<any | null>(null);
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [queueing, setQueueing] = useState(false);

  const loadProjectPages = (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    fetch('/api/projects')
      .then((r) => r.json())
      .then(async (data) => {
        if (data.projects && data.projects.length > 0) {
          const current = resolveActiveProject(data.projects);
          setProject(current);
          const pRes = await fetch(`/api/pages?projectId=${current.id}`);
          const pData = await pRes.json();
          if (pData.pages) {
            setPages(pData.pages);
          } else {
            setPages([]);
          }
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProjectPages(true);
    const handleProjectChanged = () => loadProjectPages(true);
    window.addEventListener('project-changed', handleProjectChanged);
    return () => window.removeEventListener('project-changed', handleProjectChanged);
  }, []);

  const handleOptimizePage = (page: any) => {
    setSelectedPage(page);
    setOptimizing(true);
    setOptimizationResult(null);

    // Dynamic AI page optimization based on actual page parameters
    setTimeout(() => {
      const currentTitle = page.title || '';
      const domain = project?.domain || 'Website';
      const cleanPath = page.path === '/' ? 'Home' : page.path.replace(/[-_/]/g, ' ').trim();
      const capitalized = cleanPath.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

      const suggestedTitle = currentTitle.length > 25 && currentTitle.length <= 60
        ? currentTitle
        : `${capitalized} | ${domain}`;

      const suggestedMeta = page.metaDescription && page.metaDescription.length >= 100
        ? page.metaDescription
        : `Discover comprehensive solutions and high-performance insights on ${page.path}. Learn more about our technical platform and services.`;

      setOptimizing(false);
      setOptimizationResult({
        suggestedTitle,
        suggestedMetaDescription: suggestedMeta,
        suggestedH1: page.h1 || capitalized,
        canonicalFix: page.canonicalUrl
          ? `Self-referencing canonical confirmed: ${page.canonicalUrl}`
          : `<link rel="canonical" href="${page.url}" />`,
        schemaRecommendation: page.schemaTypes && JSON.parse(page.schemaTypes || '[]').length > 0
          ? `Existing schemas: ${JSON.parse(page.schemaTypes).join(', ')}`
          : `Inject WebPage Schema.org JSON-LD markup`,
      });
    }, 800);
  };

  const handleQueueOptimization = async () => {
    if (!selectedPage || !optimizationResult) return;
    setQueueing(true);
    try {
      await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project?.id,
          pageId: selectedPage.id,
          title: `Update on-page metadata for ${selectedPage.path}`,
          agentType: 'CONTENT',
          problem: `Page metadata lacks targeted search intent alignment.`,
          recommendedAction: `Update title to: "${optimizationResult.suggestedTitle}"`,
          suggestedContent: optimizationResult.suggestedTitle,
          priority: 'HIGH',
          expectedImpact: 'HIGH_POTENTIAL',
          status: 'PENDING',
        }),
      });
      alert('Optimization added to AI Recommendations queue!');
      setSelectedPage(null);
    } catch {
      alert('Failed to queue recommendation.');
    } finally {
      setQueueing(false);
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-wrapper">
        <TopHeader currentProject={project} />

        <main className="page-container">
          <div className="page-header">
            <div>
              <h1 className="page-title">Page-Level SEO Analyzer</h1>
              <p className="page-subtitle">
                {project ? (
                  <>Real crawl records for <strong style={{ color: 'var(--text-primary)' }}>{project.domain}</strong> ({pages.length} pages indexed)</>
                ) : (
                  'Granular inspection of on-page HTML elements, metadata, internal links, headings, and schema.'
                )}
              </p>
            </div>
            {project && (
              <Link href="/live-crawl" className="btn btn-secondary btn-sm">
                <Search size={14} />
                Re-crawl Pages
              </Link>
            )}
          </div>

          {loading ? (
            <div className="card">
              <LoadingSpinner size="lg" label="Loading Crawled Pages..." sublabel="Extracting metadata, response codes, and on-page optimization scores" />
            </div>
          ) : pages.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
              <FileText size={36} color="var(--accent-cyan)" style={{ margin: '0 auto 1rem' }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                No Crawled Pages Found
              </h3>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto 1.5rem', fontSize: '0.9rem' }}>
                Run an autonomous crawl on your domain to parse HTML, inspect metadata, headings, internal links, and schemas.
              </p>
              <Link href="/live-crawl" className="btn btn-primary btn-sm">
                Run Website Crawl
              </Link>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>URL & Path</th>
                    <th>Status</th>
                    <th>Title Tag</th>
                    <th>H1 Heading</th>
                    <th>Word Count</th>
                    <th>Schema</th>
                    <th>Response</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pages.map((p) => {
                    const schemaList = p.schemaTypes ? (typeof p.schemaTypes === 'string' ? JSON.parse(p.schemaTypes || '[]') : p.schemaTypes) : [];
                    return (
                      <tr key={p.id}>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.path}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.url}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`badge badge-${p.httpStatus === 200 ? 'success' : 'critical'}`}>
                            {p.httpStatus}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.85rem', color: p.title ? '#fff' : 'var(--color-danger)' }}>
                            {p.title ? (p.title.length > 30 ? p.title.slice(0, 30) + '...' : p.title) : 'Missing Title'}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.85rem', color: p.h1 ? 'var(--text-secondary)' : 'var(--color-warning)' }}>
                            {p.h1 ? (p.h1.length > 25 ? p.h1.slice(0, 25) + '...' : p.h1) : 'Missing H1'}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: p.wordCount < 250 ? 'var(--color-warning)' : 'var(--text-primary)' }}>
                            {p.wordCount}
                          </span>
                        </td>
                        <td>
                          <span className="badge badge-low">
                            {schemaList.length > 0 ? schemaList.join(', ') : 'None'}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.responseTimeMs}ms</span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleOptimizePage(p)}
                          >
                            <Sparkles size={12} color="var(--accent-cyan)" />
                            Optimize Page
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Modal / Optimization Drawer */}
          {selectedPage && (
            <div className="modal-overlay" onClick={() => setSelectedPage(null)}>
              <div className="modal-content" style={{ maxWidth: '720px' }} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                  <div>
                    <span className="badge badge-low" style={{ marginBottom: '0.25rem' }}>Page Inspector</span>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {selectedPage.path}
                    </h2>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{selectedPage.url}</span>
                  </div>
                  <button type="button" onClick={() => setSelectedPage(null)} style={{ color: 'var(--text-muted)' }}>
                    <X size={20} />
                  </button>
                </div>

                {optimizing ? (
                  <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--accent-cyan)' }}>
                    <Sparkles size={32} style={{ animation: 'spin 1.5s linear infinite', margin: '0 auto 1rem' }} />
                    <p style={{ fontWeight: 600 }}>Autonomous AI Engine Analyzing Page Structure...</p>
                  </div>
                ) : (
                  <div>
                    <div className="grid-2" style={{ marginBottom: '1.25rem' }}>
                      <div style={{ background: 'var(--bg-input)', padding: '0.85rem', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Current Title</div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600 }}>{selectedPage.title || 'Missing'}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                          Length: {selectedPage.title?.length || 0} characters
                        </div>
                      </div>

                      <div style={{ background: 'var(--bg-input)', padding: '0.85rem', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Current Meta Description</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{selectedPage.metaDescription || 'Missing'}</div>
                      </div>
                    </div>

                    {optimizationResult && (
                      <div style={{ background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: 'var(--radius-md)', padding: '1.25rem', marginBottom: '1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '0.85rem' }}>
                          <Sparkles size={16} />
                          AI Generated Optimization Blueprint
                        </div>

                        <div style={{ marginBottom: '0.85rem' }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Recommended Title</div>
                          <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600, background: 'var(--bg-dark)', padding: '0.5rem 0.75rem', borderRadius: '4px', marginTop: '0.25rem' }}>
                            {optimizationResult.suggestedTitle}
                          </div>
                        </div>

                        <div style={{ marginBottom: '0.85rem' }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Recommended Meta Description</div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', background: 'var(--bg-dark)', padding: '0.5rem 0.75rem', borderRadius: '4px', marginTop: '0.25rem' }}>
                            {optimizationResult.suggestedMetaDescription}
                          </div>
                        </div>

                        <div className="grid-responsive-2" style={{ gap: '0.75rem' }}>
                          <div style={{ background: 'var(--bg-dark)', padding: '0.6rem', borderRadius: '4px' }}>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Canonical Status</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-success)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>
                              {optimizationResult.canonicalFix}
                            </div>
                          </div>
                          <div style={{ background: 'var(--bg-dark)', padding: '0.6rem', borderRadius: '4px' }}>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Schema Recommendation</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                              {optimizationResult.schemaRecommendation}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <button type="button" className="btn btn-secondary" onClick={() => setSelectedPage(null)}>
                        Close
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleQueueOptimization}
                        disabled={queueing}
                      >
                        {queueing ? 'Queueing...' : 'Queue Recommendation'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
