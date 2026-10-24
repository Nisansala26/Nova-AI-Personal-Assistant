import { useEffect } from 'react';
import { X, AlertTriangle, HelpCircle, Edit3 } from 'lucide-react';

export default function Modal({
  isOpen,
  title,
  type = 'info', // 'info', 'confirm', 'prompt', 'danger'
  message,
  inputPlaceholder,
  inputValue,
  onInputChange,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (!isOpen) return;
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter' && type === 'prompt') onConfirm();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel, onConfirm, type]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onCancel} role="dialog" aria-modal="true">
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            {type === 'danger' && <AlertTriangle className="modal-icon danger" size={20} />}
            {type === 'confirm' && <HelpCircle className="modal-icon warning" size={20} />}
            {type === 'prompt' && <Edit3 className="modal-icon primary" size={20} />}
            <h3>{title}</h3>
          </div>
          <button className="modal-close-btn" onClick={onCancel} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {message && <p className="modal-message">{message}</p>}
          {type === 'prompt' && (
            <div className="modal-input-wrap">
              <input
                type="text"
                className="modal-input"
                placeholder={inputPlaceholder}
                value={inputValue}
                onChange={(e) => onInputChange(e.target.value)}
                autoFocus
              />
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn-primary ${type === 'danger' ? 'btn-danger' : ''}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
