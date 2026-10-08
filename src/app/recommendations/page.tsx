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
  Boxes,
  Globe,
  GitPullRequest,
  Zap,
} from 'lucide-react';
import Link from 'next/link';

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [targetIntegration, setTargetIntegration] = useState<string>('AUTONOMOUS_ENGINE');
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<any>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const fetchRecs = async () => {
    try {
      const pRes = await fetch('/api/projects');
      const pData = await pRes.json();
      if (pData.projects && pData.projects.length > 0) {
        const curr = pData.projects[0];
        setProject(curr);
        
        const res = await fetch(`/api/recommendations?projectId=${curr.id}`);
        const data = await res.json();
        setRecommendations(data.recommendations || []);

        // Load active integrations
        const intRes = await fetch(`/api/integrations?projectId=${curr.id}`);
        const intData = await intRes.json();
        if (intData.integrations) {
          const active = intData.integrations.filter((i: any) => i.isConnected);
          setIntegrations(active);
          if (active.some((i: any) => i.type === 'WORDPRESS')) {
            setTargetIntegration('WORDPRESS');
          } else if (active.some((i: any) => i.type === 'GITHUB')) {
            setTargetIntegration('GITHUB');
          } else if (active.some((i: any) => i.type === 'CLOUDFLARE_EDGE')) {
            setTargetIntegration('CLOUDFLARE_EDGE');
          }
        }
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
    setApplyingId(id);
    try {
      const res = await fetch('/api/recommendations/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, targetIntegration }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage(data.message || 'Optimization executed safely! Recorded to change log with rollback support.');
        setRecommendations((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: 'APPLIED' } : r))
        );
        setTimeout(() => setMessage(null), 6000);
      } else {
        alert(data.error || 'Failed to apply recommendation');
      }
    } catch (e: any) {
      alert(`Error executing optimization: ${e.message}`);
    } finally {
      setApplyingId(null);
    }
  };

  const wpActive = integrations.some((i) => i.type === 'WORDPRESS');
  const ghActive = integrations.some((i) => i.type === 'GITHUB');
  const cfActive = integrations.some((i) => i.type === 'CLOUDFLARE_EDGE');

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
                Synthesized by specialized agents. Review, approve, or execute live SEO fixes directly to your website.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <Link href="/integrations" className="btn btn-secondary btn-sm">
                <Boxes size={14} />
                Manage Integrations ({integrations.length})
              </Link>
              <Link href="/changes" className="btn btn-secondary btn-sm">
                <History size={14} />
                Change History & Rollback
              </Link>
            </div>
          </div>

          {/* Publishing Destination Bar */}
          <div
            className="card"
            style={{
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
              padding: '0.85rem 1.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Boxes size={18} color="var(--accent-cyan)" />
              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#fff' }}>
                Publishing Destination:
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <select
                className="form-control"
                style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
                value={targetIntegration}
                onChange={(e) => setTargetIntegration(e.target.value)}
              >
                <option value="AUTONOMOUS_ENGINE">In-App Engine (Database + Rollback Cache)</option>
                {wpActive && <option value="WORDPRESS">WordPress REST API (Live On-Page)</option>}
                {ghActive && <option value="GITHUB">GitHub Automated Pull Request</option>}
                {cfActive && <option value="CLOUDFLARE_EDGE">Cloudflare Edge Worker (Zero-Latency Rewriter)</option>}
              </select>

              {!wpActive && !ghActive && !cfActive && (
                <Link
                  href="/integrations"
                  style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', textDecoration: 'underline' }}
                >
                  + Connect WordPress or GitHub
                </Link>
              )}
            </div>
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div style={{ flex: '1 1 280px', minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
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
                              ? 'badge-high'
                              : 'badge-medium'
                          }`}
                        >
                          {rec.status}
                        </span>
                      </div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff', marginTop: '0.25rem', wordBreak: 'break-word' }}>
                        {rec.title}
                      </h3>
                      {rec.page?.url && (
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.2rem', wordBreak: 'break-all' }}>
                          Target URL: <code>{rec.page.url}</code>
                        </div>
                      )}
                    </div>
                    {rec.riskLevel && (
                      <span className="badge badge-low" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
                        <ShieldCheck size={12} />
                        Risk: {rec.riskLevel}
                      </span>
                    )}
                  </div>

                  <div className="grid-responsive-2" style={{ marginBottom: '1rem' }}>
                    <div style={{ background: 'var(--bg-input)', padding: '0.85rem', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.25rem', fontWeight: 600 }}>
                        Identified Problem
                      </div>
                      <div style={{ fontSize: '0.88rem', color: 'var(--color-critical)', wordBreak: 'break-word' }}>
                        {rec.problem}
                      </div>
                    </div>

                    <div style={{ background: 'var(--bg-input)', padding: '0.85rem', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.25rem', fontWeight: 600 }}>
                        Recommended Solution
                      </div>
                      <div style={{ fontSize: '0.88rem', color: 'var(--color-success)', wordBreak: 'break-word' }}>
                        {rec.recommendedAction}
                      </div>
                    </div>
                  </div>

                  {rec.suggestedContent && (
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.35rem', fontWeight: 600 }}>
                        Proposed Content / Schema Code
                      </div>
                      <pre
                        style={{
                          background: '#090d16',
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
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
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
                          disabled={applyingId === rec.id}
                        >
                          <Play size={14} />
                          {applyingId === rec.id
                            ? 'Publishing...'
                            : targetIntegration === 'WORDPRESS'
                            ? 'Push to WordPress Now'
                            : targetIntegration === 'GITHUB'
                            ? 'Open GitHub PR Now'
                            : targetIntegration === 'CLOUDFLARE_EDGE'
                            ? 'Deploy to Edge Now'
                            : 'Apply Optimization Now'}
                        </button>
                      </>
                    )}

                    {rec.status === 'APPROVED' && (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => handleApply(rec.id)}
                        disabled={applyingId === rec.id}
                      >
                        <Play size={14} />
                        {applyingId === rec.id
                          ? 'Publishing...'
                          : targetIntegration === 'WORDPRESS'
                          ? 'Execute to WordPress'
                          : targetIntegration === 'GITHUB'
                          ? 'Open GitHub PR'
                          : 'Execute Approved Fix'}
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
