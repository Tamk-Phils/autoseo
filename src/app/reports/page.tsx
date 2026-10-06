'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import TopHeader from '@/components/TopHeader';
import {
  FileCheck2,
  Download,
  Printer,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Globe,
  Share2,
  Search,
} from 'lucide-react';
import Link from 'next/link';

export default function ReportsPage() {
  const [project, setProject] = useState<any>(null);
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then(async (data) => {
        if (data.projects && data.projects.length > 0) {
          const savedId = typeof window !== 'undefined' ? (new URLSearchParams(window.location.search).get('projectId') || localStorage.getItem('activeProjectId')) : null;
          const current = (savedId && data.projects.find((p: any) => p.id === savedId)) || data.projects[0];
          setProject(current);
          const iRes = await fetch(`/api/issues?projectId=${current.id}`);
          const iData = await iRes.json();
          if (iData.issues) {
            setIssues(iData.issues);
          }
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleExportCsv = () => {
    let csvContent = 'data:text/csv;charset=utf-8,Category,Issue,Severity,Solution,Impact\n';
    issues.forEach((iss) => {
      const cleanTitle = `"${(iss.title || '').replace(/"/g, '""')}"`;
      const cleanSol = `"${(iss.solution || '').replace(/"/g, '""')}"`;
      csvContent += `${iss.category},${cleanTitle},${iss.severity},${cleanSol},${iss.estimatedImpact}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `seo_audit_report_${project?.domain || 'site'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
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
                <FileCheck2 color="var(--accent-cyan)" size={24} />
                Executive SEO Audit Report
              </h1>
              <p className="page-subtitle">
                Print-ready and exportable audit summary detailing algorithmic health, issues, and executed optimizations.
              </p>
            </div>
            {project && (
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={handleExportCsv} disabled={issues.length === 0}>
                  <Download size={14} />
                  Export CSV
                </button>
                <button type="button" className="btn btn-primary btn-sm" onClick={handlePrint}>
                  <Printer size={14} />
                  Print / Save PDF
                </button>
              </div>
            )}
          </div>

          {!project ? (
            <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
              <FileCheck2 size={36} color="var(--accent-cyan)" style={{ margin: '0 auto 1rem' }} />
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
                No Website Configured
              </h3>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto 1.5rem', fontSize: '0.9rem' }}>
                Add your website URL and run a crawl to generate an executive SEO audit report.
              </p>
              <Link href="/onboarding" className="btn btn-primary btn-sm">
                Add Website
              </Link>
            </div>
          ) : (
            /* Printable Report Document Card */
            <div className="card" style={{ maxWidth: '900px', margin: '0 auto', padding: '2.5rem' }}>
              {/* Header / Brand */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid var(--border-color)', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
                <div>
                  <span className="badge badge-low" style={{ marginBottom: '0.5rem' }}>ApexSEO Autonomous Engine</span>
                  <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff' }}>
                    Technical SEO Audit & Performance Summary
                  </h2>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    Target Domain: <strong style={{ color: 'var(--accent-cyan)' }}>{project.domain}</strong>
                  </div>
                </div>

                <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <div>Generated: {new Date().toLocaleDateString()}</div>
                  <div>Audit Engine: v1.0.0 Autonomous</div>
                </div>
              </div>

              {/* Section 1: Executive Summary */}
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
                  1. Executive Summary
                </h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  The automated crawler evaluated URLs for {project.domain}, analyzing on-page HTML, response latencies, canonical structures, heading hierarchy, and structured data tags. The overall calculated Optimization Score is{' '}
                  <strong style={{ color: 'var(--color-success)' }}>{project.seoScore || 0}/100</strong>.
                </p>
              </div>

              {/* Section 2: Score Breakdown Table */}
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem' }}>
                  2. Algorithmic Optimization Dimensions
                </h3>
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Dimension</th>
                        <th>Score</th>
                        <th>Max</th>
                        <th>Status Assessment</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ fontWeight: 600 }}>Technical SEO</td>
                        <td style={{ fontWeight: 700, color: '#fff' }}>{project.technicalScore || 0}</td>
                        <td>25</td>
                        <td><span className="badge badge-low">Verified</span></td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 600 }}>Content & Headings</td>
                        <td style={{ fontWeight: 700, color: '#fff' }}>{project.contentScore || 0}</td>
                        <td>25</td>
                        <td><span className="badge badge-low">Verified</span></td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 600 }}>Indexability</td>
                        <td style={{ fontWeight: 700, color: '#fff' }}>{project.indexabilityScore || 0}</td>
                        <td>15</td>
                        <td><span className="badge badge-low">Verified</span></td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 600 }}>Response Speed & Latency</td>
                        <td style={{ fontWeight: 700, color: '#fff' }}>{project.performanceScore || 0}</td>
                        <td>10</td>
                        <td><span className="badge badge-low">Verified</span></td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 600 }}>Internal Linking Distribution</td>
                        <td style={{ fontWeight: 700, color: '#fff' }}>{project.internalLinkScore || 0}</td>
                        <td>10</td>
                        <td><span className="badge badge-low">Verified</span></td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 600 }}>Structured Data (Schema.org)</td>
                        <td style={{ fontWeight: 700, color: '#fff' }}>{project.structuredDataScore || 0}</td>
                        <td>15</td>
                        <td><span className="badge badge-low">Verified</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 3: Detected Issues */}
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem' }}>
                  3. Priority Action Plan ({issues.length} Issues Detected)
                </h3>
                {issues.length === 0 ? (
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                    No critical issues currently detected. Run a crawl to refresh diagnostic findings.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {issues.map((iss, idx) => (
                      <div key={idx} style={{ background: 'var(--bg-input)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ color: '#fff' }}>{iss.title}</strong>
                          <span className={`badge badge-${iss.severity.toLowerCase()}`}>{iss.severity}</span>
                        </div>
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                          {iss.solution}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
