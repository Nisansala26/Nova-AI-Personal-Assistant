import { useState, useEffect } from 'react';
import {
  BarChart3,
  MessageSquare,
  Mic,
  CheckCircle2,
  Clock3,
  FileText,
  RotateCcw,
  Zap,
  Activity,
  Layers,
  TrendingUp,
} from 'lucide-react';
import { getAnalyticsStats } from '../../services/api';

export default function AnalyticsView() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadData() {
    try {
      setLoading(true);
      setError('');
      const data = await getAnalyticsStats();
      setStats(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  return (
    <div className="module-container">
      <div className="module-hero" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div className="module-badge">
            <BarChart3 size={14} />
            <span>REAL-TIME SYSTEM TELEMETRY</span>
          </div>
          <h2>Assistant Analytics Dashboard</h2>
          <p>
            Monitor live usage metrics, voice interaction ratios, task productivity, and AI performance computed directly from your SQLite database.
          </p>
        </div>

        <button
          type="button"
          className="btn-secondary"
          onClick={loadData}
          disabled={loading}
          style={{ marginTop: '10px' }}
          title="Refresh metrics from backend"
        >
          <RotateCcw size={14} className={loading ? 'spin-slow' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading && !stats ? (
        <p className="no-history">Querying database metrics...</p>
      ) : stats ? (
        <>
          {/* Top 4 KPI Metrics Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '22px' }}>
            <div className="module-card" style={{ padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.08em' }}>
                  CONVERSATIONS
                </span>
                <MessageSquare size={16} className="text-accent" />
              </div>
              <strong style={{ fontSize: '26px', color: '#fff', fontWeight: 800 }}>
                {stats.overview.total_conversations}
              </strong>
              <small style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                {stats.overview.total_messages} messages recorded
              </small>
            </div>

            <div className="module-card" style={{ padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.08em' }}>
                  VOICE INTERACTION
                </span>
                <Mic size={16} style={{ color: '#38bdf8' }} />
              </div>
              <strong style={{ fontSize: '26px', color: '#fff', fontWeight: 800 }}>
                {stats.overview.voice_percentage}%
              </strong>
              <small style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                {stats.overview.voice_commands} of {stats.overview.total_commands} voice commands
              </small>
            </div>

            <div className="module-card" style={{ padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.08em' }}>
                  TASK COMPLETION
                </span>
                <CheckCircle2 size={16} className="text-success" />
              </div>
              <strong style={{ fontSize: '26px', color: '#fff', fontWeight: 800 }}>
                {stats.tasks.completion_rate}%
              </strong>
              <small style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                {stats.tasks.completed} done · {stats.tasks.pending} pending
              </small>
            </div>

            <div className="module-card" style={{ padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.08em' }}>
                  AVG AI LATENCY
                </span>
                <Zap size={16} style={{ color: '#f59e0b' }} />
              </div>
              <strong style={{ fontSize: '26px', color: '#fff', fontWeight: 800 }}>
                {stats.overview.avg_response_time_ms} ms
              </strong>
              <small style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '4px', display: 'block' }}>
                Groq LPU benchmark
              </small>
            </div>
          </div>

          {/* Detailed Telemetry Grid */}
          <div className="module-content-grid">
            {/* Left: Command Usage & Knowledge Stats */}
            <div className="module-card">
              <h3 className="card-heading">
                <TrendingUp size={16} />
                <span>Command & Knowledge Metrics</span>
              </h3>

              {/* Voice vs Typed Breakdown Bar */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                  <span>Voice vs Typed Commands</span>
                  <span style={{ fontWeight: 600 }}>{stats.overview.voice_percentage}% Voice</span>
                </div>
                <div style={{ height: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden', display: 'flex' }}>
                  <div style={{ width: `${stats.overview.voice_percentage}%`, background: 'var(--grad-primary)' }} />
                  <div style={{ width: `${100 - stats.overview.voice_percentage}%`, background: '#38bdf8' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  <span>{stats.overview.voice_commands} Spoken</span>
                  <span>{stats.overview.typed_commands} Typed</span>
                </div>
              </div>

              {/* Document Knowledge Metrics */}
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
                <strong style={{ fontSize: '12px', color: '#fff', display: 'block', marginBottom: '10px' }}>
                  Knowledge Extraction
                </strong>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)' }}>
                    <span style={{ display: 'block', fontSize: '20px', fontWeight: 700, color: '#fff' }}>
                      {stats.documents.total_documents}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Documents Uploaded</span>
                  </div>
                  <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)' }}>
                    <span style={{ display: 'block', fontSize: '20px', fontWeight: 700, color: '#fff' }}>
                      {stats.documents.total_words_processed.toLocaleString()}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Words Extracted</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Live Chronological Activity Feed */}
            <div className="module-card">
              <h3 className="card-heading">
                <Activity size={16} />
                <span>Recent System Activity</span>
              </h3>

              <div className="task-items-container" style={{ maxHeight: '320px' }}>
                {stats.recent_activity.length === 0 ? (
                  <p className="no-history">No activity recorded yet.</p>
                ) : (
                  stats.recent_activity.map((act, idx) => (
                    <div key={idx} className="task-row">
                      <div className="check-bubble" style={{ fontSize: '10px', width: '22px', height: '22px' }}>
                        {act.type === 'task' ? '✓' : act.type === 'document' ? '📄' : '💬'}
                      </div>
                      <div className="task-info">
                        <strong style={{ fontSize: '12px', color: '#fff' }}>{act.title}</strong>
                        <div className="task-meta-tags">
                          <span className="meta-tag category">{act.category}</span>
                          <span className="meta-tag category" style={{ color: 'var(--text-accent)' }}>
                            {act.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
