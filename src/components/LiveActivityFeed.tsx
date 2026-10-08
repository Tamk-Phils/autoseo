'use client';

import { useState, useEffect } from 'react';
import {
  Activity,
  Search,
  Sparkles,
  Zap,
  ShieldCheck,
  Globe,
  Boxes,
  CheckCircle2,
  Clock,
  RefreshCw,
} from 'lucide-react';

interface ActivityItem {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: string;
  timestamp: string;
  status: string;
}

export default function LiveActivityFeed({ projectId }: { projectId: string }) {
  const [events, setEvents] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivity = () => {
    if (!projectId) return;
    fetch(`/api/projects/${projectId}/activity`)
      .then((r) => r.json())
      .then((data) => {
        if (data.events) {
          setEvents(data.events);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchActivity();
    // Keep the dashboard close to live while the crawler is running.
    const interval = setInterval(fetchActivity, 2000);
    return () => clearInterval(interval);
  }, [projectId]);

  const getIcon = (category: string) => {
    switch (category) {
      case 'INDEXING':
        return <Zap size={16} color="var(--accent-cyan)" />;
      case 'OPTIMIZATION':
        return <Sparkles size={16} color="var(--color-success)" />;
      case 'CRAWL':
        return <Search size={16} color="#38bdf8" />;
      case 'TELEMETRY':
        return <ShieldCheck size={16} color="var(--color-success)" />;
      case 'SETUP':
        return <Globe size={16} color="var(--accent-cyan)" />;
      default:
        return <Activity size={16} color="var(--accent-cyan)" />;
    }
  };

  const formatTime = (ts: string) => {
    try {
      const diffSec = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
      if (diffSec < 60) return 'Just now';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
      return `${Math.floor(diffSec / 86400)}d ago`;
    } catch {
      return 'Recent';
    }
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="card-header" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Activity size={18} color="var(--accent-cyan)" />
          <h3 className="card-title">Live Autonomous Action Stream</h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }}></span>
            LIVE
          </span>
          <button
            type="button"
            onClick={fetchActivity}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            title="Refresh stream"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
        Real-time log of every action executed by the autonomous engine: crawl passes, AI optimizations, and search engine indexing pings.
      </p>

      {loading && events.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
          <RefreshCw size={16} className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
          Loading activity stream...
        </div>
      ) : events.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
          <Clock size={24} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
          Waiting for next engine pass. Actions will appear here live.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '420px', overflowY: 'auto' }}>
          {events.map((evt) => (
            <div
              key={evt.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.85rem',
                padding: '0.85rem 1rem',
                background: 'var(--bg-input)',
                borderRadius: 'var(--radius-md)',
                borderLeft: `3px solid ${
                  evt.category === 'INDEXING'
                    ? 'var(--accent-cyan)'
                    : evt.category === 'OPTIMIZATION'
                    ? 'var(--color-success)'
                    : 'rgba(56, 189, 248, 0.5)'
                }`,
              }}
            >
              <div
                style={{
                  marginTop: '2px',
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {getIcon(evt.category)}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                  <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {evt.title}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {formatTime(evt.timestamp)}
                  </span>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                  {evt.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

