'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import TopHeader from '@/components/TopHeader';
import LoadingSpinner from '@/components/LoadingSpinner';
import AcquisitionWorkspaceBar from '@/components/AcquisitionWorkspaceBar';
import { Radar, Play, Pause, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';

export default function DiscoverBusinessesPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [name, setName] = useState('');
  const [targetIndustry, setTargetIndustry] = useState('');
  const [targetCountry, setTargetCountry] = useState('United Kingdom');
  const [targetCity, setTargetCity] = useState('');
  const [websiteCondition, setWebsiteCondition] = useState<'SEO_ISSUES' | 'ANY_WEBSITE' | 'NO_WEBSITE' | 'ALL'>('SEO_ISSUES');
  const [targetLeadCount, setTargetLeadCount] = useState(25);
  const [keywordsText, setKeywordsText] = useState('');

  const loadCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/acquisition/campaigns');
      const json = await res.json();
      if (json.success) {
        setCampaigns(json.campaigns || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCampaigns();
    const handler = () => loadCampaigns();
    window.addEventListener('acquisition-workspace-changed', handler);
    return () => window.removeEventListener('acquisition-workspace-changed', handler);
  }, [loadCampaigns]);

  const handleCreateAndRun = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    setSubmitting(true);
    try {
      const targetKeywords = keywordsText
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);

      const res = await fetch('/api/acquisition/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || `${targetIndustry} in ${targetCity || targetCountry}`,
          targetIndustry: targetIndustry.trim(),
          targetCountry: targetCountry.trim(),
          targetCity: targetCity.trim() || null,
          websiteCondition,
          targetLeadCount: Number(targetLeadCount) || 25,
          targetKeywords,
          autoStart: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setNotice({ type: 'error', text: json.error || 'Failed to launch discovery campaign.' });
      } else {
        const s = json.runSummary;
        setNotice({
          type: 'success',
          text: s
            ? `Discovery complete via ${s.provider}: ${s.discovered} new businesses found (${s.duplicatesSkipped} duplicates skipped), ${s.audited} websites audited, ${s.qualified} qualified leads.`
            : 'Campaign created successfully.',
        });
        setName('');
        setTargetIndustry('');
        setTargetCity('');
        setKeywordsText('');
        await loadCampaigns();
      }
    } catch (err: any) {
      setNotice({ type: 'error', text: err?.message || 'Discovery failed.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRunCampaign = async (id: string) => {
    setRunningId(id);
    setNotice(null);
    try {
      const res = await fetch(`/api/acquisition/campaigns/${id}/start`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) {
        setNotice({ type: 'error', text: json.error || 'Discovery run failed.' });
      } else {
        const r = json.result;
        setNotice({
          type: 'success',
          text: `Discovery finished (${r.provider}): +${r.discovered} leads, ${r.audited} audited, ${r.qualified} qualified.`,
        });
        await loadCampaigns();
      }
    } finally {
      setRunningId(null);
    }
  };

  const handlePauseCampaign = async (id: string) => {
    await fetch(`/api/acquisition/campaigns/${id}/pause`, { method: 'POST' });
    await loadCampaigns();
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-wrapper">
        <TopHeader />
        <main className="page-container">
          <div className="page-header">
            <div style={{ minWidth: 0 }}>
              <h1 className="page-title">Discover Businesses Worldwide</h1>
              <p className="page-subtitle">
                Automatically discover real businesses by industry and location, verify their websites, and run SSRF-safe SEO audits.
              </p>
            </div>
          </div>

          <AcquisitionWorkspaceBar onWorkspaceChanged={loadCampaigns} />

          {notice && (
            <div
              className="card"
              style={{
                marginBottom: '1rem',
                padding: '0.9rem 1.1rem',
                borderColor: notice.type === 'success' ? 'rgba(22,163,74,0.35)' : 'rgba(220,38,38,0.35)',
                background: notice.type === 'success' ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                {notice.type === 'success' ? <CheckCircle2 size={18} color="var(--color-success)" /> : <AlertTriangle size={18} color="var(--color-danger)" />}
                <span style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{notice.text}</span>
              </div>
              {notice.type === 'success' && (
                <Link href="/acquisition/leads" className="btn btn-primary btn-sm">
                  <span>View Discovered Leads</span>
                  <ArrowRight size={14} />
                </Link>
              )}
            </div>
          )}

          <form onSubmit={handleCreateAndRun} className="card" style={{ marginBottom: '1.5rem' }}>
            <h2 className="card-title" style={{ marginBottom: '1.15rem' }}>
              <Radar size={18} color="var(--accent-primary)" />
              <span>New Discovery Campaign</span>
            </h2>

            <div className="grid-3" style={{ marginBottom: '1rem' }}>
              <div>
                <label className="form-label">Campaign Name</label>
                <input
                  className="form-control"
                  type="text"
                  placeholder="e.g. London Dental Clinics Q4"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label">Business Industry *</label>
                <input
                  className="form-control"
                  type="text"
                  required
                  placeholder="e.g. Dental clinics, Restaurants, Auto repair"
                  value={targetIndustry}
                  onChange={(e) => setTargetIndustry(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label">Target Country *</label>
                <input
                  className="form-control"
                  type="text"
                  required
                  placeholder="e.g. United Kingdom, United States, Nigeria"
                  value={targetCountry}
                  onChange={(e) => setTargetCountry(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label">Target City (Optional)</label>
                <input
                  className="form-control"
                  type="text"
                  placeholder="e.g. London, Manchester, Austin, Lagos"
                  value={targetCity}
                  onChange={(e) => setTargetCity(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label">Target Website Condition</label>
                <select
                  className="form-control"
                  value={websiteCondition}
                  onChange={(e) => setWebsiteCondition(e.target.value as any)}
                >
                  <option value="SEO_ISSUES">Websites with SEO issues</option>
                  <option value="ANY_WEBSITE">Any verified business website</option>
                  <option value="ALL">All businesses (with or without website)</option>
                </select>
              </div>

              <div>
                <label className="form-label">Number of Prospects</label>
                <input
                  className="form-control"
                  type="number"
                  min={5}
                  max={100}
                  value={targetLeadCount}
                  onChange={(e) => setTargetLeadCount(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Optional Keywords (comma-separated)</label>
              <input
                className="form-control"
                type="text"
                placeholder="e.g. cosmetic dentistry, emergency dentist, implants"
                value={keywordsText}
                onChange={(e) => setKeywordsText(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Powered by AutoSEO&apos;s built-in Native Worldwide Discovery &amp; Web Vitals Engine (zero third-party API keys).
              </span>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                <Radar size={16} />
                <span>{submitting ? 'Discovering & Auditing...' : 'Start Discovery'}</span>
              </button>
            </div>
          </form>

          <div className="card">
            <h2 className="card-title" style={{ marginBottom: '1rem' }}>Discovery Campaigns</h2>
            {loading ? (
              <LoadingSpinner label="Loading campaigns..." />
            ) : campaigns.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem' }}>
                No campaigns created yet. Use the form above to discover prospects worldwide.
              </p>
            ) : (
              <div className="table-container" style={{ marginBottom: 0 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Campaign</th>
                      <th>Target Market</th>
                      <th>Discovered</th>
                      <th>Audited</th>
                      <th>Qualified</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{c.name}</div>
                          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{c.targetIndustry}</div>
                        </td>
                        <td>{[c.targetCity, c.targetCountry].filter(Boolean).join(', ')}</td>
                        <td>{c.discoveredCount}</td>
                        <td>{c.auditedCount}</td>
                        <td style={{ color: 'var(--color-success)', fontWeight: 700 }}>{c.qualifiedCount}</td>
                        <td><span className="badge badge-low">{c.status}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              disabled={runningId === c.id}
                              onClick={() => handleRunCampaign(c.id)}
                            >
                              <Play size={13} />
                              <span>{runningId === c.id ? 'Running...' : 'Run'}</span>
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => handlePauseCampaign(c.id)}
                              aria-label="Pause campaign"
                            >
                              <Pause size={13} />
                            </button>
                            <Link href={`/acquisition/leads?campaignId=${c.id}`} className="btn btn-secondary btn-sm">
                              Leads
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
