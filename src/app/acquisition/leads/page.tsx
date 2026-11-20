'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import TopHeader from '@/components/TopHeader';
import LoadingSpinner from '@/components/LoadingSpinner';
import AcquisitionWorkspaceBar from '@/components/AcquisitionWorkspaceBar';
import { Search, Download, Sparkles, ShieldCheck, ExternalLink, Plus } from 'lucide-react';

const STATUS_OPTIONS = [
  'ALL',
  'DISCOVERED',
  'ANALYSED',
  'QUALIFIED',
  'CONTACT_APPROVED',
  'CONTACTED',
  'INTERESTED',
  'CONVERTED',
  'REJECTED',
  'DISQUALIFIED',
  'LOST',
  'UNSUBSCRIBED',
];

export default function LeadDatabasePage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [busyLeadId, setBusyLeadId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [newBiz, setNewBiz] = useState({ businessName: '', websiteUrl: '', industry: '', country: '', city: '', publicEmail: '' });

  const loadLeads = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (priorityFilter !== 'ALL') params.set('priority', priorityFilter);

      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const cid = urlParams.get('campaignId');
        if (cid) params.set('campaignId', cid);
      }

      const res = await fetch(`/api/leads?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setLeads(json.leads || []);
      }
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, priorityFilter]);

  useEffect(() => {
    loadLeads();
    const handler = () => loadLeads();
    window.addEventListener('acquisition-workspace-changed', handler);
    return () => window.removeEventListener('acquisition-workspace-changed', handler);
  }, [loadLeads]);

  const handleAnalyse = async (id: string) => {
    setBusyLeadId(id);
    setNotice(null);
    try {
      const res = await fetch(`/api/leads/${id}/analyse`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) setNotice(json.error || 'Audit failed');
      else {
        setNotice(`SEO Audit & Opportunity Score updated for ${json.lead?.businessName}.`);
        await loadLeads();
      }
    } finally {
      setBusyLeadId(null);
    }
  };

  const handleProposal = async (id: string) => {
    setBusyLeadId(id);
    setNotice(null);
    try {
      const res = await fetch(`/api/leads/${id}/generate-proposal`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) setNotice(json.error || 'Proposal generation failed');
      else setNotice('Personalized AI proposal & outreach draft created in Outreach Centre (pending your approval).');
    } finally {
      setBusyLeadId(null);
    }
  };

  const handleExport = async () => {
    const res = await fetch('/api/leads/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: statusFilter, priority: priorityFilter }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setNotice(err.error || 'Export failed');
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `autoseo-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newBiz),
    });
    const json = await res.json();
    if (!res.ok) {
      setNotice(json.error || 'Could not add lead');
    } else {
      setShowAdd(false);
      setNewBiz({ businessName: '', websiteUrl: '', industry: '', country: '', city: '', publicEmail: '' });
      await loadLeads();
    }
  };

  const priorityColor = (p: string) =>
    p === 'A' ? '#10b981' : p === 'B' ? '#38bdf8' : p === 'C' ? '#f59e0b' : '#94a3b8';

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <TopHeader />
        <main className="page-container">
          <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 className="page-title">Lead Database CRM</h1>
              <p className="page-subtitle">
                Tenant-isolated prospect pipeline with verified websites, SEO scores, opportunity ratings, and outreach controls.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAdd(!showAdd)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <Plus size={14} />
                <span>Add Lead</span>
              </button>
              <button type="button" className="btn btn-primary btn-sm" onClick={handleExport} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <Download size={14} />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          <AcquisitionWorkspaceBar onWorkspaceChanged={loadLeads} />

          {notice && (
            <div className="card" style={{ marginBottom: '1rem', padding: '0.8rem 1rem', borderColor: 'rgba(56,189,248,0.4)' }}>
              <span style={{ fontSize: '0.86rem' }}>{notice}</span>
            </div>
          )}

          {showAdd && (
            <form onSubmit={handleManualAdd} className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem' }}>Add Prospect Manually</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                <input className="form-input" placeholder="Business Name *" required value={newBiz.businessName} onChange={(e) => setNewBiz({ ...newBiz, businessName: e.target.value })} />
                <input className="form-input" placeholder="Website URL" value={newBiz.websiteUrl} onChange={(e) => setNewBiz({ ...newBiz, websiteUrl: e.target.value })} />
                <input className="form-input" placeholder="Industry" value={newBiz.industry} onChange={(e) => setNewBiz({ ...newBiz, industry: e.target.value })} />
                <input className="form-input" placeholder="Country" value={newBiz.country} onChange={(e) => setNewBiz({ ...newBiz, country: e.target.value })} />
                <input className="form-input" placeholder="City" value={newBiz.city} onChange={(e) => setNewBiz({ ...newBiz, city: e.target.value })} />
                <input className="form-input" placeholder="Public Email" type="email" value={newBiz.publicEmail} onChange={(e) => setNewBiz({ ...newBiz, publicEmail: e.target.value })} />
              </div>
              <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Save Prospect</button>
              </div>
            </form>
          )}

          {/* Search & Filters */}
          <div className="card" style={{ marginBottom: '1rem', padding: '0.9rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: '1 1 240px' }}>
              <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="form-input"
                style={{ paddingLeft: '2.2rem' }}
                placeholder="Search business, website, city, industry..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select className="form-input" style={{ width: 'auto' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s === 'ALL' ? 'All Pipeline Stages' : s}</option>
              ))}
            </select>
            <select className="form-input" style={{ width: 'auto' }} value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
              <option value="ALL">All Priorities</option>
              <option value="A">Priority A (80–100)</option>
              <option value="B">Priority B (60–79)</option>
              <option value="C">Priority C (40–59)</option>
              <option value="LOW">Low Priority (0–39)</option>
            </select>
          </div>

          <div className="card" style={{ padding: '1rem' }}>
            {loading ? (
              <LoadingSpinner label="Loading Lead CRM..." />
            ) : leads.length === 0 ? (
              <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <p style={{ marginBottom: '0.8rem' }}>No matching leads found in this workspace.</p>
                <Link href="/acquisition/discover" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
                  Discover Businesses
                </Link>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Business</th>
                      <th>Website</th>
                      <th>Industry / Location</th>
                      <th>SEO Score</th>
                      <th>Opportunity</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((l) => (
                      <tr key={l.id}>
                        <td>
                          <Link href={`/acquisition/leads/${l.id}`} style={{ fontWeight: 600, color: 'var(--text-primary)', textDecoration: 'none' }}>
                            {l.businessName}
                          </Link>
                          <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                            {l.publicEmail || l.publicPhone || 'No public contact yet'}
                          </div>
                        </td>
                        <td>
                          {l.websiteUrl ? (
                            <a href={l.websiteUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-cyan)', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                              <span>{l.normalizedDomain || l.websiteUrl}</span>
                              <ExternalLink size={12} />
                            </a>
                          ) : (
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Unverified</span>
                          )}
                        </td>
                        <td>
                          <div style={{ fontSize: '0.84rem' }}>{l.industry || '—'}</div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                            {[l.city, l.country].filter(Boolean).join(', ') || '—'}
                          </div>
                        </td>
                        <td>
                          {l.seoScore !== null && l.seoScore !== undefined ? (
                            <strong style={{ color: l.seoScore < 60 ? '#f87171' : l.seoScore < 80 ? '#f59e0b' : '#34d399' }}>
                              {l.seoScore}/100
                            </strong>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Not audited</span>
                          )}
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: priorityColor(l.priority) }}>
                            {l.opportunityScore ?? '—'}/100 ({l.priority})
                          </span>
                        </td>
                        <td>
                          <span className="badge">{l.status}</span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                            <Link href={`/acquisition/leads/${l.id}`} className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
                              Profile
                            </Link>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              disabled={busyLeadId === l.id}
                              onClick={() => handleAnalyse(l.id)}
                              title="Run SSRF-safe SEO Audit & Score"
                            >
                              <ShieldCheck size={13} />
                            </button>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              disabled={busyLeadId === l.id || l.isOptedOut}
                              onClick={() => handleProposal(l.id)}
                              title="Generate AI Sales Proposal Draft"
                            >
                              <Sparkles size={13} />
                            </button>
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
