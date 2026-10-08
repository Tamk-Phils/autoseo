'use client';

import { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import TopHeader from '@/components/TopHeader';
import {
  Boxes,
  Globe,
  GitPullRequest,
  Zap,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Trash2,
  ArrowRight,
  Info,
  Key,
  FolderGit2,
  Sparkles,
} from 'lucide-react';

export default function IntegrationsPage() {
  const [project, setProject] = useState<any>(null);
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'wordpress' | 'github' | 'cloudflare'>('wordpress');

  // WordPress Form State
  const [wpUrl, setWpUrl] = useState('');
  const [wpUser, setWpUser] = useState('');
  const [wpPassword, setWpPassword] = useState('');
  const [wpTesting, setWpTesting] = useState(false);
  const [wpStatus, setWpStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  // GitHub Form State (Simplified)
  const [ghToken, setGhToken] = useState('');
  const [ghRepo, setGhRepo] = useState('Tamk-Phils/autoseo');
  const [ghBranch, setGhBranch] = useState('main');
  const [ghTesting, setGhTesting] = useState(false);
  const [ghStatus, setGhStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [ghUser, setGhUser] = useState<any>(null);
  const [ghRepos, setGhRepos] = useState<any[]>([]);
  const [ghLoadingRepos, setGhLoadingRepos] = useState(false);
  const [hasEnvToken, setHasEnvToken] = useState(false);

  // Cloudflare State
  const [copiedWorker, setCopiedWorker] = useState(false);
  const [cfConnecting, setCfConnecting] = useState(false);
  const [cfStatus, setCfStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then((data) => {
        if (data.projects && data.projects.length > 0) {
          const savedId = typeof window !== 'undefined' ? (new URLSearchParams(window.location.search).get('projectId') || localStorage.getItem('activeProjectId')) : null;
          const p = (savedId && data.projects.find((item: any) => item.id === savedId)) || data.projects[0];
          setProject(p);
          if (p.url) {
            setWpUrl(p.url);
          }
          loadIntegrations(p.id);
        } else {
          setLoading(false);
        }
      });

    // Check if server has environment token
    fetch('/api/integrations/github/repos')
      .then((r) => r.json())
      .then((d) => setHasEnvToken(Boolean(d.hasEnvToken)))
      .catch(() => {});
  }, []);

  const loadIntegrations = (projectId: string) => {
    fetch(`/api/integrations?projectId=${projectId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.integrations) {
          setIntegrations(data.integrations);
          // Pre-populate if already connected
          const wp = data.integrations.find((i: any) => i.type === 'WORDPRESS');
          if (wp && wp.config) {
            try {
              const cfg = JSON.parse(wp.config);
              if (cfg.siteUrl) setWpUrl(cfg.siteUrl);
              if (cfg.username) setWpUser(cfg.username);
            } catch {}
          }
          const gh = data.integrations.find((i: any) => i.type === 'GITHUB');
          if (gh && gh.config) {
            try {
              const cfg = JSON.parse(gh.config);
              if (cfg.repo) setGhRepo(cfg.repo);
              if (cfg.defaultBranch) setGhBranch(cfg.defaultBranch);
            } catch {}
          }
        }
        setLoading(false);
      });
  };

  const getIntegration = (type: string) => {
    return integrations.find((i) => i.type === type && i.isConnected);
  };

  // Test & Save WordPress
  const handleTestWordPress = async (save: boolean = false) => {
    if (!project) return;
    setWpTesting(true);
    setWpStatus(null);
    try {
      const res = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          type: 'WORDPRESS',
          name: `WordPress (${new URL(wpUrl).hostname})`,
          config: {
            siteUrl: wpUrl,
            username: wpUser,
            applicationPassword: wpPassword,
          },
          testOnly: !save,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setWpStatus({ success: true, message: data.message });
        if (save) loadIntegrations(project.id);
      } else {
        setWpStatus({ success: false, message: data.error });
      }
    } catch (e: any) {
      setWpStatus({ success: false, message: e.message });
    } finally {
      setWpTesting(false);
    }
  };

  // Fetch repositories from token (simplifies picking repo)
  const fetchUserRepos = async (tokenOverride?: string) => {
    const t = tokenOverride !== undefined ? tokenOverride : ghToken;
    setGhLoadingRepos(true);
    setGhStatus(null);
    try {
      const res = await fetch('/api/integrations/github/repos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: t }),
      });
      const data = await res.json();
      if (data.success) {
        setGhUser(data.user);
        setGhRepos(data.repos || []);
        if (data.repos && data.repos.length > 0) {
          const match = data.repos.find((r: any) => r.fullName.toLowerCase().includes('seo') || r.fullName === ghRepo);
          if (match) {
            setGhRepo(match.fullName);
            setGhBranch(match.defaultBranch || 'main');
          }
        }
        setGhStatus({
          success: true,
          message: `Authenticated as @${data.user.login}. Found ${data.repos.length} accessible repositories.`,
        });
      } else {
        setGhStatus({ success: false, message: data.error });
      }
    } catch (e: any) {
      setGhStatus({ success: false, message: e.message });
    } finally {
      setGhLoadingRepos(false);
    }
  };

  // Smart Repo URL paste cleaner
  const handleRepoInput = (val: string) => {
    let clean = val
      .trim()
      .replace(/^https?:\/\/github\.com\//, '')
      .replace(/^git@github\.com:/, '')
      .replace(/\.git$/, '')
      .replace(/\/+$/, '');
    setGhRepo(clean);
  };

  // Test & Save GitHub
  const handleTestGitHub = async (save: boolean = false) => {
    if (!project) return;
    setGhTesting(true);
    setGhStatus(null);
    try {
      const res = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          type: 'GITHUB',
          name: `GitHub (${ghRepo})`,
          config: {
            token: ghToken,
            repo: ghRepo,
            defaultBranch: ghBranch,
          },
          testOnly: !save,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setGhStatus({ success: true, message: data.message });
        if (save) loadIntegrations(project.id);
      } else {
        setGhStatus({ success: false, message: data.error });
      }
    } catch (e: any) {
      setGhStatus({ success: false, message: e.message });
    } finally {
      setGhTesting(false);
    }
  };

  // Connect Cloudflare Edge
  const handleConnectCloudflare = async () => {
    if (!project) return;
    setCfConnecting(true);
    setCfStatus(null);
    try {
      const res = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          type: 'CLOUDFLARE_EDGE',
          name: `Cloudflare Edge (${project.domain || 'Domain'})`,
          config: {
            activeDomain: project.url,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCfStatus({ success: true, message: 'Cloudflare Edge Proxy activated!' });
        loadIntegrations(project.id);
      } else {
        setCfStatus({ success: false, message: data.error });
      }
    } catch (e: any) {
      setCfStatus({ success: false, message: e.message });
    } finally {
      setCfConnecting(false);
    }
  };

  const handleDisconnect = async (id: string) => {
    if (!confirm('Are you sure you want to disconnect this integration?')) return;
    await fetch(`/api/integrations?id=${id}`, { method: 'DELETE' });
    if (project) loadIntegrations(project.id);
  };

  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const targetDomain = project ? project.url.replace(/^https?:\/\//, '').replace(/\/+$/, '') : 'yourdomain.com';

  const workerScript = `/**
 * ApexSEO Edge Optimizer - Cloudflare Worker
 * Automatically rewrites titles, descriptions, and JSON-LD schemas in <10ms.
 */
const ENGINE_API = "${originUrl}/api/edge/optimize";
const TARGET_DOMAIN = "${targetDomain}";

export default {
  async fetch(request) {
    if (request.method !== "GET") return fetch(request);
    const url = new URL(request.url);
    if (/\\.(css|js|png|jpg|jpeg|gif|svg|webp|ico|woff2?|json|xml|txt)$/i.test(url.pathname)) {
      return fetch(request);
    }
    const response = await fetch(request);
    if (!response.headers.get("content-type")?.includes("text/html")) return response;

    try {
      const rulesRes = await fetch(\`\${ENGINE_API}?domain=\${TARGET_DOMAIN}\`, {
        cf: { cacheTtl: 60, cacheEverything: true }
      });
      if (rulesRes.ok) {
        const { overrides } = await rulesRes.json();
        const rule = overrides?.[url.pathname] || overrides?.[url.pathname.replace(/\\/$/, "")];
        if (rule) {
          let rewriter = new HTMLRewriter();
          if (rule.title) rewriter = rewriter.on("title", { element(e) { e.setInnerContent(rule.title); } });
          if (rule.description) rewriter = rewriter.on('meta[name="description"]', { element(e) { e.setAttribute("content", rule.description); } });
          if (rule.schemaJson) rewriter = rewriter.on("head", { element(e) { e.append(\`\\n<script type="application/ld+json">\${rule.schemaJson}</script>\\n\`, { html: true }); } });
          return rewriter.transform(response);
        }
      }
    } catch (e) {}
    return response;
  }
};`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(workerScript);
    setCopiedWorker(true);
    setTimeout(() => setCopiedWorker(false), 2500);
  };

  const wpConnected = getIntegration('WORDPRESS');
  const ghConnected = getIntegration('GITHUB');
  const cfConnected = getIntegration('CLOUDFLARE_EDGE');

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-wrapper">
        <TopHeader currentProject={project} />

        <main className="page-container">
          <div className="page-header">
            <div>
              <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <Boxes color="var(--accent-cyan)" size={24} />
                Live Publishing & Edge Integrations
              </h1>
              <p className="page-subtitle">
                Push automated SEO fixes straight to your live website via WordPress REST API, GitHub Pull Requests, or Cloudflare Edge Workers.
              </p>
            </div>
          </div>

          {/* Quick Status Cards */}
          <div className="grid-responsive-3" style={{ marginBottom: '1.75rem' }}>
            <div className={`card ${wpConnected ? 'card-success-glow' : ''}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Globe size={20} color={wpConnected ? 'var(--color-success)' : 'var(--text-secondary)'} />
                  <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>WordPress CMS</strong>
                </div>
                {wpConnected ? (
                  <span className="badge badge-success">CONNECTED</span>
                ) : (
                  <span className="badge badge-low">DISCONNECTED</span>
                )}
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                Directly updates page titles, excerpts, Yoast & RankMath meta fields.
              </p>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setActiveTab('wordpress')}
                style={{ width: '100%' }}
              >
                {wpConnected ? 'Manage Settings' : 'Connect WordPress'}
              </button>
            </div>

            <div className={`card ${ghConnected ? 'card-success-glow' : ''}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <GitPullRequest size={20} color={ghConnected ? 'var(--color-success)' : 'var(--text-secondary)'} />
                  <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>GitHub Repos</strong>
                </div>
                {ghConnected ? (
                  <span className="badge badge-success">CONNECTED</span>
                ) : (
                  <span className="badge badge-low">DISCONNECTED</span>
                )}
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                Opens automated SEO fix branches and Pull Requests in your code repo.
              </p>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setActiveTab('github')}
                style={{ width: '100%' }}
              >
                {ghConnected ? 'Manage Settings' : 'Connect GitHub'}
              </button>
            </div>

            <div className={`card ${cfConnected ? 'card-success-glow' : ''}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Zap size={20} color={cfConnected ? 'var(--color-success)' : 'var(--text-secondary)'} />
                  <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>Cloudflare Edge</strong>
                </div>
                {cfConnected ? (
                  <span className="badge badge-success">ACTIVE</span>
                ) : (
                  <span className="badge badge-low">AVAILABLE</span>
                )}
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                Dynamic HTML rewriting proxy for any website (Shopify, Webflow, Custom).
              </p>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setActiveTab('cloudflare')}
                style={{ width: '100%' }}
              >
                {cfConnected ? 'View Edge Worker' : 'Setup Edge Worker'}
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
            <button
              className={`btn btn-sm ${activeTab === 'wordpress' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('wordpress')}
            >
              <Globe size={15} /> WordPress Integration
            </button>
            <button
              className={`btn btn-sm ${activeTab === 'github' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('github')}
            >
              <GitPullRequest size={15} /> GitHub PR Workflow
            </button>
            <button
              className={`btn btn-sm ${activeTab === 'cloudflare' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('cloudflare')}
            >
              <Zap size={15} /> Cloudflare Edge Worker
            </button>
          </div>

          {/* TAB 1: WORDPRESS */}
          {activeTab === 'wordpress' && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    WordPress REST API Publisher
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Directly updates posts, pages, and meta descriptions via authenticated Application Passwords.
                  </p>
                </div>
                {wpConnected && (
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ color: '#ef4444', borderColor: '#ef4444' }}
                    onClick={() => handleDisconnect(wpConnected.id)}
                  >
                    <Trash2 size={14} /> Disconnect
                  </button>
                )}
              </div>

              {wpStatus && (
                <div
                  style={{
                    padding: '0.85rem 1.25rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: wpStatus.success ? 'var(--color-success-bg)' : 'var(--color-critical-bg)',
                    border: `1px solid ${wpStatus.success ? 'var(--color-success)' : 'var(--color-critical)'}`,
                    color: wpStatus.success ? 'var(--color-success)' : 'var(--color-critical)',
                    fontSize: '0.88rem',
                    marginBottom: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  {wpStatus.success ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                  <span>{wpStatus.message}</span>
                </div>
              )}

              <div className="grid-responsive-2">
                <div>
                  <div className="form-group">
                    <label className="form-label">WordPress Site URL</label>
                    <input
                      type="url"
                      className="form-control"
                      value={wpUrl}
                      onChange={(e) => setWpUrl(e.target.value)}
                      placeholder="https://example.com"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">WordPress Admin Username</label>
                    <input
                      type="text"
                      className="form-control"
                      value={wpUser}
                      onChange={(e) => setWpUser(e.target.value)}
                      placeholder="admin"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">WordPress Application Password</label>
                    <input
                      type="password"
                      className="form-control"
                      value={wpPassword}
                      onChange={(e) => setWpPassword(e.target.value)}
                      placeholder="xxxx xxxx xxxx xxxx"
                    />
                    <small style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', display: 'block', marginTop: '0.25rem' }}>
                      Generated in WordPress Admin &gt; Users &gt; Profile &gt; Application Passwords.
                    </small>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleTestWordPress(false)}
                      disabled={wpTesting || !wpUrl || !wpUser || !wpPassword}
                    >
                      <RefreshCw size={14} className={wpTesting ? 'animate-spin' : ''} />
                      {wpTesting ? 'Testing...' : 'Test Connection'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => handleTestWordPress(true)}
                      disabled={wpTesting || !wpUrl || !wpUser || !wpPassword}
                    >
                      <CheckCircle2 size={14} />
                      Save & Connect WordPress
                    </button>
                  </div>
                </div>

                <div style={{ background: 'var(--bg-input)', padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
                  <h4 style={{ fontSize: '0.92rem', color: 'var(--text-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Info size={16} color="var(--accent-cyan)" /> How Application Passwords Work
                  </h4>
                  <ul style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.6', paddingLeft: '1.2rem' }}>
                    <li>Log into your WordPress Dashboard as an Administrator.</li>
                    <li>Go to <strong>Users &gt; Profile</strong> (or Edit User).</li>
                    <li>Scroll down to the <strong>Application Passwords</strong> section.</li>
                    <li>Type "ApexSEO Engine" as the Application Name and click <strong>Add New Application Password</strong>.</li>
                    <li>Copy the 24-character code (format: <code>abcd efgh ijkl mnop</code>) into the field on the left.</li>
                    <li>ApexSEO uses this dedicated token to publish SEO fixes safely without sharing your main password.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GITHUB (SIMPLIFIED) */}
          {activeTab === 'github' && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <GitPullRequest color="var(--accent-cyan)" size={20} />
                    GitHub Automated Pull Requests
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Connect once. Every approved SEO fix opens an automated Pull Request with clear diffs for your engineering team to merge.
                  </p>
                </div>
                {ghConnected && (
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ color: '#ef4444', borderColor: '#ef4444' }}
                    onClick={() => handleDisconnect(ghConnected.id)}
                  >
                    <Trash2 size={14} /> Disconnect
                  </button>
                )}
              </div>

              {/* 1-Click Fast Setup Helper Banner */}
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.08), rgba(99, 102, 241, 0.08))',
                  border: '1px solid rgba(0, 240, 255, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem 1.25rem',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Sparkles size={16} color="var(--accent-cyan)" />
                    Need a token? Use the 1-Click Pre-configured Link
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    Opens GitHub with the exact required permissions (<code>repo</code> scope) pre-checked. Just click "Generate token" at the bottom!
                  </div>
                </div>

                <a
                  href="https://github.com/settings/tokens/new?scopes=repo&description=ApexSEO%20Autonomous%20PR%20Engine"
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary btn-sm"
                  style={{ textDecoration: 'none' }}
                >
                  <ExternalLink size={14} />
                  1-Click Token on GitHub
                </a>
              </div>

              {ghStatus && (
                <div
                  style={{
                    padding: '0.85rem 1.25rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: ghStatus.success ? 'var(--color-success-bg)' : 'var(--color-critical-bg)',
                    border: `1px solid ${ghStatus.success ? 'var(--color-success)' : 'var(--color-critical)'}`,
                    color: ghStatus.success ? 'var(--color-success)' : 'var(--color-critical)',
                    fontSize: '0.88rem',
                    marginBottom: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  {ghStatus.success ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                  <span>{ghStatus.message}</span>
                </div>
              )}

              <div className="grid-2">
                <div>
                  {/* Step 1: Token */}
                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <label className="form-label" style={{ margin: 0 }}>
                        Step 1: Paste GitHub Token
                      </label>
                      {hasEnvToken && (
                        <button
                          type="button"
                          onClick={() => fetchUserRepos('')}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--accent-cyan)',
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                          }}
                        >
                          Use Server GITHUB_TOKEN
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="password"
                        className="form-control"
                        value={ghToken}
                        onChange={(e) => {
                          setGhToken(e.target.value);
                          if (e.target.value.length > 30) {
                            fetchUserRepos(e.target.value);
                          }
                        }}
                        placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      />
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => fetchUserRepos()}
                        disabled={ghLoadingRepos || (!ghToken && !hasEnvToken)}
                        title="Auto-detect all repos accessible by this token"
                      >
                        <RefreshCw size={14} className={ghLoadingRepos ? 'animate-spin' : ''} />
                        {ghLoadingRepos ? 'Detecting...' : 'Detect'}
                      </button>
                    </div>
                  </div>

                  {/* Step 2: Pick or Paste Repo */}
                  <div className="form-group">
                    <label className="form-label">
                      Step 2: Repository (owner/repo or GitHub URL)
                    </label>

                    {ghRepos.length > 0 ? (
                      <div style={{ marginBottom: '0.5rem' }}>
                        <select
                          className="form-control"
                          value={ghRepo}
                          onChange={(e) => {
                            setGhRepo(e.target.value);
                            const found = ghRepos.find((r) => r.fullName === e.target.value);
                            if (found) setGhBranch(found.defaultBranch || 'main');
                          }}
                        >
                          <option value="">-- Choose from your {ghRepos.length} repositories --</option>
                          {ghRepos.map((r) => (
                            <option key={r.id} value={r.fullName}>
                              {r.fullName} {r.isPrivate ? '(Private)' : '(Public)'}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}

                    <input
                      type="text"
                      className="form-control"
                      value={ghRepo}
                      onChange={(e) => handleRepoInput(e.target.value)}
                      placeholder="e.g. Tamk-Phils/autoseo"
                    />
                    <small style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', display: 'block', marginTop: '0.25rem' }}>
                      You can paste your full GitHub URL (e.g. <code>https://github.com/Tamk-Phils/autoseo</code>). It auto-formats.
                    </small>
                  </div>

                  {/* Step 3: Branch */}
                  <div className="form-group">
                    <label className="form-label">Step 3: Base Branch</label>
                    <input
                      type="text"
                      className="form-control"
                      value={ghBranch}
                      onChange={(e) => setGhBranch(e.target.value)}
                      placeholder="main"
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleTestGitHub(false)}
                      disabled={ghTesting || (!ghToken && !hasEnvToken) || !ghRepo}
                    >
                      <RefreshCw size={14} className={ghTesting ? 'animate-spin' : ''} />
                      {ghTesting ? 'Verifying...' : 'Test Connection'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => handleTestGitHub(true)}
                      disabled={ghTesting || (!ghToken && !hasEnvToken) || !ghRepo}
                    >
                      <CheckCircle2 size={14} />
                      Save & Connect Repository
                    </button>
                  </div>
                </div>

                {/* Right side: Live Profile & Safety */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {ghUser ? (
                    <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      {ghUser.avatarUrl && (
                        <img
                          src={ghUser.avatarUrl}
                          alt={ghUser.login}
                          style={{ width: '42px', height: '42px', borderRadius: '50%', border: '1px solid var(--border-color)' }}
                        />
                      )}
                      <div>
                        <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {ghUser.name} <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>@{ghUser.login}</span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <CheckCircle2 size={13} />
                          GitHub Token Authenticated & Ready
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Key size={15} color="var(--accent-cyan)" />
                        Fastest 2-Step Authentication:
                      </div>
                      <ol style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.6', paddingLeft: '1.2rem', margin: 0 }}>
                        <li>Click the <strong>1-Click Token on GitHub</strong> button above.</li>
                        <li>Click the green <strong>Generate token</strong> button on GitHub, paste the token here, and click <strong>Save & Connect</strong>.</li>
                      </ol>
                    </div>
                  )}

                  <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                    <h4 style={{ fontSize: '0.88rem', color: 'var(--text-primary)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <ShieldCheck size={16} color="var(--accent-cyan)" /> How Pull Requests Protect Your Code
                    </h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
                      ApexSEO never modifies your <code>main</code> branch directly. Every optimization opens an isolated branch (e.g. <code>seo-fix-1728...</code>) with clean file diffs, allowing your team to review and merge via standard GitHub PR approvals.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CLOUDFLARE EDGE */}
          {activeTab === 'cloudflare' && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Zero-Code Edge Proxy (Cloudflare Worker)
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Works on ANY website (Shopify, Webflow, custom PHP, React, Next.js). Injects titles, meta descriptions, and schemas dynamically at the edge in &lt;10ms.
                  </p>
                </div>
                <div>
                  {cfConnected ? (
                    <span className="badge badge-success">EDGE PROXY ACTIVE</span>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={handleConnectCloudflare}
                      disabled={cfConnecting}
                    >
                      <Zap size={14} /> Mark Active
                    </button>
                  )}
                </div>
              </div>

              {cfStatus && (
                <div
                  style={{
                    padding: '0.85rem 1.25rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--color-success-bg)',
                    border: '1px solid var(--color-success)',
                    color: 'var(--color-success)',
                    fontSize: '0.88rem',
                    marginBottom: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <CheckCircle2 size={16} />
                  <span>{cfStatus.message}</span>
                </div>
              )}

              <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Cloudflare Worker Code</span>
                <button type="button" className="btn btn-secondary btn-sm" onClick={copyToClipboard}>
                  {copiedWorker ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                  {copiedWorker ? 'Copied to Clipboard!' : 'Copy Script'}
                </button>
              </div>

              <div
                style={{
                  background: '#090d16',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  fontFamily: 'monospace',
                  fontSize: '0.78rem',
                  color: '#94a3b8',
                  maxHeight: '280px',
                  overflowY: 'auto',
                  whiteSpace: 'pre',
                  lineHeight: '1.5',
                  marginBottom: '1.5rem',
                }}
              >
                {workerScript}
              </div>

              <div style={{ background: 'var(--bg-input)', padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
                <h4 style={{ fontSize: '0.92rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                  🚀 3-Minute Deployment Instructions
                </h4>
                <ol style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.6', paddingLeft: '1.2rem' }}>
                  <li>Log in to your <strong>Cloudflare Dashboard</strong> and navigate to <strong>Workers & Pages &gt; Create Application &gt; Create Worker</strong>.</li>
                  <li>Click <strong>Quick Edit</strong>, paste the script copied above, and click <strong>Deploy</strong>.</li>
                  <li>Go to your Website's Cloudflare Zone &gt; <strong>Workers Routes</strong> &gt; Add Route: <code>*{targetDomain}/*</code> pointing to this Worker.</li>
                  <li>That is it! Any recommendation approved in ApexSEO is now instantly served to Googlebot and live visitors without touching your site's codebase.</li>
                </ol>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
