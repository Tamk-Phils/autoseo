'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import TopHeader from '@/components/TopHeader';
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  Play,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Layers,
  History,
} from 'lucide-react';
import Link from 'next/link';

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<any>(null);
  const [message, setMessage] = useState<string | null>(null);

  const fetchRecs = async () => {
    try {
      const pRes = await fetch('/api/projects');
      const pData = await pRes.json();
      if (pData.projects && pData.projects.length > 0) {
        setProject(pData.projects[0]);
        const res = await fetch(`/api/recommendations?projectId=${pData.projects[0].id}`);
        const data = await res.json();
        setRecommendations(data.recommendations || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecs();
  }, []);

  const handleAction = async (id: string, action: 'APPROVE' | 'REJECT') => {
    try {
      const res = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      const data = await res.json();
      if (data.success) {
        setRecommendations((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED' } : r))
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleApply = async (id: string) => {
    try {
      const res = await fetch('/api/recommendations/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage('Optimization executed safely! Recorded to change log with rollback support.');
        setRecommendations((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: 'APPLIED' } : r))
        );
        setTimeout(() => setMessage(null), 4000);
      }
    } catch (e) {
      console.error(e);
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
                <Sparkles color="var(--accent-cyan)" size={24} />
                Autonomous AI Recommendations Queue
              </h1>
              <p className="page-subtitle">
                Synthesized by specialized agents (Technical, Content, Internal Linking, QA). Review, approve, or execute safe SEO fixes.
              </p>
            </div>
            <Link href="/changes" className="btn btn-secondary btn-sm">
              <History size={14} />
              View Change History
            </Link>
          </div>

          {message && (
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
              <span>{message}</span>
            </div>
          )}

          {recommendations.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <CheckCircle2 size={40} color="var(--color-success)" style={{ margin: '0 auto 1rem' }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
                All Recommendations Processed
              </h3>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto 1.5rem', fontSize: '0.9rem' }}>
                No pending tasks in queue. Re-crawl your domain or connect Google Search Console to detect new opportunities.
              </p>
              <Link href="/live-crawl" className="btn btn-primary btn-sm">
                Run Site Crawl
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {recommendations.map((rec) => (
                <div key={rec.id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem', alignItems: 'center' }}>
                        <span className="badge badge-low">{rec.agentType} AGENT</span>
                        <span className={`badge badge-${rec.priority === 'HIGH' ? 'high' : 'medium'}`}>
                          {rec.priority} PRIORITY
                        </span>
                        <span className="badge badge-success">
                          {(rec.confidence * 100).toFixed(0)}% CONFIDENCE
                        </span>
                        <span
                          className={`badge ${
                            rec.status === 'APPLIED'
                              ? 'badge-success'
                              : rec.status === 'APPROVED'
                              ? 'badge-low'
                              : rec.status === 'REJECTED'
                              ? 'badge-critical'
                              : 'badge-medium'
                          }`}
                        >
                          STATUS: {rec.status}
                        </span>
                      </div>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>{rec.title}</h3>
                    </div>

                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                      Potential Impact: <strong style={{ color: 'var(--color-success)' }}>{rec.expectedImpact}</strong>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'var(--bg-input)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem' }}>
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>
                        Identified Problem
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{rec.problem}</p>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.25rem' }}>
                        Recommended Action
                      </div>
                      <p style={{ fontSize: '0.85rem', color: '#fff' }}>{rec.recommendedAction}</p>
                    </div>
                  </div>

                  {rec.suggestedContent && (
                    <div style={{ marginBottom: '1.25rem' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.35rem' }}>
                        Proposed Content / Payload:
                      </div>
                      <pre
                        style={{
                          background: 'var(--bg-dark)',
                          border: '1px solid var(--border-color)',
                          padding: '0.75rem',
                          borderRadius: 'var(--radius-md)',
                          fontSize: '0.82rem',
                          color: 'var(--accent-cyan)',
                          fontFamily: 'var(--font-mono)',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-all',
                        }}
                      >
                        {rec.suggestedContent}
                      </pre>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                    {rec.status === 'PENDING' && (
                      <>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleAction(rec.id, 'REJECT')}
                        >
                          <XCircle size={14} />
                          Reject
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleAction(rec.id, 'APPROVE')}
                        >
                          <CheckCircle2 size={14} color="var(--accent-cyan)" />
                          Approve Fix
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => handleApply(rec.id)}
                        >
                          <Play size={14} />
                          Apply Optimization Now
                        </button>
                      </>
                    )}

                    {rec.status === 'APPROVED' && (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => handleApply(rec.id)}
                      >
                        <Play size={14} />
                        Execute Approved Fix
                      </button>
                    )}

                    {rec.status === 'APPLIED' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-success)', fontSize: '0.85rem', fontWeight: 600 }}>
                        <CheckCircle2 size={16} />
                        <span>Successfully Applied to Website</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

