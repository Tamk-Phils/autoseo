'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import TopHeader from '@/components/TopHeader';
import LoadingSpinner from '@/components/LoadingSpinner';
import AcquisitionWorkspaceBar from '@/components/AcquisitionWorkspaceBar';
import { Check, X, Send, ShieldBan, Copy, MessageSquare } from 'lucide-react';

export default function OutreachCentrePage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [suppressions, setSuppressions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [replyOpenId, setReplyOpenId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [newSuppress, setNewSuppress] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const q = statusFilter !== 'ALL' ? `?status=${statusFilter}` : '';
      const res = await fetch(`/api/outreach${q}`);
      const json = await res.json();
      if (json.success) {
        setMessages(json.messages || []);
        setSuppressions(json.suppressions || []);
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadData();
    const handler = () => loadData();
    window.addEventListener('acquisition-workspace-changed', handler);
    return () => window.removeEventListener('acquisition-workspace-changed', handler);
  }, [loadData]);

  const handleApproval = async (messageId: string, action: 'APPROVE' | 'REJECT') => {
    setBusyId(messageId);
    setNotice(null);
    try {
      const res = await fetch('/api/outreach/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, action }),
      });
      const json = await res.json();
      if (!res.ok) setNotice(json.error || 'Action failed');
      else {
        setNotice(action === 'APPROVE' ? 'Message approved for authorized dispatch.' : 'Draft rejected.');
        await loadData();
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleSend = async (messageId: string) => {
    setBusyId(messageId);
    setNotice(null);
    try {
      const res = await fetch('/api/outreach/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId }),
      });
      const json = await res.json();
      if (!res.ok) setNotice(json.error || 'Send failed');
      else {
        setNotice(`Outreach dispatched (${json.deliveryMode}) and 4-day follow-up scheduled.`);
        await loadData();
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleClassifyReply = async (messageId: string) => {
    if (!replyText.trim()) return;
    setBusyId(messageId);
    try {
      const res = await fetch(`/api/outreach/${messageId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replyText }),
      });
      const json = await res.json();
      if (!res.ok) setNotice(json.error || 'Reply processing failed');
      else {
        const c = json.classification;
        setNotice(`Reply classified as ${c.classification}. ${c.suggestedFollowUpAction}`);
        setReplyOpenId(null);
        setReplyText('');
        await loadData();
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleAddSuppression = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSuppress.trim()) return;
    const res = await fetch('/api/outreach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: newSuppress.trim(), reason: 'MANUAL_BLOCK' }),
    });
    if (res.ok) {
      setNewSuppress('');
      setNotice('Added to organization suppression list.');
      await loadData();
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-wrapper">
        <TopHeader />
        <main className="page-container">
          <div className="page-header">
            <div style={{ minWidth: 0 }}>
              <h1 className="page-title">Outreach Centre &amp; Compliance Guard</h1>
              <p className="page-subtitle">
                Human approval workflow before initial contact, AI reply classification, frequency caps, and suppression list enforcement.
              </p>
            </div>
          </div>

          <AcquisitionWorkspaceBar onWorkspaceChanged={loadData} />

          {notice && (
            <div className="card" style={{ marginBottom: '1rem', padding: '0.85rem 1rem', borderColor: 'rgba(37,99,235,0.35)', background: 'var(--color-info-bg)' }}>
              {notice}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            {['ALL', 'PENDING_APPROVAL', 'APPROVED', 'SENT', 'REPLIED', 'REJECTED'].map((st) => (
              <button
                key={st}
                type="button"
                className={`btn btn-sm ${statusFilter === st ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setStatusFilter(st)}
              >
                {st}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="card" style={{ padding: '2.5rem', textAlign: 'center' }}>
              <LoadingSpinner label="Loading outreach queue..." />
            </div>
          ) : messages.length === 0 ? (
            <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              No outreach messages yet. Open any lead in the <Link href="/acquisition/leads" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Lead Database</Link> and click Generate AI Proposal.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              {messages.map((m) => (
                <div key={m.id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                        <Link href={`/acquisition/leads/${m.lead?.id}`} style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          {m.lead?.businessName || 'Prospect'}
                        </Link>
                        <span className="badge badge-low">{m.channel}</span>
                        <span className="badge badge-medium">{m.status}</span>
                        {m.replyClassification && (
                          <span className="badge badge-success">Reply: {m.replyClassification}</span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--accent-primary)', marginTop: '0.3rem', wordBreak: 'break-word' }}>
                        Subject: {m.subject || '(No subject)'}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          navigator.clipboard?.writeText(`${m.subject ? `Subject: ${m.subject}\n\n` : ''}${m.body}`);
                          setNotice('Copied draft to clipboard.');
                        }}
                      >
                        <Copy size={13} /> Copy
                      </button>

                      {(m.status === 'PENDING_APPROVAL' || m.status === 'DRAFT') && (
                        <>
                          <button
                            type="button"
                            className="btn btn-success btn-sm"
                            disabled={busyId === m.id}
                            onClick={() => handleApproval(m.id, 'APPROVE')}
                          >
                            <Check size={13} /> Approve
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            disabled={busyId === m.id}
                            onClick={() => handleApproval(m.id, 'REJECT')}
                          >
                            <X size={13} /> Reject
                          </button>
                        </>
                      )}

                      {m.status === 'APPROVED' && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          disabled={busyId === m.id}
                          onClick={() => handleSend(m.id)}
                        >
                          <Send size={13} /> {busyId === m.id ? 'Sending...' : 'Send Authorized'}
                        </button>
                      )}

                      {(m.status === 'SENT' || m.status === 'REPLIED') && m.direction === 'OUTBOUND' && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setReplyOpenId(replyOpenId === m.id ? null : m.id)}
                        >
                          <MessageSquare size={13} /> Log &amp; Classify Reply
                        </button>
                      )}
                    </div>
                  </div>

                  <pre
                    style={{
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      fontFamily: 'inherit',
                      fontSize: '0.86rem',
                      color: 'var(--text-primary)',
                      background: 'var(--bg-surface)',
                      padding: '0.9rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      margin: 0,
                    }}
                  >
                    {m.body}
                  </pre>

                  {replyOpenId === m.id && (
                    <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <input
                        className="form-control"
                        style={{ flex: '1 1 220px' }}
                        placeholder="Paste prospect reply (e.g. 'Send pricing' or 'Please unsubscribe me')..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                      />
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={busyId === m.id}
                        onClick={() => handleClassifyReply(m.id)}
                      >
                        Classify Reply
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="card">
            <h2 className="card-title" style={{ marginBottom: '0.85rem' }}>
              <ShieldBan size={17} color="var(--color-danger)" />
              <span>Unsubscribe &amp; Suppression List ({suppressions.length})</span>
            </h2>
            <form onSubmit={handleAddSuppression} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem', maxWidth: '520px' }}>
              <input
                className="form-control"
                style={{ flex: '1 1 220px' }}
                placeholder="Email or domain to block (e.g. optout@example.com)"
                value={newSuppress}
                onChange={(e) => setNewSuppress(e.target.value)}
              />
              <button type="submit" className="btn btn-secondary btn-sm">Add Block</button>
            </form>
            {suppressions.length === 0 ? (
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>No suppressed contacts yet.</p>
            ) : (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {suppressions.map((s) => (
                  <span key={s.id} className="badge badge-critical">
                    {s.identifier} ({s.reason})
                  </span>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
