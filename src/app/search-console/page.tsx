'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import TopHeader from '@/components/TopHeader';
import {
  BarChart3,
  ExternalLink,
  Layers,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Lock,
  ArrowRight,
} from 'lucide-react';

export default function SearchConsolePage() {
  const [project, setProject] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [queries, setQueries] = useState<any[]>([]);
  const [csv, setCsv] = useState('');
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then((data) => {
        if (data.projects && data.projects.length > 0) {
          const savedId = typeof window !== 'undefined' ? (new URLSearchParams(window.location.search).get('projectId') || localStorage.getItem('activeProjectId')) : null;
          const current = (savedId && data.projects.find((p: any) => p.id === savedId)) || data.projects[0];
          setProject(current);
          fetch(`/api/search-console/import?projectId=${encodeURIComponent(current.id)}`)
            .then((response) => response.json())
            .then((connection) => setIsConnected(Boolean(connection.connected)))
            .catch(() => {});
        }
      });
  }, []);

  const handleImport = async () => {
    if (!project || !csv.trim()) return;
    setImporting(true);
    setMessage(null);
    try {
      const res = await fetch('/api/search-console/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id, csv }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Import failed');
      setIsConnected(true);
      setMessage(`Imported ${data.imported} verified Search Console queries.`);
      setCsv('');
    } catch (error: any) {
      setMessage(error.message || 'Import failed');
    } finally {
      setImporting(false);
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
                <BarChart3 color="var(--accent-cyan)" size={24} />
                Google Search Console Integration
              </h1>
              <p className="page-subtitle">
                Authentic performance metrics synchronized via Google Search Console OAuth (Clicks, Impressions, Average Position, and CTR).
              </p>
            </div>
            {isConnected ? (
              <span className="badge badge-success">Property Connected</span>
            ) : (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => document.getElementById('search-console-csv')?.click()}
                disabled={connecting || importing}
              >
                {connecting ? 'Authenticating OAuth...' : 'Connect Search Console'}
              </button>
            )}
          </div>

          {!isConnected ? (
            /* Unconnected State (Section 48: Strict "Integration not connected") */
            <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'rgba(56, 189, 248, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.25rem',
                  color: 'var(--accent-cyan)',
                }}
              >
                <BarChart3 size={28} />
              </div>

              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                Integration Not Connected
              </h2>

              <p style={{ color: 'var(--text-secondary)', maxWidth: '520px', margin: '0 auto 1.75rem', fontSize: '0.92rem', lineHeight: 1.6 }}>
                Connect your verified Google Search Console property to unlock live impressions, organic query rankings, CTR decay monitoring, and opportunity detection.
              </p>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => document.getElementById('search-console-csv')?.click()}
                disabled={connecting || importing}
                style={{ padding: '0.75rem 1.6rem' }}
              >
                {importing ? 'Importing...' : 'Import Search Console CSV'}
                <ArrowRight size={16} />
              </button>

              <div style={{ marginTop: '2rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Export the Queries report from Google Search Console and import it here. Metrics appear only from that verified export.
              </div>
              <input id="search-console-csv" type="file" accept=".csv,text/csv" hidden onChange={async (event) => { const file = event.target.files?.[0]; if (file) setCsv(await file.text()); }} />
              {csv && <button type="button" className="btn btn-primary" onClick={handleImport} disabled={importing}>{importing ? 'Importing...' : 'Import Selected CSV'}</button>}
              {message && <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>{message}</p>}
            </div>
          ) : (
            /* Connected State */
            <div>
              <div className="card" style={{ textAlign: 'center', padding: '3.5rem 2rem' }}>
                <CheckCircle2 size={40} color="var(--color-success)" style={{ margin: '0 auto 1rem' }} />
                <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                  Google Search Console Connected
                </h3>
                <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto 1.5rem', fontSize: '0.9rem' }}>
                  Property synchronization active for <strong style={{ color: 'var(--text-primary)' }}>{project?.domain || 'website'}</strong>. Imported data is stored as a verified snapshot.
                </p>
                <div style={{ display: 'inline-flex', padding: '0.4rem 0.85rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Search Console provides position, clicks, impressions, and CTR. Search volume and keyword difficulty require a separate SEO provider.
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
