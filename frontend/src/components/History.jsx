import { Clock3, Trash2 } from "lucide-react";
export default function History({ items, onClear }) {
  return (
    <section className="panel history">
      <div className="section-head">
        <div>
          <span className="eyebrow">MEMORY</span>
          <h2>Recent commands</h2>
        </div>
        <button className="icon-btn" onClick={onClear} title="Clear history">
          <Trash2 size={17} />
        </button>
      </div>
      <div className="history-list">
        {items.length === 0 ? (
          <p className="muted">Your commands will appear here.</p>
        ) : (
          items.map((x) => (
            <div className="history-item" key={x.id}>
              <Clock3 size={15} />
              <div>
                <strong>{x.command}</strong>
                <p>{x.response}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

