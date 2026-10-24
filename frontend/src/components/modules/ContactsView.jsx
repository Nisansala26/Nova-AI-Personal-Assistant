import { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Edit2,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  Search,
  Sparkles,
  Trash2,
  User,
  UserCheck,
  X,
} from 'lucide-react';
import {
  createContact,
  deleteContact,
  getContacts,
  updateContact,
} from '../../services/api';

const RELATIONSHIP_TAGS = ['friend', 'colleague', 'lecturer', 'family', 'work', 'other'];

export default function ContactsView({ onAskAssistant }) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('friend');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete Confirm State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Quick Action feedback
  const [actionNotice, setActionNotice] = useState(null);

  useEffect(() => {
    void loadContacts();
  }, [search]);

  async function loadContacts() {
    setLoading(true);
    setError('');
    try {
      const data = await getContacts(search);
      setContacts(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load contacts.');
    } finally {
      setLoading(false);
    }
  }

  function handleOpenCreate() {
    setEditingContact(null);
    setName('');
    setPhone('');
    setRelationship('friend');
    setEmail('');
    setNotes('');
    setModalOpen(true);
  }

  function handleOpenEdit(c) {
    setEditingContact(c);
    setName(c.name || '');
    setPhone(c.phone || '');
    setRelationship(c.relationship || 'friend');
    setEmail(c.email || '');
    setNotes(c.notes || '');
    setModalOpen(true);
  }

  async function handleSaveContact(e) {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setError('Name and Phone number are required.');
      return;
    }
    setSaving(true);
    setError('');

    try {
      if (editingContact) {
        await updateContact(editingContact.id, {
          name: name.trim(),
          phone: phone.trim(),
          relationship,
          email: email.trim() || null,
          notes: notes.trim() || null,
        });
      } else {
        await createContact({
          name: name.trim(),
          phone: phone.trim(),
          relationship,
          email: email.trim() || null,
          notes: notes.trim() || null,
        });
      }
      setModalOpen(false);
      void loadContacts();
    } catch (err) {
      setError(err.message || 'Failed to save contact.');
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteContact(deleteTarget.id);
      setDeleteTarget(null);
      void loadContacts();
    } catch (err) {
      setError(err.message || 'Failed to delete contact.');
    } finally {
      setDeleting(false);
    }
  }

  function handleWhatsAppClick(contact) {
    const cleanDigits = (contact.phone || '').replace(/\D/g, '');
    const waUrl = `https://wa.me/${cleanDigits}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
    setActionNotice(`Opened WhatsApp Click-to-Chat for ${contact.name}`);
    setTimeout(() => setActionNotice(null), 4000);
  }

  function handleEmailClick(contact) {
    if (contact.email) {
      window.location.href = `mailto:${contact.email}`;
    } else if (onAskAssistant) {
      onAskAssistant(`Nova, draft an email to ${contact.name}`);
    }
  }

  return (
    <div className="workspace-module">
      {/* Header Banner */}
      <div className="workspace-header">
        <div>
          <div className="module-pill">
            <UserCheck size={12} />
            <span>COMMUNICATION DIRECTORY</span>
          </div>
          <h2 className="module-title">Contacts & Messaging</h2>
          <p className="module-subtext">
            Manage your personal contacts for WhatsApp Click-to-Chat preparation and AI email drafting.
          </p>
        </div>

        <button type="button" className="action-pill-btn primary" onClick={handleOpenCreate}>
          <Plus size={15} />
          <span>Add Contact</span>
        </button>
      </div>

      {actionNotice && (
        <div className="action-notice-toast success" style={{ marginBottom: '16px' }}>
          <div className="action-notice-text">
            <CheckCircle2 size={16} className="text-success" />
            <span>{actionNotice}</span>
          </div>
          <button type="button" className="notice-close-btn" onClick={() => setActionNotice(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      {error && (
        <div className="error-banner" style={{ marginBottom: '16px' }}>
          <AlertCircle size={15} />
          <span>{error}</span>
          <button type="button" onClick={() => setError('')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Search Toolbar */}
      <div className="search-box-wrap" style={{ marginBottom: '24px' }}>
        <Search size={14} className="search-box-icon" />
        <input
          type="text"
          placeholder="Search contacts by name, phone, relationship, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-box-input"
        />
        {search && (
          <button type="button" className="search-clear-btn" onClick={() => setSearch('')}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* Contacts Grid */}
      {loading ? (
        <div className="tasks-loading">
          <div className="loading-spinner" />
          <span>Loading contacts directory...</span>
        </div>
      ) : contacts.length === 0 ? (
        <div className="empty-tasks-card">
          <User size={36} className="text-muted" />
          <h3>{search ? 'No matching contacts found' : 'No contacts in directory'}</h3>
          <p>
            {search
              ? 'Try adjusting your search terms.'
              : 'Add your friends, colleagues, or lecturers to prepare WhatsApp messages and draft emails by name.'}
          </p>
          {!search && (
            <button type="button" className="action-pill-btn primary" onClick={handleOpenCreate}>
              <Plus size={15} />
              <span>Add Your First Contact</span>
            </button>
          )}
        </div>
      ) : (
        <div className="notes-grid">
          {contacts.map((contact) => (
            <div key={contact.id} className="note-card">
              <div className="note-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(59, 130, 246, 0.3))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      color: 'var(--accent-glow, #a78bfa)',
                    }}
                  >
                    {contact.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="note-title" style={{ margin: 0 }}>{contact.name}</h3>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        color: 'var(--text-secondary, #94a3b8)',
                      }}
                    >
                      {contact.relationship || 'contact'}
                    </span>
                  </div>
                </div>

                <div className="note-actions">
                  <button
                    type="button"
                    className="note-action-btn"
                    onClick={() => handleOpenEdit(contact)}
                    title="Edit Contact"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    type="button"
                    className="note-action-btn delete"
                    onClick={() => setDeleteTarget(contact)}
                    title="Delete Contact"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              <div className="note-content" style={{ marginTop: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  <Phone size={13} className="text-muted" />
                  <span>{contact.phone}</span>
                </div>
                {contact.email && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    <Mail size={13} className="text-muted" />
                    <span>{contact.email}</span>
                  </div>
                )}
                {contact.notes && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px', fontStyle: 'italic' }}>
                    "{contact.notes}"
                  </p>
                )}
              </div>

              {/* Quick Communication Buttons */}
              <div
                style={{
                  marginTop: '16px',
                  paddingTop: '12px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  gap: '8px',
                }}
              >
                <button
                  type="button"
                  className="action-pill-btn"
                  onClick={() => handleWhatsAppClick(contact)}
                  style={{
                    flex: 1,
                    justifyContent: 'center',
                    background: 'rgba(37, 211, 102, 0.15)',
                    border: '1px solid rgba(37, 211, 102, 0.35)',
                    color: '#25d366',
                    fontSize: '0.78rem',
                    padding: '6px 10px',
                  }}
                  title="Open WhatsApp Click-to-Chat"
                >
                  <MessageCircle size={13} />
                  <span>WhatsApp</span>
                </button>

                <button
                  type="button"
                  className="action-pill-btn"
                  onClick={() => handleEmailClick(contact)}
                  style={{
                    flex: 1,
                    justifyContent: 'center',
                    background: 'rgba(96, 165, 250, 0.15)',
                    border: '1px solid rgba(96, 165, 250, 0.35)',
                    color: '#60a5fa',
                    fontSize: '0.78rem',
                    padding: '6px 10px',
                  }}
                  title={contact.email ? 'Open email client' : 'Ask Nova to draft an email'}
                >
                  <Mail size={13} />
                  <span>Email</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Contact Modal */}
      {modalOpen && (
        <div className="modal-backdrop">
          <div className="modal-panel" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={18} className="text-accent" />
                <h3 className="modal-title">{editingContact ? 'Edit Contact' : 'New Contact'}</h3>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveContact} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="field-label" style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Devni Silva or Dr. Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div>
                <label className="field-label" style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px' }}>
                  Phone Number (with Country Code) *
                </label>
                <input
                  type="tel"
                  placeholder="e.g. +94771234567 or +14155552671"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="form-input"
                  required
                />
                <small style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  Used for WhatsApp Click-to-Chat. Please include the international country code.
                </small>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="field-label" style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px' }}>
                    Relationship / Tag
                  </label>
                  <select
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    className="form-select"
                  >
                    {RELATIONSHIP_TAGS.map((t) => (
                      <option key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="field-label" style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. contact@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              <div>
                <label className="field-label" style={{ display: 'block', fontSize: '0.8rem', marginBottom: '4px' }}>
                  Notes (Optional)
                </label>
                <textarea
                  placeholder="e.g. Project partner, Lecturer for Data Structures..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="form-textarea"
                  rows={2}
                />
              </div>

              <div className="modal-actions" style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="action-pill-btn" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="action-pill-btn primary" disabled={saving}>
                  {saving ? 'Saving...' : editingContact ? 'Update Contact' : 'Save Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="modal-backdrop">
          <div className="modal-panel" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={18} className="text-warning" />
                <h3 className="modal-title">Delete Contact</h3>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setDeleteTarget(null)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <p>
                Are you sure you want to permanently delete <strong>{deleteTarget.name}</strong> from your contacts?
              </p>
            </div>
            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" className="action-pill-btn" onClick={() => setDeleteTarget(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="action-pill-btn danger"
                onClick={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
