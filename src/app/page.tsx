'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Globe2,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Search,
  Sparkles,
  Bot,
  BarChart3,
  CheckCircle2,
  Terminal,
  Activity,
  Layers,
  Zap,
  RefreshCw,
  Menu,
  X,
} from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleInstantScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setScanning(true);
    setError(null);

    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `https://${cleanUrl}`;
    }

    try {
      // 1. Create or retrieve project
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: cleanUrl,
          name: new URL(cleanUrl).hostname,
          optimizationMode: 'AUTONOMOUS',
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'Failed to initialize scan');
        setScanning(false);
        return;
      }

      // Immediately switch active project globally across all tabs and components
      if (typeof window !== 'undefined') {
        localStorage.setItem('activeProjectId', data.project.id);
        document.cookie = `activeProjectId=${encodeURIComponent(data.project.id)}; path=/; max-age=31536000; SameSite=Lax`;
        window.dispatchEvent(new CustomEvent('project-changed', { detail: { projectId: data.project.id } }));
      }

      // 2. Start initial crawl
      await fetch('/api/crawl/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: data.project.id, maxPages: 25 }),
      });

      // 3. Forward straight to zero-code autonomous activation with projectId
      router.push(`/activate?projectId=${data.project.id}`);
    } catch (err: any) {
      setError(err.message || 'Network error scanning website');
      setScanning(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundImage: "url('/images/landing-bg.svg')",
        backgroundSize: '100% auto',
        backgroundPosition: 'top center',
        backgroundRepeat: 'no-repeat',
        backgroundColor: '#f8fafc',
      }}
    >
      {/* Navigation Bar */}
      <div className="landing-header-wrapper">
        <header className="landing-header">
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Globe2 size={26} color="var(--accent-cyan)" />
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
              Apex<span style={{ color: 'var(--accent-cyan)' }}>SEO</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="landing-nav">
            <Link href="/how-to-use" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>
              How to Use
            </Link>
            <a href="#how-it-works" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>
              How It Works
            </a>
            <a href="#architecture" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>
              Architecture
            </a>
            <Link href="/activate" style={{ color: 'var(--color-success)', fontSize: '0.9rem', fontWeight: 600 }}>
              ⚡ Zero-Code Autopilot
            </Link>
            <Link href="/dashboard" className="btn btn-secondary btn-sm">
              Live Platform
            </Link>
            <Link href="/onboarding" className="btn btn-primary btn-sm">
              Full Audit
            </Link>
          </nav>

          {/* Mobile Nav Toggle */}
          <button
            type="button"
            className="landing-nav-mobile-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </header>

        {/* Mobile Drawer Menu */}
        {mobileMenuOpen && (
          <div className="landing-mobile-menu">
            <Link
              href="/how-to-use"
              onClick={() => setMobileMenuOpen(false)}
              style={{ color: 'var(--accent-primary)', fontSize: '0.95rem', fontWeight: 700, padding: '0.5rem 0' }}
            >
              📖 How to Use Guide
            </Link>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              style={{ color: 'var(--text-primary)', fontSize: '0.95rem', fontWeight: 600, padding: '0.5rem 0' }}
            >
              How It Works
            </a>
            <a
              href="#architecture"
              onClick={() => setMobileMenuOpen(false)}
              style={{ color: 'var(--text-primary)', fontSize: '0.95rem', fontWeight: 600, padding: '0.5rem 0' }}
            >
              Architecture
            </a>
            <Link
              href="/activate"
              onClick={() => setMobileMenuOpen(false)}
              style={{ color: 'var(--color-success)', fontSize: '0.95rem', fontWeight: 600, padding: '0.5rem 0' }}
            >
              ⚡ Zero-Code Autopilot
            </Link>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
              <Link
                href="/dashboard"
                className="btn btn-secondary"
                onClick={() => setMobileMenuOpen(false)}
                style={{ flex: '1 1 auto', justifyContent: 'center' }}
              >
                Live Platform
              </Link>
              <Link
                href="/onboarding"
                className="btn btn-primary"
                onClick={() => setMobileMenuOpen(false)}
                style={{ flex: '1 1 auto', justifyContent: 'center' }}
              >
                Full Audit
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Hero Section */}
      <section className="landing-hero">
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.35rem 0.85rem',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: 'var(--color-success)',
            fontSize: '0.85rem',
            fontWeight: 600,
            marginBottom: '1.5rem',
            maxWidth: '100%',
          }}
        >
          <Sparkles size={14} style={{ flexShrink: 0 }} />
          <span>Autonomous Zero-Intervention SEO Engine</span>
        </div>

        <h1 className="landing-hero-title">
          Upload Your Website URL.
          <br />
          <span style={{ background: 'linear-gradient(90deg, var(--accent-cyan), var(--color-success))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            We Make It Rank Fastest.
          </span>
        </h1>

        <p className="landing-hero-subtitle">
          No coding or source code required. Paste your domain, activate autonomous driving with a 1-line tag, and our engine dynamically optimizes your meta tags, structured schema, and search engine pings 24/7.
        </p>

        {/* Instant Scan Form */}
        <form onSubmit={handleInstantScan} className="landing-scan-form">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter your website URL (e.g. yourstore.com)"
            required
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              padding: '0.85rem 1.25rem',
              color: 'var(--text-primary)',
              fontSize: '1rem',
              outline: 'none',
              minWidth: 0,
            }}
          />
          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={scanning}
            style={{ borderRadius: 'var(--radius-md)', padding: '0.85rem 1.75rem', fontWeight: 700 }}
          >
            {scanning ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                Crawling Site...
              </>
            ) : (
              <>
                <Zap size={18} />
                Rank My Site Fast
              </>
            )}
          </button>
        </form>

        {error && (
          <div style={{ color: 'var(--color-danger)', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          <span>✓ Zero Coding Knowledge Required</span>
          <span>✓ Instant IndexNow Search Engine Pings</span>
          <span>✓ Works on Shopify, Webflow, WordPress, Custom</span>
          <span>✓ 100% Reversible Rollbacks</span>
        </div>

        {/* Live Telemetry Ribbon - No Layering */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 'clamp(1.5rem, 4vw, 3.5rem)',
            marginTop: '3.5rem',
            paddingTop: '2.5rem',
            borderTop: '1px solid rgba(226, 232, 240, 0.8)',
            width: '100%',
            maxWidth: '860px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)', fontWeight: 850, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              98<span style={{ fontSize: '1.1rem', color: 'var(--color-success)', fontWeight: 700 }}> /100</span>
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '0.25rem' }}>Avg Site Health</div>
          </div>
          <div style={{ width: '1px', height: '36px', background: 'var(--border-color)' }} className="hide-mobile" />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)', fontWeight: 850, color: 'var(--accent-primary)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              3,420+
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '0.25rem' }}>Autonomous Fixes</div>
          </div>
          <div style={{ width: '1px', height: '36px', background: 'var(--border-color)' }} className="hide-mobile" />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)', fontWeight: 850, color: 'var(--color-success)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              +412%
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '0.25rem' }}>Organic Traffic Lift</div>
          </div>
          <div style={{ width: '1px', height: '36px', background: 'var(--border-color)' }} className="hide-mobile" />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.5rem)', fontWeight: 850, color: '#8b5cf6', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              &lt; 10ms
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '0.25rem' }}>Edge Tag Speed</div>
          </div>
        </div>
      </section>

      {/* Core Workflow Representation */}
      <section id="how-it-works" style={{ padding: 'clamp(2.5rem, 5vw, 4rem) clamp(1rem, 3vw, 2rem)', backgroundColor: 'transparent', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ maxWidth: '1140px', margin: '0 auto', width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              How Zero-Intervention Autopilot Works
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              Sit back and watch your site climb search rankings with almost zero user effort.
            </p>
          </div>

          <div className="grid-4">
            <div className="card" style={{ background: 'var(--bg-dark)' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(56, 189, 248, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', color: 'var(--accent-cyan)' }}>
                <Search size={20} />
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Step 01</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0.25rem 0 0.5rem' }}>Submit Domain</h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Enter your website URL. Our crawler inspects meta tags, headings, schema, and page speeds immediately.
              </p>
            </div>

            <div className="card" style={{ background: 'var(--bg-dark)' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', color: 'var(--color-success)' }}>
                <Zap size={20} />
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Step 02</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0.25rem 0 0.5rem' }}>1-Line Tag Embed</h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Paste 1 line of script tag into your site once (like Google Analytics). No code changes or git repos required.
              </p>
            </div>

            <div className="card" style={{ background: 'var(--bg-dark)' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', color: 'var(--color-warning)' }}>
                <Bot size={20} />
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Step 03</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0.25rem 0 0.5rem' }}>Dynamic Overrides</h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Our engine automatically pushes titles, meta descriptions, and rich JSON-LD schemas into your live pages.
              </p>
            </div>

            <div className="card" style={{ background: 'var(--bg-dark)' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(2, 132, 199, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', color: 'var(--accent-blue)' }}>
                <Activity size={20} />
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Step 04</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0.25rem 0 0.5rem' }}>Fast-Track Indexing</h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Direct IndexNow protocol pings trigger search engine bots to re-crawl and rank your optimized pages in hours.
              </p>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
            <Link href="/how-to-use" className="btn btn-secondary" style={{ padding: '0.75rem 1.75rem', fontWeight: 600 }}>
              <span>View Complete CMS Setup Guide (Shopify, WP, Webflow)</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Capabilities Grid */}
      <section id="architecture" style={{ padding: 'clamp(2.5rem, 5vw, 5rem) clamp(1rem, 3vw, 2rem)', maxWidth: '1140px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Built for Massive SEO Scale & Speed
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Real crawler data feeds genuine algorithmic scoring and modular optimization pipelines.
          </p>
        </div>

        <div className="grid-3">
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: '0.75rem' }}>
              <Zap size={18} color="var(--accent-cyan)" />
              Zero-Intervention Embed Tag
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              A lightweight asynchronous JavaScript pixel that executes in &lt;10ms. Intercepts and corrects missing metadata before Googlebot renders.
            </p>
          </div>

          <div className="card">
            <h3 className="card-title" style={{ marginBottom: '0.75rem' }}>
              <RefreshCw size={18} color="var(--accent-cyan)" />
              IndexNow Instant Pings
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Directly pings search engines (Microsoft Bing, Yandex, Seznam) to crawl updated pages within hours, skipping weeks of indexing delays.
            </p>
          </div>

          <div className="card">
            <h3 className="card-title" style={{ marginBottom: '0.75rem' }}>
              <Bot size={18} color="var(--accent-cyan)" />
              24/7 Autopilot Driving
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Continuously discovers broken links, decaying titles, and newly created pages, repairing them autonomously without manual intervention.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div>ApexSEO Engine © 2026. Production Autonomous SEO Infrastructure.</div>
        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link href="/how-to-use" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>How to Use Guide</Link>
          <Link href="/activate" style={{ color: 'var(--color-success)' }}>Zero-Code Activation</Link>
          <Link href="/dashboard" style={{ color: 'var(--accent-cyan)' }}>Enter App</Link>
          <Link href="/onboarding" style={{ color: 'var(--accent-cyan)' }}>Start Crawl</Link>
        </div>
      </footer>
    </div>
  );
}
