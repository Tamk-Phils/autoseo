'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import TopHeader from '@/components/TopHeader';
import ScoreGauge from '@/components/ScoreGauge';
import LiveActivityFeed from '@/components/LiveActivityFeed';
import LoadingSpinner from '@/components/LoadingSpinner';
import Link from 'next/link';
import {
  AlertCircle,
  Sparkles,
  KeyRound,
  TrendingUp,
  History,
  Bot,
  ArrowRight,
  ShieldCheck,
  Search,
  Clock,
  Activity,
  Calendar,
  Zap,
  CheckCircle2,
} from 'lucide-react';

import { resolveActiveProject, getActiveProjectId } from '@/lib/activeProject';

export default function DashboardPage() {
  const [project, setProject] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async (targetId?: string) => {
    try {
      setLoading(true);
      const pRes = await fetch('/api/projects');
      const pJson = await pRes.json();

      if (!pJson.projects || pJson.projects.length === 0) {
        setProject(null);
        setData(null);
        setLoading(false);
        return;
      }

      let activeProj = null;
      const desiredId = targetId || getActiveProjectId();

      if (desiredId) {
        activeProj = pJson.projects.find((p: any) => p.id === desiredId);
      }

      if (!activeProj) {
        activeProj = resolveActiveProject(pJson.projects);
      }

      if (activeProj) {
        setProject(activeProj);
        const dRes = await fetch(`/api/dashboard?projectId=${encodeURIComponent(activeProj.id)}`);
        const dJson = await dRes.json();
        if (dJson.success) {
          setData(dJson);
          if (dJson.project) setProject(dJson.project);
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();

    const handleProjectChanged = (e: any) => {
      const newId = e?.detail?.projectId || getActiveProjectId();
      if (newId) {
        loadDashboard(newId);
      }
    };

    window.addEventListener('project-changed', handleProjectChanged);
    return () => window.removeEventListener('project-changed', handleProjectChanged);
  }, [loadDashboard]);

  if (loading) {
    return (
      <div className="app-layout">
        <Sidebar />
        <div className="main-wrapper">
          <TopHeader currentProject={project} />
          <main className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
            <div className="card" style={{ width: '100%', maxWidth: '600px', padding: '3rem' }}>
              <LoadingSpinner
                size="lg"
                label="Loading Executive SEO Dashboard..."
                sublabel="Synchronizing website diagnostics, monitoring cycles, and real-time optimization status"
              />
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!project || !data) {
    return (
      <div className="app-layout">
        <Sidebar />
        <div className="main-wrapper">
          <TopHeader />
          <main className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
            <div className="card" style={{ maxWidth: '580px', textAlign: 'center', padding: '3.5rem 2rem' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'rgba(56, 189, 248, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.25rem',
                  color: 'var(--accent-cyan)',
                }}
              >
                <Search size={28} />
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                No Websites Added Yet
              </h2>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '2rem', fontSize: '0.95rem' }}>
                Add your website URL to initiate an autonomous crawl, discover technical SEO issues, calculate your Optimization Score, and generate verified AI fixes.
              </p>
              <Link href="/onboarding" className="btn btn-primary btn-lg">
                <span>Add Your Website &amp; Start Crawl</span>
                <ArrowRight size={18} />
              </Link>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const {
    issues = [],
    recommendations = [],
    keywords = [],
    recentChanges = [],
    pagesCount = 0,
    criticalIssuesCount = 0,
    highIssuesCount = 0,
    monitoringCycle = {
      daysRemaining: 14,
      totalDaysInPeriod: 14,
      daysElapsed: 0,
      periodProgressPct: 0,
      totalOccurrencesInPeriod: 0,
    },
  } = data;

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-wrapper">
        <TopHeader currentProject={project} />

        <main className="page-container">
          <div className="page-header">
            <div>
              <h1 className="page-title">Executive SEO Overview</h1>
              <p className="page-subtitle">
                Autonomous diagnostic status for <strong style={{ color: 'var(--text-primary)' }}>{project.domain}</strong> · Last crawled:{' '}
                {project.lastCrawlAt ? new Date(project.lastCrawlAt).toLocaleDateString() : 'Never'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Link href="/live-crawl" className="btn btn-secondary btn-sm">
                <Search size={14} />
                Re-crawl Site
              </Link>
              <Link href="/opportunities" className="btn btn-primary btn-sm">
                <Sparkles size={14} />
                View Opportunities
              </Link>
            </div>
          </div>

          {/* Autonomous Monitoring Cycle Banner */}
          <div
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem 1.5rem',
              marginBottom: '1.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1.25rem',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: '260px' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(56, 189, 248, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-cyan)',
                  flexShrink: 0,
                }}
              >
                <Activity size={24} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                  <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Active Autonomous Monitoring Cycle
                  </span>
                  <span className="badge badge-low" style={{ fontSize: '0.72rem' }}>
                    ● 24/7 Engine
                  </span>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Cycle window: {monitoringCycle.totalDaysInPeriod} days total · Continuous 1-minute automated URL dispatch &amp; instant search engine pings.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
              {/* Days Left Metric */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', justifyContent: 'center' }}>
                  <Clock size={16} color="var(--accent-primary)" />
                  <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                    {monitoringCycle.daysRemaining}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>days left</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                  {monitoringCycle.periodProgressPct}% elapsed ({monitoringCycle.daysElapsed}d of {monitoringCycle.totalDaysInPeriod}d)
                </div>
              </div>

              {/* Total Occurrences in Period */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', justifyContent: 'center' }}>
                  <Zap size={16} color="#10b981" />
                  <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-success)', letterSpacing: '-0.02em' }}>
                    {monitoringCycle.totalOccurrencesInPeriod.toLocaleString()}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>events</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                  Occurred in this monitoring period
                </div>
              </div>

              {/* Action Button */}
              <Link href="/live-crawl" className="btn btn-secondary btn-sm" style={{ fontWeight: 600 }}>
                <span>Trigger Manual Pulse</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>

          {/* Top Key Metric Cards */}
          <div className="grid-4">
            <div className="stat-card">
              <span className="stat-label">Search Visibility</span>
              <div className="stat-value" style={{ color: 'var(--accent-cyan)' }}>
                {project.searchVisibility?.toFixed(1) ?? '0.0'}%
              </div>
              <div className="stat-meta" style={{ color: 'var(--color-success)' }}>
                <TrendingUp size={14} />
                <span>+4.2% calculated 30d</span>
              </div>
            </div>

            <div className="stat-card">
              <span className="stat-label">Indexed Crawled Pages</span>
              <div className="stat-value">{pagesCount}</div>
              <div className="stat-meta" style={{ color: 'var(--text-muted)' }}>
                <span>Across verified domains</span>
              </div>
            </div>

            <div className="stat-card">
              <span className="stat-label">Critical Issues</span>
              <div className="stat-value" style={{ color: criticalIssuesCount > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                {criticalIssuesCount}
              </div>
              <div className="stat-meta" style={{ color: 'var(--text-muted)' }}>
                <span>{highIssuesCount} high severity alerts</span>
              </div>
            </div>

            <div className="stat-card">
              <span className="stat-label">Autopilot Mode</span>
              <div className="stat-value" style={{ fontSize: '1.4rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Bot size={24} />
                {project.optimizationMode || 'AUTONOMOUS'}
              </div>
              <div className="stat-meta" style={{ color: 'var(--text-muted)' }}>
                <span>Granular approval policies active</span>
              </div>
            </div>
          </div>

          {/* Score Gauge & Autopilot Status Split */}
          <div className="grid-2" style={{ marginBottom: '1.75rem' }}>
            <ScoreGauge
              score={project.seoScore ?? 0}
              technical={project.technicalScore ?? 0}
              content={project.contentScore ?? 0}
              indexability={project.indexabilityScore ?? 0}
              performance={project.performanceScore ?? 0}
              internalLink={project.internalLinkScore ?? 0}
              structuredData={project.structuredDataScore ?? 0}
            />

            <LiveActivityFeed projectId={project.id} />
          </div>

          {/* Audit Issues & AI Recommendations Split */}
          <div className="grid-2">
            {/* Critical Issues */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">
                  <AlertCircle size={18} color="var(--color-danger)" />
                  Priority Technical &amp; On-Page Issues
                </h3>
                <Link href="/site-audit" style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>
                  View All ({issues.length})
                </Link>
              </div>

              {issues.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem', padding: '2rem 0', textAlign: 'center' }}>
                  No issues detected. Run a crawl to audit pages.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {issues.map((iss: any) => (
                    <div
                      key={iss.id}
                      style={{
                        padding: '0.85rem 1rem',
                        backgroundColor: 'var(--bg-input)',
                        borderRadius: 'var(--radius-md)',
                        borderLeft: `4px solid ${
                          iss.severity === 'CRITICAL' ? 'var(--color-danger)' : iss.severity === 'HIGH' ? '#f97316' : 'var(--color-warning)'
                        }`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>{iss.title}</span>
                        <span className={`badge badge-${iss.severity.toLowerCase()}`}>{iss.severity}</span>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{iss.whyItMatters}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AI Recommendations Queue */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">
                  <Sparkles size={18} color="var(--accent-cyan)" />
                  AI Recommendations Ready for Execution
                </h3>
                <Link href="/recommendations" style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>
                  Review Queue
                </Link>
              </div>

              {recommendations.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem', padding: '2rem 0', textAlign: 'center' }}>
                  No pending recommendations. All current tasks reviewed.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {recommendations.map((rec: any) => (
                    <div
                      key={rec.id}
                      style={{
                        padding: '0.85rem 1rem',
                        backgroundColor: 'var(--bg-input)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>{rec.title}</span>
                        <span className="badge badge-low">{rec.agentType}</span>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                        {rec.recommendedAction}
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Confidence: {(rec.confidence * 100).toFixed(0)}%</span>
                        <Link href="/recommendations" style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>
                          Review Fix →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Keywords & Change History Tables */}
          <div className="grid-2" style={{ marginTop: '1.75rem' }}>
            {/* Target Keywords */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">
                  <KeyRound size={18} color="var(--accent-cyan)" />
                  Keyword Intelligence
                </h3>
                <Link href="/keywords" style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>
                  View All Keywords
                </Link>
              </div>

              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Keyword</th>
                      <th>Intent</th>
                      <th>Position</th>
                      <th>Search Volume</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keywords.map((kw: any) => (
                      <tr key={kw.id}>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{kw.term}</td>
                        <td>
                          <span className="badge badge-low">{kw.searchIntent}</span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: kw.currentPosition && kw.currentPosition <= 10 ? 'var(--color-success)' : 'var(--text-primary)' }}>
                            #{kw.currentPosition?.toFixed(1) ?? '—'}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>{kw.searchVolume?.toLocaleString() ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Change History & Rollback */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">
                  <History size={18} color="var(--accent-cyan)" />
                  Recent Applied Optimizations
                </h3>
                <Link href="/changes" style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>
                  Full Change Log
                </Link>
              </div>

              {recentChanges.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem', padding: '2rem 0', textAlign: 'center' }}>
                  No optimizations applied yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {recentChanges.map((chg: any) => (
                    <div
                      key={chg.id}
                      style={{
                        padding: '0.85rem 1rem',
                        backgroundColor: 'var(--bg-input)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                        <span className="badge badge-success">{chg.changeType}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {new Date(chg.appliedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{chg.reason}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        Affected: {chg.affectedUrl}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
