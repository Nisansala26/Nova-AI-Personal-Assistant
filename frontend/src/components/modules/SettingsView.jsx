import { useState, useEffect } from 'react';
import {
  Settings,
  Volume2,
  Mic,
  Moon,
  Sun,
  Shield,
  Download,
  Trash2,
  Database,
  Monitor,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { clearHistory, getMemories, deleteMemory } from '../../services/api';

export default function SettingsView({
  theme,
  setTheme,
  voiceConfig,
  setVoiceConfig,
  availableVoices = [],
}) {
  const [memories, setMemories] = useState([]);
  const [loadingMemories, setLoadingMemories] = useState(false);
  const [desktopEnabled, setDesktopEnabled] = useState(() => {
    try {
      return localStorage.getItem('nova_desktop_enabled') !== 'false';
    } catch {
      return true;
    }
  });
  const [defaultSearch, setDefaultSearch] = useState(() => {
    try {
      return localStorage.getItem('nova_default_search') || 'google';
    } catch {
      return 'google';
    }
  });
  const [toast, setToast] = useState('');

  useEffect(() => {
    void loadMemories();
  }, []);

  function showNotice(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  }

  async function loadMemories() {
    try {
      setLoadingMemories(true);
      const data = await getMemories();
      setMemories(data);
    } catch {
      // ignore
    } finally {
      setLoadingMemories(false);
    }
  }

  async function handleDeleteMemory(id) {
    try {
      await deleteMemory(id);
      setMemories((prev) => prev.filter((m) => m.id !== id));
      showNotice('Memory removed.');
    } catch {
      // ignore
    }
  }

  function handleDesktopToggle(val) {
    setDesktopEnabled(val);
    try {
      localStorage.setItem('nova_desktop_enabled', String(val));
    } catch {
      // ignore
    }
    showNotice(val ? 'Windows desktop automation enabled.' : 'Windows desktop automation disabled.');
  }

  function handleSearchChange(engine) {
    setDefaultSearch(engine);
    try {
      localStorage.setItem('nova_default_search', engine);
    } catch {
      // ignore
    }
    showNotice(`Default search set to ${engine.toUpperCase()}.`);
  }

  function handleExportData() {
    try {
      const exportBlob = new Blob(
        [
          JSON.stringify(
            {
              exportedAt: new Date().toISOString(),
              theme,
              voiceConfig,
              memories,
              desktopEnabled,
            },
            null,
            2
          ),
        ],
        { type: 'application/json' }
      );
      const url = URL.createObjectURL(exportBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Nova_AI_Settings_Export_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showNotice('Settings exported successfully!');
    } catch (err) {
      showNotice(`Export failed: ${err.message}`);
    }
  }

  async function handleClearAllHistory() {
    if (window.confirm('Are you sure you want to clear your local command history?')) {
      try {
        await clearHistory();
        showNotice('Command history cleared.');
      } catch (err) {
        showNotice(err.message);
      }
    }
  }

  return (
    <div className="module-container">
      <div className="module-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 className="module-title">Settings & Preferences</h2>
            <span className="badge-tag cyan">v3.0</span>
          </div>
          <p className="module-desc">
            Configure Nova AI voice speech, desktop automation, privacy memories, and visual themes.
          </p>
        </div>
      </div>

      {toast && (
        <div className="action-notice-toast success" style={{ marginBottom: '16px' }}>
          <CheckCircle2 size={16} className="text-success" />
          <span>{toast}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Voice & Speech Card */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Volume2 size={18} className="text-accent" />
            <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>Speech & Voice</strong>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label className="form-label">TTS Voice Profile</label>
            <select
              value={voiceConfig.voiceURI}
              onChange={(e) => setVoiceConfig((v) => ({ ...v, voiceURI: e.target.value }))}
              className="form-input"
            >
              {availableVoices.length === 0 ? (
                <option value="">Default System Voice</option>
              ) : (
                availableVoices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))
              )}
            </select>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
              <span>Speech Rate</span>
              <span>{voiceConfig.rate.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.7"
              max="1.5"
              step="0.1"
              value={voiceConfig.rate}
              onChange={(e) => setVoiceConfig((v) => ({ ...v, rate: parseFloat(e.target.value) }))}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
            <span style={{ fontSize: '0.85rem' }}>Auto-speak answers</span>
            <input
              type="checkbox"
              checked={voiceConfig.autoSpeak}
              onChange={(e) => setVoiceConfig((v) => ({ ...v, autoSpeak: e.target.checked }))}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
            <div>
              <span style={{ fontSize: '0.85rem', display: 'block' }}>&quot;Hey Nova&quot; Wake Word</span>
              <small style={{ color: 'var(--text-muted)' }}>Hands-free speech detection</small>
            </div>
            <input
              type="checkbox"
              checked={voiceConfig.wakeWordEnabled}
              onChange={(e) => setVoiceConfig((v) => ({ ...v, wakeWordEnabled: e.target.checked }))}
            />
          </div>
        </div>

        {/* Desktop Automation & Security Card */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Monitor size={18} className="text-accent" />
            <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>Windows Desktop Automation</strong>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div>
              <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>Enable Desktop Service</span>
              <small style={{ color: 'var(--text-muted)', display: 'block' }}>
                Open Notepad, Calculator, Explorer, VS Code, Chrome
              </small>
            </div>
            <input
              type="checkbox"
              checked={desktopEnabled}
              onChange={(e) => handleDesktopToggle(e.target.checked)}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label className="form-label">Default Web Search Engine</label>
            <select
              value={defaultSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="form-input"
            >
              <option value="google">Google</option>
              <option value="youtube">YouTube</option>
              <option value="github">GitHub</option>
              <option value="stackoverflow">Stack Overflow</option>
              <option value="wikipedia">Wikipedia</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.85rem' }}>Visual Theme</span>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            >
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
              <span>{theme === 'dark' ? 'Studio Light' : 'Cyber Dark'}</span>
            </button>
          </div>
        </div>

        {/* Long-Term Memory Controls Card */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Database size={18} className="text-accent" />
              <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>AI Long-Term Memories</strong>
            </div>
            <span className="badge-tag cyan">{memories.length} stored</span>
          </div>

          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
            Stored preferences and personal context injected into Groq prompts. You can delete any memory at any time.
          </p>

          {loadingMemories ? (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Loading memories...</div>
          ) : memories.length === 0 ? (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', padding: '10px 0' }}>
              No long-term memories stored yet. Tell Nova your favorite tools or preferences to populate memory.
            </div>
          ) : (
            <div style={{ maxHeight: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {memories.map((m) => (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    fontSize: '0.82rem',
                  }}
                >
                  <div>
                    <strong>{m.memory_key}:</strong> <span>{m.memory_value}</span>
                  </div>
                  <button
                    type="button"
                    className="icon-btn text-danger"
                    onClick={() => handleDeleteMemory(m.id)}
                    title="Delete memory"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Data & Privacy Card */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Shield size={18} className="text-accent" />
            <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>Privacy & Data Export</strong>
          </div>

          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Your API keys remain exclusively on your local server. Data is stored locally in your SQLite database.
          </p>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button type="button" className="btn-primary" onClick={handleExportData}>
              <Download size={14} />
              <span>Export Settings</span>
            </button>
            <button type="button" className="btn-danger" onClick={handleClearAllHistory}>
              <Trash2 size={14} />
              <span>Clear History</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
