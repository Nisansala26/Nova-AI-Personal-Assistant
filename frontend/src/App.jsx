import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Check,
  CheckCircle2,
  CloudSun,
  Copy,
  ExternalLink,
  FileText,
  Globe2,
  History,
  LayoutDashboard,
  ListTodo,
  Menu,
  MessageSquare,
  Mic,
  Moon,
  Pause,
  Pencil,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  Plus,
  RotateCcw,
  Search,
  Send,
  Settings,
  Settings2,
  ShieldCheck,
  Square,
  SquarePlay,
  Sparkles,
  StickyNote,
  Sun,
  Trash2,
  User as UserIcon,
  Users,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';

import Orb from './components/Orb';
import Modal from './components/Modal';
import AuthModal from './components/AuthModal';
import ActionExecutionPanel from './components/ActionExecutionPanel';
import useSpeechRecognition from './hooks/useSpeechRecognition';
import {
  clearConversation,
  createConversation,
  deleteConversation,
  getConversation,
  getConversations,
  getCurrentUser,
  regenerateResponse,
  renameConversation,
  streamAssistantCommand,
} from './services/api';

// Interactive workspace modules
import TasksView from './components/modules/TasksView';
import VoiceSettingsView from './components/modules/VoiceSettingsView';
import DocumentsView from './components/modules/DocumentsView';
import WebResearchView from './components/modules/WebResearchView';
import YouTubeView from './components/modules/YouTubeView';
import AnalyticsView from './components/modules/AnalyticsView';
import NotesView from './components/modules/NotesView';
import SettingsView from './components/modules/SettingsView';
import VoiceAssistantView from './components/modules/VoiceAssistantView';
import ContactsView from './components/modules/ContactsView';

const MessageContent = lazy(() => import('./components/MessageContent'));

const quickActions = [
  { label: 'Weather in Colombo', desc: 'Check local temperature and forecasts', Icon: CloudSun, tone: 'cyan' },
  { label: 'Take a note: buy groceries', desc: 'Store a quick reminder in your database', Icon: StickyNote, tone: 'violet' },
  { label: 'Explain quantum computing', desc: 'Get a clear, intuitive breakdown of complex topics', Icon: Search, tone: 'orange' },
  { label: 'Search YouTube for Python tutorials', desc: 'Find high-quality developer tutorials and courses', Icon: Play, tone: 'pink' },
];

const welcomeMessage = {
  role: 'assistant',
  content: 'Hello! I’m **Nova**, your personal AI assistant. How can I assist you today? You can speak, type, or pick a quick action below.',
  id: 'welcome',
};

function toMessage(message) {
  return {
    ...message,
    id: message.id || `${Date.now()}-${Math.random()}`,
    action: message.action,
    url: message.url,
  };
}

const DEFAULT_VOICE_CONFIG = {
  voiceURI: '',
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0,
  autoSpeak: true,
  wakeWordEnabled: false,
};

