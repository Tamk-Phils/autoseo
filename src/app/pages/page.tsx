'use client';

import { useState, useEffect, useMemo } from 'react';
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
  Zap,
  Check,
  RotateCcw,
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
  const [appliedChanges, setAppliedChanges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sweeping, setSweeping] = useState(false);
  const [queueing, setQueueing] = useState(false);
  const [applyingLive, setApplyingLive] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const loadProjectPages = (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    fetch('/api/projects')
      .then((r) => r.json())
      .then(async (data) => {
        if (data.projects && data.projects.length > 0) {
          const current = resolveActiveProject(data.projects);
          setProject(current);
          
          const [pRes, cRes] = await Promise.all([
            fetch(`/api/pages?projectId=${current.id}`),
            fetch(`/api/changes?projectId=${current.id}`),
          ]);
          
          const pData = await pRes.json();
          const cData = await cRes.json();
          
          if (pData.pages) {
            setPages(pData.pages);
          } else {
            setPages([]);
          }

          if (cData.changes) {
            setAppliedChanges(cData.changes);
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

  const changesByPath = useMemo(() => {
    const map: Record<string, { title?: any; description?: any; canonical?: any; schema?: any; keywords?: any; all: any[] }> = {};
    for (const c of appliedChanges) {
      if (c.status !== 'APPLIED') continue;
      let path = '/';
      try {
        path = new URL(c.affectedUrl).pathname;
      } catch {
        path = c.affectedUrl.startsWith('/') ? c.affectedUrl : `/${c.affectedUrl}`;
      }
      const norm = path === '/' ? '/' : path.replace(/\/$/, '');
      if (!map[norm]) map[norm] = { all: [] };
      map[norm].all.push(c);
      const t = c.changeType.toUpperCase();
      if (t.includes('TITLE')) map[norm].title = c;
      else if (t.includes('META_DESCRIPTION') || t.includes('DESCRIPTION')) map[norm].description = c;
      else if (t.includes('CANONICAL')) map[norm].canonical = c;
      else if (t.includes('SCHEMA')) map[norm].schema = c;
      else if (t.includes('KEYWORD')) map[norm].keywords = c;
    }
    return map;
  }, [appliedChanges]);

  const handleTriggerSweep = async () => {
    if (!project) return;
    setSweeping(true);
    try {
      const res = await fetch('/api/autopilot/sweep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessBanner(`⚡ Autonomous sweep completed! Applied optimizations across ${data.processed || pages.length} pages in real time via engine.js.`);
        setTimeout(() => setSuccessBanner(null), 8000);
        loadProjectPages(false);
      } else {
        alert(data.error || 'Failed to trigger autonomous sweep');
      }
    } catch {
      alert('Network error while running autonomous sweep');
    } finally {
      setSweeping(false);
    }
  };

  const handleOptimizePage = (page: any) => {
    setSelectedPage(page);
    setOptimizing(true);
    setOptimizationResult(null);

    const norm = page.path === '/' ? '/' : page.path.replace(/\/$/, '');
    const activeRule = changesByPath[norm] || changesByPath[page.path];

    setTimeout(() => {
      const currentTitle = page.title || '';
      const domain = project?.domain || 'Website';
      const cleanPath = page.path === '/' ? 'Home' : page.path.replace(/[-_/]/g, ' ').trim();
      const capitalized = cleanPath.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

      const suggestedTitle = activeRule?.title?.newValue || (currentTitle.length >= 35 && currentTitle.length <= 65
        ? currentTitle
        : `${capitalized} | ${domain}`);

      const suggestedMeta = activeRule?.description?.newValue || (page.metaDescription && page.metaDescription.length >= 110
        ? page.metaDescription
        : `Explore ${capitalized} at ${domain}. Discover comprehensive insights, verified selection, and expert support. Guaranteed performance.`);

      setOptimizing(false);
      setOptimizationResult({
        isLiveActive: Boolean(activeRule),
        liveTitle: activeRule?.title?.newValue,
        liveDescription: activeRule?.description?.newValue,
        liveCanonical: activeRule?.canonical?.newValue,
        liveSchema: activeRule?.schema?.newValue,
        liveKeywords: activeRule?.keywords?.newValue,
        suggestedTitle,
        suggestedMetaDescription: suggestedMeta,
        suggestedH1: page.h1 || capitalized,
        canonicalFix: activeRule?.canonical?.newValue || page.canonicalUrl || page.url,
        schemaRecommendation: activeRule?.schema?.newValue || (page.schemaTypes && JSON.parse(page.schemaTypes || '[]').length > 0
          ? `Existing schemas: ${JSON.parse(page.schemaTypes).join(', ')}`
          : `Inject WebPage Schema.org JSON-LD markup`),
      });
    }, 400);
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

  const handleApplyLive = async () => {
    if (!selectedPage || !optimizationResult || !project) return;
    setApplyingLive(true);
    try {
      // 1. Create title change
      await fetch('/api/changes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          pageId: selectedPage.id,
          changeType: 'TITLE',
          originalValue: selectedPage.title || '',
          newValue: optimizationResult.suggestedTitle,
          reason: `On-page title optimization for ${selectedPage.path}`,
          affectedUrl: selectedPage.url,
          integrationUsed: 'AUTONOMOUS_ENGINE',
          status: 'APPLIED',
        }),
      });

      // 2. Create description change
      await fetch('/api/changes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          pageId: selectedPage.id,
          changeType: 'META_DESCRIPTION',
          originalValue: selectedPage.metaDescription || '',
          newValue: optimizationResult.suggestedMetaDescription,
          reason: `On-page meta description optimization for ${selectedPage.path}`,
          affectedUrl: selectedPage.url,
          integrationUsed: 'AUTONOMOUS_ENGINE',
          status: 'APPLIED',
        }),
      });

      setSuccessBanner(`Optimization applied live to ${selectedPage.path} in real time via engine.js!`);
      setTimeout(() => setSuccessBanner(null), 7000);
      setSelectedPage(null);
      loadProjectPages(false);
    } catch {
      alert('Failed to apply optimization live.');
    } finally {
      setApplyingLive(false);
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
              <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleTriggerSweep}
                  disabled={sweeping}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', borderColor: 'var(--accent-cyan)' }}
                >
                  <Zap size={14} className={sweeping ? 'animate-spin' : ''} color="var(--accent-cyan)" />
                  {sweeping ? 'Sweeping All Pages...' : 'Sweep & Optimize All Pages'}
                </button>
                <Link href="/live-crawl" className="btn btn-secondary btn-sm">
                  <Search size={14} />
                  Re-crawl Pages
                </Link>
              </div>
            )}
          </div>

          {/* Autonomous Status Callout */}
          {project && (
            <div
              className="card"
              style={{
                marginBottom: '1.25rem',
                background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.08) 0%, rgba(37, 99, 235, 0.04) 100%)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                padding: '1.1rem 1.4rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(56, 189, 248, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--accent-cyan)',
                      flexShrink: 0,
                    }}
                  >
                    <Zap size={22} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                        SEO Autopilot Engine: AUTONOMOUS
                      </h3>
                      <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
                        Real-Time Live Serving Active
                      </span>
                    </div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0' }}>
                      In Autonomous Mode, all pages are diagnosed and optimized automatically. Title tags, meta descriptions, canonical URLs, keywords, and Schema.org entities are deployed live to your website via <code>engine.js</code> with zero manual intervention.
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                      {Object.keys(changesByPath).length} / {pages.length}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Pages Live Optimized
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {successBanner && (
            <div
              style={{
                padding: '0.85rem 1.25rem',
                backgroundColor: 'rgba(22, 163, 74, 0.1)',
                border: '1px solid var(--color-success)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-success)',
                fontSize: '0.88rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <CheckCircle2 size={16} />
              <span>{successBanner}</span>
            </div>
          )}

          {loading ? (
            <div className="card">
              <LoadingSpinner size="lg" label="Loading Crawled Pages & Live Overrides..." sublabel="Extracting metadata, response codes, and active autonomous engine injections" />
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
                    <th>Autonomous Live</th>
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
                    const norm = p.path === '/' ? '/' : p.path.replace(/\/$/, '');
                    const activeRule = changesByPath[norm] || changesByPath[p.path];
                    const schemaList = p.schemaTypes ? (typeof p.schemaTypes === 'string' ? JSON.parse(p.schemaTypes || '[]') : p.schemaTypes) : [];
                    
                    const tagCount = activeRule
                      ? [activeRule.title, activeRule.description, activeRule.canonical, activeRule.schema, activeRule.keywords].filter(Boolean).length
                      : 0;

                    return (
                      <tr key={p.id}>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.path}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.url}</span>
                          </div>
                        </td>
                        <td>
                          {activeRule ? (
                            <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                              <CheckCircle2 size={12} />
                              Live Active ({tagCount} tags)
                            </span>
                          ) : (
                            <span className="badge badge-low" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                              Auto-Optimizing
                            </span>
                          )}
                        </td>
                        <td>
                          <span style={{ fontSize: '0.85rem', color: activeRule?.title ? '#22c55e' : (p.title ? '#fff' : 'var(--color-danger)') }}>
                            {activeRule?.title?.newValue
                              ? (activeRule.title.newValue.length > 30 ? activeRule.title.newValue.slice(0, 30) + '...' : activeRule.title.newValue)
                              : (p.title ? (p.title.length > 30 ? p.title.slice(0, 30) + '...' : p.title) : 'Missing Title')}
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
                            {activeRule?.schema ? 'JSON-LD Active' : (schemaList.length > 0 ? schemaList.join(', ') : 'None')}
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
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              borderColor: activeRule ? 'rgba(34, 197, 94, 0.4)' : undefined,
                              color: activeRule ? '#22c55e' : undefined,
                            }}
                          >
                            <Zap size={12} fill={activeRule ? 'currentColor' : 'none'} />
                            {activeRule ? 'View Live Overrides' : 'Auto-Optimize'}
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
              <div className="modal-content" style={{ maxWidth: '740px' }} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span className="badge badge-low">Page Inspector</span>
                      {optimizationResult?.isLiveActive && (
                        <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                          <CheckCircle2 size={12} />
                          Autonomous Deployment Active
                        </span>
                      )}
                    </div>
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
                    <p style={{ fontWeight: 600 }}>Autonomous AI Engine Analyzing Page Structure & Live Status...</p>
                  </div>
                ) : (
                  <div>
                    {optimizationResult?.isLiveActive && (
                      <div
                        style={{
                          padding: '0.9rem 1.25rem',
                          backgroundColor: 'rgba(34, 197, 94, 0.08)',
                          border: '1px solid var(--color-success)',
                          borderRadius: 'var(--radius-md)',
                          marginBottom: '1.25rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                        }}
                      >
                        <CheckCircle2 size={20} color="var(--color-success)" style={{ flexShrink: 0 }} />
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--color-success)', fontSize: '0.92rem' }}>
                            Autonomously Optimized & Active Live on Your Website
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            The optimizations below are automatically active and served in real-time to visitors and Google/Bing bots via <code>engine.js</code>. No manual action is required.
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid-2" style={{ marginBottom: '1.25rem' }}>
                      <div style={{ background: 'var(--bg-input)', padding: '0.85rem', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Original Title Tag</div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600 }}>{selectedPage.title || 'Missing'}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                          Length: {selectedPage.title?.length || 0} characters
                        </div>
                      </div>

                      <div style={{ background: 'var(--bg-input)', padding: '0.85rem', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Original Meta Description</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{selectedPage.metaDescription || 'Missing'}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                          Length: {selectedPage.metaDescription?.length || 0} characters
                        </div>
                      </div>
                    </div>

                    {optimizationResult && (
                      <div style={{ background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: 'var(--radius-md)', padding: '1.25rem', marginBottom: '1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                            <Sparkles size={16} />
                            Autonomous Live Blueprint
                          </div>
                          <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>
                            {optimizationResult.isLiveActive ? 'SERVING LIVE VIA ENGINE.JS' : 'READY TO DEPLOY'}
                          </span>
                        </div>

                        <div style={{ marginBottom: '0.85rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Active Live Title</span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--color-success)', fontWeight: 600 }}>
                              {optimizationResult.suggestedTitle.length} chars (Optimal: 50-60)
                            </span>
                          </div>
                          <div style={{ fontSize: '0.9rem', color: '#22c55e', fontWeight: 600, background: 'var(--bg-dark)', padding: '0.5rem 0.75rem', borderRadius: '4px', marginTop: '0.25rem', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                            {optimizationResult.suggestedTitle}
                          </div>
                        </div>

                        <div style={{ marginBottom: '0.85rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Active Live Meta Description</span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--color-success)', fontWeight: 600 }}>
                              {optimizationResult.suggestedMetaDescription.length} chars (Optimal: 140-160)
                            </span>
                          </div>
                          <div style={{ fontSize: '0.85rem', color: '#22c55e', background: 'var(--bg-dark)', padding: '0.5rem 0.75rem', borderRadius: '4px', marginTop: '0.25rem', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                            {optimizationResult.suggestedMetaDescription}
                          </div>
                        </div>

                        <div className="grid-responsive-2" style={{ gap: '0.75rem', marginBottom: '0.85rem' }}>
                          <div style={{ background: 'var(--bg-dark)', padding: '0.6rem', borderRadius: '4px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Canonical Link Tag</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-success)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>
                              &lt;link rel=&quot;canonical&quot; href=&quot;{optimizationResult.canonicalFix}&quot; /&gt;
                            </div>
                          </div>
                          <div style={{ background: 'var(--bg-dark)', padding: '0.6rem', borderRadius: '4px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Schema.org JSON-LD</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-success)', wordBreak: 'break-word', fontFamily: 'var(--font-mono)' }}>
                              WebPage Entity Active
                            </div>
                          </div>
                        </div>

                        {optimizationResult.liveKeywords && (
                          <div style={{ background: 'var(--bg-dark)', padding: '0.6rem', borderRadius: '4px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Injected Target Keywords</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>
                              {optimizationResult.liveKeywords}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <button type="button" className="btn btn-secondary" onClick={() => setSelectedPage(null)}>
                        Done / Close
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleQueueOptimization}
                        disabled={queueing || applyingLive}
                      >
                        {queueing ? 'Queueing...' : 'Queue into Recommendations'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleApplyLive}
                        disabled={applyingLive || queueing}
                        style={{
                          background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
                          border: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.45rem',
                        }}
                      >
                        <Zap size={14} />
                        {applyingLive ? 'Applying Live...' : 'Re-Deploy Live Now'}
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
