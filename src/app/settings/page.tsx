'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import TopHeader from '@/components/TopHeader';
import {
  Settings,
  Save,
  CheckCircle2,
  Globe,
  Sliders,
  ShieldCheck,
  Cpu,
} from 'lucide-react';

export default function SettingsPage() {
  const [project, setProject] = useState<any>(null);
  const [maxPages, setMaxPages] = useState('30');
  const [crawlDepth, setCrawlDepth] = useState('3');
  const [country, setCountry] = useState('US');
  const [languages, setLanguages] = useState('en, fr');
  const [userAgent, setUserAgent] = useState('ApexSEO-Bot/1.0 (+https://apexseo.engine/bot)');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then((data) => {
        if (data.projects && data.projects.length > 0) {
          const savedId = typeof window !== 'undefined' ? (new URLSearchParams(window.location.search).get('projectId') || localStorage.getItem('activeProjectId')) : null;
          const current = (savedId && data.projects.find((p: any) => p.id === savedId)) || data.projects[0];
          setProject(current);
          setCountry(current.country || 'US');
          setMaxPages(String(current.crawlMaxPages || 30));
          setCrawlDepth(String(current.crawlMaxDepth || 3));
          setLanguages(current.targetLanguages ? current.targetLanguages.replace(/[\[\]"]+/g, '') : 'en, fr');
          setUserAgent(current.crawlerUserAgent || userAgent);
        }
      })
      .catch(() => setError('Unable to load project settings.'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!project) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/projects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id, maxPages, crawlDepth, userAgent, country, languages }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Unable to save settings');
      setProject(data.project);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Unable to save settings');
    } finally {
      setSaving(false);
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
                <Settings color="var(--accent-cyan)" size={24} />
                Project & Crawler Configuration
              </h1>
              <p className="page-subtitle">
                Manage crawler execution parameters, localized target markets, and security boundaries.
              </p>
            </div>
            <button type="button" className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving || loading || !project}>
              {saving ? <Save size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>

          {saved && (
            <div
              style={{
                padding: '0.85rem 1.25rem',
                backgroundColor: 'var(--color-success-bg)',
                border: '1px solid var(--color-success)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-success)',
                fontSize: '0.88rem',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <CheckCircle2 size={16} />
              <span>Project settings successfully persisted!</span>
            </div>
          )}
          {error && <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>{error}</div>}

          {loading ? (
            <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Cpu size={22} className="animate-spin" /> Loading project settings...
            </div>
          ) : (
          <>

          <div className="grid-2">
            {/* Crawler Settings */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">
                  <Sliders size={18} color="var(--accent-cyan)" />
                  Crawler Parameters
                </h3>
              </div>

              <div className="form-group">
                <label className="form-label">Default Max Pages per Crawl</label>
                <input
                  type="number"
                  className="form-control"
                  value={maxPages}
                  onChange={(e) => setMaxPages(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Maximum Link Depth</label>
                <input
                  type="number"
                  className="form-control"
                  value={crawlDepth}
                  onChange={(e) => setCrawlDepth(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Crawler User-Agent String</label>
                <input
                  type="text"
                  className="form-control"
                  value={userAgent}
                  onChange={(e) => setUserAgent(e.target.value)}
                />
              </div>
            </div>

            {/* Localization Settings (Section 25: Local & Multilingual SEO) */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">
                  <Globe size={18} color="var(--accent-cyan)" />
                  Target Market & Localization
                </h3>
              </div>

              <div className="form-group">
                <label className="form-label">Primary Target Country</label>
                <select className="form-control" value={country} onChange={(e) => setCountry(e.target.value)}>
                  <option value="US">United States</option>
                  <option value="CM">Cameroon</option>
                  <option value="GB">United Kingdom</option>
                  <option value="FR">France</option>
                  <option value="DE">Germany</option>
                  <option value="NG">Nigeria</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Target Languages (Comma separated)</label>
                <input
                  type="text"
                  className="form-control"
                  value={languages}
                  onChange={(e) => setLanguages(e.target.value)}
                  placeholder="e.g. en, fr"
                />
              </div>

              <div className="form-group">
                <label className="form-label">SSRF Protection Filter</label>
                <div style={{ background: 'var(--bg-input)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldCheck size={16} />
                  <span>Active: DNS resolved IP verification strictly blocks loopback and private networks.</span>
                </div>
              </div>
            </div>
          </div>
          </>
          )}
        </main>
      </div>
    </div>
  );
}

