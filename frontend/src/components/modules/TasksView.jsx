import { useState, useEffect } from 'react';
import {
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
  ListTodo,
  Tag,
  ArrowRight,
  Filter,
  Sparkles,
  Calendar,
  Bell,
  Search,
  Check,
} from 'lucide-react';
import { createTask, deleteTask, getTasks, updateTask } from '../../services/api';

export default function TasksView({ onAskAssistant }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form state
  const [inputTitle, setInputTitle] = useState('');
  const [category, setCategory] = useState('Dev');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');

  // Filter state
  const [filter, setFilter] = useState('all'); // all, active, completed
  const [priorityFilter, setPriorityFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationPermission, setNotificationPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  async function loadTasks() {
    try {
      setLoading(true);
      setError('');
      const data = await getTasks({
        priority: priorityFilter || undefined,
        search: searchQuery || undefined,
      });
      setTasks(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTasks();
  }, [priorityFilter, searchQuery]);

  async function handleAddTask(e) {
    e.preventDefault();
    if (!inputTitle.trim()) return;

    try {
      const created = await createTask({
        title: inputTitle.trim(),
        category,
        priority,
        due_date: dueDate || null,
      });
      setTasks([created, ...tasks]);
      setInputTitle('');
      setDueDate('');

      // If due date was set and notification permission granted, trigger test confirmation
      if (dueDate && Notification.permission === 'granted') {
        new Notification('Nova Reminder Scheduled', {
          body: `Task "${created.title}" scheduled for ${dueDate}.`,
          icon: '/favicon.ico',
        });
      }
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleToggleTask(id, currentStatus) {
    try {
      const updated = await updateTask(id, { completed: !currentStatus });
      setTasks(tasks.map((t) => (t.id === id ? updated : t)));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteTask(id, title) {
    if (!window.confirm(`Delete task "${title}"?`)) return;
    try {
      await deleteTask(id);
      setTasks(tasks.filter((t) => t.id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  async function requestNotificationPermission() {
    if (typeof Notification === 'undefined') return;
    const perm = await Notification.requestPermission();
    setNotificationPermission(perm);
    if (perm === 'granted') {
      new Notification('Nova Notifications Enabled', {
        body: 'You will receive reminders for scheduled tasks and deadlines.',
      });
    }
  }

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'active') return !t.completed;
    if (filter === 'completed') return t.completed;
    return true;
  });

  const activeCount = tasks.filter((t) => !t.completed).length;

  return (
    <div className="module-container">
      <div className="module-hero">
        <div className="module-badge">
          <ListTodo size={14} />
          <span>DATABASE TASK & REMINDER ENGINE</span>
        </div>
        <h2>Focus on what matters</h2>
        <p>
          Organize persistent daily tasks, set due dates & browser reminders, and have Nova AI break down complex goals.
        </p>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="module-content-grid">
        {/* Left Column: Form & Settings */}
        <div className="module-card">
          <h3 className="card-heading">Add New Task</h3>
          <form onSubmit={handleAddTask} className="task-form">
            <div className="input-group">
              <label>Task Description</label>
              <input
                type="text"
                placeholder="What needs to be done?"
                value={inputTitle}
                onChange={(e) => setInputTitle(e.target.value)}
                className="custom-input"
                required
              />
            </div>

            <div className="form-row">
              <div className="input-group">
                <label>Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="custom-select"
                >
                  <option value="Dev">Dev & Tech</option>
                  <option value="AI">AI & ML</option>
                  <option value="Study">Study & Research</option>
                  <option value="Personal">Personal</option>
                  <option value="Reminder">Reminder</option>
                </select>
              </div>

              <div className="input-group">
                <label>Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="custom-select"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                </select>
              </div>
            </div>

            <div className="input-group">
              <label>Due Date / Scheduled Time (Optional)</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="e.g. Today 5 PM, Tomorrow, 2026-10-30"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="custom-input"
                />
              </div>
            </div>

            <button type="submit" className="btn-primary full-width" disabled={!inputTitle.trim()}>
              <Plus size={16} />
              <span>Create Task</span>
            </button>
          </form>

          {/* Browser Notifications Permission Pill */}
          <div className="toggle-card" style={{ marginTop: '20px' }}>
            <div className="toggle-text">
              <strong>Browser Reminders</strong>
              <p>Receive notifications for upcoming deadlines.</p>
            </div>
            {notificationPermission === 'granted' ? (
              <span className="action-status-badge success">
                <Check size={12} /> Enabled
              </span>
            ) : (
              <button
                type="button"
                className="btn-secondary"
                onClick={requestNotificationPermission}
                title="Enable browser notifications"
              >
                <Bell size={13} />
                <span>Enable</span>
              </button>
            )}
          </div>

          <div className="task-stats-bar">
            <div className="stat-item">
              <span className="stat-num">{tasks.length}</span>
              <span className="stat-label">Total in DB</span>
            </div>
            <div className="stat-item">
              <span className="stat-num">{activeCount}</span>
              <span className="stat-label">Pending</span>
            </div>
            <div className="stat-item">
              <span className="stat-num">{tasks.length - activeCount}</span>
              <span className="stat-label">Completed</span>
            </div>
          </div>
        </div>

        {/* Right Column: Task List & Filtering */}
        <div className="module-card task-list-card">
          <div className="card-top-bar">
            <h3 className="card-heading" style={{ margin: 0 }}>
              <span>Task List</span>
              <span className="counter-badge">{filteredTasks.length}</span>
            </h3>

            <div className="filter-pill-group">
              <button
                className={`filter-pill ${filter === 'all' ? 'active' : ''}`}
                onClick={() => setFilter('all')}
              >
                All
              </button>
              <button
                className={`filter-pill ${filter === 'active' ? 'active' : ''}`}
                onClick={() => setFilter('active')}
              >
                Active
              </button>
              <button
                className={`filter-pill ${filter === 'completed' ? 'active' : ''}`}
                onClick={() => setFilter('completed')}
              >
                Done
              </button>
            </div>
          </div>

          {/* Search & Priority Filter row */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search
                size={13}
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="custom-input"
                style={{ paddingLeft: '30px', fontSize: '12px' }}
              />
            </div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="custom-select"
              style={{ width: 'auto', fontSize: '12px' }}
            >
              <option value="">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div className="task-items-container">
            {loading ? (
              <p className="no-history">Loading persistent tasks from SQLite...</p>
            ) : filteredTasks.length === 0 ? (
              <div className="empty-tasks-state">
                <CheckCircle2 size={36} className="text-muted" />
                <p>No tasks found. Everything is up to date!</p>
              </div>
            ) : (
              filteredTasks.map((t) => (
                <div key={t.id} className={`task-row ${t.completed ? 'completed' : ''}`}>
                  <button
                    type="button"
                    className="task-toggle-btn"
                    onClick={() => handleToggleTask(t.id, t.completed)}
                    aria-label="Toggle task completion"
                  >
                    {t.completed ? (
                      <CheckCircle2 size={19} className="task-check-icon checked" />
                    ) : (
                      <Circle size={19} className="task-check-icon" />
                    )}
                  </button>

                  <div className="task-info">
                    <span className="task-title">{t.title}</span>
                    <div className="task-meta-tags">
                      <span className="meta-tag category">
                        <Tag size={10} />
                        {t.category}
                      </span>
                      <span className={`meta-tag priority-${t.priority}`}>{t.priority}</span>
                      {t.due_date && (
                        <span className="meta-tag category" style={{ color: '#bae6fd' }}>
                          <Calendar size={10} />
                          {t.due_date}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="task-row-actions">
                    <button
                      type="button"
                      className="task-ai-assist-btn"
                      onClick={() =>
                        onAskAssistant(
                          `Create a step-by-step action plan to accomplish this task: "${t.title}"`
                        )
                      }
                      title="Ask Nova to break down this task"
                    >
                      <Sparkles size={13} />
                      <span>Plan</span>
                    </button>
                    <button
                      type="button"
                      className="task-delete-btn"
                      onClick={() => handleDeleteTask(t.id, t.title)}
                      title="Delete task"
                      aria-label="Delete task"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
