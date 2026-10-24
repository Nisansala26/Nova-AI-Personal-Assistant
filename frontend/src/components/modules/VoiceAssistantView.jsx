import { useState } from 'react';
import {
  Mic,
  MicOff,
  Square,
  Volume2,
  Sparkles,
  Radio,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import Orb from '../Orb';

export default function VoiceAssistantView({
  speech,
  speaking,
  stopSpeaking,
  onSendCommand,
  voiceConfig,
  setVoiceConfig,
}) {
  const [wakeNotice, setWakeNotice] = useState(false);

  // Compute active voice state for the orb
  let voiceState = 'idle';
  if (speech.isListening) {
    voiceState = 'listening';
  } else if (speaking) {
    voiceState = 'speaking';
  } else if (speech.error) {
    voiceState = 'error';
  }

  const voiceSamplePrompts = [
    'Nova, open Notepad and write 5 rice',
    'Nova, search YouTube for Python tutorials',
    'Nova, what is the weather in Colombo?',
    'Nova, prepare a WhatsApp message to Devni saying I\'m fine',
    'Nova, remind me tomorrow at 8 PM to study Java',
    'Nova, open Calculator',
    'Nova, add task complete assignment',
  ];

  return (
    <div className="module-container" style={{ textAlign: 'center', maxWidth: '820px', margin: '0 auto' }}>
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '20px', background: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.35)', boxShadow: '0 0 20px rgba(139, 92, 246, 0.25)', marginBottom: '14px' }}>
          <Radio size={14} className="text-accent" />
          <span style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.1em', color: '#c4b5fd' }}>
            HOLOGRAPHIC VOICE COMMAND CENTER
          </span>
        </div>
        <h2 style={{ fontSize: '2.2rem', fontWeight: 800, margin: '0 0 10px', color: '#f8fafc', letterSpacing: '-0.03em' }}>
          Nova Voice Intelligence
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '560px', margin: '0 auto', lineHeight: 1.6 }}>
          Speak naturally in English or trigger desktop actions hands-free using the &quot;Hey Nova&quot; wake word.
        </p>
      </div>

      {/* Main Interactive Voice Orb Canvas */}
      <div
        className="glass-card"
        style={{
          padding: '48px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          marginBottom: '24px',
          background: 'linear-gradient(135deg, rgba(20, 28, 48, 0.65) 0%, rgba(14, 20, 36, 0.45) 100%)',
          border: '1px solid rgba(139, 92, 246, 0.25)',
          borderRadius: '24px',
          boxShadow: '0 16px 45px rgba(0, 0, 0, 0.45), 0 0 35px rgba(139, 92, 246, 0.15)',
        }}
      >
        <div style={{ transform: 'scale(1.2)', margin: '10px 0 30px' }}>
          <Orb
            listening={speech.isListening}
            speaking={speaking}
            thinking={voiceState === 'processing'}
            onClick={() => (speech.isListening ? speech.stop() : speech.start())}
          />
        </div>

        {/* State Badge */}
        <div style={{ marginBottom: '18px' }}>
          <span
            className={`badge-tag ${
              voiceState === 'listening'
                ? 'cyan'
                : voiceState === 'speaking'
                ? 'violet'
                : voiceState === 'error'
                ? 'orange'
                : 'gray'
            }`}
            style={{ fontSize: '0.85rem', padding: '6px 16px', borderRadius: '20px', fontWeight: 600, letterSpacing: '0.04em' }}
          >
            {voiceState === 'listening' && '● LISTENING TO SPEECH'}
            {voiceState === 'speaking' && '● SPEAKING RESPONSE'}
            {voiceState === 'error' && '● MICROPHONE ISSUE'}
            {voiceState === 'idle' && '○ READY (CLICK ORB OR SAY "HEY NOVA")'}
          </span>
        </div>

        {/* Live Interim Transcript display */}
        {speech.interimTranscript ? (
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.45)',
              border: '1px solid rgba(139, 92, 246, 0.4)',
              borderRadius: '14px',
              padding: '14px 24px',
              maxWidth: '90%',
              fontSize: '1.05rem',
              color: '#f8fafc',
              fontStyle: 'italic',
              marginBottom: '20px',
              boxShadow: '0 0 25px rgba(139, 92, 246, 0.2)',
            }}
          >
            &quot;{speech.interimTranscript}&quot;
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '0 0 24px', lineHeight: 1.5 }}>
            {speech.supported
              ? 'Click the microphone button below or say "Hey Nova" to begin dictating.'
              : 'Speech recognition requires a supported browser such as Google Chrome or Microsoft Edge.'}
          </p>
        )}

        {/* Primary Voice Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            type="button"
            className="action-pill-btn primary"
            onClick={() => (speech.isListening ? speech.stop() : speech.start())}
            style={{
              padding: '14px 28px',
              fontSize: '0.98rem',
              borderRadius: '30px',
            }}
          >
            {speech.isListening ? <MicOff size={18} /> : <Mic size={18} />}
            <span>{speech.isListening ? 'Stop Listening' : 'Start Dictation'}</span>
          </button>

          {speaking && (
            <button
              type="button"
              className="action-pill-btn danger"
              onClick={stopSpeaking}
              style={{
                padding: '14px 24px',
                fontSize: '0.94rem',
                borderRadius: '30px',
              }}
            >
              <Square size={16} />
              <span>Interrupt Speech</span>
            </button>
          )}
        </div>

        {speech.error && (
          <div className="error-banner" style={{ marginTop: '16px', maxWidth: '440px' }}>
            <AlertCircle size={15} />
            <span>{speech.error}</span>
          </div>
        )}
      </div>

      {/* Suggested Voice Commands */}
      <div className="glass-card" style={{ textAlign: 'left', borderRadius: '18px', padding: '24px' }}>
        <h3 style={{ fontSize: '0.98rem', color: '#f8fafc', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={16} style={{ color: '#c084fc' }} />
          <span>Recommended Voice Invocations:</span>
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
          {voiceSamplePrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="action-card"
              style={{ padding: '14px 16px', fontSize: '0.86rem', cursor: 'pointer', textAlign: 'left' }}
              onClick={() => onSendCommand?.(prompt)}
            >
              <span style={{ color: '#e2e8f0', fontWeight: 500 }}>&quot;{prompt}&quot;</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
