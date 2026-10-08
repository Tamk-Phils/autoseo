'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Globe,
  ArrowRight,
  ShieldCheck,
  Bot,
  Eye,
  CheckCircle2,
  Sparkles,
  GitBranch,
  FileCode,
  Layers,
  ChevronLeft,
  RefreshCw,
} from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [url, setUrl] = useState('');
  const [projectName, setProjectName] = useState('');
  const [mode, setMode] = useState<'ANALYZE_ONLY' | 'ASSISTED' | 'AUTONOMOUS'>('AUTONOMOUS');
  const [periodDays, setPeriodDays] = useState('14');
  const [selectedIntegrations, setSelectedIntegrations] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleIntegration = (type: string) => {
    setSelectedIntegrations((prev) =>
      prev.includes(type) ? prev.filter((i) => i !== type) : [...prev, type]
    );
  };

  const handleFinish = async () => {
    setLoading(true);
    setError(null);

    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `https://${cleanUrl}`;
    }

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: cleanUrl,
          name: projectName.trim() || new URL(cleanUrl).hostname,
          optimizationMode: mode,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Failed to create project');
        setLoading(false);
        return;
      }

      const crawlRes = await fetch('/api/crawl/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: data.project.id, maxPages: 25, periodDays: Number(periodDays) }),
      });

      const crawlData = await crawlRes.json();
      if (!crawlRes.ok || !crawlData.success) {
        setError(crawlData.error || 'Website connected, but the SEO run could not start');
        setLoading(false);
        return;
      }

      router.push(`/live-crawl?jobId=${crawlData.crawlJobId}&projectId=${data.project.id}`);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-dark)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
      }}
    >
      <div style={{ width: '100%', maxWidth: '640px' }}>
        {/* Progress Tracker */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: step >= 1 ? 'var(--accent-primary)' : 'var(--bg-surface)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.85rem',
                color: 'var(--text-primary)',
              }}
            >
              1
            </div>
            <span style={{ fontSize: '0.85rem', color: step >= 1 ? '#fff' : 'var(--text-muted)' }}>Target Website</span>
          </div>

          <div style={{ flex: 1, height: '2px', backgroundColor: 'var(--border-color)', margin: '0 1rem' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: step >= 2 ? 'var(--accent-primary)' : 'var(--bg-surface)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.85rem',
                color: 'var(--text-primary)',
              }}
            >
              2
            </div>
            <span style={{ fontSize: '0.85rem', color: step >= 2 ? '#fff' : 'var(--text-muted)' }}>Autopilot Mode</span>
          </div>

          <div style={{ flex: 1, height: '2px', backgroundColor: 'var(--border-color)', margin: '0 1rem' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: step >= 3 ? 'var(--accent-primary)' : 'var(--bg-surface)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.85rem',
                color: 'var(--text-primary)',
              }}
            >
              3
            </div>
            <span style={{ fontSize: '0.85rem', color: step >= 3 ? '#fff' : 'var(--text-muted)' }}>Integrations</span>
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: '1rem',
              backgroundColor: 'var(--color-danger-bg)',
              border: '1px solid var(--color-danger)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-danger)',
              fontSize: '0.88rem',
              marginBottom: '1.5rem',
            }}
          >
            {error}
          </div>
        )}

        <div className="card">
          {/* STEP 1: Add Website */}
          {step === 1 && (
            <div>
              <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                  Add your website
                </h2>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                  Enter the canonical domain URL for continuous automated crawling and technical auditing.
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">Website Domain or URL</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="url"
                    className="form-control"
                    placeholder="https://example.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    style={{ paddingLeft: '2.5rem' }}
                    autoFocus
                  />
                  <Globe
                    size={16}
                    color="var(--text-muted)"
                    style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Project Name (Optional)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. My SaaS Platform"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">SEO Run Period</label>
                <select className="form-control" value={periodDays} onChange={(e) => setPeriodDays(e.target.value)}>
                  <option value="7">7 days</option>
                  <option value="14">14 days</option>
                  <option value="30">30 days</option>
                  <option value="90">90 days</option>
                </select>
              </div>

              <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!url.trim()}
                  onClick={() => {
                    setError(null);
                    setStep(2);
                  }}
                >
                  Continue to Mode Selection
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Choose Optimization Mode */}
          {step === 2 && (
            <div>
              <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                  Choose your optimization mode
                </h2>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                  Control how autonomously the AI SEO engine operates on your project.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                {/* Analyze Only */}
                <div
                  onClick={() => setMode('ANALYZE_ONLY')}
                  style={{
                    border: mode === 'ANALYZE_ONLY' ? '2px solid var(--accent-cyan)' : '1px solid var(--border-color)',
                    backgroundColor: mode === 'ANALYZE_ONLY' ? 'rgba(56, 189, 248, 0.08)' : 'var(--bg-input)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.25rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '1rem',
                  }}
                >
                  <Eye size={22} color="var(--accent-cyan)" style={{ marginTop: '0.2rem' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1rem', marginBottom: '0.25rem' }}>
                      Analyze Only
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      The system continuously crawls and analyzes the website, audits issues, and scores performance, but never executes modifications.
                    </p>
                  </div>
                </div>

                {/* Assisted Optimization */}
                <div
                  onClick={() => setMode('ASSISTED')}
                  style={{
                    border: mode === 'ASSISTED' ? '2px solid var(--accent-cyan)' : '1px solid var(--border-color)',
                    backgroundColor: mode === 'ASSISTED' ? 'rgba(56, 189, 248, 0.08)' : 'var(--bg-input)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.25rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '1rem',
                  }}
                >
                  <ShieldCheck size={22} color="var(--color-warning)" style={{ marginTop: '0.2rem' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1rem' }}>Assisted Optimization</span>
                      <span className="badge badge-medium">Recommended</span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      The system identifies high-impact opportunities, prepares verified fixes, and waits for your manual 1-click review and approval.
                    </p>
                  </div>
                </div>

                {/* Autonomous Optimization */}
                <div
                  onClick={() => setMode('AUTONOMOUS')}
                  style={{
                    border: mode === 'AUTONOMOUS' ? '2px solid var(--accent-cyan)' : '1px solid var(--border-color)',
                    backgroundColor: mode === 'AUTONOMOUS' ? 'rgba(56, 189, 248, 0.08)' : 'var(--bg-input)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.25rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '1rem',
                  }}
                >
                  <Bot size={22} color="var(--color-success)" style={{ marginTop: '0.2rem' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1rem', marginBottom: '0.25rem' }}>
                      Autonomous Optimization
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      The system automatically deploys approved categories of safe SEO improvements (meta titles, descriptions, schema, alt tags) with instant rollback history.
                    </p>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>
                  <ChevronLeft size={16} />
                  Back
                </button>
                <button type="button" className="btn btn-primary" onClick={() => setStep(3)}>
                  Continue to Integrations
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Optional Integrations */}
          {step === 3 && (
            <div>
              <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                  Connect integrations (Optional)
                </h2>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                  Integrate data pipelines and publishing targets. You can skip this step and connect them anytime from Settings.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                {[
                  { id: 'GSC', name: 'Google Search Console', icon: Layers, desc: 'Real search impressions & rank positions' },
                  { id: 'GA4', name: 'Google Analytics 4', icon: Sparkles, desc: 'Organic traffic & visitor engagement' },
                  { id: 'WP', name: 'WordPress CMS', icon: FileCode, desc: 'Direct on-page metadata publishing' },
                  { id: 'GH', name: 'GitHub Repository', icon: GitBranch, desc: 'Automated PRs for technical SEO fixes' },
                  { id: 'SHOPIFY', name: 'Shopify Store', icon: Layers, desc: 'E-commerce schema & product SEO' },
                  { id: 'WEBFLOW', name: 'Webflow CMS', icon: Layers, desc: 'Live publishing sync via Webflow API' },
                ].map((item) => {
                  const Icon = item.icon;
                  const isChecked = selectedIntegrations.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleIntegration(item.id)}
                      style={{
                        padding: '1rem',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: isChecked ? 'rgba(56, 189, 248, 0.08)' : 'var(--bg-input)',
                        border: isChecked ? '1px solid var(--accent-cyan)' : '1px solid var(--border-color)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                          <Icon size={16} color="var(--accent-cyan)" />
                          {item.name}
                        </div>
                        {isChecked && <CheckCircle2 size={16} color="var(--accent-cyan)" />}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.desc}</div>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setStep(2)}>
                  <ChevronLeft size={16} />
                  Back
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={loading}
                  onClick={handleFinish}
                >
                  {loading ? <><RefreshCw size={16} className="animate-spin" /> Initializing Engine...</> : 'Start Website Crawl'}
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

