'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import TopHeader from '@/components/TopHeader';
import {
  Zap,
  CheckCircle2,
  Copy,
  Check,
  Send,
  Sparkles,
  Bot,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Globe2,
  Clock,
  ArrowRight,
  CreditCard,
} from 'lucide-react';
import Link from 'next/link';

export default function ActivatePage() {
  const [project, setProject] = useState<any>(null);
  const [copiedTag, setCopiedTag] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<{ installed?: boolean; message?: string } | null>(null);
  const [indexing, setIndexing] = useState(false);
  const [indexStatus, setIndexStatus] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<'STARTER' | 'AUTOPILOT' | 'SCALE'>('AUTOPILOT');
  const [paying, setPaying] = useState(false);
  const [planActivated, setPlanActivated] = useState(false);

  useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then((data) => {
        if (data.projects && data.projects.length > 0) {
          setProject(data.projects[0]);
        }
      });
  }, []);

  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const siteId = project?.id || 'demo-project-id';
  const embedSnippet = `<script src="${originUrl}/engine.js" data-site="${siteId}" async></script>`;

  const copySnippet = () => {
    navigator.clipboard.writeText(embedSnippet);
    setCopiedTag(true);
    setTimeout(() => setCopiedTag(false), 2500);
  };

  const handleVerify = async () => {
    if (!project) return;
    setVerifying(true);
    setVerifyStatus(null);
    try {
      const res = await fetch('/api/tag/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id }),
      });
      const data = await res.json();
      setVerifyStatus(data);
    } catch (e: any) {
      setVerifyStatus({ installed: false, message: e.message });
    } finally {
      setVerifying(false);
    }
  };

  const handleIndexNow = async () => {
    if (!project) return;
    setIndexing(true);
    setIndexStatus(null);
    try {
      const res = await fetch('/api/indexing/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id }),
      });
      const data = await res.json();
      if (data.success) {
        setIndexStatus(`Dispatched ${data.urlsCount} URLs to IndexNow & search engines for priority crawl.`);
      } else {
        setIndexStatus(data.error || 'Failed to ping engines');
      }
    } catch (e: any) {
      setIndexStatus(e.message);
    } finally {
      setIndexing(false);
    }
  };

  const handlePayment = () => {
    setPaying(true);
    setTimeout(() => {
      setPaying(false);
      setPlanActivated(true);
    }, 1200);
  };

  const mailtoSubject = encodeURIComponent(`Please install the 1-line SEO tag on ${project?.domain || 'our website'}`);
  const mailtoBody = encodeURIComponent(
    `Hi,\n\nPlease paste this 1-line script tag into our website's <head> section so our AI SEO Engine can automatically optimize our meta tags, schema, and search rankings:\n\n${embedSnippet}\n\nThank you!`
  );

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-wrapper">
        <TopHeader currentProject={project} />

        <main className="page-container">
          <div className="page-header">
            <div>
              <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Zap color="var(--accent-cyan)" size={24} />
                Zero-Intervention Autonomous Activation
              </h1>
              <p className="page-subtitle">
                Paste the 1-line embed snippet once. The engine will automatically optimize your pages, inject schema, and push your site to rank fastest.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleIndexNow}
                disabled={indexing || !project}
              >
                <RefreshCw size={14} className={indexing ? 'animate-spin' : ''} />
                {indexing ? 'Pinging Search Engines...' : '⚡ Ping Search Engines (IndexNow)'}
              </button>
            </div>
          </div>

          {indexStatus && (
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
              <span>{indexStatus}</span>
            </div>
          )}

          {/* Pricing & Activation Banner */}
          <div
            className="card"
            style={{
              marginBottom: '2rem',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(56, 189, 248, 0.08))',
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
              <div>
                <span className="badge badge-success" style={{ marginBottom: '0.35rem' }}>
                  {planActivated ? 'ACTIVE SUBSCRIPTION' : 'AUTOPILOT MEMBERSHIP'}
                </span>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fff', margin: '0.2rem 0' }}>
                  {planActivated ? 'Autopilot Active — 24/7 Hands-Free SEO Driving' : 'Select Autopilot Tier & Start Ranking Faster'}
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Zero developer knowledge required. Automatic continuous crawl, dynamic schema injection, and search engine pings.
                </p>
              </div>

              {!planActivated && (
                <button
                  type="button"
                  className="btn btn-primary btn-lg"
                  onClick={handlePayment}
                  disabled={paying}
                >
                  <CreditCard size={18} />
                  {paying ? 'Processing...' : `Activate ${selectedPlan} Plan Now`}
                </button>
              )}
            </div>

            {!planActivated && (
              <div className="grid-3">
                <div
                  onClick={() => setSelectedPlan('STARTER')}
                  style={{
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    border: `2px solid ${selectedPlan === 'STARTER' ? 'var(--accent-cyan)' : 'var(--border-color)'}`,
                    background: selectedPlan === 'STARTER' ? 'rgba(56, 189, 248, 0.1)' : 'var(--bg-input)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <strong style={{ color: '#fff', fontSize: '0.95rem' }}>Starter Scan</strong>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>$29/mo</span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
                    Weekly audits, 1-line tag deployment, 25 pages optimized.
                  </p>
                </div>

                <div
                  onClick={() => setSelectedPlan('AUTOPILOT')}
                  style={{
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    border: `2px solid ${selectedPlan === 'AUTOPILOT' ? 'var(--color-success)' : 'var(--border-color)'}`,
                    background: selectedPlan === 'AUTOPILOT' ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-input)',
                    cursor: 'pointer',
                    position: 'relative',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: '-10px',
                      right: '12px',
                      background: 'var(--color-success)',
                      color: '#000',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '10px',
                    }}
                  >
                    MOST POPULAR
                  </span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <strong style={{ color: '#fff', fontSize: '0.95rem' }}>Autonomous Autopilot</strong>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-success)' }}>$79/mo</span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
                    Daily continuous sweeps, real-time DOM overrides, IndexNow auto-pings, up to 500 pages.
                  </p>
                </div>

                <div
                  onClick={() => setSelectedPlan('SCALE')}
                  style={{
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    border: `2px solid ${selectedPlan === 'SCALE' ? 'var(--accent-cyan)' : 'var(--border-color)'}`,
                    background: selectedPlan === 'SCALE' ? 'rgba(56, 189, 248, 0.1)' : 'var(--bg-input)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <strong style={{ color: '#fff', fontSize: '0.95rem' }}>Enterprise Scale</strong>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>$199/mo</span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
                    Hourly sweeps, full schema graphs, competitor monitoring, unlimited pages.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* STEP 1: 1-Line Embed Tag */}
          <div className="card" style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-cyan)', textTransform: 'uppercase' }}>
                  Zero-Intervention Step 1
                </span>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', margin: '0.2rem 0' }}>
                  Paste This 1 Line into Your Website
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Works on Shopify, Webflow, WordPress, Squarespace, Wix, or Google Tag Manager.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <a
                  href={`mailto:?subject=${mailtoSubject}&body=${mailtoBody}`}
                  className="btn btn-secondary btn-sm"
                  style={{ textDecoration: 'none' }}
                >
                  <Send size={14} /> Send to My Web Designer
                </a>
                <button type="button" className="btn btn-primary btn-sm" onClick={copySnippet}>
                  {copiedTag ? <Check size={14} /> : <Copy size={14} />}
                  {copiedTag ? 'Copied to Clipboard!' : 'Copy 1-Line Tag'}
                </button>
              </div>
            </div>

            {/* Code Box */}
            <div
              style={{
                background: '#090d16',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem 1.25rem',
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                color: 'var(--accent-cyan)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.5rem',
                wordBreak: 'break-all',
              }}
            >
              <code>{embedSnippet}</code>
            </div>

            {/* Test & Verify Installation */}
            <div
              style={{
                background: 'var(--bg-input)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div>
                <strong style={{ fontSize: '0.92rem', color: '#fff', display: 'block', marginBottom: '0.2rem' }}>
                  Verify Installation
                </strong>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Our crawler will inspect your homepage right now to confirm the tag is active.
                </span>
              </div>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleVerify}
                disabled={verifying || !project}
              >
                <RefreshCw size={14} className={verifying ? 'animate-spin' : ''} />
                {verifying ? 'Scanning Live Site...' : 'Test & Verify Tag'}
              </button>
            </div>

            {verifyStatus && (
              <div
                style={{
                  marginTop: '1rem',
                  padding: '0.85rem 1.25rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: verifyStatus.installed ? 'var(--color-success-bg)' : 'var(--color-critical-bg)',
                  border: `1px solid ${verifyStatus.installed ? 'var(--color-success)' : 'var(--color-critical)'}`,
                  color: verifyStatus.installed ? 'var(--color-success)' : 'var(--color-critical)',
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                {verifyStatus.installed ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                <span>{verifyStatus.message}</span>
              </div>
            )}
          </div>

          {/* Supported CMS Badges */}
          <div className="card">
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fff', marginBottom: '1rem' }}>
              Where to paste the 1-line tag (Takes 30 seconds):
            </h4>
            <div className="grid-3" style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <strong style={{ color: '#fff', display: 'block', marginBottom: '0.25rem' }}>🛍️ Shopify</strong>
                Go to <strong>Online Store &gt; Themes &gt; Edit Code</strong>, open <code>theme.liquid</code>, and paste right above <code>&lt;/head&gt;</code>.
              </div>
              <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <strong style={{ color: '#fff', display: 'block', marginBottom: '0.25rem' }}>🔷 WordPress</strong>
                Go to <strong>Settings &gt; Insert Headers and Footers</strong> (or theme header settings) and paste in Scripts in Header.
              </div>
              <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <strong style={{ color: '#fff', display: 'block', marginBottom: '0.25rem' }}>🌐 Webflow / Wix / Squarespace</strong>
                Go to <strong>Site Settings &gt; Custom Code</strong> and paste in the Head Code section.
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
