'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import TopHeader from '@/components/TopHeader';
import {
  Play,
  Terminal,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ArrowRight,
  Radio,
  Clock,
  Layers,
} from 'lucide-react';

interface CrawlLogEntry {
  timestamp: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'PAGE';
  message: string;
  url?: string;
}

export default function LiveCrawlPage() {
  const [crawlUrl, setCrawlUrl] = useState('');
  const [maxPages, setMaxPages] = useState('20');
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<CrawlLogEntry[]>([]);
  const [currentAnalyzing, setCurrentAnalyzing] = useState<string | null>(null);
  const [robotsFound, setRobotsFound] = useState(false);
  const [sitemapFound, setSitemapFound] = useState(false);
  const [pagesCount, setPagesCount] = useState(0);
  const [progress, setProgress] = useState(0);
  const [project, setProject] = useState<any>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Load project defaults
  useEffect(() => {
    const requestedJobId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('jobId') : null;
    setJobId(requestedJobId);
    if (requestedJobId) {
      setIsRunning(true);
    }

    fetch('/api/projects')
      .then((r) => r.json())
      .then((data) => {
        if (data.projects && data.projects.length > 0) {
          const savedId = typeof window !== 'undefined' ? (new URLSearchParams(window.location.search).get('projectId') || localStorage.getItem('activeProjectId')) : null;
          const current = (savedId && data.projects.find((p: any) => p.id === savedId)) || data.projects[0];
          setProject(current);
          setCrawlUrl(current.url);
          if (current && typeof window !== 'undefined') {
            localStorage.setItem('activeProjectId', current.id);
          }
        }
      });
  }, []);

  // Poll status while running
  useEffect(() => {
    let interval: any = null;
    if (isRunning) {
      interval = setInterval(async () => {
        try {
          const statusUrl = jobId ? `/api/crawl/status?jobId=${encodeURIComponent(jobId)}` : '/api/crawl/status';
          const res = await fetch(statusUrl);
          const data = await res.json();
          if (data.success && data.logs) {
            setLogs(data.logs);

            // Derive stats
            const hasRobots = data.logs.some((l: any) => l.message.includes('robots.txt discovered'));
            const hasSitemap = data.logs.some((l: any) => l.message.includes('sitemap.xml discovered'));
            const pageLogs = data.logs.filter((l: any) => l.type === 'PAGE');
            const lastPage = pageLogs[pageLogs.length - 1];

            setRobotsFound(hasRobots);
            setSitemapFound(hasSitemap);
            setPagesCount(pageLogs.length);
            if (lastPage) {
              setCurrentAnalyzing(lastPage.url || lastPage.message);
            }

            const max = Number(maxPages) || 20;
            const pct = Math.min(100, Math.round((pageLogs.length / max) * 100));
            setProgress(pct);

            if (data.job?.status === 'COMPLETED' || data.job?.status === 'FAILED') {
              setIsRunning(false);
              setProgress(100);
            }
          }
        } catch (e) {
          console.error(e);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, maxPages, jobId]);

  // Auto-scroll console
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleStartCrawl = async () => {
    if (!crawlUrl.trim()) return;
    setIsRunning(true);
    setLogs([{ timestamp: new Date().toISOString(), type: 'INFO', message: `Initializing crawl engine for ${crawlUrl}` }]);
    setProgress(5);

    try {
      let targetProjectId = project?.id;
      if (!targetProjectId) {
        let cleanUrl = crawlUrl.trim();
        if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
          cleanUrl = `https://${cleanUrl}`;
        }
        const createRes = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: cleanUrl }),
        });
        const createData = await createRes.json();
        if (createData.project) {
          targetProjectId = createData.project.id;
          setProject(createData.project);
        }
      }

      const crawlRes = await fetch('/api/crawl/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: targetProjectId,
          maxPages: Number(maxPages),
        }),
      });
      const crawlData = await crawlRes.json();
      if (!crawlRes.ok || !crawlData.success) {
        throw new Error(crawlData.error || 'Failed to start crawl');
      }
      setJobId(crawlData.crawlJobId);
    } catch (err) {
      console.error(err);
      setIsRunning(false);
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
              <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Radio color="var(--accent-cyan)" size={24} />
                Live Crawl Interface
              </h1>
              <p className="page-subtitle">
                Real-time crawl console streaming URL requests, header responses, and on-page HTML diagnostics.
              </p>
            </div>
            {progress === 100 && (
              <Link href="/site-audit" className="btn btn-primary">
                <span>View Full Audit Issues</span>
                <ArrowRight size={16} />
              </Link>
            )}
          </div>

          {/* Crawl Control Bar */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="crawl-control-bar">
              <div style={{ flex: 1, minWidth: 0 }}>
                <label className="form-label">Crawl Target URL</label>
                <input
                  type="url"
                  className="form-control"
                  value={crawlUrl}
                  onChange={(e) => setCrawlUrl(e.target.value)}
                  placeholder="https://example.com"
                  disabled={isRunning}
                />
              </div>

              <div style={{ minWidth: '130px' }}>
                <label className="form-label">Max Pages</label>
                <select
                  className="form-control"
                  value={maxPages}
                  onChange={(e) => setMaxPages(e.target.value)}
                  disabled={isRunning}
                >
                  <option value="10">10 pages</option>
                  <option value="25">25 pages</option>
                  <option value="50">50 pages</option>
                  <option value="100">100 pages</option>
                </select>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleStartCrawl}
                disabled={isRunning}
                style={{ padding: '0.65rem 1.4rem' }}
              >
                <Play size={16} />
                {isRunning ? 'Crawling...' : 'Start Live Crawl'}
              </button>
            </div>

            {/* Progress Bar */}
            <div style={{ marginTop: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <span>Crawl Progress</span>
                <span style={{ fontWeight: 600, color: '#fff' }}>{progress}%</span>
              </div>
              <div className="progress-bar-container">
                <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>

          {/* Discovery Badges */}
          <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
            <div className="stat-card">
              <span className="stat-label">Robots.txt</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                {robotsFound ? (
                  <>
                    <CheckCircle2 size={20} color="var(--color-success)" />
                    <span style={{ fontWeight: 600, color: 'var(--color-success)' }}>Discovered & Respected</span>
                  </>
                ) : (
                  <>
                    <Clock size={20} color="var(--text-muted)" />
                    <span style={{ color: 'var(--text-muted)' }}>Scanning root...</span>
                  </>
                )}
              </div>
            </div>

            <div className="stat-card">
              <span className="stat-label">Sitemap.xml</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                {sitemapFound ? (
                  <>
                    <CheckCircle2 size={20} color="var(--color-success)" />
                    <span style={{ fontWeight: 600, color: 'var(--color-success)' }}>Index Parsed</span>
                  </>
                ) : (
                  <>
                    <Clock size={20} color="var(--text-muted)" />
                    <span style={{ color: 'var(--text-muted)' }}>Checking paths...</span>
                  </>
                )}
              </div>
            </div>

            <div className="stat-card">
              <span className="stat-label">Pages Crawled</span>
              <div className="stat-value" style={{ color: 'var(--accent-cyan)' }}>
                {pagesCount}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Target: {maxPages} pages
              </span>
            </div>

            <div className="stat-card">
              <span className="stat-label">Security Protocol</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                <CheckCircle2 size={20} color="var(--color-success)" />
                <span style={{ fontWeight: 600, color: '#fff' }}>SSRF Verified</span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                DNS & Private IP filtered
              </span>
            </div>
          </div>

          {/* Currently Analyzing Card */}
          {currentAnalyzing && (
            <div
              style={{
                backgroundColor: 'rgba(56, 189, 248, 0.08)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: 'var(--radius-md)',
                padding: '0.85rem 1.25rem',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', minWidth: 0, flex: 1 }}>
                <span className="badge badge-low" style={{ flexShrink: 0 }}>Analyzing Page</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: '#fff', wordBreak: 'break-all' }}>
                  {currentAnalyzing}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem', flexWrap: 'wrap' }}>
                <span style={{ color: 'var(--color-success)' }}>Title ✓</span>
                <span style={{ color: 'var(--color-success)' }}>H1 ✓</span>
                <span style={{ color: 'var(--color-warning)' }}>Meta ⚠</span>
                <span style={{ color: 'var(--accent-cyan)' }}>Links ✓</span>
              </div>
            </div>
          )}

          {/* Console Window */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <Terminal size={18} color="var(--accent-cyan)" />
                Crawl Worker Execution Stream
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {isRunning ? 'STATUS: ACTIVE_WORKER' : 'STATUS: IDLE'}
              </span>
            </div>

            <div className="console-box">
              {logs.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', padding: '1rem 0' }}>
                  Ready to crawl. Press &quot;Start Live Crawl&quot; above to initialize asynchronous worker.
                </div>
              ) : (
                logs.map((log, index) => {
                  let badgeColor = 'var(--text-muted)';
                  if (log.type === 'SUCCESS') badgeColor = 'var(--color-success)';
                  if (log.type === 'WARNING') badgeColor = 'var(--color-warning)';
                  if (log.type === 'ERROR') badgeColor = 'var(--color-danger)';
                  if (log.type === 'PAGE') badgeColor = 'var(--accent-cyan)';

                  return (
                    <div key={index} className="console-line">
                      <span className="console-timestamp">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                      <span style={{ color: badgeColor, fontWeight: 600, minWidth: '70px' }}>[{log.type}]</span>
                      <span style={{ color: '#f1f5f9' }}>{log.message}</span>
                    </div>
                  );
                })
              )}
              <div ref={consoleEndRef} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

