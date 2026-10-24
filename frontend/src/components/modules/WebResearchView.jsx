import { useState } from 'react';
import { Globe2, Search, ArrowUpRight, Sparkles, BookOpen, ExternalLink } from 'lucide-react';

const SUGGESTIONS = [
  'Latest breakthroughs in quantum computing and AI',
  'Compare FastAPI vs Express.js for production APIs',
  'Best architectural patterns for modern web apps',
  'History and future roadmap of WebAssembly',
];

export default function WebResearchView({ onAskAssistant }) {
  const [query, setQuery] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    onAskAssistant(`Search the web and provide a structured research brief on: "${query.trim()}"`);
  };

  const handleDirectWeb = (engine) => {
    if (!query.trim()) return;
    const url =
      engine === 'google'
        ? `https://www.google.com/search?q=${encodeURIComponent(query.trim())}`
        : `https://duckduckgo.com/?q=${encodeURIComponent(query.trim())}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="module-container">
      <div className="module-hero">
        <div className="module-badge">
          <Globe2 size={14} />
          <span>WEB RESEARCH LAB</span>
        </div>
        <h2>Synthesize the Web</h2>
        <p>Formulate deep queries, explore topics with AI synthesis, or launch direct search engines.</p>
      </div>

      <div className="module-content-grid">
        <div className="module-card">
          <h3 className="card-heading">
            <Search size={16} />
            <span>Research Query</span>
          </h3>

          <form onSubmit={handleSearch} className="research-form">
            <div className="search-input-box">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                placeholder="Enter topic, technology, or question to research..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="research-input"
              />
            </div>

            <div className="research-action-row">
              <button
                type="submit"
                className="btn-primary"
                disabled={!query.trim()}
              >
                <Sparkles size={16} />
                <span>Ask Nova to Research</span>
              </button>

              <button
                type="button"
                className="btn-secondary"
                disabled={!query.trim()}
                onClick={() => handleDirectWeb('google')}
              >
                <span>Google</span>
                <ExternalLink size={13} />
              </button>

              <button
                type="button"
                className="btn-secondary"
                disabled={!query.trim()}
                onClick={() => handleDirectWeb('duckduckgo')}
              >
                <span>DuckDuckGo</span>
                <ExternalLink size={13} />
              </button>
            </div>
          </form>

          <div className="research-topics">
            <span className="topics-heading">Recommended exploration topics:</span>
            <div className="topic-chips">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="topic-chip"
                  onClick={() => {
                    setQuery(s);
                    onAskAssistant(`Search the web and provide a structured research brief on: "${s}"`);
                  }}
                >
                  <BookOpen size={13} />
                  <span>{s}</span>
                  <ArrowUpRight size={13} />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="module-card">
          <h3 className="card-heading">
            <BookOpen size={16} />
            <span>Research Capabilities</span>
          </h3>

          <div className="features-checklist">
            <div className="feature-item">
              <div className="check-bubble">✓</div>
              <div>
                <strong>Autonomous Query Formulation</strong>
                <p>Nova formats your concepts into high-precision search keywords for relevant answers.</p>
              </div>
            </div>
            <div className="feature-item">
              <div className="check-bubble">✓</div>
              <div>
                <strong>Source Verification & Highlights</strong>
                <p>Direct web links returned in chat messages allow one-click source inspection.</p>
              </div>
            </div>
            <div className="feature-item">
              <div className="check-bubble">✓</div>
              <div>
                <strong>Key Takeaway Synthesis</strong>
                <p>Bullet-pointed summaries without ad clutter or redundant web fluff.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
