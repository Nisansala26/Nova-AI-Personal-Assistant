import { useState, useEffect } from 'react';
import {
  StickyNote,
  Plus,
  Search,
  Trash2,
  Edit3,
  ExternalLink,
  FolderOpen,
  FileText,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Save,
  X,
} from 'lucide-react';
import {
  createNote,
  deleteNote,
  getNotes,
  openNoteInNotepad,
  updateNote,
} from '../../services/api';

export default function NotesView({ onAskAssistant }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  // Form state
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [openInNotepad, setOpenInNotepad] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Edit modal
  const [editingNote, setEditingNote] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [editTitle, setEditTitle] = useState('');

  // Delete confirmation modal
  const [deleteTarget, setDeleteTarget] = useState(null);

  async function loadNotes() {
    try {
      setLoading(true);
      setError('');
      const data = await getNotes(searchQuery);
      setNotes(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadNotes();
  }, [searchQuery]);

  function showToast(text, type = 'success') {
    setToast({ text, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!content.trim()) return;

    try {
      const res = await createNote(content.trim(), title.trim() || null, openInNotepad);
      setContent('');
      setTitle('');
      showToast(res.message || 'Note saved successfully!');
      await loadNotes();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleOpenNotepad(noteId) {
    try {
      const res = await openNoteInNotepad(noteId);
      showToast(res.message || 'Opened in Windows Notepad');
    } catch (err) {
      showToast(err.message, 'warning');
    }
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    if (!editingNote || !editContent.trim()) return;

    try {
      await updateNote(editingNote.id, {
        title: editTitle.trim() || undefined,
        content: editContent.trim(),
      });
      setEditingNote(null);
      showToast('Note updated successfully!');
      await loadNotes();
    } catch (err) {
      setError(err.message);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteNote(deleteTarget.id);
      setDeleteTarget(null);
      showToast('Note deleted.');
      await loadNotes();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="module-container">
      {/* View Header */}
      <div className="module-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 className="module-title">Nova Notes & Notepad Automation</h2>
            <span className="badge-tag cyan">Windows Local</span>
          </div>
          <p className="module-desc">
            Dictate or type notes. Automatically creates UTF-8 text files in{' '}
            <code>~/Documents/NovaNotes</code> and opens them in Windows Notepad.
          </p>
        </div>

        <button
          className="btn-ghost"
          onClick={() =>
            onAskAssistant?.('Nova, put a note: Buy groceries tomorrow at 5 PM')
          }
        >
          <Sparkles size={14} />
          <span>Dictate Note</span>
        </button>
      </div>

      {toast && (
        <div className={`action-notice-toast ${toast.type}`}>
          <div className="action-notice-text">
            {toast.type === 'success' ? (
              <CheckCircle2 size={16} className="text-success" />
            ) : (
              <AlertCircle size={16} className="text-warning" />
            )}
            <span>{toast.text}</span>
          </div>
        </div>
      )}

      {error && <div className="error-banner">{error}</div>}

      {/* Quick Create Note Card */}
      <div className="glass-card mb-6">
        <form onSubmit={handleCreate}>
          <div style={{ marginBottom: '12px' }}>
            <input
              type="text"
              placeholder="Note title (optional)..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="form-input"
              style={{ marginBottom: '8px' }}
            />
            <textarea
              placeholder="Note content (e.g., '5 rice', 'Buy milk tomorrow')..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="form-textarea"
              rows={3}
              required
            />
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.85rem',
                color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={openInNotepad}
                onChange={(e) => setOpenInNotepad(e.target.checked)}
              />
              <span>Open in Windows Notepad immediately</span>
            </label>

            <button type="submit" className="btn-primary" disabled={!content.trim()}>
              <Plus size={15} />
              <span>Save Note</span>
            </button>
          </div>
        </form>
      </div>

      {/* Search and Filters */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          gap: '12px',
        }}
      >
        <div className="search-box-wrap" style={{ flex: 1, maxWidth: '360px' }}>
          <Search size={14} className="search-icon" />
          <input
            type="text"
            placeholder="Search notes by title or content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="clear-search-btn"
            >
              <X size={12} />
            </button>
          )}
        </div>

        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {notes.length} note{notes.length === 1 ? '' : 's'} stored
        </div>
      </div>

      {/* Notes Grid */}
      {loading ? (
        <div className="loading-state">Loading your notes...</div>
      ) : notes.length === 0 ? (
        <div className="empty-state">
          <StickyNote size={36} className="empty-icon" />
          <h3>No notes found</h3>
          <p>
            {searchQuery
              ? `No notes match "${searchQuery}".`
              : 'Dictate "Nova, put a note: 5 rice" or type a note above.'}
          </p>
        </div>
      ) : (
        <div className="notes-grid">
          {notes.map((note) => (
            <div key={note.id} className="note-card">
              <div className="note-header">
                <strong className="note-title">{note.title}</strong>
                <div className="note-actions">
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => handleOpenNotepad(note.id)}
                    title="Open in Windows Notepad"
                  >
                    <ExternalLink size={14} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => {
                      setEditingNote(note);
                      setEditTitle(note.title);
                      setEditContent(note.content);
                    }}
                    title="Edit Note"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn text-danger"
                    onClick={() => setDeleteTarget(note)}
                    title="Delete Note"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <p className="note-content">{note.content}</p>

              <div className="note-footer">
                {note.filename && (
                  <span className="note-filename">
                    <FileText size={11} />
                    <span>{note.filename}</span>
                  </span>
                )}
                {note.created_at && (
                  <span className="note-date">
                    {new Date(note.created_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Note Modal */}
      {editingNote && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h3>Edit Note</h3>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setEditingNote(null)}
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSaveEdit}>
              <div style={{ marginBottom: '12px' }}>
                <label className="form-label">Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="form-input"
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label className="form-label">Content</label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="form-textarea"
                  rows={6}
                  required
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setEditingNote(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  <Save size={14} />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-header">
              <h3 style={{ color: 'var(--danger)' }}>Confirm Deletion</h3>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setDeleteTarget(null)}
              >
                <X size={16} />
              </button>
            </div>
            <p style={{ margin: '12px 0 20px', color: 'var(--text-muted)' }}>
              Are you sure you want to delete &quot;
              <strong>{deleteTarget.title || deleteTarget.filename}</strong>&quot;?
              This will remove the database record and delete the text file from your{' '}
              <code>~/Documents/NovaNotes</code> directory.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={() => void confirmDelete()}
              >
                <Trash2 size={14} />
                <span>Delete Note</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