export default function App() {
  const [page, setPage] = useState('AI Assistant');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([welcomeMessage]);
  const [conversations, setConversations] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [sound, setSound] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState(null);
  const [sidebar, setSidebar] = useState(true);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [connected, setConnected] = useState(null);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [actionNotice, setActionNotice] = useState(null);
  const [activeAction, setActiveAction] = useState(null);

  // Auth state
  const [currentUser, setCurrentUser] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Theme state: 'dark' (Cyber-Luxe) or 'light' (Studio Light)
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('nova_theme') || 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('nova_theme', theme);
    } catch {
      // ignore
    }
  }, [theme]);

  // Voice engine configuration persisted in localStorage
  const [voiceConfig, setVoiceConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('nova_voice_config');
      return saved ? JSON.parse(saved) : DEFAULT_VOICE_CONFIG;
    } catch {
      return DEFAULT_VOICE_CONFIG;
    }
  });

  const [availableVoices, setAvailableVoices] = useState([]);

  useEffect(() => {
    function loadVoices() {
      if ('speechSynthesis' in window) {
        setAvailableVoices(window.speechSynthesis.getVoices());
      }
    }
    loadVoices();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Modal dialog state
  const [modalState, setModalState] = useState({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
    inputValue: '',
    confirmLabel: 'Confirm',
    onConfirm: () => {},
  });

  const messagesRef = useRef(null);
  const textareaRef = useRef(null);
  const busyRef = useRef(false);
  const soundRef = useRef(true);
  const conversationIdRef = useRef(null);
  const voiceConfigRef = useRef(voiceConfig);
  const initializedRef = useRef(false);

  useEffect(() => {
    soundRef.current = sound;
  }, [sound]);

  useEffect(() => {
    voiceConfigRef.current = voiceConfig;
    try {
      localStorage.setItem('nova_voice_config', JSON.stringify(voiceConfig));
    } catch {
      // ignore
    }
  }, [voiceConfig]);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    void initialize();

    // Check user auth on startup
    getCurrentUser()
      .then((res) => {
        if (res?.authenticated) setCurrentUser(res.user);
      })
      .catch(() => {});

    return () => window.speechSynthesis?.cancel();
  }, []);

  useEffect(() => {
    const container = messagesRef.current;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, busy]);

  const speech = useSpeechRecognition(
    (text) => {
      setInput(text);
      void run(text, true);
    },
    { wakeWordEnabled: voiceConfig.wakeWordEnabled }
  );

  async function initialize() {
    try {
      const items = await getConversations();
      setConversations(items);
      setConnected(true);
      if (items.length) {
        await openConversation(items[0].id);
      } else {
        await createNewConversation();
      }
    } catch (requestError) {
      setConnected(false);
      setError(requestError.message);
    } finally {
      setInitializing(false);
    }
  }

  function setActiveConversation(id, title) {
    conversationIdRef.current = id;
    setConversationId(id);
    if (title) {
      setConversations((items) => [
        { id, title, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        ...items.filter((item) => item.id !== id),
      ]);
    }
  }

  async function refreshConversations() {
    const items = await getConversations();
    setConversations(items);
    return items;
  }

  async function createNewConversation() {
    const conversation = await createConversation();
    setActiveConversation(conversation.id, conversation.title);
    setMessages([welcomeMessage]);
    setInput('');
    setError('');
    setConnected(true);
    setPage('AI Assistant');
    setMobileMenu(false);
    return conversation;
  }

  async function newChat() {
    try {
      await createNewConversation();
    } catch (requestError) {
      setError(requestError.message);
      setConnected(false);
    }
  }

  async function openConversation(id) {
    try {
      const conversation = await getConversation(id);
      setActiveConversation(conversation.id);
      setMessages(conversation.messages.length ? conversation.messages.map(toMessage) : [welcomeMessage]);
      setInput('');
      setError('');
      setConnected(true);
      setPage('AI Assistant');
      setMobileMenu(false);
    } catch (requestError) {
      setError(requestError.message);
      setConnected(false);
    }
  }

  function speakText(text, messageId = null) {
    if (!soundRef.current || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();

    // Clean markdown symbols for cleaner TTS speech
    const cleanText = text
      .replace(/```[\s\S]*?```/g, 'Code block omitted.')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/[*_#~]/g, '')
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const cfg = voiceConfigRef.current;
    utterance.rate = cfg.rate || 1.0;
    utterance.pitch = cfg.pitch || 1.0;
    utterance.volume = cfg.volume ?? 1.0;

    if (cfg.voiceURI) {
      const voices = window.speechSynthesis.getVoices();
      const match = voices.find((v) => v.voiceURI === cfg.voiceURI);
      if (match) utterance.voice = match;
    }

    utterance.onstart = () => {
      setSpeaking(true);
      setIsPaused(false);
      if (messageId) setSpeakingMsgId(messageId);
    };

    const handleEnd = () => {
      setSpeaking(false);
      setIsPaused(false);
      setSpeakingMsgId(null);
    };

    utterance.onend = handleEnd;
    utterance.onerror = handleEnd;

    window.speechSynthesis.speak(utterance);
  }

  function pauseSpeaking() {
    if ('speechSynthesis' in window && speaking) {
      if (isPaused) {
        window.speechSynthesis.resume();
        setIsPaused(false);
      } else {
        window.speechSynthesis.pause();
        setIsPaused(true);
      }
    }
  }

  function stopSpeaking() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
    setIsPaused(false);
    setSpeakingMsgId(null);
  }

  async function run(value, isVoice = false) {
    const command = (value ?? input).trim();
    if (!command || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError('');
    setActionNotice(null);
    setInput('');

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Check if the command indicates an open/navigation action
    const lowerCmd = command.toLowerCase();
    const isNavigationIntent =
      lowerCmd.includes('youtube') ||
      lowerCmd.startsWith('open ') ||
      lowerCmd.startsWith('search ') ||
      lowerCmd.startsWith('google ') ||
      lowerCmd.startsWith('find ') ||
      lowerCmd.startsWith('play ') ||
      lowerCmd.startsWith('watch ');

    // Synchronously open blank window during user click/submit to maintain activation token
    let preOpenedTab = null;
    if (!isVoice && isNavigationIntent) {
      try {
        preOpenedTab = window.open('about:blank', '_blank');
      } catch {
        preOpenedTab = null;
      }
    }

    const userMessage = { role: 'user', content: command, id: `${Date.now()}-user` };
    setMessages((current) => [...current, userMessage]);

    try {
      let activeId = conversationIdRef.current;
      if (!activeId) {
        const created = await createConversation();
        activeId = created.id;
        setActiveConversation(created.id, created.title);
      }

      const assistantMsgId = `${Date.now()}-assistant`;
      let accumulatedText = '';
      let actionHandled = false;

      // Temporary placeholder message
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: '',
          id: assistantMsgId,
        },
      ]);

      await streamAssistantCommand(
        command,
        activeId,
        (delta) => {
          accumulatedText += delta;
          setMessages((current) =>
            current.map((m) =>
              m.id === assistantMsgId ? { ...m, content: accumulatedText } : m
            )
          );
        },
        (actionResult, convId) => {
          actionHandled = true;
          setConnected(true);
          let actionStatus = null;

          // Extract structured action or legacy action format
          const actionObj =
            typeof actionResult.action === 'object' && actionResult.action !== null
              ? actionResult.action
              : { type: actionResult.action, url: actionResult.url };

          const isOpenUrlAction =
            actionObj.type === 'open_url' ||
            actionResult.action === 'open_url' ||
            actionResult.action === 'youtube_search' ||
            Boolean(actionResult.url);

          const targetUrl = actionObj.url || actionResult.url;
          const displayReply = actionResult.reply || actionResult.response;

          if (isOpenUrlAction && targetUrl) {
            let tabOpened = false;

            // Navigate the synchronously pre-opened tab if available
            if (preOpenedTab && !preOpenedTab.closed) {
              try {
                preOpenedTab.location.href = targetUrl;
                preOpenedTab.focus?.();
                tabOpened = true;
              } catch {
                tabOpened = false;
              }
            }

            // Fallback: attempt direct window.open
            if (!tabOpened) {
              try {
                const directTab = window.open(targetUrl, '_blank', 'noopener,noreferrer');
                if (directTab && !directTab.closed && typeof directTab.closed !== 'undefined') {
                  tabOpened = true;
                }
              } catch {
                tabOpened = false;
              }
            }

            if (tabOpened) {
              actionStatus = 'opened';
              setActionNotice({
                type: 'success',
                text: `✓ YouTube results opened in a new tab: ${targetUrl}`,
                url: targetUrl,
              });
              setTimeout(() => {
                setActionNotice((prev) => (prev?.type === 'success' ? null : prev));
              }, 6000);
            } else {
              // Popup blocked or voice triggered without user gesture
              actionStatus = 'blocked';
              setActionNotice({
                type: 'warning',
                text: isVoice
                  ? '🎙️ Voice search ready! Click "Open YouTube Search" below to view results.'
                  : 'Pop-up blocked by browser settings. Click "Open YouTube Search" below to view results.',
                url: targetUrl,
              });
            }
          } else {
            // Close the pre-opened tab if the response was not a navigation command
            if (preOpenedTab && !preOpenedTab.closed) {
              try {
                preOpenedTab.close();
              } catch {
                // ignore
              }
            }
          }

          if (actionObj.type === 'desktop_open') {
            const isSuccess = actionObj.success !== false && actionResult.action?.success !== false;
            if (isSuccess) {
              actionStatus = 'opened';
              setActionNotice({
                type: 'success',
                text: `✓ ${actionObj.app || 'Notepad'} opened successfully on Windows desktop${actionObj.pid ? ` (PID: ${actionObj.pid})` : ''}.`,
              });
              setTimeout(() => {
                setActionNotice((prev) => (prev?.type === 'success' ? null : prev));
              }, 6000);
            } else {
              actionStatus = 'failed';
              setActionNotice({
                type: 'error',
                text: `✕ Failed to open ${actionObj.app || 'Notepad'}: ${actionObj.error || actionResult.reply || 'Process failed to launch.'}`,
              });
            }
          }

          if (
            actionObj.type === 'whatsapp_prepare' ||
            actionObj.type === 'email_draft' ||
            actionObj.type === 'desktop_open' ||
            actionResult.is_multistep
          ) {
            setActiveAction({
              ...actionResult,
              ...actionObj,
              command,
              is_multistep: Boolean(actionResult.is_multistep),
              steps: actionResult.steps || [],
              type: actionObj.type || actionResult.action,
            });
          }

          setMessages((current) =>
            current.map((m) =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    content: displayReply,
                    action: actionObj.type || actionResult.action,
                    url: targetUrl,
                    query: actionResult.query,
                    target: actionResult.target,
                    actionStatus,
                  }
                : m
            )
          );

          if (voiceConfigRef.current.autoSpeak) {
            speakText(displayReply, assistantMsgId);
          }
        },
        () => {
          // Stream completed
          if (preOpenedTab && !preOpenedTab.closed && !actionHandled) {
            try {
              preOpenedTab.close();
            } catch {
              // ignore
            }
          }
          setConnected(true);
          if (accumulatedText && voiceConfigRef.current.autoSpeak && !actionHandled) {
            speakText(accumulatedText, assistantMsgId);
          }
          void refreshConversations();
        },
        (errMsg) => {
          if (preOpenedTab && !preOpenedTab.closed) {
            try {
              preOpenedTab.close();
            } catch {
              // ignore
            }
          }
          setError(errMsg);
          setMessages((current) =>
            current.map((m) =>
              m.id === assistantMsgId ? { ...m, content: `Error: ${errMsg}` } : m
            )
          );
        },
        isVoice
      );
    } catch (requestError) {
      if (preOpenedTab && !preOpenedTab.closed) {
        try {
          preOpenedTab.close();
        } catch {
          // ignore
        }
      }
      setConnected(false);
      setError(requestError.message);
      setMessages((current) => [
        ...current,
        { role: 'assistant', content: requestError.message, id: `${Date.now()}-error` },
      ]);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  // Custom Modal Handlers
  function handleOpenRename(id, currentTitle) {
    setModalState({
      isOpen: true,
      type: 'prompt',
      title: 'Rename Conversation',
      message: 'Choose a descriptive name for this conversation session.',
      inputPlaceholder: 'Conversation title...',
      inputValue: currentTitle,
      confirmLabel: 'Save Title',
      onConfirm: async () => {
        const newTitle = modalState.inputValue.trim();
        if (newTitle && newTitle !== currentTitle) {
          try {
            await renameConversation(id, newTitle);
            await refreshConversations();
          } catch (err) {
            setError(err.message);
          }
        }
        setModalState((s) => ({ ...s, isOpen: false }));
      },
    });
  }

  function handleOpenDelete(item) {
    setModalState({
      isOpen: true,
      type: 'danger',
      title: 'Delete Conversation',
      message: `Are you sure you want to delete "${item.title}"? All messages in this session will be permanently erased.`,
      confirmLabel: 'Delete Forever',
      onConfirm: async () => {
        try {
          await deleteConversation(item.id);
          const remaining = await refreshConversations();
          if (conversationIdRef.current === item.id) {
            if (remaining.length) {
              await openConversation(remaining[0].id);
            } else {
              await createNewConversation();
            }
          }
        } catch (err) {
          setError(err.message);
        }
        setModalState((s) => ({ ...s, isOpen: false }));
      },
    });
  }

  function handleOpenClear() {
    if (!conversationIdRef.current) return;
    setModalState({
      isOpen: true,
      type: 'confirm',
      title: 'Clear Conversation',
      message: 'Are you sure you want to clear all messages from this conversation? Your session title will be preserved.',
      confirmLabel: 'Clear All',
      onConfirm: async () => {
        try {
          await clearConversation(conversationIdRef.current);
          setMessages([welcomeMessage]);
          await refreshConversations();
        } catch (err) {
          setError(err.message);
        }
        setModalState((s) => ({ ...s, isOpen: false }));
      },
    });
  }

  async function regenerate() {
    if (!conversationIdRef.current || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError('');
    try {
      await regenerateResponse(conversationIdRef.current);
      const conversation = await getConversation(conversationIdRef.current);
      setMessages(conversation.messages.length ? conversation.messages.map(toMessage) : [welcomeMessage]);
      await refreshConversations();
      const latest = conversation.messages.at(-1);
      if (latest?.role === 'assistant' && voiceConfigRef.current.autoSpeak) {
        speakText(latest.content, latest.id);
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function copyMessage(content, id) {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setError('Could not copy to clipboard.');
    }
  }

  function toggleSound() {
    setSound((enabled) => !enabled);
    stopSpeaking();
  }

  const handleAskAssistant = (command) => {
    setPage('AI Assistant');
    setInput(command);
    void run(command);
  };

  const filteredConversations = conversations.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeConversation = conversations.find((item) => item.id === conversationId);
  const userMessages = messages.filter((m) => m.role === 'user');
  const isConversationEmpty = userMessages.length === 0;
  const lastAssistantIndex = messages.findLastIndex((m) => m.role === 'assistant');

  return (
    <div className="nova-app">
      {/* Background Ambient Glows */}
      <div className="ambient ambient-a" />
      <div className="ambient ambient-b" />
      <div className="ambient ambient-c" />

      {/* Mobile Drawer Toggle */}
      <button
        className="mobile-menu-btn"
        onClick={() => setMobileMenu(!mobileMenu)}
        aria-label="Toggle navigation drawer"
      >
        {mobileMenu ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Modern Collapsible Sidebar */}
      <aside className={`sidebar ${sidebar ? '' : 'collapsed'} ${mobileMenu ? 'mobile-open' : ''}`}>
        <div className="side-top">
          <div className="brand">
            <div className="brand-mark">
              <Sparkles size={20} />
            </div>
            <div className="brand-copy">
              <strong>NOVA<span>AI</span></strong>
              <small>ENTERPRISE 3.0</small>
            </div>
          </div>
          <button
            className="collapse-btn"
            onClick={() => setSidebar(!sidebar)}
            title={sidebar ? 'Collapse sidebar' : 'Expand sidebar'}
            aria-label="Toggle sidebar"
          >
            {sidebar ? <PanelLeftClose size={17} /> : <PanelLeftOpen size={17} />}
          </button>
        </div>

        <button
          className="new-chat-btn"
          onClick={() => void newChat()}
          disabled={initializing}
          title="Start a new conversation"
        >
          <Plus size={16} />
          <span>New chat</span>
        </button>

        <div className="side-label">MAIN NAVIGATION</div>
        <nav className="workspace-nav" aria-label="Module navigation">
          {[
            ['Dashboard', LayoutDashboard],
            ['AI Chat', MessageSquare],
            ['Voice Assistant', Mic],
            ['Tasks', ListTodo],
            ['Notes', StickyNote],
            ['Documents', FileText],
            ['Contacts', Users],
            ['Conversation History', History],
            ['Activity', Activity],
            ['Settings', Settings],
          ].map(([name, Icon]) => (
            <button
              key={name}
              className={`workspace-nav-item ${page === name ? 'selected' : ''}`}
              onClick={() => {
                setPage(name);
                setMobileMenu(false);
              }}
              title={name}
            >
              <Icon size={17} />
              <span>{name}</span>
              {page === name && <span className="nav-dot" />}
            </button>
          ))}
        </nav>

        {/* Conversation List & Search */}
        <div className="conv-section-header">
          <span className="side-label" style={{ margin: 0 }}>CHATS</span>
          <span className="conv-count-badge">{conversations.length}</span>
        </div>

        {sidebar && (
          <div className="conv-search-wrap">
            <Search size={13} className="conv-search-icon" />
            <input
              type="text"
              placeholder="Filter chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="conv-search-input"
            />
          </div>
        )}

        <div className="recent-list">
          {filteredConversations.length ? (
            filteredConversations.map((item) => (
              <div
                className={`conversation-row ${conversationId === item.id ? 'active' : ''}`}
                key={item.id}
              >
                <button
                  className="conversation-select"
                  onClick={() => openConversation(item.id)}
                  title={item.title}
                >
                  <MessageSquare size={13} />
                  <span>{item.title}</span>
                </button>
                <button
                  className="conversation-action"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenRename(item.id, item.title);
                  }}
                  title="Rename"
                  aria-label={`Rename ${item.title}`}
                >
                  <Pencil size={12} />
                </button>
                <button
                  className="conversation-action delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenDelete(item);
                  }}
                  title="Delete"
                  aria-label={`Delete ${item.title}`}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))
          ) : (
            <p className="no-history">
              {initializing ? 'Loading conversations…' : searchQuery ? 'No matches found.' : 'No conversations yet.'}
            </p>
          )}
        </div>

        {/* Sidebar Bottom: Account & Actions */}
        <div className="side-bottom">
          <button
            className="clear-btn"
            onClick={handleOpenClear}
            disabled={!conversationId || isConversationEmpty}
            title="Clear all messages in active conversation"
          >
            <Trash2 size={15} />
            <span>Clear messages</span>
          </button>

          <div
            className="side-user"
            onClick={() => setAuthModalOpen(true)}
            style={{ cursor: 'pointer' }}
            title={currentUser ? `Signed in as ${currentUser.email}` : 'Sign in or register account'}
          >
            <div className="user-avatar">
              {currentUser ? currentUser.username[0]?.toUpperCase() : 'N'}
            </div>
            <div className="user-info">
              <strong>{currentUser ? currentUser.username : 'Guest Session'}</strong>
              <small>{currentUser ? currentUser.email : 'Click to Sign In / Register'}</small>
            </div>
            <ShieldCheck size={16} className={currentUser ? 'text-success' : 'text-accent'} />
          </div>
        </div>
      </aside>

      {/* Main Canvas Area */}
      <div className="main-area">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Workspace</span>
            <span className="slash">/</span>
            <strong>{page}</strong>
          </div>

          <div className="top-actions">
            {/* Real-time Status */}
            <div className={`status-pill ${connected === false ? 'offline' : ''}`}>
              <span className="status-dot" />
              <span>
                {connected === false ? 'Backend Offline' : connected === true ? 'Connected' : 'Connecting'}
              </span>
            </div>

            {/* Theme Toggle: Cyber-Luxe Dark vs Studio Light */}
            <button
              className="icon-btn"
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              title={theme === 'dark' ? 'Switch to Studio Light' : 'Switch to Cyber-Luxe Dark'}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            {/* Speaking / Audio Playback Controls */}
            {speaking && (
              <>
                <button
                  className="icon-btn active-speaking"
                  onClick={pauseSpeaking}
                  title={isPaused ? 'Resume speaking' : 'Pause speaking'}
                  aria-label="Pause or resume audio"
                >
                  {isPaused ? <Play size={14} /> : <Pause size={14} />}
                </button>
                <button
                  className="icon-btn active-speaking"
                  onClick={stopSpeaking}
                  title="Stop speaking"
                  aria-label="Stop speaking"
                >
                  <Square size={14} />
                </button>
              </>
            )}

            {/* Master Sound Toggle */}
            <button
              className="icon-btn"
              onClick={toggleSound}
              title={sound ? 'Mute speech synthesis' : 'Unmute speech synthesis'}
              aria-label="Toggle sound"
            >
              {sound ? <Volume2 size={17} /> : <VolumeX size={17} />}
            </button>
          </div>
        </header>

        {/* View Switcher: Interactive Modules vs AI Assistant Canvas */}
        {page === 'Dashboard' && <AnalyticsView onAskAssistant={handleAskAssistant} />}
        {page === 'Tasks' && <TasksView onAskAssistant={handleAskAssistant} />}
        {page === 'Notes' && <NotesView onAskAssistant={handleAskAssistant} />}
        {page === 'Voice Assistant' && (
          <VoiceAssistantView
            speech={speech}
            speaking={speaking}
            stopSpeaking={stopSpeaking}
            onSendCommand={(cmd) => void run(cmd)}
            voiceConfig={voiceConfig}
            setVoiceConfig={setVoiceConfig}
          />
        )}
        {page === 'Settings' && (
          <SettingsView
            theme={theme}
            setTheme={setTheme}
            voiceConfig={voiceConfig}
            setVoiceConfig={setVoiceConfig}
            availableVoices={availableVoices}
          />
        )}
        {page === 'Voice Settings' && (
          <VoiceSettingsView voiceConfig={voiceConfig} onUpdateVoiceConfig={setVoiceConfig} />
        )}
        {page === 'Documents' && <DocumentsView onAskAssistant={handleAskAssistant} />}
        {page === 'Contacts' && <ContactsView onAskAssistant={handleAskAssistant} />}
        {page === 'Analytics' && <AnalyticsView onAskAssistant={handleAskAssistant} />}
        {page === 'Activity' && <AnalyticsView onAskAssistant={handleAskAssistant} />}
        {page === 'Web Research' && <WebResearchView onAskAssistant={handleAskAssistant} />}
        {page === 'YouTube' && <YouTubeView onAskAssistant={handleAskAssistant} />}
        {page === 'Conversation History' && (
          <div className="module-container">
            <div className="module-header">
              <div>
                <h2 className="module-title">Conversation History</h2>
                <p className="module-desc">Review, search, rename, or resume your past AI assistant dialogues.</p>
              </div>
              <button className="btn-primary" onClick={() => void newChat()}>
                <Plus size={14} />
                <span>New Conversation</span>
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {conversations.length === 0 ? (
                <div className="empty-state">No past conversations recorded yet.</div>
              ) : (
                conversations.map((c) => (
                  <div
                    key={c.id}
                    className="glass-card"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 18px',
                      cursor: 'pointer',
                    }}
                    onClick={() => void openConversation(c.id)}
                  >
                    <div>
                      <strong style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>{c.title}</strong>
                      <small style={{ display: 'block', color: 'var(--text-muted)', marginTop: '4px' }}>
                        {c.created_at ? new Date(c.created_at).toLocaleString() : 'Recent'}
                      </small>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenRename(c.id, c.title);
                        }}
                        title="Rename"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn text-danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDelete(c.id);
                        }}
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {(page === 'AI Assistant' || page === 'AI Chat') && (
          <div className="chat-canvas">
            {/* HERO CANVAS: When no messages have been exchanged yet */}
            {isConversationEmpty ? (
              <div className="hero-canvas">
                <div className="hero-badge">
                  <Sparkles size={13} />
                  <span>YOUR INTELLIGENT COMPANION</span>
                </div>
                <h1 className="hero-title">
                  Good to see you. <span>I'm Nova.</span>
                </h1>
                <p className="hero-subtext">
                  Your cyber-luxe workspace to reason, code, synthesize, and create with voice and intelligence.
                </p>

                {/* 3D Voice Orb Stage */}
                <div className="hero-orb-stage">
                  <Orb
                    listening={speech.isListening}
                    speaking={speaking}
                    thinking={busy}
                    variant="hero"
                    onClick={() => (speech.isListening ? speech.stop() : speech.start())}
                  />
                  <div className="orb-guidance">
                    <strong>
                      {speech.isListening
                        ? 'Listening to you...'
                        : speaking
                        ? isPaused
                          ? 'Nova is paused...'
                          : 'Nova is responding...'
                        : busy
                        ? 'Processing request...'
                        : 'Tap Orb or Mic to talk'}
                    </strong>
                    <span>
                      {speech.supported
                        ? voiceConfig.wakeWordEnabled
                          ? 'Say "Hey Nova" or tap to talk.'
                          : 'Speak naturally or use the chat composer below.'
                        : 'Voice recognition requires Chrome or Edge.'}
                    </span>
                    {speech.error && <span className="inline-error">{speech.error}</span>}
                  </div>
                </div>

                <ActionExecutionPanel
                  activeAction={activeAction}
                  onDismiss={() => setActiveAction(null)}
                  onExecuteConfirm={(kind) => {
                    setActionNotice({ type: 'success', text: `✓ Action dispatched (${kind})` });
                    setTimeout(() => setActionNotice(null), 4000);
                  }}
                />

                {/* Quick Action Cards Grid */}
                <div className="hero-quick-grid">
                  {quickActions.map(({ label, desc, Icon, tone }) => (
                    <button
                      key={label}
                      className="action-card"
                      onClick={() => void run(label)}
                      disabled={busy}
                    >
                      <div className={`action-card-icon ${tone}`}>
                        <Icon size={18} />
                      </div>
                      <strong>{label}</strong>
                      <small>{desc}</small>
                      <ArrowUpRight className="action-arrow" size={15} />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* ACTIVE CONVERSATION STREAM (Full-Height Chat) */
              <div className="conversation-stream" ref={messagesRef}>
                <div className="active-conv-header">
                  <div className="active-conv-title">
                    <MessageSquare size={15} />
                    <span>{activeConversation?.title || 'Active Session'}</span>
                  </div>
                  <div className="active-conv-meta">
                    <span>
                      {userMessages.length} {userMessages.length === 1 ? 'message' : 'messages'}
                    </span>
                    <Orb
                      variant="compact"
                      listening={speech.isListening}
                      speaking={speaking}
                      thinking={busy}
                      onClick={() => (speech.isListening ? speech.stop() : speech.start())}
                    />
                  </div>
                </div>

                {actionNotice && (
                  <div className={`action-notice-toast ${actionNotice.type}`}>
                    <div className="action-notice-text">
                      {actionNotice.type === 'success' ? (
                        <CheckCircle2 size={16} className="text-success" />
                      ) : actionNotice.type === 'error' ? (
                        <AlertCircle size={16} style={{ color: '#ef4444' }} />
                      ) : (
                        <AlertCircle size={16} className="text-warning" />
                      )}
                      <span>{actionNotice.text}</span>
                    </div>
                    <div className="action-notice-actions">
                      {actionNotice.url && (
                        <a
                          href={actionNotice.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="notice-link"
                        >
                          Open Link <ArrowUpRight size={12} />
                        </a>
                      )}
                      <button
                        type="button"
                        className="notice-close-btn"
                        onClick={() => setActionNotice(null)}
                        aria-label="Dismiss notification"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                )}

                <ActionExecutionPanel
                  activeAction={activeAction}
                  onDismiss={() => setActiveAction(null)}
                  onExecuteConfirm={(kind) => {
                    setActionNotice({ type: 'success', text: `✓ Action dispatched (${kind})` });
                    setTimeout(() => setActionNotice(null), 4000);
                  }}
                />

                {messages.map((message, index) => (
                  <div key={message.id} className={`message-row ${message.role}`}>
                    <div className="message-avatar">
                      {message.role === 'assistant' ? <Sparkles size={16} /> : 'You'}
                    </div>

                    <div className="message-content-wrap">
                      <div className="message-sender-name">
                        <span>{message.role === 'assistant' ? 'Nova AI' : 'You'}</span>
                      </div>

                      <div className="message-bubble">
                        <Suspense fallback={<p>Formatting response...</p>}>
                          <MessageContent content={message.content} />
                        </Suspense>

                        {/* Structured Action Card */}
                        {message.url && (
                          <div className="message-action-card">
                            <div className="action-card-header">
                              <div className="action-card-brand">
                                {message.action === 'youtube_search' || message.target === 'youtube' ? (
                                  <SquarePlay size={20} className="brand-icon-youtube" />
                                ) : (
                                  <Globe2 size={20} className="brand-icon-web" />
                                )}
                                <div className="action-card-titles">
                                  <strong>
                                    {message.action === 'youtube_search'
                                      ? `YouTube Search: "${message.query || 'Results'}"`
                                      : message.target === 'youtube'
                                      ? 'YouTube'
                                      : 'Web Search Results'}
                                  </strong>
                                  {message.actionStatus === 'opened' && (
                                    <span className="action-status-badge success">
                                      <CheckCircle2 size={11} /> Opened in new browser tab
                                    </span>
                                  )}
                                  {message.actionStatus === 'blocked' && (
                                    <span className="action-status-badge warning">
                                      <AlertCircle size={11} /> Pop-up blocked by browser
                                    </span>
                                  )}
                                </div>
                              </div>
                              <a
                                href={message.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`action-open-btn ${message.actionStatus === 'blocked' ? 'pulse-prompt' : ''}`}
                                onClick={() => {
                                  setMessages((prev) =>
                                    prev.map((m) =>
                                      m.id === message.id ? { ...m, actionStatus: 'opened' } : m
                                    )
                                  );
                                }}
                              >
                                <span>
                                  {message.actionStatus === 'blocked' ? 'Open YouTube Search' : 'Open in YouTube'}
                                </span>
                                <ExternalLink size={13} />
                              </a>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action Bar for Assistant Messages */}
                      {message.role === 'assistant' && message.id !== 'welcome' && (
                        <div className="message-action-bar">
                          <button
                            type="button"
                            className="msg-action-btn"
                            onClick={() => copyMessage(message.content, message.id)}
                            title="Copy message to clipboard"
                          >
                            {copiedId === message.id ? (
                              <>
                                <Check size={12} className="text-success" />
                                <span>Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy size={12} />
                                <span>Copy</span>
                              </>
                            )}
                          </button>

                          {/* Individual Message TTS Play/Pause */}
                          <button
                            type="button"
                            className={`msg-action-btn ${speakingMsgId === message.id ? 'playing' : ''}`}
                            onClick={() => {
                              if (speakingMsgId === message.id) {
                                stopSpeaking();
                              } else {
                                speakText(message.content, message.id);
                              }
                            }}
                            title={speakingMsgId === message.id ? 'Pause audio' : 'Read aloud'}
                          >
                            <Volume2 size={12} />
                            <span>{speakingMsgId === message.id ? 'Stop' : 'Speak'}</span>
                          </button>

                          {/* Regenerate Response */}
                          {index === lastAssistantIndex && (
                            <button
                              type="button"
                              className="msg-action-btn"
                              onClick={() => void regenerate()}
                              disabled={busy}
                              title="Regenerate this response"
                            >
                              <RotateCcw size={12} />
                              <span>Retry</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Thinking Shimmer */}
                {busy && (
                  <div className="thinking-box">
                    <div className="thinking-dots">
                      <span />
                      <span />
                      <span />
                    </div>
                    <span>Nova is synthesizing a response...</span>
                  </div>
                )}
              </div>
            )}

            {/* Error Banner */}
            {error && (
              <div className="error-banner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <span>{error}</span>
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    void initialize();
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: '1px solid rgba(255, 255, 255, 0.35)',
                    color: 'inherit',
                    borderRadius: '6px',
                    padding: '4px 12px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Retry Connection
                </button>
              </div>
            )}

            {/* Floating Glass Composer Dock */}
            <div className="composer-dock">
              <form
                className="composer-pill"
                onSubmit={(e) => {
                  e.preventDefault();
                  void run();
                }}
              >
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void run();
                    }
                  }}
                  placeholder="Message Nova... (Press Enter to send, Shift+Enter for new line)"
                  rows={1}
                  className="composer-textarea"
                  disabled={busy || initializing}
                />

                <div className="composer-actions">
                  <button
                    type="button"
                    className={`mic-pill-btn ${speech.isListening ? 'recording' : ''}`}
                    onClick={() => (speech.isListening ? speech.stop() : speech.start())}
                    disabled={!speech.supported || busy}
                    title={speech.isListening ? 'Stop listening' : 'Voice input'}
                    aria-label="Voice input"
                  >
                    <Mic size={18} />
                  </button>

                  <button
                    type="submit"
                    className="send-pill-btn"
                    disabled={busy || !input.trim()}
                    title="Send message"
                    aria-label="Send message"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </form>

              <div className="composer-footnote">
                Nova AI 3.0 · Enterprise Cyber-Luxe Edition · Groq LPU + FastAPI SQLite Architecture
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Accessible Modals */}
      <Modal
        isOpen={modalState.isOpen}
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
        inputValue={modalState.inputValue}
        inputPlaceholder={modalState.inputPlaceholder}
        onInputChange={(val) => setModalState((s) => ({ ...s, inputValue: val }))}
        confirmLabel={modalState.confirmLabel}
        onConfirm={modalState.onConfirm}
        onCancel={() => setModalState((s) => ({ ...s, isOpen: false }))}
      />

      <AuthModal
        isOpen={authModalOpen}
        currentUser={currentUser}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={(user) => {
          setCurrentUser(user);
          void refreshConversations();
        }}
      />
    </div>
  );
}
