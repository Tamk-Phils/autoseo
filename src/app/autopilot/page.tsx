'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import TopHeader from '@/components/TopHeader';
import {
  Bot,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Save,
} from 'lucide-react';

export default function AutopilotPage() {
  const [project, setProject] = useState<any>(null);
  const [mode, setMode] = useState<string>('ASSISTED');
  const [allowTitle, setAllowTitle] = useState(true);
  const [allowMetaDesc, setAllowMetaDesc] = useState(true);
  const [allowAltText, setAllowAltText] = useState(true);
  const [allowInternalLinking, setAllowInternalLinking] = useState(true);
  const [allowSchema, setAllowSchema] = useState(true);
  const [allowRobotsTxt, setAllowRobotsTxt] = useState(false);
  const [allowRedirects, setAllowRedirects] = useState(false);
  const [allowRewriteContent, setAllowRewriteContent] = useState(false);
  const [allowPublishPages, setAllowPublishPages] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const savedId = typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('projectId') || localStorage.getItem('activeProjectId')
      : null;
    fetch(`/api/autopilot${savedId ? `?projectId=${encodeURIComponent(savedId)}` : ''}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.project) {
          setProject(data.project);
        }
        if (data.config) {
          setMode(data.config.mode || 'ASSISTED');
          setAllowTitle(data.config.allowTitleUpdate);
          setAllowMetaDesc(data.config.allowMetaDescUpdate);
          setAllowAltText(data.config.allowAltTextUpdate);
          setAllowInternalLinking(data.config.allowInternalLinking);
          setAllowSchema(data.config.allowSchemaUpdate);
          setAllowRobotsTxt(data.config.allowRobotsTxtUpdate);
          setAllowRedirects(data.config.allowRedirectsUpdate);
          setAllowRewriteContent(data.config.allowRewriteContent);
          setAllowPublishPages(data.config.allowPublishPages);
        }
      })
      .catch(() => setError('Unable to load autopilot policies.'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/autopilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project?.id,
          config: {
            mode,
            allowTitleUpdate: allowTitle,
            allowMetaDescUpdate: allowMetaDesc,
            allowAltTextUpdate: allowAltText,
            allowInternalLinking,
            allowSchemaUpdate: allowSchema,
            allowRobotsTxtUpdate: allowRobotsTxt,
            allowRedirectsUpdate: allowRedirects,
            allowRewriteContent,
            allowPublishPages,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSavedMessage(true);
        setTimeout(() => setSavedMessage(false), 3000);
      }
      else setError(data.error || 'Unable to save autopilot policies.');
    } catch (e: any) {
      setError(e.message || 'Unable to save autopilot policies.');
    } finally {
      setSaving(false);
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
                <Bot color="var(--accent-cyan)" size={24} />
                SEO Autopilot & Guardrail Policies
              </h1>
              <p className="page-subtitle">
                Configure autonomous execution parameters, safety permissions, and approval requirements for AI optimizations.
              </p>
            </div>
            <button type="button" className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving || loading || !project}>
              <Save size={14} className={saving ? 'animate-spin' : ''} />
              {saving ? 'Saving...' : 'Save Policies'}
            </button>
          </div>

          {savedMessage && (
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
              <span>Autopilot safety policies successfully updated!</span>
            </div>
          )}
          {error && <div className="alert alert-danger" style={{ marginBottom: '1.5rem' }}>{error}</div>}

          {/* Autopilot Mode Selector */}
          <div className="card" style={{ marginBottom: '1.75rem' }}>
            <div className="card-header">
              <h3 className="card-title">Operating Mode</h3>
            </div>

            <div className="grid-3">
              <div
                onClick={() => setMode('OFF')}
                style={{
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: mode === 'OFF' ? 'rgba(56, 189, 248, 0.08)' : 'var(--bg-input)',
                  border: mode === 'OFF' ? '2px solid var(--accent-cyan)' : '1px solid var(--border-color)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>OFF (Read Only)</div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Continuous auditing without automated execution. All changes remain purely informational recommendations.
                </p>
              </div>

              <div
                onClick={() => setMode('ASSISTED')}
                style={{
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: mode === 'ASSISTED' ? 'rgba(56, 189, 248, 0.08)' : 'var(--bg-input)',
                  border: mode === 'ASSISTED' ? '2px solid var(--accent-cyan)' : '1px solid var(--border-color)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>ASSISTED (Recommended)</div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  AI prepares verified fixes and queues them. 1-click manual human authorization required prior to live deployment.
                </p>
              </div>

              <div
                onClick={() => setMode('AUTONOMOUS')}
                style={{
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: mode === 'AUTONOMOUS' ? 'rgba(56, 189, 248, 0.08)' : 'var(--bg-input)',
                  border: mode === 'AUTONOMOUS' ? '2px solid var(--accent-cyan)' : '1px solid var(--border-color)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>AUTONOMOUS (Self-Executing)</div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Engine executes approved categories of safe SEO improvements automatically as soon as verified by the QA agent.
                </p>
              </div>
            </div>
          </div>

          {/* Granular Permissions Section (Section 26 & 445) */}
          <div className="grid-2">
            {/* Safe Automated Actions */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">
                  <ShieldCheck size={18} color="var(--color-success)" />
                  Safe On-Page Permissions
                </h3>
                <span className="badge badge-success">Low Risk</span>
              </div>

              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                Reversible metadata and semantic attributes verified against character bounds and intent matching.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input
                    type="checkbox"
                    checked={allowTitle}
                    onChange={(e) => setAllowTitle(e.target.checked)}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span>Update title tags (SERP snippet alignment)</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input
                    type="checkbox"
                    checked={allowMetaDesc}
                    onChange={(e) => setAllowMetaDesc(e.target.checked)}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span>Update meta descriptions (CTR optimization)</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input
                    type="checkbox"
                    checked={allowAltText}
                    onChange={(e) => setAllowAltText(e.target.checked)}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span>Add missing image alt attributes</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input
                    type="checkbox"
                    checked={allowInternalLinking}
                    onChange={(e) => setAllowInternalLinking(e.target.checked)}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span>Inject contextual internal links</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                  <input
                    type="checkbox"
                    checked={allowSchema}
                    onChange={(e) => setAllowSchema(e.target.checked)}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span>Generate & inject Schema.org JSON-LD</span>
                </label>
              </div>
            </div>

            {/* High-Risk Technical Actions (Manual Approval Required) */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">
                  <Lock size={18} color="var(--color-warning)" />
                  Restricted Technical Guardrails
                </h3>
                <span className="badge badge-medium">High Risk</span>
              </div>

              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                Potentially destructive operations always locked down to protect indexing integrity.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  <input
                    type="checkbox"
                    checked={allowRobotsTxt}
                    onChange={(e) => setAllowRobotsTxt(e.target.checked)}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span>Modify robots.txt crawl rules</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  <input
                    type="checkbox"
                    checked={allowRedirects}
                    onChange={(e) => setAllowRedirects(e.target.checked)}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span>Configure server-side HTTP 301 redirects</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  <input
                    type="checkbox"
                    checked={allowRewriteContent}
                    onChange={(e) => setAllowRewriteContent(e.target.checked)}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span>Rewrite entire page body content</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  <input
                    type="checkbox"
                    checked={allowPublishPages}
                    onChange={(e) => setAllowPublishPages(e.target.checked)}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span>Automatically publish new pages to CMS</span>
                </label>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

