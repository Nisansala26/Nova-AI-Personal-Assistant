import { useState, useEffect } from 'react';
import {
  FileText,
  Upload,
  FileCode,
  Sparkles,
  ArrowRight,
  Trash2,
  Check,
  FileCheck,
  HelpCircle,
  BookOpen,
  Send,
  Quote,
} from 'lucide-react';
import {
  askDocumentQuestion,
  deleteDocument,
  getDocuments,
  summarizeDocument,
  uploadDocument,
} from '../../services/api';

export default function DocumentsView({ onAskAssistant }) {
  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  // Summarize & Q&A state
  const [summary, setSummary] = useState('');
  const [summarizing, setSummarizing] = useState(false);
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [qaAnswer, setQaAnswer] = useState(null);

  const [isDragging, setIsDragging] = useState(false);

  async function loadDocs() {
    try {
      setLoading(true);
      setError('');
      const list = await getDocuments();
      setDocuments(list);
      if (list.length > 0 && !selectedDoc) {
        setSelectedDoc(list[0]);
        if (list[0].summary) setSummary(list[0].summary);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDocs();
  }, []);

  async function handleFileUpload(file) {
    if (!file) return;
    try {
      setUploading(true);
      setError('');
      const uploaded = await uploadDocument(file);
      setDocuments([uploaded, ...documents]);
      setSelectedDoc(uploaded);
      setSummary('');
      setQaAnswer(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      void handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  async function handleDelete(id, filename) {
    if (!window.confirm(`Delete document "${filename}"?`)) return;
    try {
      await deleteDocument(id);
      const remaining = documents.filter((d) => d.id !== id);
      setDocuments(remaining);
      if (selectedDoc?.id === id) {
        setSelectedDoc(remaining.length ? remaining[0] : null);
        setSummary(remaining.length && remaining[0].summary ? remaining[0].summary : '');
        setQaAnswer(null);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSummarize() {
    if (!selectedDoc) return;
    try {
      setSummarizing(true);
      setError('');
      const res = await summarizeDocument(selectedDoc.id);
      setSummary(res.summary);
      // update doc in list
      setDocuments(documents.map((d) => (d.id === selectedDoc.id ? { ...d, summary: res.summary } : d)));
    } catch (err) {
      setError(err.message);
    } finally {
      setSummarizing(false);
    }
  }

  async function handleAskQuestion(e) {
    e.preventDefault();
    if (!selectedDoc || !question.trim()) return;
    try {
      setAsking(true);
      setError('');
      const res = await askDocumentQuestion(selectedDoc.id, question.trim());
      setQaAnswer(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setAsking(false);
    }
  }

  return (
    <div className="module-container">
      <div className="module-hero">
        <div className="module-badge">
          <FileText size={14} />
          <span>AI DOCUMENT & KNOWLEDGE ASSISTANT</span>
        </div>
        <h2>Inspect, Summarize & Query Documents</h2>
        <p>
          Securely upload PDF, DOCX, TXT, or code documents. Extract plain text, generate AI executive summaries, and ask deep questions with direct source citations.
        </p>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="module-content-grid">
        {/* Left Column: Upload Dropzone & Document Library */}
        <div className="module-card">
          <h3 className="card-heading">
            <Upload size={16} />
            <span>Upload Document</span>
          </h3>

          <div
            className={`dropzone ${isDragging ? 'dragging' : ''} ${uploading ? 'has-file' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById('doc-file-input')?.click()}
          >
            <input
              id="doc-file-input"
              type="file"
              accept=".pdf,.docx,.txt,.md,.json,.csv"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files?.[0]) void handleFileUpload(e.target.files[0]);
              }}
            />

            <div className="dropzone-prompt">
              <Upload size={32} className="dropzone-icon" />
              <strong>{uploading ? 'Processing & Extracting text...' : 'Click to browse or drop document'}</strong>
              <span>Supports PDF, DOCX, TXT, MD, CSV (Up to 10 MB)</span>
            </div>
          </div>

          {/* Document Library List */}
          <div className="card-top-bar" style={{ marginTop: '16px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>
              <span>Uploaded Library</span>
              <span className="counter-badge">{documents.length}</span>
            </h4>
          </div>

          <div className="task-items-container" style={{ maxHeight: '260px' }}>
            {loading ? (
              <p className="no-history">Loading document library...</p>
            ) : documents.length === 0 ? (
              <p className="no-history">No documents uploaded yet. Drop a PDF or DOCX above.</p>
            ) : (
              documents.map((d) => (
                <div
                  key={d.id}
                  className={`task-row ${selectedDoc?.id === d.id ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedDoc(d);
                    setSummary(d.summary || '');
                    setQaAnswer(null);
                  }}
                  style={{
                    cursor: 'pointer',
                    borderColor: selectedDoc?.id === d.id ? 'var(--border-focus)' : 'var(--border-subtle)',
                    background: selectedDoc?.id === d.id ? 'rgba(139, 92, 246, 0.15)' : undefined,
                  }}
                >
                  <FileCheck size={18} className="text-accent" />
                  <div className="task-info">
                    <strong style={{ fontSize: '12px', color: '#fff' }}>{d.filename}</strong>
                    <div className="task-meta-tags">
                      <span className="meta-tag category">{d.file_type.toUpperCase()}</span>
                      <span className="meta-tag category">{d.file_size_kb} KB</span>
                      <span className="meta-tag category">{d.word_count} words</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="task-delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDelete(d.id, d.filename);
                    }}
                    title="Delete document"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: AI Analysis, Summarizer & Document Q&A */}
        <div className="module-card">
          <h3 className="card-heading">
            <Sparkles size={16} />
            <span>AI Document Intelligence</span>
          </h3>

          {!selectedDoc ? (
            <div className="empty-tasks-state">
              <BookOpen size={36} className="text-muted" />
              <p>Select or upload a document to generate summaries and ask questions.</p>
            </div>
          ) : (
            <div>
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-subtle)',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <strong style={{ fontSize: '13px', color: '#fff' }}>{selectedDoc.filename}</strong>
                  <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>
                    {selectedDoc.word_count} extracted words
                  </span>
                </div>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleSummarize}
                  disabled={summarizing}
                >
                  <Sparkles size={14} />
                  <span>{summarizing ? 'Analyzing...' : 'Generate Summary'}</span>
                </button>
              </div>

              {/* Summary display if available */}
              {summary && (
                <div
                  style={{
                    padding: '14px',
                    borderRadius: '12px',
                    background: 'rgba(14, 20, 36, 0.65)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    marginBottom: '18px',
                    fontSize: '12px',
                    lineHeight: '1.6',
                    color: '#e2e8f0',
                  }}
                >
                  <strong style={{ color: 'var(--text-accent)', display: 'block', marginBottom: '6px' }}>
                    ✦ Executive Summary
                  </strong>
                  <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{summary}</p>
                </div>
              )}

              {/* Document Question & Answer with Citations */}
              <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '10px' }}>
                Ask Questions with Source References
              </h4>
              <form onSubmit={handleAskQuestion} style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                <input
                  type="text"
                  placeholder={`Ask anything about ${selectedDoc.filename}...`}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="custom-input"
                  style={{ flex: 1 }}
                />
                <button type="submit" className="btn-primary" disabled={asking || !question.trim()}>
                  <Send size={14} />
                  <span>{asking ? 'Searching...' : 'Ask'}</span>
                </button>
              </form>

              {/* Q&A Answer and References */}
              {qaAnswer && (
                <div
                  style={{
                    padding: '14px',
                    borderRadius: '12px',
                    background: 'rgba(6, 182, 212, 0.08)',
                    border: '1px solid rgba(6, 182, 212, 0.25)',
                    fontSize: '13px',
                    lineHeight: '1.6',
                  }}
                >
                  <strong style={{ color: '#38bdf8', display: 'block', marginBottom: '6px' }}>
                    Nova Answer:
                  </strong>
                  <p style={{ color: '#fff', whiteSpace: 'pre-wrap', marginBottom: '12px' }}>
                    {qaAnswer.answer}
                  </p>

                  {qaAnswer.references && qaAnswer.references.length > 0 && (
                    <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '10px' }}>
                      <strong style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Quote size={11} /> Source References in {selectedDoc.filename}:
                      </strong>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                        {qaAnswer.references.map((refText, idx) => (
                          <div
                            key={idx}
                            style={{
                              padding: '6px 10px',
                              borderRadius: '6px',
                              background: 'rgba(0, 0, 0, 0.3)',
                              fontSize: '11px',
                              color: '#cbd5e1',
                              fontFamily: 'var(--font-mono)',
                            }}
                          >
                            "{refText}"
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
