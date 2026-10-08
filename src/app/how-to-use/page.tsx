'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Globe2,
  Copy,
  Check,
  Zap,
  Bot,
  Search,
  ShieldCheck,
  Layers,
  ArrowRight,
  ExternalLink,
  HelpCircle,
  ChevronDown,
  Sparkles,
  RefreshCw,
  Code2,
  CheckCircle2,
  Radio,
  FileText,
  Clock,
  ArrowUpRight,
} from 'lucide-react';

export default function HowToUsePage() {
  const [copied, setCopied] = useState(false);
  const [activeCms, setActiveCms] = useState<'shopify' | 'wordpress' | 'webflow' | 'squarespace' | 'wix' | 'custom'>('shopify');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const scriptSnippet = `<script async src="https://apexseo.io/engine.js" data-site="YOUR_SITE_ID"></script>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(scriptSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const cmsGuides = {
    shopify: {
      name: 'Shopify',
      badge: 'Most Popular for E-Commerce',
      icon: '🛍️',
      steps: [
        'Log in to your Shopify Admin dashboard.',
        'Navigate to Online Store → Themes.',
        'Click the three dots (…) next to your current theme and select Edit code.',
        'Under Layout, click on theme.liquid.',
        'Find the closing </head> tag, paste the 1-line script right before it, and click Save.',
      ],
      tip: 'Takes less than 60 seconds. Changes are instantly live across all product, collection, and blog pages.',
    },
    wordpress: {
      name: 'WordPress / WooCommerce',
      badge: 'Works with Any WP Theme',
      icon: '🌐',
      steps: [
        'Log in to your WordPress WP-Admin panel.',
        'Go to Plugins → Add New, search for "WPCode" (or "Insert Headers and Footers") and click Install & Activate.',
        'Go to Code Snippets → Header & Footer in your sidebar.',
        'Paste the 1-line script into the Header box.',
        'Click Save Changes at the bottom.',
      ],
      tip: 'Compatible with Elementor, Divi, Astra, WooCommerce, Yoast, and RankMath without any conflicts.',
    },
    webflow: {
      name: 'Webflow',
      badge: 'Visual Design Platforms',
      icon: '🎨',
      steps: [
        'Open your Webflow Dashboard and select your Project.',
        'Click Project Settings (gear icon) in the top left.',
        'Select the Custom Code tab in the top navigation.',
        'Paste the 1-line script into the Head Code box.',
        'Click Save Changes and then Publish to Selected Domains.',
      ],
      tip: 'The tag will execute on all static and dynamic CMS collection template pages automatically.',
    },
    squarespace: {
      name: 'Squarespace',
      badge: 'Business & Commerce Plans',
      icon: '⬛',
      steps: [
        'Log in to your Squarespace account and open your Website.',
        'Go to Settings → Developer Tools → Code Injection (or Website → Pages → Custom Code).',
        'Paste the 1-line script into the Header area.',
        'Click Save at the top left of the panel.',
      ],
      tip: 'Squarespace caches scripts efficiently. Your optimized tags will execute immediately for all visitors.',
    },
    wix: {
      name: 'Wix Studio',
      badge: 'Wix & Wix Studio',
      icon: '✨',
      steps: [
        'Open your Wix Site Dashboard.',
        'Go to Settings → Custom Code (under the Advanced section).',
        'Click + Add Custom Code in the top right.',
        'Paste the 1-line script, set Place Code in to "Head", and apply to "All Pages".',
        'Click Apply to save and activate.',
      ],
      tip: 'Ensure "Load code once" or "Load on each new page" is selected for seamless single-page-app navigation.',
    },
    custom: {
      name: 'Custom Code (Next.js / HTML)',
      badge: 'Developers & Custom Stacks',
      icon: '⚡',
      steps: [
        'For HTML: Paste the script tag inside the <head>...</head> tag of your index.html.',
        'For Next.js App Router: Add <script async src="https://apexseo.io/engine.js" data-site="YOUR_SITE_ID" /> inside app/layout.tsx inside <head>.',
        'For Nuxt / Svelte / Remix: Insert the script into your root document template head block.',
      ],
      tip: 'The script weighs less than 4KB, executes asynchronously with zero render-blocking, and completes in <10ms.',
    },
  };

  const faqs = [
    {
      q: 'Will this script slow down my website or affect Google PageSpeed?',
      a: 'No. The script is an ultra-lightweight asynchronous snippet (<4 KB) distributed over high-speed global Edge CDN locations. It loads in parallel without blocking HTML parsing or page rendering. In fact, by eliminating metadata errors and streamlining schema injection, many websites experience improved Core Web Vitals rankings.',
    },
    {
      q: 'How long does it take to see ranking and traffic improvements?',
      a: 'Search engines that support the IndexNow protocol (such as Microsoft Bing, Copilot, Yandex, and Naver) receive instant notifications and typically re-crawl updated URLs within 2 to 24 hours. Google typically processes updated meta titles, descriptions, and JSON-LD structured data within 3 to 7 days. Meaningful ranking climb and organic traffic increases are commonly observed over 2 to 4 weeks.',
    },
    {
      q: 'What is the difference between Autonomous Autopilot and Assisted Review?',
      a: 'In Autonomous Mode (recommended), our AI engine continuously audits your pages, generates high-impact titles, descriptions, and schemas, and deploys them to live visitor browsers and search bots automatically. In Assisted Review Mode, recommendations are staged in your dashboard for one-click human approval before being published live.',
    },
    {
      q: 'Can I undo or revert any change made by the engine?',
      a: 'Yes, 100%. Every single modification is saved to a persistent database audit trail with its exact original value. You can revert any page back to its pre-optimized state with a single click in the Change History dashboard, or disable individual override rules anytime.',
    },
    {
      q: 'Does ApexSEO conflict with plugins like Yoast, RankMath, or Shopify SEO apps?',
      a: 'Not at all. ApexSEO operates in harmony with existing setups. If a page already has a well-optimized, non-duplicate meta tag, ApexSEO respects your guardrails. If a tag is missing, truncated, or underperforming, ApexSEO seamlessly injects the enhancement via client DOM override.',
    },
    {
      q: 'Do I need developer skills or access to my web server code?',
      a: 'Zero developer skills required. All you need is the ability to paste 1 line of script into your website header once (just like setting up Google Analytics or Facebook Pixel). Everything else happens automatically in the cloud.',
    },
  ];

  return (
    <div style={{ padding: 'clamp(1rem, 3vw, 2.5rem)', maxWidth: '1180px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }} className="animate-fade-in">
      {/* Page Header */}
      <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.4rem 1rem',
            borderRadius: 'var(--radius-full)',
            background: 'rgba(37, 99, 235, 0.08)',
            border: '1px solid rgba(37, 99, 235, 0.2)',
            color: 'var(--accent-primary)',
            fontSize: '0.85rem',
            fontWeight: 700,
            marginBottom: '1rem',
          }}
          className="shimmer-badge"
        >
          <Sparkles size={15} />
          <span>Complete Beginner-Friendly Walkthrough</span>
        </div>

        <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.75rem)', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1.2, marginBottom: '0.85rem' }}>
          How To Use ApexSEO Autopilot
        </h1>
        <p style={{ fontSize: 'clamp(0.95rem, 1.8vw, 1.15rem)', color: 'var(--text-secondary)', maxWidth: '780px', margin: '0 auto', lineHeight: 1.6 }}>
          Learn how to connect your website in 3 minutes, activate zero-intervention AI optimization, and climb Google search rankings without touching code or hiring expensive SEO agencies.
        </p>

        {/* Quick Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
          <Link href="/activate" className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', fontWeight: 700 }}>
            <Zap size={16} />
            Get 1-Line Embed Tag
          </Link>
          <Link href="/onboarding" className="btn btn-secondary" style={{ padding: '0.75rem 1.5rem', fontWeight: 600 }}>
            <Search size={16} />
            Scan Website Now
          </Link>
        </div>
      </div>

      {/* 4-Step Visual Journey */}
      <div style={{ marginBottom: '3.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            The 4 Simple Steps to SEO Dominance
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            From initial URL input to top-ranking search results in 4 automated stages.
          </p>
        </div>

        <div className="grid-4" style={{ gap: '1.25rem' }}>
          {/* Step 1 */}
          <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(37, 99, 235, 0.1)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                01
              </div>
              <span className="live-pulse-dot" title="Active Step" />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Submit Your Website URL
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              Enter your domain (e.g. <code>mybrand.com</code>). Our cloud crawler instantly scans your live pages, discovers missing meta titles, broken links, and Schema.org gaps.
            </p>
          </div>

          {/* Step 2 */}
          <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(22, 163, 74, 0.1)', color: 'var(--color-success)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                02
              </div>
              <span className="live-pulse-dot" title="Active Step" />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Paste 1-Line Tag Embed
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              Copy the single lightweight script tag and paste it into your CMS header (Shopify, WordPress, Webflow, etc.). It connects your site to the optimization cloud in seconds.
            </p>
          </div>

          {/* Step 3 */}
          <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(217, 119, 6, 0.1)', color: 'var(--color-warning)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                03
              </div>
              <span className="blue-pulse-dot" title="Processing Engine" />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Turn On Autonomous Autopilot
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              Switch Autonomous Driving to ON. Our rotating AI engine (Groq, Gemini 3.8, OpenRouter) generates and injects click-worthy titles, descriptions, and JSON-LD schemas 24/7.
            </p>
          </div>

          {/* Step 4 */}
          <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                04
              </div>
              <span className="live-pulse-dot" title="Active Step" />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Instant IndexNow Bot Pings
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              The moment a page is enhanced, IndexNow notifies Bing, Microsoft Copilot, and Yandex to index your improvements in hours rather than waiting weeks for standard re-crawling.
            </p>
          </div>
        </div>
      </div>

      {/* Interactive CMS Integration Guides */}
      <div className="card" style={{ padding: 'clamp(1.5rem, 3vw, 2.5rem)', marginBottom: '3.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <Code2 size={20} color="var(--accent-primary)" />
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Step-by-Step CMS Installation Guide
              </h2>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Select your platform below to see exact copy-paste instructions for your CMS.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#eff6ff', padding: '0.4rem 0.85rem', borderRadius: 'var(--radius-full)', border: '1px solid #bfdbfe' }}>
            <Clock size={14} color="var(--accent-primary)" />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-primary)' }}>Setup Time: ~2 Minutes</span>
          </div>
        </div>

        {/* CMS Tab Switcher */}
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
          {(Object.keys(cmsGuides) as Array<keyof typeof cmsGuides>).map((key) => {
            const cms = cmsGuides[key];
            const isActive = activeCms === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveCms(key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 1.15rem',
                  borderRadius: 'var(--radius-md)',
                  background: isActive ? 'var(--accent-primary)' : 'var(--bg-dark)',
                  color: isActive ? '#ffffff' : 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  border: isActive ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>{cms.icon}</span>
                <span>{cms.name}</span>
              </button>
            );
          })}
        </div>

        {/* Active CMS Details */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
              <span style={{ fontSize: '1.5rem' }}>{cmsGuides[activeCms].icon}</span>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  How to Install on {cmsGuides[activeCms].name}
                </h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                  {cmsGuides[activeCms].badge}
                </span>
              </div>
            </div>

            <ol style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.55 }}>
              {cmsGuides[activeCms].steps.map((step, idx) => (
                <li key={idx} style={{ paddingLeft: '0.25rem' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Step {idx + 1}:</strong> {step}
                </li>
              ))}
            </ol>

            <div style={{ marginTop: '1.25rem', padding: '0.85rem 1rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--radius-md)', display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
              <CheckCircle2 size={18} color="var(--color-success)" style={{ flexShrink: 0 }} />
              <div style={{ fontSize: '0.85rem', color: '#15803d', fontWeight: 500 }}>
                {cmsGuides[activeCms].tip}
              </div>
            </div>
          </div>

          {/* Script Copy Box */}
          <div style={{ background: 'var(--bg-dark)', padding: '1.25rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Your Universal 1-Line Embed Tag
              </span>
              <button
                type="button"
                onClick={handleCopy}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.45rem 0.85rem',
                  background: copied ? 'var(--color-success)' : 'var(--accent-primary)',
                  color: '#ffffff',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? 'Copied Tag!' : 'Copy Tag'}</span>
              </button>
            </div>

            <pre
              style={{
                background: '#ffffff',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                fontSize: '0.85rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-primary)',
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                lineHeight: 1.6,
              }}
            >
              <code>{scriptSnippet}</code>
            </pre>

            <div style={{ marginTop: '1rem', fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle2 size={13} color="var(--color-success)" />
                <span>Loads asynchronously in under 10ms</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle2 size={13} color="var(--color-success)" />
                <span>Zero impact on Core Web Vitals or PageSpeed</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle2 size={13} color="var(--color-success)" />
                <span>Instant live verification via our dashboard</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Visual System Architecture Diagram */}
      <div className="card" style={{ padding: 'clamp(1.5rem, 3vw, 2.5rem)', marginBottom: '3.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.35rem 0.85rem',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(37, 99, 235, 0.08)',
              color: 'var(--accent-primary)',
              fontSize: '0.8rem',
              fontWeight: 700,
              marginBottom: '0.5rem',
            }}
          >
            <Radio size={14} />
            <span>Autonomous Cloud Pipeline</span>
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Under the Hood: How the Engine Works 24/7
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', maxWidth: '650px', margin: '0 auto' }}>
            A self-healing closed loop combining crawler telemetry, multi-LLM consensus, and edge DOM overrides.
          </p>
        </div>

        {/* Embedded SVG Diagram */}
        <div style={{ width: '100%', overflowX: 'auto', padding: '0.5rem 0', borderRadius: 'var(--radius-md)' }}>
          <img
            src="/images/architecture-flow.svg"
            alt="ApexSEO Autonomous Cloud Pipeline Architecture"
            style={{ width: '100%', minWidth: '700px', height: 'auto', display: 'block' }}
          />
        </div>
      </div>

      {/* Google Search SERP Before & After Illustration */}
      <div className="card" style={{ padding: 'clamp(1.5rem, 3vw, 2.5rem)', marginBottom: '3.5rem', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            What Your Potential Customers Will See in Google
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', maxWidth: '650px', margin: '0 auto' }}>
            Notice the stark difference in click-through rates (CTR) when ApexSEO injects schema rich cards, star ratings, and optimized titles.
          </p>
        </div>

        {/* Embedded SERP Illustration */}
        <div style={{ width: '100%', overflowX: 'auto', padding: '0.5rem 0', borderRadius: 'var(--radius-md)' }}>
          <img
            src="/images/serp-comparison.svg"
            alt="Google Search Before vs After ApexSEO Optimization"
            style={{ width: '100%', minWidth: '700px', height: 'auto', display: 'block' }}
          />
        </div>
      </div>

      {/* Frequently Asked Questions Accordion */}
      <div style={{ marginBottom: '3.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Frequently Asked Questions
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
            Everything you need to know about autonomous SEO, website speed, and indexing safety.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div
                key={index}
                className="card"
                style={{
                  padding: '1.25rem 1.5rem',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s ease',
                }}
                onClick={() => setOpenFaq(isOpen ? null : index)}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <HelpCircle size={18} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
                    <h3 style={{ fontSize: '1.02rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {faq.q}
                    </h3>
                  </div>
                  <ChevronDown
                    size={18}
                    color="var(--text-muted)"
                    style={{
                      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                      flexShrink: 0,
                    }}
                  />
                </div>
                {isOpen && (
                  <p style={{ marginTop: '0.85rem', fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.6, paddingLeft: '2.1rem' }}>
                    {faq.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Final Call to Action */}
      <div
        className="card"
        style={{
          padding: 'clamp(2rem, 4vw, 3rem)',
          textAlign: 'center',
          background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 50%, #f0fdf4 100%)',
          border: '1px solid #bfdbfe',
        }}
      >
        <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
          Ready to Automate Your Website's SEO?
        </h2>
        <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 1.5rem', lineHeight: 1.5 }}>
          Join thousands of modern businesses that stopped paying expensive agencies and let ApexSEO drive their organic search traffic 24/7.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <Link href="/activate" className="btn btn-primary btn-lg" style={{ fontWeight: 700 }}>
            <Zap size={18} />
            Activate Autopilot Tag
          </Link>
          <Link href="/dashboard" className="btn btn-secondary btn-lg" style={{ fontWeight: 600 }}>
            Enter Live Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

