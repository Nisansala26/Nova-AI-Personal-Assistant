import { useState } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Mail,
  MessageCircle,
  Send,
  ShieldAlert,
  Sparkles,
  Terminal,
  X,
} from 'lucide-react';

export default function ActionExecutionPanel({
  activeAction,
  onDismiss,
  onExecuteConfirm,
}) {
  if (!activeAction) return null;

  const {
    command,
    type,
    title,
    steps = [],
    is_multistep,
    requires_confirmation,
    recipient_name,
    phone,
    digits,
    message,
    subject,
    body,
    mailto_url,
    web_url,
    url,
    app_url,
    filename,
    due_date,
  } = activeAction;

  // Editing state for Email drafts
  const [editSubject, setEditSubject] = useState(subject || '');
  const [editBody, setEditBody] = useState(body || '');
  const [confirmed, setConfirmed] = useState(false);

  function handleOpenWhatsApp(useApp = false) {
    const targetUrl = useApp && app_url ? app_url : url;
    if (targetUrl) {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }
    setConfirmed(true);
    if (onExecuteConfirm) onExecuteConfirm('whatsapp_opened');
  }

  function handleOpenEmail(useGmail = true) {
    if (useGmail && web_url) {
      window.open(web_url, '_blank', 'noopener,noreferrer');
    } else if (mailto_url) {
      window.location.href = mailto_url;
    }
    setConfirmed(true);
    if (onExecuteConfirm) onExecuteConfirm('email_opened');
  }

  return (
    <div className="action-execution-panel" style={{
      background: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid rgba(139, 92, 246, 0.3)',
      borderRadius: '16px',
      padding: '20px',
      margin: '16px 0',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(139, 92, 246, 0.15)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
          }}>
            <Terminal size={15} />
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#a78bfa', fontWeight: 600 }}>
              ACTION EXECUTION ENGINE
            </span>
            <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#f8fafc' }}>
              {is_multistep ? 'Multi-Step Execution Pipeline' : type === 'whatsapp_prepare' ? 'WhatsApp Message Dispatch' : type === 'email_draft' ? 'Email Composition Assistant' : 'Planned Action'}
            </h4>
          </div>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
          aria-label="Dismiss panel"
        >
          <X size={16} />
        </button>
      </div>

      {/* Requested Command */}
      {command && (
        <div style={{
          background: 'rgba(0, 0, 0, 0.35)',
          padding: '8px 12px',
          borderRadius: '8px',
          fontSize: '0.82rem',
          color: '#cbd5e1',
          marginBottom: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          borderLeft: '3px solid #8b5cf6',
        }}>
          <span style={{ color: '#94a3b8', fontWeight: 600 }}>Command:</span>
          <span>"{command}"</span>
        </div>
      )}

      {/* 1. Multi-Step Execution List */}
      {is_multistep && steps.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
          {steps.map((st, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.07)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  background: st.status === 'completed' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(148, 163, 184, 0.2)',
                  color: st.status === 'completed' ? '#4ade80' : '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}>
                  {st.status === 'completed' ? <Check size={13} /> : idx + 1}
                </div>
                <span style={{ fontSize: '0.85rem', color: '#e2e8f0' }}>{st.message}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  fontSize: '0.7rem',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  background: st.status === 'completed' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                  color: st.status === 'completed' ? '#4ade80' : '#fde047',
                  border: `1px solid ${st.status === 'completed' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(234, 179, 8, 0.3)'}`,
                }}>
                  {st.status}
                </span>
                {st.url && (
                  <a href={st.url} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', display: 'flex', alignItems: 'center' }}>
                    <ExternalLink size={13} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 2. WhatsApp Preparation View */}
      {type === 'whatsapp_prepare' && (
        <div style={{
          background: 'rgba(37, 211, 102, 0.06)',
          border: '1px solid rgba(37, 211, 102, 0.25)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '14px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <MessageCircle size={18} style={{ color: '#25d366' }} />
            <strong style={{ fontSize: '0.9rem', color: '#f8fafc' }}>
              Message for {recipient_name} ({phone})
            </strong>
          </div>

          <div style={{
            background: 'rgba(0, 0, 0, 0.4)',
            padding: '10px 14px',
            borderRadius: '8px',
            borderLeft: '3px solid #25d366',
            color: '#e2e8f0',
            fontSize: '0.88rem',
            fontStyle: 'italic',
            marginBottom: '12px',
          }}>
            "{message}"
          </div>

          <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '0 0 14px 0' }}>
            ℹ️ WhatsApp Click-to-Chat will open your conversation with {recipient_name} with your message pre-filled. You can review the message and press Send inside WhatsApp.
          </p>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="action-pill-btn"
              onClick={() => handleOpenWhatsApp(false)}
              style={{
                background: '#25d366',
                color: '#000',
                fontWeight: 600,
                fontSize: '0.82rem',
                border: 'none',
              }}
            >
              <ExternalLink size={14} />
              <span>Open in WhatsApp Web</span>
            </button>

            {app_url && (
              <button
                type="button"
                className="action-pill-btn"
                onClick={() => handleOpenWhatsApp(true)}
                style={{
                  background: 'rgba(37, 211, 102, 0.2)',
                  border: '1px solid rgba(37, 211, 102, 0.4)',
                  color: '#25d366',
                  fontSize: '0.82rem',
                }}
              >
                <span>Launch Desktop App</span>
              </button>
            )}

            <button
              type="button"
              className="action-pill-btn"
              onClick={onDismiss}
              style={{ fontSize: '0.82rem' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* 3. Email Draft View */}
      {type === 'email_draft' && (
        <div style={{
          background: 'rgba(96, 165, 250, 0.06)',
          border: '1px solid rgba(96, 165, 250, 0.25)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '14px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Mail size={18} style={{ color: '#60a5fa' }} />
            <strong style={{ fontSize: '0.9rem', color: '#f8fafc' }}>
              Review Email Draft
            </strong>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Subject:</label>
              <input
                type="text"
                value={editSubject}
                onChange={(e) => setEditSubject(e.target.value)}
                className="form-input"
                style={{ fontSize: '0.85rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Email Body:</label>
              <textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                className="form-textarea"
                rows={5}
                style={{ fontSize: '0.85rem' }}
              />
            </div>
          </div>

          <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '0 0 14px 0' }}>
            ℹ️ You can edit the text above. Click below to open your preferred email client with the subject and body pre-filled.
          </p>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="action-pill-btn primary"
              onClick={() => handleOpenEmail(true)}
              style={{ fontSize: '0.82rem' }}
            >
              <ExternalLink size={14} />
              <span>Compose in Gmail</span>
            </button>

            <button
              type="button"
              className="action-pill-btn"
              onClick={() => handleOpenEmail(false)}
              style={{ fontSize: '0.82rem' }}
            >
              <Mail size={14} />
              <span>Default Email App (mailto)</span>
            </button>

            <button
              type="button"
              className="action-pill-btn"
              onClick={onDismiss}
              style={{ fontSize: '0.82rem' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* 4. Desktop Application Launch / File Open */}
      {type === 'desktop_open' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px',
            borderRadius: '10px',
            background:
              activeAction.success === false
                ? 'rgba(239, 68, 68, 0.12)'
                : 'rgba(34, 197, 94, 0.08)',
            border: `1px solid ${
              activeAction.success === false
                ? 'rgba(239, 68, 68, 0.35)'
                : 'rgba(34, 197, 94, 0.25)'
            }`,
          }}
        >
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#f8fafc' }}>
              {activeAction.app || 'Windows Desktop Application'}
            </div>
            {filename && (
              <div style={{ fontSize: '0.78rem', color: '#cbd5e1', marginTop: '2px' }}>
                Note file: <strong>{filename}</strong>
              </div>
            )}
            {activeAction.error && (
              <div style={{ fontSize: '0.8rem', color: '#f87171', marginTop: '4px' }}>
                Error: {activeAction.error}
              </div>
            )}
          </div>
          <div>
            {activeAction.success !== false ? (
              <span
                style={{
                  fontSize: '0.75rem',
                  color: '#4ade80',
                  background: 'rgba(34, 197, 94, 0.15)',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Check size={13} />
                <span>Verified Active {activeAction.pid ? `(PID: ${activeAction.pid})` : ''}</span>
              </span>
            ) : (
              <span
                style={{
                  fontSize: '0.75rem',
                  color: '#ef4444',
                  background: 'rgba(239, 68, 68, 0.15)',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <AlertCircle size={13} />
                <span>Launch Failed</span>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
