'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import TopHeader from '@/components/TopHeader';
import LoadingSpinner from '@/components/LoadingSpinner';
import AcquisitionWorkspaceBar from '@/components/AcquisitionWorkspaceBar';

export default function AcquisitionAnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/acquisition/analytics');
      const json = await res.json();
      if (json.success) setData(json);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
    const handler = () => loadAnalytics();
    window.addEventListener('acquisition-workspace-changed', handler);
    return () => window.removeEventListener('acquisition-workspace-changed', handler);
  }, [loadAnalytics]);

  const rates = data?.rates || {};
  const kpis = data?.kpis || {};
  const usage = data?.usage || {};
  const limits = data?.limits || {};

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-wrapper">
        <TopHeader />
        <main className="page-container">
          <div className="page-header">
            <div style={{ minWidth: 0 }}>
              <h1 className="page-title">Acquisition Analytics &amp; Usage</h1>
              <p className="page-subtitle">
                Verified funnel conversion rates, AI operational costs, revenue attribution, and plan credit utilization.
              </p>
            </div>
          </div>

          <AcquisitionWorkspaceBar onWorkspaceChanged={loadAnalytics} />

          {loading ? (
            <div className="card" style={{ padding: '2.5rem', textAlign: 'center' }}>
              <LoadingSpinner label="Computing acquisition analytics..." />
            </div>
          ) : !data ? (
            <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>Sign in to view analytics.</div>
          ) : (
            <>
              <div className="grid-4">
                {[
                  { label: 'Website Verification Rate', value: `${rates.websiteVerificationRate ?? 0}%` },
                  { label: 'Audit Completion Rate', value: `${rates.auditCompletionRate ?? 0}%` },
                  { label: 'Qualified Lead Rate', value: `${rates.qualificationRate ?? 0}%` },
                  { label: 'Outreach Response Rate', value: `${rates.outreachResponseRate ?? 0}%` },
                  { label: 'Positive Response Rate', value: `${rates.positiveResponseRate ?? 0}%` },
                  { label: 'Lead → Customer Rate', value: `${rates.leadToCustomerConversionRate ?? 0}%` },
                  { label: 'Est. Cost / Qualified Lead', value: `$${rates.costPerQualifiedLeadUsd ?? 0}` },
                  { label: 'Attributed Revenue', value: `$${kpis.totalRevenueUsd ?? 0}` },
                ].map((m) => (
                  <div key={m.label} className="stat-card">
                    <div className="stat-label">{m.label}</div>
                    <div className="stat-value">{m.value}</div>
                  </div>
                ))}
              </div>

              <div className="grid-2">
                <div className="card">
                  <h2 className="card-title" style={{ marginBottom: '0.85rem' }}>Leads by Country</h2>
                  {data.byCountry?.length === 0 ? (
                    <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>No geographic data yet.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                      {data.byCountry?.slice(0, 8).map((c: any) => (
                        <div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', paddingBottom: '0.4rem', borderBottom: '1px solid var(--border-color)' }}>
                          <span>{c.name}</span>
                          <strong>{c.count}</strong>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="card">
                  <h2 className="card-title" style={{ marginBottom: '0.85rem' }}>Leads by Industry</h2>
                  {data.byIndustry?.length === 0 ? (
                    <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>No industry data yet.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                      {data.byIndustry?.slice(0, 8).map((c: any) => (
                        <div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', paddingBottom: '0.4rem', borderBottom: '1px solid var(--border-color)' }}>
                          <span>{c.name}</span>
                          <strong>{c.count}</strong>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="card">
                <h2 className="card-title" style={{ marginBottom: '0.85rem' }}>
                  Monthly Usage &amp; Credit Accounting ({data.workspace?.plan})
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 170px), 1fr))', gap: '0.85rem', fontSize: '0.88rem' }}>
                  <div>Discovery Credits: <strong>{usage.DISCOVERY ?? 0} / {limits.discoveryCreditsPerMonth ?? 50}</strong></div>
                  <div>Prospect Audits: <strong>{usage.AUDIT ?? 0} / {limits.auditsPerMonth ?? 25}</strong></div>
                  <div>AI Proposals: <strong>{usage.PROPOSAL ?? 0} / {limits.proposalsPerMonth ?? 10}</strong></div>
                  <div>Outreach Sends: <strong>{usage.OUTREACH ?? 0} / {limits.outreachPerMonth ?? 25}</strong></div>
                  <div>Est. AI Spend: <strong>${usage.totalEstimatedCostUsd ?? 0}</strong></div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
