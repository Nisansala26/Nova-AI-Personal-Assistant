import { useState } from 'react';
import { Play, Search, ArrowUpRight, SquarePlay, Sparkles, Video } from 'lucide-react';

const TOPICS = [
  { title: 'FastAPI Backend Architecture Masterclass', query: 'FastAPI full course backend python' },
  { title: 'React 19 Server Components & Actions', query: 'React 19 full tutorial features' },
  { title: 'Large Language Models & Agentic AI', query: 'Building AI agents from scratch' },
  { title: 'Tailwind & Modern CSS Design Systems', query: 'Modern CSS UI design glassmorphism tutorial' },
];

export default function YouTubeView({ onAskAssistant }) {
  const [query, setQuery] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query.trim())}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleAskNova = (customQuery) => {
    const q = customQuery || query;
    if (!q.trim()) return;
    onAskAssistant(`Search YouTube for ${q.trim()} and summarize what topics to look out for`);
  };

  return (
    <div className="module-container">
      <div className="module-hero">
        <div className="module-badge">
          <SquarePlay size={14} className="text-pink" />
          <span>YOUTUBE LEARNING HUB</span>
        </div>
        <h2>Video Tutorials & Knowledge</h2>
        <p>Find top-rated educational videos, discover expert crash courses, and take smart study notes.</p>
      </div>

      <div className="module-content-grid">
        <div className="module-card">
          <h3 className="card-heading">
            <Search size={16} />
            <span>Search YouTube</span>
          </h3>

          <form onSubmit={handleSearch} className="research-form">
            <div className="search-input-box">
              <SquarePlay size={18} className="search-icon text-pink" />
              <input
                type="text"
                placeholder="What tutorial or lecture do you want to watch?"
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
                <Play size={16} />
                <span>Search on YouTube</span>
              </button>

              <button
                type="button"
                className="btn-secondary"
                disabled={!query.trim()}
                onClick={() => handleAskNova()}
              >
                <Sparkles size={14} />
                <span>Ask Nova to Guide</span>
              </button>
            </div>
          </form>

          <div className="research-topics">
            <span className="topics-heading">Popular developer masterclasses:</span>
            <div className="topic-chips">
              {TOPICS.map((item) => (
                <button
                  key={item.title}
                  type="button"
                  className="topic-chip"
                  onClick={() => {
                    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(item.query)}`;
                    window.open(url, '_blank', 'noopener,noreferrer');
                  }}
                >
                  <Video size={13} />
                  <span>{item.title}</span>
                  <ArrowUpRight size={13} />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="module-card">
          <h3 className="card-heading">
            <Sparkles size={16} />
            <span>Smart Video Workflows</span>
          </h3>

          <div className="features-checklist">
            <div className="feature-item">
              <div className="check-bubble">▶</div>
              <div>
                <strong>Direct Command Integration</strong>
                <p>Say "Search YouTube for Python" to Nova anywhere in chat or voice mode to instantly discover videos.</p>
              </div>
            </div>
            <div className="feature-item">
              <div className="check-bubble">✦</div>
              <div>
                <strong>Structured Study Companion</strong>
                <p>Paste video titles or lecture transcripts into Documents to get instant chapter notes and key takeaways.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
