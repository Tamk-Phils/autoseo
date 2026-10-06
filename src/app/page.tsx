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
} from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      // 2. Start initial crawl
      await fetch('/api/crawl/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: data.project.id, maxPages: 25 }),
      });

      // 3. Forward straight to zero-code autonomous activation
      router.push('/activate');
    } catch (err: any) {
      setError(err.message || 'Network error scanning website');
      setScanning(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-dark)' }}>
      {/* Navigation */}
      <header
        style={{
          height: '72px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 3rem',
          backgroundColor: 'rgba(7, 13, 25, 0.85)',
          backdropFilter: 'blur(10px)',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <Globe2 size={26} color="var(--accent-cyan)" />
          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>
            Apex<span style={{ color: 'var(--accent-cyan)' }}>SEO</span>
          </span>
        </div>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
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
            View Live Platform
          </Link>
          <Link href="/onboarding" className="btn btn-primary btn-sm">
            Full Audit
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section style={{ padding: '5.5rem 2rem 4rem', textAlign: 'center', maxWidth: '980px', margin: '0 auto' }}>
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
          }}
        >
          <Sparkles size={14} />
          Autonomous Zero-Intervention SEO Engine
        </div>

        <h1
          style={{
            fontSize: '3.6rem',
            fontWeight: 800,
            color: '#fff',
            letterSpacing: '-0.04em',
            lineHeight: 1.15,
            marginBottom: '1.25rem',
          }}
        >
          Upload Your Website URL.
          <br />
          <span style={{ background: 'linear-gradient(90deg, var(--accent-cyan), var(--color-success))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            We Make It Rank Fastest.
          </span>
        </h1>

        <p
          style={{
            fontSize: '1.2rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            maxWidth: '720px',
            margin: '0 auto 2.5rem',
          }}
        >
          No coding or source code required. Paste your domain, activate autonomous driving with a 1-line tag, and our engine dynamically optimizes your meta tags, structured schema, and search engine pings 24/7.
        </p>

        {/* Instant Scan Form */}
        <form
          onSubmit={handleInstantScan}
          style={{
            maxWidth: '680px',
            margin: '0 auto 1.5rem',
            display: 'flex',
            background: 'rgba(15, 23, 42, 0.8)',
            border: '2px solid rgba(56, 189, 248, 0.4)',
            borderRadius: 'var(--radius-lg)',
            padding: '0.45rem',
            boxShadow: '0 8px 32px rgba(0, 240, 255, 0.15)',
          }}
        >
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
              color: '#fff',
              fontSize: '1rem',
              outline: 'none',
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
          <div style={{ color: 'var(--color-critical)', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem', flexWrap: 'wrap' }}>
          <span>✓ Zero Coding Knowledge Required</span>
          <span>✓ Instant IndexNow Search Engine Pings</span>
          <span>✓ Works on Shopify, Webflow, WordPress, Custom</span>
          <span>✓ 100% Reversible Rollbacks</span>
        </div>
      </section>

      {/* Core Workflow Representation */}
      <section id="how-it-works" style={{ padding: '4rem 2rem', backgroundColor: 'var(--bg-card)', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ maxWidth: '1140px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
              How Zero-Intervention Autopilot Works
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              Sit back and watch your site climb search rankings with almost zero user effort.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '1.5rem',
              position: 'relative',
            }}
          >
            <div className="card" style={{ background: 'var(--bg-dark)' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(56, 189, 248, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', color: 'var(--accent-cyan)' }}>
                <Search size={20} />
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Step 01</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', margin: '0.25rem 0 0.5rem' }}>Submit Domain</h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                Enter your website URL. Our crawler inspects meta tags, headings, schema, and page speeds immediately.
              </p>
            </div>

            <div className="card" style={{ background: 'var(--bg-dark)' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', color: 'var(--color-success)' }}>
                <Zap size={20} />
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Step 02</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', margin: '0.25rem 0 0.5rem' }}>1-Line Tag Embed</h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                Paste 1 line of script tag into your site once (like Google Analytics). No code changes or git repos required.
              </p>
            </div>

            <div className="card" style={{ background: 'var(--bg-dark)' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', color: 'var(--color-warning)' }}>
                <Bot size={20} />
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Step 03</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', margin: '0.25rem 0 0.5rem' }}>Dynamic Overrides</h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                Our engine automatically pushes titles, meta descriptions, and rich JSON-LD schemas into your live pages.
              </p>
            </div>

            <div className="card" style={{ background: 'var(--bg-dark)' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(2, 132, 199, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', color: 'var(--accent-blue)' }}>
                <Activity size={20} />
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Step 04</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', margin: '0.25rem 0 0.5rem' }}>Fast-Track Indexing</h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                Direct IndexNow protocol pings trigger search engine bots to re-crawl and rank your optimized pages in hours.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Capabilities Grid */}
      <section id="architecture" style={{ padding: '5rem 2rem', maxWidth: '1140px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
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
      <footer style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', padding: '2rem 3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        <div>ApexSEO Engine © 2026. Production Autonomous SEO Infrastructure.</div>
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <Link href="/activate" style={{ color: 'var(--color-success)' }}>Zero-Code Activation</Link>
          <Link href="/dashboard" style={{ color: 'var(--accent-cyan)' }}>Enter App</Link>
          <Link href="/onboarding" style={{ color: 'var(--accent-cyan)' }}>Start Crawl</Link>
        </div>
      </footer>
    </div>
  );
}
