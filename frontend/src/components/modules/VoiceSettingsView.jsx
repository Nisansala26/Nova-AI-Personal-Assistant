import { useState, useEffect } from 'react';
import {
  Settings2,
  Volume2,
  Sliders,
  Play,
  RotateCcw,
  Sparkles,
  CheckCircle,
  Mic,
  Radio,
} from 'lucide-react';

export default function VoiceSettingsView({ voiceConfig, onUpdateVoiceConfig }) {
  const [voices, setVoices] = useState([]);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    function loadVoices() {
      if ('speechSynthesis' in window) {
        const available = window.speechSynthesis.getVoices();
        if (available && available.length > 0) {
          setVoices(available);
        }
      }
    }

    loadVoices();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const handleTestVoice = () => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    setTesting(true);

    const testPhrases = [
      "Hello! I'm Nova, your intelligent assistant. How does my voice sound to you?",
      "Voice synthesis initialized. All systems are running smoothly.",
      "Greetings! Ready to collaborate and get things done today.",
    ];
    const phrase = testPhrases[Math.floor(Math.random() * testPhrases.length)];

    const utterance = new SpeechSynthesisUtterance(phrase);
    utterance.rate = voiceConfig.rate || 1;
    utterance.pitch = voiceConfig.pitch || 1;
    utterance.volume = voiceConfig.volume ?? 1;

    if (voiceConfig.voiceURI && voices.length) {
      const match = voices.find((v) => v.voiceURI === voiceConfig.voiceURI);
      if (match) utterance.voice = match;
    }

    utterance.onend = () => setTesting(false);
    utterance.onerror = () => setTesting(false);

    window.speechSynthesis.speak(utterance);
  };

  const handleReset = () => {
    onUpdateVoiceConfig({
      voiceURI: '',
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
      autoSpeak: true,
    });
  };

  return (
    <div className="module-container">
      <div className="module-hero">
        <div className="module-badge">
          <Settings2 size={14} />
          <span>VOICE & AUDIO LAB</span>
        </div>
        <h2>Personalize Nova's Voice</h2>
        <p>Tune speech synthesis speed, pitch, accent, and audio playback behavior.</p>
      </div>

      <div className="module-content-grid">
        {/* Left Column: Voice Engine Controls */}
        <div className="module-card">
          <h3 className="card-heading">
            <Radio size={16} />
            <span>Speech Engine</span>
          </h3>

          <div className="setting-group">
            <label className="setting-label">Selected Voice</label>
            <select
              className="custom-select"
              value={voiceConfig.voiceURI || ''}
              onChange={(e) => onUpdateVoiceConfig({ ...voiceConfig, voiceURI: e.target.value })}
            >
              <option value="">Default System Voice</option>
              {voices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
            <span className="setting-hint">
              {voices.length} synthesized {voices.length === 1 ? 'voice' : 'voices'} detected in your browser
            </span>
          </div>

          <div className="setting-group">
            <div className="slider-header">
              <label className="setting-label">Speaking Rate (Speed)</label>
              <span className="slider-value">{voiceConfig.rate.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.6"
              max="1.6"
              step="0.05"
              value={voiceConfig.rate}
              onChange={(e) =>
                onUpdateVoiceConfig({ ...voiceConfig, rate: parseFloat(e.target.value) })
              }
              className="custom-range"
            />
            <div className="range-marks">
              <span>Slower (0.6x)</span>
              <span>Normal (1.0x)</span>
              <span>Faster (1.6x)</span>
            </div>
          </div>

          <div className="setting-group">
            <div className="slider-header">
              <label className="setting-label">Vocal Pitch</label>
              <span className="slider-value">{voiceConfig.pitch.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.05"
              value={voiceConfig.pitch}
              onChange={(e) =>
                onUpdateVoiceConfig({ ...voiceConfig, pitch: parseFloat(e.target.value) })
              }
              className="custom-range"
            />
            <div className="range-marks">
              <span>Lower (0.5)</span>
              <span>Neutral (1.0)</span>
              <span>Higher (1.5)</span>
            </div>
          </div>

          <div className="setting-group">
            <div className="slider-header">
              <label className="setting-label">Volume Level</label>
              <span className="slider-value">{Math.round((voiceConfig.volume ?? 1) * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={voiceConfig.volume ?? 1}
              onChange={(e) =>
                onUpdateVoiceConfig({ ...voiceConfig, volume: parseFloat(e.target.value) })
              }
              className="custom-range"
            />
          </div>

          <div className="button-row">
            <button
              type="button"
              className="btn-primary"
              onClick={handleTestVoice}
              disabled={testing}
            >
              <Play size={16} />
              <span>{testing ? 'Speaking...' : 'Test Voice'}</span>
            </button>
            <button type="button" className="btn-secondary" onClick={handleReset}>
              <RotateCcw size={15} />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Right Column: Audio Behaviors & Microphone */}
        <div className="module-card">
          <h3 className="card-heading">
            <Sliders size={16} />
            <span>Playback Behavior</span>
          </h3>

          <div className="toggle-card">
            <div className="toggle-text">
              <strong>Auto-read responses aloud</strong>
              <p>Nova will speak newly received responses automatically through your audio output.</p>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={voiceConfig.autoSpeak}
                onChange={(e) =>
                  onUpdateVoiceConfig({ ...voiceConfig, autoSpeak: e.target.checked })
                }
              />
              <span className="slider round" />
            </label>
          </div>

          <div className="toggle-card">
            <div className="toggle-text">
              <strong>"Hey Nova" Wake-Word Detection</strong>
              <p>Listen continuously for the "Hey Nova" trigger to start hands-free voice command execution.</p>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={voiceConfig.wakeWordEnabled || false}
                onChange={(e) =>
                  onUpdateVoiceConfig({ ...voiceConfig, wakeWordEnabled: e.target.checked })
                }
              />
              <span className="slider round" />
            </label>
          </div>

          <div className="info-callout">
            <div className="callout-icon">
              <Mic size={18} />
            </div>
            <div>
              <strong>Microphone Input Status</strong>
              <p>
                {('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
                  ? 'Web Speech API is fully supported in your browser (Chrome/Edge/Brave).'
                  : 'Web Speech API is not detected in this browser. Please use Chrome or Edge.'}
              </p>
            </div>
          </div>

          <div className="voice-tips-box">
            <h4>Voice interaction tips</h4>
            <ul>
              <li>
                <Sparkles size={13} />
                <span>Tap the Voice Orb or composer microphone to begin speaking.</span>
              </li>
              <li>
                <Sparkles size={13} />
                <span>You can pause speech anytime using the speaker button in the topbar.</span>
              </li>
              <li>
                <Sparkles size={13} />
                <span>Each individual chat message has its own "Read Aloud" button.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
