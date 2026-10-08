'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import TopHeader from '@/components/TopHeader';
import {
  Users2,
  Plus,
  ExternalLink,
  Sparkles,
  Layers,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  FileText,
  X,
  Search,
} from 'lucide-react';
import Link from 'next/link';

export default function CompetitorsPage() {
  const [project, setProject] = useState<any>(null);
  const [competitors, setCompetitors] = useState<any[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);

  const fetchCompetitors = async () => {
    try {
      const pRes = await fetch('/api/projects');
      const pData = await pRes.json();
      if (pData.projects && pData.projects.length > 0) {
        const current = pData.projects[0];
        setProject(current);
        const res = await fetch(`/api/competitors?projectId=${current.id}`);
        const data = await res.json();
        if (data.competitors) {
          setCompetitors(data.competitors);
          setOpportunities(data.opportunities || []);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompetitors();
  }, []);

  const handleAddCompetitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain.trim()) return;

    setAdding(true);
    try {
      const res = await fetch('/api/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project?.id,
          domain: newDomain.trim(),
          name: newName.trim() || newDomain.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCompetitors((prev) => [data.competitor, ...prev]);
        setIsModalOpen(false);
        setNewDomain('');
        setNewName('');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAdding(false);
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
                <Users2 color="var(--accent-cyan)" size={24} />
                Competitor Intelligence & Content Gap Engine
              </h1>
              <p className="page-subtitle">
                {project ? (
                  <>Compare search coverage and content opportunities against competitors for <strong style={{ color: '#fff' }}>{project.domain}</strong></>
                ) : (
                  'Analyze competitor topical coverage, discover search intent gaps, and generate actionable content blueprints.'
                )}
              </p>
            </div>
            {project && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setIsModalOpen(true)}
              >
                <Plus size={14} />
                Add Competitor
              </button>
            )}
          </div>

          {loading ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              Loading competitors...
            </div>
          ) : !project ? (
            <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
              <Search size={36} color="var(--accent-cyan)" style={{ margin: '0 auto 1rem' }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
                No Website Configured
              </h3>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto 1.5rem', fontSize: '0.9rem' }}>
                Add your website URL first to begin competitor intelligence tracking.
              </p>
              <Link href="/onboarding" className="btn btn-primary btn-sm">
                Add Website
              </Link>
            </div>
          ) : competitors.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
              <Users2 size={36} color="var(--accent-cyan)" style={{ margin: '0 auto 1rem' }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
                No Competitors Added Yet
              </h3>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto 1.5rem', fontSize: '0.9rem' }}>
                Add your primary market competitors to analyze search visibility overlap and discover topical content gaps.
              </p>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setIsModalOpen(true)}
              >
                <Plus size={14} />
                Add Competitor Domain
              </button>
            </div>
          ) : (
            <>
              {/* Competitor Overview Cards */}
              <div className="grid-2" style={{ marginBottom: '2rem' }}>
                {competitors.map((comp) => (
                  <div key={comp.id} className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <div>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>{comp.name}</h3>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{comp.domain}</span>
                      </div>
                      <span className="badge badge-low">Tracked Competitor</span>
                    </div>

                    <div className="grid-3" style={{ marginBottom: '0.5rem' }}>
                      <div style={{ background: 'var(--bg-input)', padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Common Keywords</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>
                          {comp.commonKeywords || 0}
                        </div>
                      </div>

                      <div style={{ background: 'var(--bg-input)', padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Search Visibility</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                          {comp.searchVisibility ? `${comp.searchVisibility}%` : 'Pending Crawl'}
                        </div>
                      </div>

                      <div style={{ background: 'var(--bg-input)', padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Pages Tracked</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-success)' }}>
                          {comp.pages?.length || 0}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Content Opportunities */}
              <div className="card">
                <div className="card-header">
                  <div>
                    <h3 className="card-title">
                      <Sparkles size={18} color="var(--accent-cyan)" />
                      Content Opportunities & Topic Gaps
                    </h3>
                  </div>
                </div>

                {opportunities.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    No content gap reports generated yet. Add competitors to automatically analyze search topic differences.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {opportunities.map((opp) => (
                      <div key={opp.id} style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ fontWeight: 700, color: '#fff' }}>{opp.topic}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{opp.reason}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Add Competitor Modal */}
          {isModalOpen && (
            <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>Add Competitor Domain</h2>
                  <button type="button" onClick={() => setIsModalOpen(false)} style={{ color: 'var(--text-muted)' }}>
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleAddCompetitor}>
                  <div className="form-group">
                    <label className="form-label">Competitor Domain or URL</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. competitor.com"
                      value={newDomain}
                      onChange={(e) => setNewDomain(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Competitor Display Name (Optional)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Acme Tech"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={adding}>
                      <Plus size={14} className={adding ? 'animate-spin' : ''} /> {adding ? 'Tracking...' : 'Track Competitor'}
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
