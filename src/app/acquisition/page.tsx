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
    { key: 'DISCOVERED', label: '1. Discovered', color: '#38bdf8' },
    { key: 'ANALYSED', label: '2. Analysed', color: '#818cf8' },
    { key: 'QUALIFIED', label: '3. Qualified', color: '#a855f7' },
    { key: 'CONTACT_APPROVED', label: '4. Contact Approved', color: '#f59e0b' },
    { key: 'CONTACTED', label: '5. Contacted', color: '#fb923c' },
    { key: 'INTERESTED', label: '6. Interested', color: '#22d3ee' },
    { key: 'CONVERTED', label: '7. Converted', color: '#10b981' },
  ];

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <TopHeader />
        <main className="page-container">
          <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 className="page-title">AI Customer Acquisition Engine</h1>
              <p className="page-subtitle">
                Discover businesses worldwide, verify websites, run evidence-based SEO audits, qualify leads, and convert prospects.
              </p>
            </div>
            <Link href="/acquisition/discover" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', textDecoration: 'none' }}>
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
              <p style={{ color: '#f87171', marginBottom: '1rem' }}>{error}</p>
              <Link href="/login" className="btn btn-primary">Sign In</Link>
            </div>
          ) : (
            <>
              {/* KPI Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                  gap: '1rem',
                  marginBottom: '1.5rem',
                }}
              >
                {[
                  { label: 'Businesses Discovered', value: kpis.totalDiscovered ?? 0, icon: Radar, color: '#38bdf8' },
                  { label: 'Verified Websites', value: kpis.verifiedWebsites ?? 0, icon: Globe, color: '#22d3ee' },
                  { label: 'SEO Audits Completed', value: kpis.auditsCompleted ?? 0, icon: ShieldCheck, color: '#818cf8' },
                  { label: 'Qualified Leads (60+)', value: kpis.qualifiedLeads ?? 0, icon: Target, color: '#a855f7' },
                  { label: 'Pending Approvals', value: kpis.pendingApprovals ?? 0, icon: Clock, color: '#f59e0b' },
                  { label: 'Prospects Contacted', value: kpis.contactedLeads ?? 0, icon: Send, color: '#fb923c' },
                  { label: 'Interested Prospects', value: kpis.interestedLeads ?? 0, icon: ThumbsUp, color: '#34d399' },
                  { label: 'Converted Customers', value: kpis.convertedLeads ?? 0, icon: CheckCircle2, color: '#10b981' },
                  { label: 'Attributed Revenue', value: `$${kpis.totalRevenueUsd ?? 0}`, icon: DollarSign, color: '#10b981' },
                ].map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <div key={stat.label} className="card" style={{ padding: '1.1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{stat.label}</span>
                        <Icon size={18} color={stat.color} />
                      </div>
                      <div style={{ fontSize: '1.65rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {stat.value}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 7-Stage Sales Pipeline */}
              <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h2 style={{ fontSize: '1.05rem', fontWeight: 700 }}>7-Stage Acquisition Pipeline</h2>
                  <Link href="/acquisition/leads" style={{ fontSize: '0.82rem', color: 'var(--accent-cyan)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none' }}>
                    <span>Open Lead CRM</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
                  {pipelineStages.map((s) => (
                    <Link
                      key={s.key}
                      href={`/acquisition/leads?status=${s.key}`}
                      style={{
                        padding: '0.85rem',
                        borderRadius: 'var(--radius-md)',
                        background: 'rgba(15, 23, 42, 0.65)',
                        border: '1px solid var(--border-color)',
                        borderTop: `3px solid ${s.color}`,
                        textDecoration: 'none',
                      }}
                    >
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>{s.label}</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {pipeline[s.key] ?? 0}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Recent Campaigns */}
              <div className="card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h2 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Recent Discovery Campaigns</h2>
                  <Link href="/acquisition/discover" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
                    Manage Campaigns
                  </Link>
                </div>

                {!data?.recentCampaigns || data.recentCampaigns.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Users size={32} style={{ margin: '0 auto 0.65rem', opacity: 0.5 }} />
                    <p style={{ marginBottom: '0.85rem' }}>No discovery campaigns yet in this workspace.</p>
                    <Link href="/acquisition/discover" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
                      Launch Your First Worldwide Search
                    </Link>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table" style={{ width: '100%' }}>
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
                            <td style={{ color: '#34d399', fontWeight: 600 }}>{c.qualifiedCount}</td>
                            <td>
                              <span className="badge">{c.status}</span>
                            </td>
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
