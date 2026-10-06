import Link from 'next/link';
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
} from 'lucide-react';

export default function LandingPage() {
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
          <a href="#guardrails" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>
            Safety Guardrails
          </a>
          <Link href="/dashboard" className="btn btn-secondary btn-sm">
            View Live Platform
          </Link>
          <Link href="/onboarding" className="btn btn-primary btn-sm">
            Analyze My Website
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section style={{ padding: '6rem 2rem 5rem', textAlign: 'center', maxWidth: '1080px', margin: '0 auto' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.35rem 0.85rem',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            color: 'var(--accent-cyan)',
            fontSize: '0.85rem',
            fontWeight: 600,
            marginBottom: '1.75rem',
          }}
        >
          <Sparkles size={14} />
          Autonomous AI SEO Platform
        </div>

        <h1
          style={{
            fontSize: '3.6rem',
            fontWeight: 800,
            color: '#fff',
            letterSpacing: '-0.04em',
            lineHeight: 1.15,
            marginBottom: '1.5rem',
          }}
        >
          Your Website’s AI SEO Engineer
        </h1>

        <p
          style={{
            fontSize: '1.25rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            maxWidth: '780px',
            margin: '0 auto 2.5rem',
          }}
        >
          Analyze, optimize, monitor, and continuously improve your website’s search visibility with an autonomous
          AI-powered SEO engine built on real crawling and verifiable technical best practices.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
          <Link href="/onboarding" className="btn btn-primary btn-lg">
            <span>Analyze My Website</span>
            <ArrowRight size={18} />
          </Link>
          <Link href="/dashboard" className="btn btn-secondary btn-lg">
            <span>Explore Live Demo</span>
          </Link>
        </div>

        <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'center', gap: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          <span>✓ Real SSRF-Protected Crawler</span>
          <span>✓ Zero Hardcoded Scores</span>
          <span>✓ Safe Autopilot Approvals</span>
          <span>✓ 100% Reversible Rollbacks</span>
        </div>
      </section>

      {/* Core Workflow Representation (Section 5 & 1) */}
      <section id="how-it-works" style={{ padding: '4rem 2rem', backgroundColor: 'var(--bg-card)', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ maxWidth: '1140px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
              The Closed Autonomous SEO Loop
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              Don’t just list errors. Discover what matters most, generate precision fixes, and execute safely.
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
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', margin: '0.25rem 0 0.5rem' }}>Website Crawler</h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                Crawls your domain, respects robots.txt, parses sitemap.xml, checks canonical tags, and records real server responses.
              </p>
            </div>

            <div className="card" style={{ background: 'var(--bg-dark)' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', color: 'var(--color-success)' }}>
                <Cpu size={20} />
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Step 02</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', margin: '0.25rem 0 0.5rem' }}>AI Multi-Agent Analysis</h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                Specialized agents examine Technical SEO, Content Quality, Search Intent, Structured Data, and Link Architecture.
              </p>
            </div>

            <div className="card" style={{ background: 'var(--bg-dark)' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', color: 'var(--color-warning)' }}>
                <Bot size={20} />
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Step 03</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', margin: '0.25rem 0 0.5rem' }}>Precision Optimization</h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                Optimization Agent drafts validated metadata, alt tags, and schema. QA Agent guarantees adherence to quality standards.
              </p>
            </div>

            <div className="card" style={{ background: 'var(--bg-dark)' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(2, 132, 199, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', color: 'var(--accent-blue)' }}>
                <Activity size={20} />
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Step 04</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', margin: '0.25rem 0 0.5rem' }}>Search Performance</h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                Track rank movement, impressions, and CTR changes. Continuous crawler sweeps verify applied fixes and alert to regressions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Capabilities Grid */}
      <section id="architecture" style={{ padding: '5rem 2rem', maxWidth: '1140px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
            Engineered for Modern Web Architecture
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Real crawler data feeds genuine algorithmic scoring and modular optimization pipelines.
          </p>
        </div>

        <div className="grid-3">
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: '0.75rem' }}>
              <Terminal size={18} color="var(--accent-cyan)" />
              Real Crawler Engine
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Real-time asynchronous crawler respecting robots.txt directives and parsing XML sitemaps. Built-in SSRF protection verifies DNS and rejects internal address spaces.
            </p>
          </div>

          <div className="card">
            <h3 className="card-title" style={{ marginBottom: '0.75rem' }}>
              <Layers size={18} color="var(--accent-cyan)" />
              Dynamic Optimization Score
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Calculated purely from detected status codes, canonical health, heading hierarchy, content depth, and response latency. No hardcoded or fabricated scores.
            </p>
          </div>

          <div className="card">
            <h3 className="card-title" style={{ marginBottom: '0.75rem' }}>
              <Bot size={18} color="var(--accent-cyan)" />
              Autonomous Autopilot Modes
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Configure granular safety permissions. Choose between Analyze Only, Assisted Approval, or Autonomous Execution for safe on-page metadata.
            </p>
          </div>

          <div className="card">
            <h3 className="card-title" style={{ marginBottom: '0.75rem' }}>
              <BarChart3 size={18} color="var(--accent-cyan)" />
              Search Console Integration
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Direct OAuth synchronization with Google Search Console. Uncovers high-impression low-CTR queries and pages ranking between positions 4 and 20.
            </p>
          </div>

          <div className="card">
            <h3 className="card-title" style={{ marginBottom: '0.75rem' }}>
              <ShieldCheck size={18} color="var(--color-success)" />
              Automated QA Gatekeeper
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Every AI recommendation is independently verified by a QA agent to prevent keyword stuffing, truncated snippets, and broken canonical links before deployment.
            </p>
          </div>

          <div className="card">
            <h3 className="card-title" style={{ marginBottom: '0.75rem' }}>
              <CheckCircle2 size={18} color="var(--color-success)" />
              1-Click Reversible Rollbacks
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Complete change log capturing original value, proposed value, applied timestamp, and executor. Instant rollback restored with one click.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', padding: '2rem 3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        <div>ApexSEO Engine © 2026. Production Autonomous SEO Infrastructure.</div>
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <Link href="/dashboard" style={{ color: 'var(--accent-cyan)' }}>Enter App</Link>
          <Link href="/onboarding" style={{ color: 'var(--accent-cyan)' }}>Start Crawl</Link>
        </div>
      </footer>
    </div>
  );
}

