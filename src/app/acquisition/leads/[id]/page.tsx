'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import TopHeader from '@/components/TopHeader';
import LoadingSpinner from '@/components/LoadingSpinner';
import AcquisitionWorkspaceBar from '@/components/AcquisitionWorkspaceBar';
import {
  ArrowLeft,
  ShieldCheck,
  Sparkles,
  Rocket,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  MessageSquarePlus,
} from 'lucide-react';

const STATUS_LIST = [
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

function safeJsonParse<T>(str: string | null | undefined, fallback: T): T {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

export default function LeadDetailPage() {
  const params = useParams();
  const leadId = String(params?.id || '');
  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [convertRevenue, setConvertRevenue] = useState('99');

  const loadLead = useCallback(async () => {
    if (!leadId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/leads/${leadId}`);
      const json = await res.json();
      if (json.success) setLead(json.lead);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    loadLead();
  }, [loadLead]);

  const handleStatusChange = async (newStatus: string) => {
    setBusyAction('status');
    try {
      await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      await loadLead();
    } finally {
      setBusyAction(null);
    }
  };

  const handleRunAudit = async () => {
    setBusyAction('audit');
    setNotice(null);
    try {
      const res = await fetch(`/api/leads/${leadId}/analyse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok) setNotice(json.error || 'Audit failed');
      else {
        setNotice('Live SSRF-safe SEO & Web Vitals audit and opportunity score updated.');
        await loadLead();
      }
    } finally {
      setBusyAction(null);
    }
  };

  const handleGenerateProposal = async () => {
    setBusyAction('proposal');
    setNotice(null);
    try {
      const res = await fetch(`/api/leads/${leadId}/generate-proposal`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) setNotice(json.error || 'Proposal failed');
      else {
        setNotice('Personalized AI proposal draft created (awaiting human approval in Outreach Centre).');
        await loadLead();
      }
    } finally {
      setBusyAction(null);
    }
  };

  const handleConvert = async () => {
    setBusyAction('convert');
    setNotice(null);
    try {
      const res = await fetch(`/api/leads/${leadId}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          revenueAmount: Number(convertRevenue) || 0,
          currency: 'USD',
          launchSeoProject: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) setNotice(json.error || 'Conversion failed');
      else {
        setNotice(
          json.project
            ? `Converted! Autonomous AutoSEO project created for ${json.project.domain}.`
            : 'Lead converted and revenue recorded!'
        );
        await loadLead();
      }
    } finally {
      setBusyAction(null);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    setBusyAction('note');
    try {
      await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: noteText.trim() }),
      });
      setNoteText('');
      await loadLead();
    } finally {
      setBusyAction(null);
    }
  };

  const latestAudit = lead?.audits?.[0];
  const latestScore = lead?.scores?.[0];
  const auditIssues = safeJsonParse<any[]>(latestAudit?.issues, []);
  const measuredFacts = safeJsonParse<string[]>(latestAudit?.measuredFacts, []);
  const inferredInsights = safeJsonParse<string[]>(latestAudit?.inferredInsights, []);
  const unavailableData = safeJsonParse<string[]>(latestAudit?.unavailableData, []);
  const scoreReasons = safeJsonParse<string[]>(latestScore?.reasons, []);
  const scoreServices = safeJsonParse<string[]>(latestScore?.recommendedServices, []);
  const missingInfo = safeJsonParse<string[]>(latestScore?.missingInfo, []);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-wrapper">
        <TopHeader />
        <main className="page-container">
          <div style={{ marginBottom: '0.85rem' }}>
            <Link href="/acquisition/leads" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--accent-primary)', fontWeight: 600, fontSize: '0.86rem' }}>
              <ArrowLeft size={15} />
              <span>Back to Lead Database</span>
            </Link>
          </div>

          <AcquisitionWorkspaceBar />

          {notice && (
            <div className="card" style={{ marginBottom: '1rem', padding: '0.85rem 1rem', borderColor: 'rgba(37,99,235,0.35)', background: 'var(--color-info-bg)' }}>
              {notice}
            </div>
          )}

          {loading ? (
            <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
              <LoadingSpinner label="Loading prospect intelligence..." />
            </div>
          ) : !lead ? (
            <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>Lead not found in this workspace.</div>
          ) : (
            <>
              <div className="card" style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ minWidth: 0 }}>
                    <h1 className="page-title" style={{ marginBottom: '0.35rem' }}>{lead.businessName}</h1>
                    <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
                      <span>{lead.industry || 'General'}</span>
                      <span>•</span>
                      <span>{[lead.city, lead.country].filter(Boolean).join(', ') || 'Global'}</span>
                      {lead.websiteUrl && (
                        <>
                          <span>•</span>
                          <a href={lead.websiteUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-primary)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', wordBreak: 'break-all' }}>
                            <span>{lead.websiteUrl}</span>
                            <ExternalLink size={13} />
                          </a>
                        </>
                      )}
                    </div>
                    <div style={{ marginTop: '0.5rem', fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', gap: '0.85rem', flexWrap: 'wrap' }}>
                      <span>Email: <strong style={{ color: 'var(--text-primary)' }}>{lead.publicEmail || 'Not found'}</strong></span>
                      <span>Phone: <strong style={{ color: 'var(--text-primary)' }}>{lead.publicPhone || 'Not found'}</strong></span>
                      <span>Source: <strong style={{ color: 'var(--text-primary)' }}>{lead.discoverySource}</strong></span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <select
                      className="form-control"
                      style={{ width: 'auto', minWidth: '150px' }}
                      value={lead.status}
                      disabled={busyAction === 'status'}
                      onChange={(e) => handleStatusChange(e.target.value)}
                    >
                      {STATUS_LIST.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <button type="button" className="btn btn-secondary btn-sm" disabled={busyAction === 'audit'} onClick={handleRunAudit}>
                      <ShieldCheck size={14} /> {busyAction === 'audit' ? 'Auditing...' : 'Run SEO Audit'}
                    </button>
                    <button type="button" className="btn btn-primary btn-sm" disabled={busyAction === 'proposal' || lead.isOptedOut} onClick={handleGenerateProposal}>
                      <Sparkles size={14} /> {busyAction === 'proposal' ? 'Drafting...' : 'Generate AI Proposal'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="card" style={{ marginBottom: '1.25rem', borderColor: 'rgba(22,163,74,0.35)', background: 'var(--color-success-bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Rocket size={16} />
                    <span>AutoSEO Growth Loop — Convert Prospect to Live SEO Campaign</span>
                  </div>
                  <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    Record conversion revenue and automatically launch an autonomous AutoSEO optimization project for this customer.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    className="form-control"
                    type="number"
                    min={0}
                    style={{ width: '110px' }}
                    value={convertRevenue}
                    onChange={(e) => setConvertRevenue(e.target.value)}
                    placeholder="USD"
                  />
                  <button type="button" className="btn btn-success btn-sm" disabled={busyAction === 'convert'} onClick={handleConvert}>
                    {lead.status === 'CONVERTED' ? 'Converted ✓' : busyAction === 'convert' ? 'Converting...' : 'Convert & Start SEO'}
                  </button>
                </div>
              </div>

              <div className="grid-2" style={{ marginBottom: '1.25rem' }}>
                <div className="card">
                  <h2 className="card-title" style={{ marginBottom: '0.85rem' }}>
                    Deterministic Opportunity Score ({latestScore?.version || 'v1.0'})
                  </h2>
                  <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--accent-primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span>{lead.opportunityScore ?? '—'} / 100</span>
                    <span className="badge badge-low">Priority {lead.priority}</span>
                  </div>

                  {latestScore && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: '0.5rem', fontSize: '0.83rem', marginBottom: '1rem', padding: '0.75rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)' }}>
                      <div>SEO Opportunity: <strong>{latestScore.seoOpportunityPts}/30</strong></div>
                      <div>Website Quality: <strong>{latestScore.websiteQualityPts}/20</strong></div>
                      <div>Commercial: <strong>{latestScore.commercialRelevancePts}/20</strong></div>
                      <div>Competition: <strong>{latestScore.competitionPts}/15</strong></div>
                      <div>Completeness: <strong>{latestScore.completenessPts}/10</strong></div>
                      <div>Contactability: <strong>{latestScore.contactabilityPts}/5</strong></div>
                    </div>
                  )}

                  {scoreReasons.length > 0 && (
                    <div style={{ marginBottom: '0.85rem' }}>
                      <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>QUALIFICATION REASONS</div>
                      <ul style={{ paddingLeft: '1.1rem', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                        {scoreReasons.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    </div>
                  )}

                  {scoreServices.length > 0 && (
                    <div style={{ marginBottom: '0.85rem' }}>
                      <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>RECOMMENDED SERVICES</div>
                      <ul style={{ paddingLeft: '1.1rem', fontSize: '0.84rem', color: 'var(--color-success)' }}>
                        {scoreServices.map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                  )}

                  {missingInfo.length > 0 && (
                    <div>
                      <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>UNKNOWN / MISSING INFO</div>
                      <ul style={{ paddingLeft: '1.1rem', fontSize: '0.82rem', color: 'var(--color-warning)' }}>
                        {missingInfo.map((m, i) => <li key={i}>{m}</li>)}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="card">
                  <h2 className="card-title" style={{ marginBottom: '0.85rem' }}>
                    Website Intelligence &amp; Native Web Vitals
                  </h2>
                  {!latestAudit ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem' }}>
                      No SEO audit recorded yet. Click <strong>Run SEO Audit</strong> above to analyse the live website safely.
                    </p>
                  ) : (
                    <>
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.9rem', fontSize: '0.83rem', padding: '0.65rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)' }}>
                        <span>Overall: <strong>{latestAudit.seoScore}/100</strong></span>
                        <span>Technical: <strong>{latestAudit.technicalScore}</strong></span>
                        <span>On-Page: <strong>{latestAudit.onPageScore}</strong></span>
                        <span>Perf: <strong>{latestAudit.performanceScore}</strong></span>
                        <span>Schema: <strong>{latestAudit.structuredDataScore}</strong></span>
                      </div>

                      <div style={{ marginBottom: '0.85rem' }}>
                        <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--color-success)', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <CheckCircle2 size={13} /> DIRECTLY MEASURED FACTS
                        </div>
                        <ul style={{ paddingLeft: '1.1rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          {measuredFacts.map((f, i) => <li key={i}>{f}</li>)}
                        </ul>
                      </div>

                      {inferredInsights.length > 0 && (
                        <div style={{ marginBottom: '0.85rem' }}>
                          <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--accent-primary)', marginBottom: '0.3rem' }}>INFERRED OPPORTUNITIES</div>
                          <ul style={{ paddingLeft: '1.1rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                            {inferredInsights.map((f, i) => <li key={i}>{f}</li>)}
                          </ul>
                        </div>
                      )}

                      <div>
                        <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <AlertCircle size={13} /> NOT VERIFIABLE WITHOUT OWNER ACCESS
                        </div>
                        <ul style={{ paddingLeft: '1.1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {unavailableData.map((u, i) => <li key={i}>{u}</li>)}
                        </ul>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {auditIssues.length > 0 && (
                <div className="card" style={{ marginBottom: '1.25rem' }}>
                  <h2 className="card-title" style={{ marginBottom: '0.85rem' }}>Verified SEO &amp; Web Vitals Issues ({auditIssues.length})</h2>
                  <div className="table-container" style={{ marginBottom: 0 }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Severity</th>
                          <th>Category</th>
                          <th>Issue</th>
                          <th>Measured Evidence</th>
                          <th>Recommendation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditIssues.map((iss, idx) => (
                          <tr key={idx}>
                            <td>
                              <span className={`badge ${iss.severity === 'CRITICAL' ? 'badge-critical' : iss.severity === 'HIGH' ? 'badge-high' : iss.severity === 'MEDIUM' ? 'badge-medium' : 'badge-low'}`}>
                                {iss.severity}
                              </span>
                            </td>
                            <td>{iss.category}</td>
                            <td style={{ fontWeight: 600 }}>{iss.title}</td>
                            <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{iss.evidence}</td>
                            <td style={{ fontSize: '0.82rem', color: 'var(--color-success)' }}>{iss.recommendation}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="grid-2">
                <div className="card">
                  <h2 className="card-title" style={{ marginBottom: '0.75rem' }}>Sales Notes</h2>
                  <form onSubmit={handleAddNote} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    <input
                      className="form-control"
                      placeholder="Add internal note about this prospect..."
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                    />
                    <button type="submit" className="btn btn-primary btn-sm" disabled={busyAction === 'note'}>
                      <MessageSquarePlus size={14} />
                    </button>
                  </form>
                  {lead.notes?.length === 0 ? (
                    <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>No notes yet.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      {lead.notes?.map((n: any) => (
                        <div key={n.id} style={{ padding: '0.7rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{n.content}</div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                            {n.author?.name || n.author?.email} • {new Date(n.createdAt).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="card">
                  <div className="card-header">
                    <h2 className="card-title">Outreach History</h2>
                    <Link href="/acquisition/outreach" style={{ fontSize: '0.82rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                      Outreach Centre →
                    </Link>
                  </div>
                  {lead.outreachMessages?.length === 0 ? (
                    <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>No outreach drafts yet.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                      {lead.outreachMessages?.map((m: any) => (
                        <div key={m.id} style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
                            <strong style={{ fontSize: '0.84rem' }}>{m.subject || m.channel}</strong>
                            <span className="badge badge-low">{m.status}</span>
                          </div>
                          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{m.body}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
