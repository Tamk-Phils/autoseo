'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import TopHeader from '@/components/TopHeader';
import LoadingSpinner from '@/components/LoadingSpinner';
import AcquisitionWorkspaceBar from '@/components/AcquisitionWorkspaceBar';
import {
  Radar,
  Globe,
  ShieldCheck,
  Target,
  Clock,
  Send,
  ThumbsUp,
  CheckCircle2,
  DollarSign,
  ArrowRight,
  Users,
} from 'lucide-react';

export default function AcquisitionOverviewPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/acquisition/analytics');
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Please sign in to access AI Acquisition.');
        setData(null);
      } else {
        setData(json);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load acquisition overview');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const handler = () => loadData();
    window.addEventListener('acquisition-workspace-changed', handler);
    return () => window.removeEventListener('acquisition-workspace-changed', handler);
  }, [loadData]);

  const kpis = data?.kpis || {};
  const pipeline = data?.pipelineBreakdown || {};

  const pipelineStages = [
    { key: 'DISCOVERED', label: '1. Discovered', color: '#0284c7' },
    { key: 'ANALYSED', label: '2. Analysed', color: '#4f46e5' },
    { key: 'QUALIFIED', label: '3. Qualified', color: '#7e22ce' },
    { key: 'CONTACT_APPROVED', label: '4. Approved', color: '#d97706' },
    { key: 'CONTACTED', label: '5. Contacted', color: '#ea580c' },
    { key: 'INTERESTED', label: '6. Interested', color: '#0891b2' },
    { key: 'CONVERTED', label: '7. Converted', color: '#16a34a' },
  ];

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-wrapper">
        <TopHeader />
        <main className="page-container">
          <div className="page-header">
            <div style={{ minWidth: 0 }}>
              <h1 className="page-title">AI Customer Acquisition Engine</h1>
              <p className="page-subtitle">
                Discover businesses worldwide, verify websites, run evidence-based SEO audits, qualify leads, and convert prospects.
              </p>
            </div>
            <Link href="/acquisition/discover" className="btn btn-primary" style={{ textDecoration: 'none' }}>
              <Radar size={16} />
              <span>New Discovery Campaign</span>
            </Link>
          </div>

          <AcquisitionWorkspaceBar onWorkspaceChanged={loadData} />

          {loading ? (
            <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
              <LoadingSpinner label="Loading AI Acquisition Engine..." />
            </div>
          ) : error ? (
            <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
              <p style={{ color: 'var(--color-danger)', marginBottom: '1rem' }}>{error}</p>
              <Link href="/login" className="btn btn-primary">Sign In</Link>
            </div>
          ) : (
            <>
              <div className="grid-4">
                {[
                  { label: 'Businesses Discovered', value: kpis.totalDiscovered ?? 0, icon: Radar, color: '#0284c7' },
                  { label: 'Verified Websites', value: kpis.verifiedWebsites ?? 0, icon: Globe, color: '#0891b2' },
                  { label: 'SEO Audits Completed', value: kpis.auditsCompleted ?? 0, icon: ShieldCheck, color: '#4f46e5' },
                  { label: 'Qualified Leads (60+)', value: kpis.qualifiedLeads ?? 0, icon: Target, color: '#7e22ce' },
                  { label: 'Pending Approvals', value: kpis.pendingApprovals ?? 0, icon: Clock, color: '#d97706' },
                  { label: 'Prospects Contacted', value: kpis.contactedLeads ?? 0, icon: Send, color: '#ea580c' },
                  { label: 'Interested Prospects', value: kpis.interestedLeads ?? 0, icon: ThumbsUp, color: '#16a34a' },
                  { label: 'Converted Customers', value: kpis.convertedLeads ?? 0, icon: CheckCircle2, color: '#16a34a' },
                  { label: 'Attributed Revenue', value: `$${kpis.totalRevenueUsd ?? 0}`, icon: DollarSign, color: '#16a34a' },
                ].map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <div key={stat.label} className="stat-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                        <span className="stat-label" style={{ marginBottom: 0 }}>{stat.label}</span>
                        <Icon size={18} color={stat.color} />
                      </div>
                      <div className="stat-value">{stat.value}</div>
                    </div>
                  );
                })}
              </div>

              <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-header">
                  <h2 className="card-title">7-Stage Acquisition Pipeline</h2>
                  <Link href="/acquisition/leads" style={{ fontSize: '0.84rem', color: 'var(--accent-primary)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span>Open Lead CRM</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 135px), 1fr))', gap: '0.75rem' }}>
                  {pipelineStages.map((s) => (
                    <Link
                      key={s.key}
                      href={`/acquisition/leads?status=${s.key}`}
                      style={{
                        padding: '0.85rem',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-color)',
                        borderTop: `3px solid ${s.color}`,
                        textDecoration: 'none',
                      }}
                    >
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>{s.label}</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {pipeline[s.key] ?? 0}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h2 className="card-title">Recent Discovery Campaigns</h2>
                  <Link href="/acquisition/discover" className="btn btn-secondary btn-sm">
                    Manage Campaigns
                  </Link>
                </div>

                {!data?.recentCampaigns || data.recentCampaigns.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Users size={32} style={{ margin: '0 auto 0.65rem', opacity: 0.5 }} />
                    <p style={{ marginBottom: '0.85rem' }}>No discovery campaigns yet in this workspace.</p>
                    <Link href="/acquisition/discover" className="btn btn-primary btn-sm">
                      Launch Your First Worldwide Search
                    </Link>
                  </div>
                ) : (
                  <div className="table-container" style={{ marginBottom: 0 }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Campaign</th>
                          <th>Industry</th>
                          <th>Location</th>
                          <th>Discovered</th>
                          <th>Audited</th>
                          <th>Qualified</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.recentCampaigns.map((c: any) => (
                          <tr key={c.id}>
                            <td style={{ fontWeight: 600 }}>{c.name}</td>
                            <td>{c.targetIndustry}</td>
                            <td>{[c.targetCity, c.targetCountry].filter(Boolean).join(', ')}</td>
                            <td>{c.discoveredCount}</td>
                            <td>{c.auditedCount}</td>
                            <td style={{ color: 'var(--color-success)', fontWeight: 700 }}>{c.qualifiedCount}</td>
                            <td><span className="badge badge-low">{c.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
