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
    p === 'A' ? 'var(--color-success)' : p === 'B' ? 'var(--accent-primary)' : p === 'C' ? 'var(--color-warning)' : 'var(--text-muted)';

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-wrapper">
        <TopHeader />
        <main className="page-container">
          <div className="page-header">
            <div style={{ minWidth: 0 }}>
              <h1 className="page-title">Lead Database CRM</h1>
              <p className="page-subtitle">
                Tenant-isolated prospect pipeline with verified websites, SEO scores, opportunity ratings, and outreach controls.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAdd(!showAdd)}>
                <Plus size={14} />
                <span>Add Lead</span>
              </button>
              <button type="button" className="btn btn-primary btn-sm" onClick={handleExport}>
                <Download size={14} />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          <AcquisitionWorkspaceBar onWorkspaceChanged={loadLeads} />

          {notice && (
            <div className="card" style={{ marginBottom: '1rem', padding: '0.8rem 1rem', borderColor: 'rgba(37,99,235,0.35)', background: 'var(--color-info-bg)' }}>
              <span style={{ fontSize: '0.86rem', color: 'var(--text-primary)' }}>{notice}</span>
            </div>
          )}

          {showAdd && (
            <form onSubmit={handleManualAdd} className="card" style={{ marginBottom: '1rem' }}>
              <h3 className="card-title" style={{ marginBottom: '0.85rem' }}>Add Prospect Manually</h3>
              <div className="grid-3" style={{ marginBottom: '0.85rem' }}>
                <input className="form-control" placeholder="Business Name *" required value={newBiz.businessName} onChange={(e) => setNewBiz({ ...newBiz, businessName: e.target.value })} />
                <input className="form-control" placeholder="Website URL" value={newBiz.websiteUrl} onChange={(e) => setNewBiz({ ...newBiz, websiteUrl: e.target.value })} />
                <input className="form-control" placeholder="Industry" value={newBiz.industry} onChange={(e) => setNewBiz({ ...newBiz, industry: e.target.value })} />
                <input className="form-control" placeholder="Country" value={newBiz.country} onChange={(e) => setNewBiz({ ...newBiz, country: e.target.value })} />
                <input className="form-control" placeholder="City" value={newBiz.city} onChange={(e) => setNewBiz({ ...newBiz, city: e.target.value })} />
                <input className="form-control" placeholder="Public Email" type="email" value={newBiz.publicEmail} onChange={(e) => setNewBiz({ ...newBiz, publicEmail: e.target.value })} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAdd(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Save Prospect</button>
              </div>
            </form>
          )}

          <div className="card" style={{ marginBottom: '1rem', padding: '0.9rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 0 }}>
              <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="form-control"
                style={{ paddingLeft: '2.25rem' }}
                placeholder="Search business, website, city, industry..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select className="form-control" style={{ flex: '0 1 190px' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s === 'ALL' ? 'All Pipeline Stages' : s}</option>
              ))}
            </select>
            <select className="form-control" style={{ flex: '0 1 180px' }} value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
              <option value="ALL">All Priorities</option>
              <option value="A">Priority A (80–100)</option>
              <option value="B">Priority B (60–79)</option>
              <option value="C">Priority C (40–59)</option>
              <option value="LOW">Low Priority (0–39)</option>
            </select>
          </div>

          <div className="card" style={{ padding: 0 }}>
            {loading ? (
              <div style={{ padding: '2.5rem', textAlign: 'center' }}>
                <LoadingSpinner label="Loading Lead CRM..." />
              </div>
            ) : leads.length === 0 ? (
              <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <p style={{ marginBottom: '0.8rem' }}>No matching leads found in this workspace.</p>
                <Link href="/acquisition/discover" className="btn btn-primary btn-sm">
                  Discover Businesses
                </Link>
              </div>
            ) : (
              <div className="table-container" style={{ marginBottom: 0, border: 'none', boxShadow: 'none' }}>
                <table className="data-table">
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
                          <Link href={`/acquisition/leads/${l.id}`} style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {l.businessName}
                          </Link>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {l.publicEmail || l.publicPhone || 'No public contact yet'}
                          </div>
                        </td>
                        <td>
                          {l.websiteUrl ? (
                            <a href={l.websiteUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-primary)', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                              <span>{l.normalizedDomain || l.websiteUrl}</span>
                              <ExternalLink size={12} />
                            </a>
                          ) : (
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Unverified</span>
                          )}
                        </td>
                        <td>
                          <div style={{ fontSize: '0.84rem' }}>{l.industry || '—'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {[l.city, l.country].filter(Boolean).join(', ') || '—'}
                          </div>
                        </td>
                        <td>
                          {l.seoScore !== null && l.seoScore !== undefined ? (
                            <strong style={{ color: l.seoScore < 60 ? 'var(--color-danger)' : l.seoScore < 80 ? 'var(--color-warning)' : 'var(--color-success)' }}>
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
                        <td><span className="badge badge-low">{l.status}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                            <Link href={`/acquisition/leads/${l.id}`} className="btn btn-secondary btn-sm">
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
