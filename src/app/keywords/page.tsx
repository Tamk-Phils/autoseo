'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import TopHeader from '@/components/TopHeader';
import {
  KeyRound,
  Plus,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  Search,
  ExternalLink,
  X,
  RefreshCw,
} from 'lucide-react';

export default function KeywordsPage() {
  const [keywords, setKeywords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTerm, setNewTerm] = useState('');
  const [newIntent, setNewIntent] = useState('Commercial');
  const [newVolume, setNewVolume] = useState('2400');
  const [newPos, setNewPos] = useState('11.5');

  const fetchKeywords = async () => {
    try {
      const savedId = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('projectId') || localStorage.getItem('activeProjectId')
        : null;
      const res = await fetch(`/api/keywords${savedId ? `?projectId=${encodeURIComponent(savedId)}` : ''}`);
      const data = await res.json();
      if (data.keywords) {
        setKeywords(data.keywords);
        setProject(data.project);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeywords();
  }, []);

  const handleAddKeyword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTerm.trim()) return;

    try {
      const res = await fetch('/api/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          term: newTerm.trim(),
          searchIntent: newIntent,
          searchVolume: Number(newVolume),
          currentPosition: Number(newPos),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setKeywords((prev) => [data.keyword, ...prev]);
        setIsModalOpen(false);
        setNewTerm('');
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
                <KeyRound color="var(--accent-cyan)" size={24} />
                Keyword Intelligence & Rank Movement
              </h1>
              <p className="page-subtitle">
                Track organic keyword rankings, SERP intent classifications, and detect high-ROI &quot;Almost Ranking&quot; opportunities.
              </p>
            </div>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setIsModalOpen(true)}>
              <Plus size={14} />
              Add Target Keyword
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="grid-4" style={{ marginBottom: '1.75rem' }}>
            <div className="stat-card">
              <span className="stat-label">Tracked Keywords</span>
              <div className="stat-value">{keywords.length}</div>
            </div>

            <div className="stat-card">
              <span className="stat-label">Top 10 Positions</span>
              <div className="stat-value" style={{ color: 'var(--color-success)' }}>
                {keywords.filter((k) => k.currentPosition && k.currentPosition <= 10).length}
              </div>
            </div>

            <div className="stat-card">
              <span className="stat-label">&quot;Almost Ranking&quot; (Pos 11-20)</span>
              <div className="stat-value" style={{ color: '#f97316' }}>
                {keywords.filter((k) => k.isOpportunity).length}
              </div>
            </div>

            <div className="stat-card">
              <span className="stat-label">Total Monthly Search Volume</span>
              <div className="stat-value" style={{ color: 'var(--accent-cyan)' }}>
                {keywords.reduce((acc, k) => acc + (k.searchVolume || 0), 0).toLocaleString()}
              </div>
            </div>
          </div>

          {keywords.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
              <KeyRound size={36} color="var(--accent-cyan)" style={{ margin: '0 auto 1rem' }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
                No Keywords Tracked Yet
              </h3>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto 1.5rem', fontSize: '0.9rem' }}>
                Add your target search queries to monitor SERP rank positions, classify search intent, and uncover high-ROI &quot;Almost Ranking&quot; opportunities.
              </p>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setIsModalOpen(true)}>
                <Plus size={14} />
                Add Your First Keyword
              </button>
            </div>
          ) : (
            <>
            <div style={{ marginBottom: '1rem', padding: '0.85rem 1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
              Site and competitor candidates are shown immediately. Position, trend, volume, difficulty, and CTR become verified after Search Console or another SEO data provider is connected.
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Keyword Term</th>
                    <th>Search Intent</th>
                    <th>Position</th>
                    <th>Trend</th>
                    <th>Volume</th>
                    <th>Difficulty</th>
                    <th>Est. CTR</th>
                    <th>Opportunity Analysis</th>
                  </tr>
                </thead>
                <tbody>
                {keywords.map((k) => (
                  <tr key={k.id}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 600, color: '#fff' }}>{k.term}</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{k.rankingUrl}</span>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-low">{k.searchIntent}</span>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '1rem',
                          fontWeight: 700,
                          color: k.currentPosition && k.currentPosition <= 10 ? 'var(--color-success)' : '#fff',
                        }}
                      >
                        {k.currentPosition != null ? `#${k.currentPosition.toFixed(1)}` : 'Not tracked'}
                      </span>
                    </td>
                    <td>
                      {k.trend === 'UP' ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: 'var(--color-success)', fontSize: '0.8rem', fontWeight: 600 }}>
                          <TrendingUp size={14} /> Rising
                        </span>
                      ) : k.trend === 'DOWN' ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: 'var(--color-danger)', fontSize: '0.8rem', fontWeight: 600 }}>
                          <TrendingDown size={14} /> Falling
                        </span>
                      ) : (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          <Minus size={14} /> Awaiting data
                        </span>
                      )}
                    </td>
                    <td>{k.searchVolume != null ? k.searchVolume.toLocaleString() : 'Not available'}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span>{k.difficulty != null ? k.difficulty : 'Not available'}</span>
                        <div style={{ width: '40px', height: '4px', background: 'var(--bg-surface)', borderRadius: '2px' }}>
                          <div style={{ width: `${k.difficulty || 0}%`, height: '100%', background: '#38bdf8' }} />
                        </div>
                      </div>
                    </td>
                    <td>{k.ctr != null ? `${k.ctr}%` : 'Not available'}</td>
                    <td>
                      {k.isOpportunity ? (
                        <div style={{ background: 'rgba(249, 115, 22, 0.1)', border: '1px solid rgba(249, 115, 22, 0.3)', padding: '0.35rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', color: '#f97316', maxWidth: '280px' }}>
                          <strong>Almost ranking:</strong> {k.opportunityNote}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Established visibility</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
            </>
          )}

          {/* Add Keyword Modal */}
          {isModalOpen && (
            <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>Add Target Keyword</h2>
                  <button type="button" onClick={() => setIsModalOpen(false)} style={{ color: 'var(--text-muted)' }}>
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleAddKeyword}>
                  <div className="form-group">
                    <label className="form-label">Keyword Term</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. enterprise cloud solutions"
                      value={newTerm}
                      onChange={(e) => setNewTerm(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>

                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">Search Intent</label>
                      <select className="form-control" value={newIntent} onChange={(e) => setNewIntent(e.target.value)}>
                        <option value="Informational">Informational</option>
                        <option value="Navigational">Navigational</option>
                        <option value="Commercial">Commercial</option>
                        <option value="Transactional">Transactional</option>
                        <option value="Local">Local</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Estimated Monthly Volume</label>
                      <input
                        type="number"
                        className="form-control"
                        value={newVolume}
                        onChange={(e) => setNewVolume(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Initial Position Baseline</label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-control"
                      value={newPos}
                      onChange={(e) => setNewPos(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      Track Keyword
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

