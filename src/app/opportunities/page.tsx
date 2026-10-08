'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import TopHeader from '@/components/TopHeader';
import {
  Flame,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Layers,
  CheckCircle2,
  Zap,
  Search,
} from 'lucide-react';
import Link from 'next/link';

export default function OpportunitiesPage() {
  const [project, setProject] = useState<any>(null);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then(async (data) => {
        if (data.projects && data.projects.length > 0) {
          const savedId = typeof window !== 'undefined' ? (new URLSearchParams(window.location.search).get('projectId') || localStorage.getItem('activeProjectId')) : null;
          const current = (savedId && data.projects.find((p: any) => p.id === savedId)) || data.projects[0];
          setProject(current);

          const [issuesRes, kwRes] = await Promise.all([
            fetch(`/api/issues?projectId=${current.id}`),
            fetch(`/api/keywords?projectId=${current.id}`),
          ]);
          const issuesData = await issuesRes.json();
          const kwData = await kwRes.json();

          const derived: any[] = [];

          // Derive opportunity from issues
          const missingMeta = issuesData.issues?.find((i: any) => i.title.toLowerCase().includes('meta description'));
          if (missingMeta) {
            derived.push({
              id: 'opp-meta',
              title: 'Optimize metadata for pages lacking search descriptions',
              impact: 'HIGH IMPACT',
              confidence: 'HIGH CONFIDENCE',
              effort: 'LOW EFFORT',
              impactScore: 92,
              description: missingMeta.whyItMatters,
              actionLabel: 'Review AI Recommendations',
              targetRoute: '/recommendations',
              estimatedGain: 'Higher Organic Snippet CTR',
            });
          }

          const brokenPages = issuesData.issues?.find((i: any) => i.severity === 'CRITICAL');
          if (brokenPages) {
            derived.push({
              id: 'opp-broken',
              title: brokenPages.title,
              impact: 'HIGH IMPACT',
              confidence: 'HIGH CONFIDENCE',
              effort: 'LOW EFFORT',
              impactScore: 96,
              description: brokenPages.whyItMatters,
              actionLabel: 'Resolve in Site Audit',
              targetRoute: '/site-audit',
              estimatedGain: 'Immediate Crawl Budget Recovery',
            });
          }

          // Derive opportunity from keywords (positions 4 to 20)
          const almostRanking = kwData.keywords?.filter((k: any) => k.isOpportunity || (k.currentPosition >= 4 && k.currentPosition <= 20));
          if (almostRanking && almostRanking.length > 0) {
            const topKw = almostRanking[0];
            derived.push({
              id: 'opp-kw',
              title: `Push "${topKw.term}" from Position #${topKw.currentPosition?.toFixed(1)} to Page 1`,
              impact: 'HIGH IMPACT',
              confidence: 'HIGH CONFIDENCE',
              effort: 'MEDIUM EFFORT',
              impactScore: 89,
              description: topKw.opportunityNote || `Currently ranking #${topKw.currentPosition}. Improving on-page topic depth and internal links can lift this query into the top 3.`,
              actionLabel: 'View Keyword Movement',
              targetRoute: '/keywords',
              estimatedGain: `+${topKw.searchVolume || 1200} Potential Monthly Impressions`,
            });
          }

          setOpportunities(derived);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-wrapper">
        <TopHeader currentProject={project} />

        <main className="page-container">
          <div className="page-header">
            <div>
              <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Flame color="#f97316" size={26} />
                SEO Opportunity Center
              </h1>
              <p className="page-subtitle">
                Central decision engine ranking high-leverage search growth opportunities derived from real crawler diagnostics and rank data.
              </p>
            </div>
            {project && (
              <Link href="/live-crawl" className="btn btn-secondary btn-sm">
                <Search size={14} />
                Re-crawl Site
              </Link>
            )}
          </div>

          {loading ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              Analyzing search opportunities...
            </div>
          ) : !project ? (
            <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
              <Search size={36} color="var(--accent-cyan)" style={{ margin: '0 auto 1rem' }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                No Website Configured
              </h3>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto 1.5rem', fontSize: '0.9rem' }}>
                Add your website URL to begin discovering high-impact SEO opportunities.
              </p>
              <Link href="/onboarding" className="btn btn-primary btn-sm">
                Add Website
              </Link>
            </div>
          ) : opportunities.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
              <CheckCircle2 size={36} color="var(--color-success)" style={{ margin: '0 auto 1rem' }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                No Active Opportunities Detected Yet
              </h3>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto 1.5rem', fontSize: '0.9rem' }}>
                Crawl your website or track target keywords in the Keywords section to let the algorithmic engine identify rank growth opportunities.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                <Link href="/live-crawl" className="btn btn-primary btn-sm">
                  Run Website Crawl
                </Link>
                <Link href="/keywords" className="btn btn-secondary btn-sm">
                  Track Target Keywords
                </Link>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {opportunities.map((opp) => (
                <div key={opp.id} className="card" style={{ borderLeft: '4px solid #f97316' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div style={{ flex: 1, minWidth: 'min(100%, 260px)' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                        <span className="badge badge-high">{opp.impact}</span>
                        <span className="badge badge-success">{opp.confidence}</span>
                        <span className="badge badge-low">{opp.effort}</span>
                      </div>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', wordBreak: 'break-word' }}>{opp.title}</h3>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Opportunity Score</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f97316' }}>{opp.impactScore}</div>
                    </div>
                  </div>

                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                    {opp.description}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: 'var(--color-success)', fontWeight: 600 }}>
                      <TrendingUp size={16} />
                      <span>Estimated Impact: {opp.estimatedGain}</span>
                    </div>

                    <Link href={opp.targetRoute} className="btn btn-primary btn-sm">
                      <span>{opp.actionLabel}</span>
                      <ArrowRight size={14} />
                    </Link>
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
