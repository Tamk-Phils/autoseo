'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import TopHeader from '@/components/TopHeader';
import {
  History,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Search,
} from 'lucide-react';
import Link from 'next/link';

export default function ChangesPage() {
  const [changes, setChanges] = useState<any[]>([]);
  const [project, setProject] = useState<any>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchChanges = async () => {
    try {
      const pRes = await fetch('/api/projects');
      const pData = await pRes.json();
      if (pData.projects && pData.projects.length > 0) {
        const current = pData.projects[0];
        setProject(current);
        const res = await fetch(`/api/changes?projectId=${current.id}`);
        const data = await res.json();
        if (data.changes) {
          setChanges(data.changes);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChanges();
  }, []);

  const handleRollback = async (changeId: string) => {
    try {
      const res = await fetch('/api/changes/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changeId }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage('Change successfully rolled back! Prior value restored in database.');
        setChanges((prev) =>
          prev.map((c) => (c.id === changeId ? { ...c, status: 'ROLLED_BACK' } : c))
        );
        setTimeout(() => setStatusMessage(null), 4000);
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
                <History color="var(--accent-cyan)" size={24} />
                Change Management & Rollback Engine
              </h1>
              <p className="page-subtitle">
                {project ? (
                  <>Audit trail of applied optimizations for <strong style={{ color: '#fff' }}>{project.domain}</strong></>
                ) : (
                  'Complete audit trail of every automated and assisted change with Before/After verification and instant 1-click rollback.'
                )}
              </p>
            </div>
            <Link href="/recommendations" className="btn btn-primary btn-sm">
              Review Recommendations
            </Link>
          </div>

          {statusMessage && (
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
              <span>{statusMessage}</span>
            </div>
          )}

          {loading ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              Loading change history...
            </div>
          ) : changes.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
              <History size={36} color="var(--accent-cyan)" style={{ margin: '0 auto 1rem' }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
                No Optimizations Executed Yet
              </h3>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto 1.5rem', fontSize: '0.9rem' }}>
                When you approve AI recommendations or enable Autopilot, all changes are logged here with their original value, new value, reason, and 1-click rollback.
              </p>
              <Link href="/recommendations" className="btn btn-primary btn-sm">
                View Recommendations Queue
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {changes.map((chg) => (
                <div key={chg.id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.35rem' }}>
                        <span className="badge badge-low">{chg.changeType}</span>
                        <span className="badge badge-success">{chg.integrationUsed}</span>
                        <span
                          className={`badge ${
                            chg.status === 'APPLIED' ? 'badge-success' : 'badge-critical'
                          }`}
                        >
                          {chg.status}
                        </span>
                      </div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>{chg.reason}</h3>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Affected URL: <strong style={{ color: '#fff' }}>{chg.affectedUrl}</strong>
                      </span>
                    </div>

                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Applied: {new Date(chg.appliedAt).toLocaleString()}
                    </div>
                  </div>

                  {/* Before / After Diff Visualizer */}
                  <div className="grid-2" style={{ marginBottom: '1.25rem' }}>
                    <div style={{ background: 'var(--bg-input)', padding: '0.85rem', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--color-danger)' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-danger)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                        BEFORE (Original Value)
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#e2e8f0', fontFamily: 'var(--font-mono)' }}>
                        {chg.originalValue || '—'}
                      </div>
                    </div>

                    <div style={{ background: 'var(--bg-input)', padding: '0.85rem', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--color-success)' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-success)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                        AFTER (Optimized Value)
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#fff', fontFamily: 'var(--font-mono)' }}>
                        {chg.newValue}
                      </div>
                    </div>
                  </div>

                  {/* Rollback action */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem' }}>
                    {chg.status === 'APPLIED' ? (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleRollback(chg.id)}
                        style={{ color: '#f97316' }}
                      >
                        <RotateCcw size={14} />
                        Rollback Change
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Change has been safely reverted.
                      </span>
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
