'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import TopHeader from '@/components/TopHeader';
import LoadingSpinner from '@/components/LoadingSpinner';
import AcquisitionWorkspaceBar from '@/components/AcquisitionWorkspaceBar';
import { CalendarClock, CheckCircle2, XCircle } from 'lucide-react';

export default function FollowUpsPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('PENDING');

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      const q = filter !== 'ALL' ? `?status=${filter}` : '';
      const res = await fetch(`/api/outreach/follow-ups${q}`);
      const json = await res.json();
      if (json.success) setTasks(json.tasks || []);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadTasks();
    const handler = () => loadTasks();
    window.addEventListener('acquisition-workspace-changed', handler);
    return () => window.removeEventListener('acquisition-workspace-changed', handler);
  }, [loadTasks]);

  const updateStatus = async (taskId: string, status: 'COMPLETED' | 'CANCELLED') => {
    await fetch('/api/outreach/follow-ups', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId, status }),
    });
    await loadTasks();
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <TopHeader />
        <main className="page-container">
          <div className="page-header">
            <h1 className="page-title">Follow-up Centre</h1>
            <p className="page-subtitle">
              Scheduled prospect follow-ups. Tasks automatically cancel if a prospect opts out or unsubscribes.
            </p>
          </div>

          <AcquisitionWorkspaceBar onWorkspaceChanged={loadTasks} />

          <div style={{ display: 'flex', gap: '0.45rem', marginBottom: '1rem' }}>
            {['PENDING', 'COMPLETED', 'CANCELLED', 'ALL'].map((st) => (
              <button
                key={st}
                type="button"
                className={`btn btn-sm ${filter === st ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFilter(st)}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="card" style={{ padding: '1.25rem' }}>
            {loading ? (
              <LoadingSpinner label="Loading follow-up tasks..." />
            ) : tasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                <CalendarClock size={30} style={{ margin: '0 auto 0.6rem', opacity: 0.5 }} />
                <p>No {filter.toLowerCase()} follow-up tasks in this workspace.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {tasks.map((t) => (
                  <div
                    key={t.id}
                    style={{
                      padding: '0.95rem 1.1rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(15,23,42,0.65)',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '0.75rem',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{t.title}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                        Lead:{' '}
                        <Link href={`/acquisition/leads/${t.lead?.id}`} style={{ color: 'var(--accent-cyan)' }}>
                          {t.lead?.businessName}
                        </Link>{' '}
                        • Due: <strong>{new Date(t.dueAt).toLocaleDateString()}</strong>
                      </div>
                      {t.notes && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{t.notes}</div>}
                    </div>

                    <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
                      <span className="badge">{t.status}</span>
                      {t.status === 'PENDING' && (
                        <>
                          <button type="button" className="btn btn-primary btn-sm" onClick={() => updateStatus(t.id, 'COMPLETED')}>
                            <CheckCircle2 size={13} /> Done
                          </button>
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => updateStatus(t.id, 'CANCELLED')}>
                            <XCircle size={13} /> Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
