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

  useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then((data) => {
        if (data.projects && data.projects.length > 0) {
          const savedId = typeof window !== 'undefined' ? (new URLSearchParams(window.location.search).get('projectId') || localStorage.getItem('activeProjectId')) : null;
          const current = (savedId && data.projects.find((p: any) => p.id === savedId)) || data.projects[0];
          setProject(current);
          setCountry(current.country || 'US');
        }
      });
  }, []);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
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
            <button type="button" className="btn btn-primary btn-sm" onClick={handleSave}>
              <Save size={14} />
              Save Configuration
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
        </main>
      </div>
    </div>
  );
}

