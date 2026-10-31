import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Conversation, Message, Settings, Persona, InterfaceTheme, ColorTheme, User } from './types';
import { buildSystemPrompt } from './services/aiConfig';

// ── NOTE: Add `hasMessages?: boolean` to your Conversation type in types.ts ──
// export type Conversation = {
//   id: string;
//   title: string;
//   messages: Message[];
//   lastUpdated: number;
//   pinned: boolean;
//   hasMessages?: boolean;  // ← ADD THIS
// };

const API = import.meta.env.VITE_API_URL || '';

// Model display names
const MODEL_NAMES: Record<string, string> = {
  'xenon-1.0': 'Xenon 1.0',
  'yuruzu-1.0': 'Yuruzu 1.0',
};

// Only 5 personas
const PERSONA_NAMES: Record<Persona, string> = {
  default: 'Default',
  formal: 'Formal',
  concise: 'Concise',
  precise: 'Precise',
  creative: 'Creative',
};

// AI name in chat: "Zyro - {Model Name}"
function getAIDisplayName(model: string): string {
  return `Zyro — ${MODEL_NAMES[model] || model}`;
}

// ── Toast ─────────────────────────────────────────────────────────────────────
type Toast = { id: string; message: string; type: 'success' | 'error' | 'info' };

// ── Guest rate limiter ────────────────────────────────────────────────────────
const GUEST_LIMIT = 5;
const GUEST_WINDOW_MS = 60_000;
let guestRequestTimestamps: number[] = [];
function checkGuestRateLimit(): boolean {
  const now = Date.now();
  guestRequestTimestamps = guestRequestTimestamps.filter(t => now - t < GUEST_WINDOW_MS);
  if (guestRequestTimestamps.length >= GUEST_LIMIT) return false;
  guestRequestTimestamps.push(now);
  return true;
}

// ── Icons ─────────────────────────────────────────────────────────────────────
const IconHamburger = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 6H20M4 12H20M4 18H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>);
const IconSettings  = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>);
const IconStop      = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" rx="2" fill="currentColor"/></svg>);
const IconSend      = () => (<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 7H13M13 7L7 1M13 7L7 13" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/></svg>);
const IconClose     = () => (<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/></svg>);
const IconPlus      = () => (<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1V13M1 7H13" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/></svg>);
const IconPin       = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2L12 8M12 8L8 12H4V14H10L10 22L12 22L14 22L14 14H20V12H16L12 8Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>);
const IconTrash     = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 6H5H21M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M10 11V17M14 11V17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>);
const IconEdit      = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13M18.5 2.5C18.8978 2.10217 19.437 1.87868 20 1.87868C20.563 1.87868 21.1022 2.10217 21.5 2.5C21.8978 2.89782 22.1213 3.43696 22.1213 4C22.1213 4.56304 21.8978 5.10217 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>);
const IconCopy      = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M5 15H4C3.46957 15 2.96086 14.7893 2.58579 14.4142C2.21071 14.0391 2 13.5304 2 13V4C2 3.46957 2.21071 2.96086 2.58579 2.58579C2.96086 2.21071 3.46957 2 4 2H13C13.5304 2 14.0391 2.21071 14.4142 2.58579C14.7893 2.96086 15 3.46957 15 4V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>);
const IconRefresh   = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M23 4V10H17M1 20V14H7M3.51 9C4.01717 7.56678 4.87913 6.2854 6.01547 5.27541C7.1518 4.26543 8.52547 3.55989 10.0083 3.22464C11.4911 2.88939 13.0348 2.93516 14.4952 3.35778C15.9556 3.78041 17.2853 4.56624 18.36 5.64L23 10M1 14L5.64 18.36C6.71475 19.4338 8.04437 20.2196 9.50481 20.6422C10.9652 21.0648 12.5089 21.1106 13.9917 20.7754C15.4745 20.4401 16.8482 19.7346 17.9845 18.7246C19.1209 17.7146 19.9828 16.4332 20.49 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>);
const IconChevronDown = () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>);
const IconMore      = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="5" r="1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="19" r="1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>);
const IconLogout    = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9M16 17L21 12L16 7M21 12H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>);
const IconUser      = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>);
const IconKey       = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>);
const IconSwitch    = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>);
const IconCpu       = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.5"/><rect x="9" y="9" width="6" height="6" fill="currentColor" opacity="0.4"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>);

// ── Guest session storage ─────────────────────────────────────────────────────
// Only conversations with at least 1 message are ever persisted.
function loadGuestConvs(): Conversation[] {
  try { const r = sessionStorage.getItem('zyro_guest'); return r ? JSON.parse(r) : []; } catch { return []; }
}
function saveGuestConvs(c: Conversation[]) {
  const used = c.filter(conv => conv.messages.length > 0);
  try { sessionStorage.setItem('zyro_guest', JSON.stringify(used)); } catch {}
}

// ── Settings panel sub-views ──────────────────────────────────────────────────
type SettingsView = 'main' | 'edit-profile' | 'change-password' | 'delete-account' | 'ai-instructions' | 'model-select';

// ── Typing indicator ──────────────────────────────────────────────────────────
const TypingIndicator = () => (
  <div className="flex items-center gap-[5px] h-5">
    {[0, 1, 2].map(i => (
      <motion.span
        key={i}
        className="block w-1.5 h-1.5 rounded-full bg-silver"
        animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
        transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2, ease: 'easeInOut' }}
      />
    ))}
  </div>
);

// ── Shimmer loading skeleton ──────────────────────────────────────────────────
const ShimmerBlock = ({ w = '100%', h = 14 }: { w?: string; h?: number }) => (
  <div
    className="rounded shimmer-anim"
    style={{ width: w, height: h, background: 'var(--surface2)', position: 'relative', overflow: 'hidden' }}
  />
);

const ResponseSkeleton = () => (
  <div className="flex flex-col items-start gap-3 w-full max-w-[420px]">
    <ShimmerBlock w="60%" h={10} />
    <ShimmerBlock w="100%" h={10} />
    <ShimmerBlock w="85%" h={10} />
    <ShimmerBlock w="70%" h={10} />
  </div>
);

// ── App ────────────────────────────────────────────────────────────────────────
export default function App() {
  const [currentUser, setCurrentUser]             = useState<User | null>(null);
  const [authLoading, setAuthLoading]             = useState(true);
  const [authModal, setAuthModal]                 = useState<'login'|'register'|null>(null);
  const [authForm, setAuthForm]                   = useState({ username:'', email:'', password:'' });
  const [authError, setAuthError]                 = useState('');
  const [authSubmitting, setAuthSubmitting]       = useState(false);
  const [conversations, setConversations]         = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string|null>(null);
  const [isSidebarOpen, setIsSidebarOpen]         = useState(false);
  const [isSettingsOpen, setIsSettingsOpen]       = useState(false);
  const [settingsView, setSettingsView]           = useState<SettingsView>('main');
  const [isConfirmOpen, setIsConfirmOpen]         = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [renameId, setRenameId]                   = useState<string|null>(null);
  const [renameValue, setRenameValue]             = useState('');
  const [inputValue, setInputValue]               = useState('');
  const [isTyping, setIsTyping]                   = useState(false);
  const [isConnecting, setIsConnecting]           = useState(false);
  const [streamingText, setStreamingText]         = useState('');
  const [copySuccess, setCopySuccess]             = useState<string|null>(null);
  const [mobileOptionsId, setMobileOptionsId]     = useState<string|null>(null);
  const [apiError, setApiError]                   = useState<{message:string;action?:()=>void;actionLabel?:string}|null>(null);
  const [toasts, setToasts]                       = useState<Toast[]>([]);
  const CHAR_WARN = 8000;
  
  // Logo uses declarative motion props — no imperative ref needed

  // Profile edit state
  const [profileForm, setProfileForm]             = useState({ username:'', email:'' });
  const [profileError, setProfileError]           = useState('');
  const [profileSubmitting, setProfileSubmitting] = useState(false);

  // Change password state
  const [pwForm, setPwForm]                       = useState({ current:'', next:'', confirm:'' });
  const [pwError, setPwError]                     = useState('');
  const [pwSubmitting, setPwSubmitting]           = useState(false);

  // Delete account state
  const [deleteForm, setDeleteForm]               = useState({ password:'' });
  const [deleteError, setDeleteError]             = useState('');
  const [deleteSubmitting, setDeleteSubmitting]   = useState(false);

  const [settings, setSettings] = useState<Settings>({
    model: 'xenon-1.0', persona: 'default', personaName: 'Default',
    interfaceTheme: 'dark', colorTheme: 'monochrome',
    memoryEnabled: true,
    aiInstructions: '',
  });

  const chatEndRef         = useRef<HTMLDivElement>(null);
  const textareaRef        = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController|null>(null);
  const readerRef          = useRef<ReadableStreamDefaultReader|null>(null);
  const streamBufferRef    = useRef('');
  const rafRef             = useRef<number|null>(null);

  // ── Toast ─────────────────────────────────────────────────────────────────
  const showToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Date.now().toString();
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 2500);
  }, []);

  // ── Theme ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.setAttribute('data-color-theme', settings.colorTheme);
  }, [settings.colorTheme]);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.interfaceTheme === 'dark' ? '' : settings.interfaceTheme);
  }, [settings.interfaceTheme]);

  // ── Session check ─────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/api/auth/me`, { credentials: 'include' });
        const data = await res.json();
        if (data.user) {
          setCurrentUser(data.user);
          await loadConversations();
          // Load per-user AI instructions from backend
          try {
            const instrRes = await fetch(`${API}/api/auth/ai-instructions`, { credentials: 'include' });
            if (instrRes.ok) {
              const instrData = await instrRes.json();
              setSettings(s => ({ ...s, aiInstructions: instrData.ai_instructions || '' }));
            }
          } catch {}
        } else {
          // Guest: restore only conversations with messages from session storage.
          // activeConversationId stays null — user lands on blank new thread.
          const saved = loadGuestConvs();
          setConversations(saved);
          setActiveConversationId(null);
        }
      } catch {
        // Network error — start as guest with no conversations
        setConversations([]);
        setActiveConversationId(null);
      } finally { setAuthLoading(false); }
    })();
  }, []);

  useEffect(() => {
    const s = localStorage.getItem('zyro_settings');
    if (s) { try { setSettings(JSON.parse(s)); } catch {} }
  }, []);
  useEffect(() => { localStorage.setItem('zyro_settings', JSON.stringify(settings)); }, [settings]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [conversations, streamingText, isTyping]);
  useEffect(() => { const h = () => setMobileOptionsId(null); window.addEventListener('click', h); return () => window.removeEventListener('click', h); }, []);

  // ── Guest persistence: sync to sessionStorage whenever conversations change ─
  // Only fires for guests (currentUser is null). Filters to only used convs.
  useEffect(() => {
    if (!currentUser) {
      saveGuestConvs(conversations);
    }
  }, [conversations, currentUser]);

  // Reset settings sub-view on open
  useEffect(() => { if (isSettingsOpen) setSettingsView('main'); }, [isSettingsOpen]);

  

  // ── Swipe ─────────────────────────────────────────────────────────────────
  const [touchStart, setTouchStart]   = useState<number|null>(null);
  const [touchEnd, setTouchEnd]       = useState<number|null>(null);
  const [touchStartY, setTouchStartY] = useState<number|null>(null);
  const onTouchStart = (e: React.TouchEvent) => { setTouchEnd(null); setTouchStart(e.targetTouches[0].clientX); setTouchStartY(e.targetTouches[0].clientY); };
  const onTouchMove  = (e: React.TouchEvent) => { setTouchEnd(e.targetTouches[0].clientX); };
  const onTouchEnd   = (e: React.TouchEvent) => {
    if (!touchStart || !touchEnd || !touchStartY) return;
    const target = e.target as HTMLElement;
    if (target.closest('textarea') || target.closest('.overflow-y-auto')) return;
    const dx = touchStart - touchEnd;
    const dy = Math.abs((e.changedTouches[0]?.clientY ?? touchStartY) - touchStartY);
    if (dy > Math.abs(dx)) return;
    if (dx > 50 && !isSidebarOpen && !isSettingsOpen) setIsSettingsOpen(true);
    if (dx < -50 && !isSettingsOpen && !isSidebarOpen) setIsSidebarOpen(true);
    if (dx > 50 && isSidebarOpen) setIsSidebarOpen(false);
    if (dx < -50 && isSettingsOpen) setIsSettingsOpen(false);
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  function makeLocalConv(title = 'New Conversation'): Conversation {
    return { id: Date.now().toString(), title, messages: [], lastUpdated: Date.now(), pinned: false };
  }
  const activeConversation  = conversations.find(c => c.id === activeConversationId) ?? null;
  const sortedConversations = [...conversations.filter(c => c.pinned), ...conversations.filter(c => !c.pinned)];

  // ── Backend ───────────────────────────────────────────────────────────────
  async function loadConversations() {
    try {
      setConversations([]);
      const res = await fetch(`${API}/api/conversations/`, { credentials: 'include' });
      if (!res.ok) return;
      const data: any[] = await res.json();
      const convs: Conversation[] = data.map(c => ({
        id: c.id,
        title: c.title,
        messages: [],
        lastUpdated: c.lastUpdated,
        pinned: c.pinned,
        // Mark as hasMessages:true — the backend only returns convs that have messages
        // (see conversations.py GET filter). This lets visibleConvs show them in the
        // sidebar even before their messages are lazy-loaded into memory.
        hasMessages: true,
      }));
      // Pinned first, then by last updated (backend already sorts, but keep consistent)
      const sorted = [...convs.filter(c => c.pinned), ...convs.filter(c => !c.pinned)];
      setConversations(sorted);
      // Always land on blank new thread — user navigates to history via sidebar
      setActiveConversationId(null);
    } catch {}
  }

  async function loadMessages(convId: string): Promise<Message[]> {
    try {
      const res = await fetch(`${API}/api/conversations/${convId}/messages`, { credentials: 'include' });
      if (!res.ok) return [];
      return await res.json();
    } catch { return []; }
  }

  async function saveMessageToBackend(convId: string, msg: Message) {
    if (!currentUser) return;
    try {
      await fetch(`${API}/api/conversations/${convId}/messages`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msg),
      });
    } catch {}
  }

  async function updateConvTitle(convId: string, title: string) {
    if (!currentUser) return;
    try {
      await fetch(`${API}/api/conversations/${convId}/title`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
    } catch {}
  }

  // ── Conversation actions ──────────────────────────────────────────────────
  const selectConversation = async (convId: string) => {
    setActiveConversationId(convId);
    setIsSidebarOpen(false);
    if (currentUser) {
      const ex = conversations.find(c => c.id === convId);
      if (ex && ex.messages.length === 0) {
        // Lazy-load messages for this conversation
        const msgs = await loadMessages(convId);
        if (msgs.length) setConversations(p => p.map(c => c.id === convId ? { ...c, messages: msgs } : c));
      }
    }
  };

  // ── handleNewChat ─────────────────────────────────────────────────────────
  // Sets activeConversationId to null — this IS the blank pending thread.
  // No DB record or local object is created until the first message is sent.
  // The conv becomes visible in history only after the first message is saved.
  const handleNewChat = () => {
    stopGenerating();

    // Already on blank thread — nothing to do except clear any leftover input
    if (!activeConversationId) {
      setInputValue('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
      return;
    }

    // Check if current active conv is already empty (e.g. a guest local conv
    // that was just created but never messaged). Treat as already blank.
    const curr = conversations.find(c => c.id === activeConversationId);
    if (curr && curr.messages.length === 0 && !curr.hasMessages) {
      // Remove this orphaned empty local conv from state
      setConversations(p => p.filter(c => c.id !== activeConversationId));
      setActiveConversationId(null);
      setInputValue('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
      setIsSidebarOpen(false);
      return;
    }

    // Navigate to blank new thread
    setActiveConversationId(null);
    setIsSidebarOpen(false);
    setInputValue('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const deleteConversation = async (id: string) => {
    if (currentUser) { try { await fetch(`${API}/api/conversations/${id}`, { method: 'DELETE', credentials: 'include' }); } catch {} }
    setConversations(p => {
      const f = p.filter(c => c.id !== id);
      if (activeConversationId === id) {
        // After deletion, find next visible conv or go to blank thread
        const nextUsed = f.find(c => c.messages.length > 0 || c.hasMessages);
        setActiveConversationId(nextUsed?.id ?? null);
      }
      return f;
    });
    showToast('Conversation deleted', 'info');
  };

  const togglePin = async (id: string) => {
    if (currentUser) { try { await fetch(`${API}/api/conversations/${id}/pin`, { method: 'PATCH', credentials: 'include' }); } catch {} }
    const conv = conversations.find(c => c.id === id);
    setConversations(p => { const u = p.map(c => c.id === id ? { ...c, pinned: !c.pinned } : c); return [...u.filter(c => c.pinned), ...u.filter(c => !c.pinned)]; });
    showToast(conv?.pinned ? 'Unpinned' : 'Pinned', 'success');
  };

  const renameConversation = (id: string, t: string) => {
    if (!t.trim()) return;
    setConversations(p => p.map(c => c.id === id ? { ...c, title: t.trim() } : c));
    updateConvTitle(id, t.trim());
    showToast('Renamed', 'success');
  };

  const eraseMemory = () => {
    if (currentUser) {
      setConversations([]); setActiveConversationId(null);
    } else {
      sessionStorage.removeItem('zyro_guest');
      setConversations([]);
      setActiveConversationId(null);
    }
    setIsConfirmOpen(false); setIsSettingsOpen(false);
    showToast('Memory erased', 'info');
  };

  // ── Auth ──────────────────────────────────────────────────────────────────
  const handleAuth = async (mode: 'login'|'register') => {
    setAuthError(''); setAuthSubmitting(true);
    try {
      const body = mode === 'login'
        ? { email: authForm.email, password: authForm.password }
        : { username: authForm.username, email: authForm.email, password: authForm.password };
      const res = await fetch(`${API}/api/auth/${mode}`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setAuthError(data.error || 'Something went wrong'); return; }
      // Clear guest state first to prevent sidebar flash
      sessionStorage.removeItem('zyro_guest');
      setConversations([]);
      setCurrentUser(data.user); setAuthModal(null); setAuthForm({ username:'', email:'', password:'' });
      await loadConversations();
      // Load per-user AI instructions from backend
      try {
        const instrRes = await fetch(`${API}/api/auth/ai-instructions`, { credentials: 'include' });
        if (instrRes.ok) {
          const instrData = await instrRes.json();
          setSettings(s => ({ ...s, aiInstructions: instrData.ai_instructions || '' }));
        }
      } catch {}
      showToast(`Welcome, ${data.user.username}!`, 'success');
    } catch { setAuthError('Network error. Please try again.'); }
    finally { setAuthSubmitting(false); }
  };

  const handleLogout = async () => {
    try { await fetch(`${API}/api/auth/logout`, { method: 'POST', credentials: 'include' }); } catch {}
    setCurrentUser(null);
    setSettings(s => ({ ...s, aiInstructions: '' }));
    // Restore any guest convs from session storage. Land on blank thread.
    const saved = loadGuestConvs();
    setConversations(saved);
    setActiveConversationId(null);
    showToast('Logged out', 'info');
  };

  const handleSwitchAccount = async () => {
    await handleLogout();
    setIsSettingsOpen(false);
    setTimeout(() => { setAuthModal('login'); setAuthError(''); }, 300);
  };

  // ── Edit Profile ──────────────────────────────────────────────────────────
  const handleEditProfile = async () => {
    setProfileError(''); setProfileSubmitting(true);
    try {
      const body: any = {};
      if (profileForm.username.trim()) body.username = profileForm.username.trim();
      if (profileForm.email.trim()) body.email = profileForm.email.trim();
      const res = await fetch(`${API}/api/auth/profile`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setProfileError(data.error || 'Update failed'); return; }
      setCurrentUser(data.user);
      showToast('Profile updated', 'success');
      setSettingsView('main');
    } catch { setProfileError('Network error. Please try again.'); }
    finally { setProfileSubmitting(false); }
  };

  // ── Change Password ───────────────────────────────────────────────────────
  const handleChangePassword = async () => {
    setPwError('');
    if (pwForm.next !== pwForm.confirm) { setPwError('Passwords do not match'); return; }
    if (pwForm.next.length < 8) { setPwError('New password must be at least 8 characters'); return; }
    setPwSubmitting(true);
    try {
      const res = await fetch(`${API}/api/auth/password`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }),
      });
      const data = await res.json();
      if (!res.ok) { setPwError(data.error || 'Update failed'); return; }
      showToast('Password updated', 'success');
      setPwForm({ current:'', next:'', confirm:'' });
      setSettingsView('main');
    } catch { setPwError('Network error. Please try again.'); }
    finally { setPwSubmitting(false); }
  };

  // ── Delete Account ────────────────────────────────────────────────────────
  const handleDeleteAccount = async () => {
    setDeleteError(''); setDeleteSubmitting(true);
    try {
      const res = await fetch(`${API}/api/auth/account`, {
        method: 'DELETE', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: deleteForm.password }),
      });
      const data = await res.json();
      if (!res.ok) { setDeleteError(data.error || 'Delete failed'); return; }
      setCurrentUser(null);
      sessionStorage.removeItem('zyro_guest');
      setConversations([]);
      setActiveConversationId(null);
      setIsSettingsOpen(false);
      showToast('Account deleted', 'info');
    } catch { setDeleteError('Network error. Please try again.'); }
    finally { setDeleteSubmitting(false); }
  };

  // ── Utils ─────────────────────────────────────────────────────────────────
  const stopGenerating = () => {
    abortControllerRef.current?.abort();
    readerRef.current?.cancel();
    setIsTyping(false);
    setIsConnecting(false);
    setStreamingText('');
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  };

  const copyToClipboard = (text: string, msgId: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess(msgId);
      setTimeout(() => setCopySuccess(null), 1500);
      showToast('Copied!', 'success');
    });
  };

  // ── handleSend ────────────────────────────────────────────────────────────
  // Conversation lifecycle:
  //   activeConversationId = null  →  blank thread (not in history)
  //   First message sent           →  conv created in DB (logged-in) or locally (guest),
  //                                   added to conversations state with messages,
  //                                   automatically appears in visibleConvs / sidebar
  //   Subsequent messages          →  appended to existing conv
  const handleSend = useCallback(async (overrideContent?: string) => {
    const trimmedInput = (overrideContent ?? inputValue).trim();
    if (!trimmedInput || isTyping || isConnecting) return;

    if (trimmedInput.length > 10000) { showToast('Message too long. Max 10,000 characters.', 'error'); return; }
    if (!currentUser && !checkGuestRateLimit()) { showToast('Rate limit: 5 messages/min as guest. Login for unlimited.', 'error'); return; }

    // currentConvId is the working ID for this send operation.
    // It starts as activeConversationId (possibly null) and may be assigned
    // a real ID below if a new conversation must be created.
    let currentConvId = activeConversationId;

    // Snapshot message history BEFORE any state updates (for AI context)
    const history = currentConvId
      ? (conversations.find(c => c.id === currentConvId)?.messages ?? [])
      : [];

    const titleFromInput = trimmedInput.slice(0, 60);

    // ── Step 1: Ensure a conversation exists ─────────────────────────────
    // This only runs when activeConversationId is null (blank thread).
    // For logged-in users: create the conv in DB right now with the derived title.
    // For guests: create a local-only conv object.
    if (!currentConvId) {
      if (currentUser) {
        try {
          const res = await fetch(`${API}/api/conversations/`, {
            method: 'POST', credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: titleFromInput }),
          });
          if (!res.ok) return;
          const data = await res.json();
          currentConvId = data.id;
          // Add to state immediately — mark hasMessages:true because we're
          // about to save the first message. It appears in visibleConvs right away.
          setConversations(p => [{
            id: data.id,
            title: titleFromInput,
            messages: [],
            lastUpdated: data.lastUpdated,
            pinned: false,
            hasMessages: true,
          }, ...p]);
          setActiveConversationId(data.id);
        } catch { return; }
      } else {
        // Guest: create a local conv with the derived title
        const nc = makeLocalConv(titleFromInput);
        currentConvId = nc.id;
        setConversations(p => [nc, ...p]);
        setActiveConversationId(nc.id);
      }
    }

    // ── Step 2: Append user message to state ─────────────────────────────
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmedInput,
      timestamp: Date.now(),
    };

    setConversations(p => p.map(c => {
      if (c.id !== currentConvId) return c;
      return { ...c, messages: [...c.messages, userMsg], lastUpdated: Date.now() };
    }));

    // ── Step 3: Persist user message ─────────────────────────────────────
    // For guests this is handled automatically by the saveGuestConvs useEffect.
    // For logged-in users we explicitly POST to backend.
    if (!overrideContent) setInputValue('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    setIsConnecting(true); setIsTyping(false); setStreamingText(''); streamBufferRef.current = '';
    await saveMessageToBackend(currentConvId, userMsg);

    // ── Step 4: Stream AI response ────────────────────────────────────────
    abortControllerRef.current = new AbortController();
    const tcl = new AbortController();
    const tid = setTimeout(() => tcl.abort(), 30000);
    const sig = (AbortSignal as any).any
      ? (AbortSignal as any).any([abortControllerRef.current.signal, tcl.signal])
      : abortControllerRef.current.signal;

    let attempts = 0;
    const tryFetch = async (): Promise<void> => {
      attempts++;
      try {
        const msgs = [
          ...(settings.memoryEnabled ? history.map(m => ({ role: m.role, content: m.content })) : []),
          { role: 'user', content: trimmedInput },
        ];

        const systemPrompt = buildSystemPrompt(settings.persona, settings.model, settings.aiInstructions);

        const res = await fetch(`${API}/api/ai/chat`, {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' }, signal: sig,
          body: JSON.stringify({ messages: msgs, systemPrompt, model: settings.model }),
        });
        clearTimeout(tid);
        if (!res.ok || !res.body) {
          let e = `Server error ${res.status}`;
          try { const j = await res.json(); e = j.error || e; } catch {}
          throw new Error(e);
        }

        setIsConnecting(false); setIsTyping(true);

        const reader = res.body.getReader(); readerRef.current = reader;
        const dec = new TextDecoder(); let full = '';
        while (true) {
          const { done, value } = await reader.read(); if (done) break;
          const chunk = dec.decode(value, { stream: true });
          for (const line of chunk.split('\n')) {
            if (!line.startsWith('data: ')) continue;
            const payload = line.slice(6).trim(); if (payload === '[DONE]') break;
            try {
              const parsed = JSON.parse(payload);
              if (parsed.error) throw new Error(parsed.error);
              if (parsed.text) {
                full += parsed.text; streamBufferRef.current = full;
                if (rafRef.current) cancelAnimationFrame(rafRef.current);
                rafRef.current = requestAnimationFrame(() => setStreamingText(streamBufferRef.current));
              }
            } catch (pe: any) { if (pe?.message && !pe.message.includes('JSON')) throw pe; }
          }
        }
        if (rafRef.current) cancelAnimationFrame(rafRef.current);

        if (!abortControllerRef.current.signal.aborted) {
          setStreamingText(full);
          const am: Message = { id: (Date.now()+1).toString(), role: 'assistant', content: full, timestamp: Date.now() };
          setConversations(p => p.map(c => c.id === currentConvId ? { ...c, messages: [...c.messages, am], lastUpdated: Date.now() } : c));
          await saveMessageToBackend(currentConvId, am);
        }
      } catch (err: any) {
        clearTimeout(tid);
        if (err?.name === 'AbortError') { if (tcl.signal.aborted) showToast('Request timed out', 'error'); return; }
        const isNet = err?.message?.toLowerCase().match(/fetch|network|failed/);
        if (isNet && attempts < 2) { showToast('Connection issue, retrying...', 'info'); await new Promise(r => setTimeout(r, 1000)); return tryFetch(); }
        const t = err?.message || 'Unknown error';
        const msg = t.includes('fetch')||t.includes('network')||t.includes('Failed') ? 'Cannot reach Zyro backend. Make sure the server is running.'
          : t.includes('401')||t.includes('403')||t.includes('API key') ? 'API key error. Check YOUR_API_KEY in backend/.env.'
          : t.includes('429') ? 'Rate limit reached. Wait a moment and try again.'
          : t.includes('500') ? 'Zyro backend internal error. Check server logs.'
          : `Error: ${t}`;
        const em: Message = { id: (Date.now()+1).toString(), role: 'assistant', content: msg, timestamp: Date.now(), isError: true };
        setConversations(p => p.map(c => c.id === currentConvId ? { ...c, messages: [...c.messages, em], lastUpdated: Date.now() } : c));
      }
    };

    try { await tryFetch(); } finally {
      setIsTyping(false);
      setIsConnecting(false);
      setStreamingText('');
      readerRef.current = null;
      abortControllerRef.current = null;
    }
  }, [inputValue, isTyping, isConnecting, activeConversationId, conversations, settings, currentUser, showToast]);

  // ── refreshResponse ───────────────────────────────────────────────────────
  const refreshResponse = (messageId: string) => {
    const conv = conversations.find(c => c.id === activeConversationId); if (!conv) return;
    const idx = conv.messages.findIndex(m => m.id === messageId); if (idx === -1) return;
    const lastUser = conv.messages.slice(0, idx).reverse().find(m => m.role === 'user'); if (!lastUser) return;
    handleSend(lastUser.content);
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    if (textareaRef.current) { textareaRef.current.style.height = 'auto'; textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`; }
  };
  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };

  // ── visibleConvs ──────────────────────────────────────────────────────────
  // A conversation is visible in history when:
  //   - It has messages loaded in memory (messages.length > 0), OR
  //   - It was loaded from the backend (hasMessages: true), meaning it has messages
  //     in the DB even if they haven't been lazy-loaded into memory yet.
  //
  // This means:
  //   - New blank threads (null activeConversationId) are never listed — they don't
  //     exist as objects in the conversations array.
  //   - Backend conversations appear immediately on load without needing eager message fetch.
  //   - Guest local convs appear only after the first message is sent.
  const visibleConvs = sortedConversations.filter(c => c.messages.length > 0 || c.hasMessages === true);

  const ConvList = ({ mobile = false }: { mobile?: boolean }) => (
    <div className={`flex-1 overflow-y-auto ${mobile ? 'px-4' : 'px-4 py-6'} space-y-1`}>
      {!mobile && visibleConvs.length > 0 && <div className="px-2 pb-4"><span className="text-[10px] uppercase tracking-[0.1em] text-text-dim">History</span></div>}
      {visibleConvs.map(conv => (
        <div key={conv.id} onClick={() => selectConversation(conv.id)}
          className={`group relative w-full flex items-center px-3 py-3 text-[11px] truncate transition-all duration-300 border-l-2 cursor-pointer ${activeConversationId === conv.id ? 'border-silver bg-surface text-text' : 'border-transparent text-text-mid hover:text-text hover:bg-surface'}`}>
          <div className="flex items-center gap-2 flex-1 truncate">
            {conv.pinned && <span className="shrink-0 text-silver"><IconPin /></span>}
            <div className="flex flex-col overflow-hidden">
              <span className="truncate">{conv.title}</span>
              <span className="text-[9px] uppercase tracking-[0.1em] text-text-dim mt-0.5">{new Date(conv.lastUpdated).toLocaleDateString()}</span>
            </div>
          </div>
          <div className={`flex items-center gap-1 shrink-0 ml-2 transition-opacity ${mobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
            {mobile && <button onClick={(e) => { e.stopPropagation(); setMobileOptionsId(mobileOptionsId === conv.id ? null : conv.id); }} className="p-1 hover:text-silver"><IconMore /></button>}
            <AnimatePresence>
              {!mobile && (
                <div className="flex items-center gap-1">
                  <button onClick={(e) => { e.stopPropagation(); togglePin(conv.id); }} className="p-1 hover:text-silver" title="Pin"><IconPin /></button>
                  <button onClick={(e) => { e.stopPropagation(); setRenameId(conv.id); setRenameValue(conv.title); setIsRenameModalOpen(true); }} className="p-1 hover:text-silver" title="Rename"><IconEdit /></button>
                  <button onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }} className="p-1 hover:text-red-500" title="Delete"><IconTrash /></button>
                </div>
              )}
              {mobile && mobileOptionsId === conv.id && (
                <motion.div initial={{ opacity:0,x:10 }} animate={{ opacity:1,x:0 }} exit={{ opacity:0,x:10 }}
                  className="flex items-center gap-1 bg-surface border border-border p-1 shadow-xl z-[100]" onClick={(e) => e.stopPropagation()}>
                  <button onClick={(e) => { e.stopPropagation(); togglePin(conv.id); setMobileOptionsId(null); }} className="p-1 hover:text-silver"><IconPin /></button>
                  <button onClick={(e) => { e.stopPropagation(); setRenameId(conv.id); setRenameValue(conv.title); setIsRenameModalOpen(true); setMobileOptionsId(null); }} className="p-1 hover:text-silver"><IconEdit /></button>
                  <button onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); setMobileOptionsId(null); }} className="p-1 hover:text-red-500"><IconTrash /></button>
                  <button onClick={(e) => { e.stopPropagation(); setMobileOptionsId(null); }} className="p-1 hover:text-text-dim border-l border-border ml-1"><IconClose /></button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      ))}
    </div>
  );

  // ── Loading screen ────────────────────────────────────────────────────────
  if (authLoading) return (
    <div className="flex h-screen w-full items-center justify-center bg-bg">
      <div className="flex flex-col items-center gap-6">
        <span className="font-display text-2xl tracking-[0.25em] text-silver font-bold">ZYRO</span>
        <div className="flex gap-1.5">
          {[0,1,2].map(i => <motion.div key={i} animate={{ y:[0,-6,0] }} transition={{ duration:1.2,repeat:Infinity,delay:i*0.2 }} className="w-1.5 h-1.5 rounded-full bg-silver" />)}
        </div>
      </div>
    </div>
  );

  // ── Model Select Modal (settings sub-view) ────────────────────────────────
  const renderModelSelect = () => (
    <div className="p-8 space-y-8">
      <button onClick={() => setSettingsView('main')} className="flex items-center gap-2 text-text-dim hover:text-silver text-[10px] uppercase tracking-widest transition-colors">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        Back
      </button>
      <div className="space-y-2">
        <h3 className="text-[10px] uppercase tracking-[0.2em] text-silver font-bold">Select Model</h3>
        <p className="text-[11px] text-text-dim">Choose the AI engine that powers Zyro.</p>
      </div>
      <div className="space-y-3">
        {[
          { key: 'xenon-1.0', label: 'Xenon 1.0', desc: 'Fast, efficient. Ideal for everyday tasks, quick answers, and responsive conversation.' },
          { key: 'yuruzu-1.0', label: 'Yuruzu 1.0', desc: 'Advanced reasoning engine. Best for complex analysis, research, and nuanced writing.' },
        ].map(m => (
          <button key={m.key} onClick={() => { setSettings(s => ({ ...s, model: m.key })); setSettingsView('main'); showToast(`Switched to ${m.label}`, 'success'); }}
            className={`w-full text-left p-4 border transition-all space-y-1.5 ${settings.model === m.key ? 'border-silver bg-accent-soft' : 'border-border hover:border-silver/50 hover:bg-surface'}`}>
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold text-text tracking-wide">{m.label}</span>
              {settings.model === m.key && (
                <span className="text-[9px] uppercase tracking-widest text-silver font-bold border border-silver/40 px-2 py-0.5">Active</span>
              )}
            </div>
            <p className="text-[11px] text-text-dim leading-relaxed">{m.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );

  // ── Settings sub-views ────────────────────────────────────────────────────
  const renderSettingsContent = () => {
    if (settingsView === 'model-select') return renderModelSelect();

    if (settingsView === 'edit-profile') return (
      <div className="p-8 space-y-8">
        <button onClick={() => setSettingsView('main')} className="flex items-center gap-2 text-text-dim hover:text-silver text-[10px] uppercase tracking-widest transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          Back
        </button>
        <div className="space-y-2">
          <h3 className="text-[10px] uppercase tracking-[0.2em] text-silver font-bold">Edit Profile</h3>
          <p className="text-[11px] text-text-dim">Update your display name or email address.</p>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[9px] uppercase tracking-[0.1em] text-text-dim">New Username</label>
            <input type="text" value={profileForm.username} onChange={e => setProfileForm({ ...profileForm, username: e.target.value })}
              placeholder={currentUser?.username || 'username'}
              className="w-full bg-surface2 border border-border p-3 text-[12px] outline-none focus:border-silver transition-colors font-mono text-text" />
          </div>
          <div className="space-y-2">
            <label className="text-[9px] uppercase tracking-[0.1em] text-text-dim">New Email</label>
            <input type="email" value={profileForm.email} onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
              placeholder={currentUser?.email || 'email@example.com'}
              className="w-full bg-surface2 border border-border p-3 text-[12px] outline-none focus:border-silver transition-colors font-mono text-text" />
          </div>
          {profileError && <p className="text-[11px] text-red-400 font-mono">{profileError}</p>}
          <button onClick={handleEditProfile} disabled={profileSubmitting || (!profileForm.username.trim() && !profileForm.email.trim())}
            className="w-full py-3 bg-silver text-bg text-[10px] uppercase tracking-[0.2em] font-bold hover:opacity-90 transition-all disabled:opacity-40">
            {profileSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    );

    if (settingsView === 'change-password') return (
      <div className="p-8 space-y-8">
        <button onClick={() => setSettingsView('main')} className="flex items-center gap-2 text-text-dim hover:text-silver text-[10px] uppercase tracking-widest transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          Back
        </button>
        <div className="space-y-2">
          <h3 className="text-[10px] uppercase tracking-[0.2em] text-silver font-bold">Change Password</h3>
          <p className="text-[11px] text-text-dim">Enter your current password, then choose a new one.</p>
        </div>
        <div className="space-y-4">
          {[
            { label: 'Current Password', key: 'current', val: pwForm.current },
            { label: 'New Password', key: 'next', val: pwForm.next },
            { label: 'Confirm New Password', key: 'confirm', val: pwForm.confirm },
          ].map(({ label, key, val }) => (
            <div key={key} className="space-y-2">
              <label className="text-[9px] uppercase tracking-[0.1em] text-text-dim">{label}</label>
              <input type="password" value={val}
                onChange={e => setPwForm({ ...pwForm, [key]: e.target.value })}
                className="w-full bg-surface2 border border-border p-3 text-[12px] outline-none focus:border-silver transition-colors font-mono text-text"
                placeholder="••••••••" />
            </div>
          ))}
          {pwError && <p className="text-[11px] text-red-400 font-mono">{pwError}</p>}
          <button onClick={handleChangePassword} disabled={pwSubmitting || !pwForm.current || !pwForm.next || !pwForm.confirm}
            className="w-full py-3 bg-silver text-bg text-[10px] uppercase tracking-[0.2em] font-bold hover:opacity-90 transition-all disabled:opacity-40">
            {pwSubmitting ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </div>
    );

    if (settingsView === 'delete-account') return (
      <div className="p-8 space-y-8">
        <button onClick={() => setSettingsView('main')} className="flex items-center gap-2 text-text-dim hover:text-silver text-[10px] uppercase tracking-widest transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          Back
        </button>
        <div className="space-y-2">
          <h3 className="text-[10px] uppercase tracking-[0.2em] text-red-400 font-bold">Delete Account</h3>
          <p className="text-[11px] text-text-mid leading-relaxed">This will permanently delete your account, all conversations, and all messages. This cannot be undone.</p>
        </div>
        <div className="p-4 border border-red-900/30 bg-red-900/5 space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-red-400">⚠ Irreversible Action</p>
          <p className="text-[11px] text-text-dim">Enter your password to confirm deletion.</p>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[9px] uppercase tracking-[0.1em] text-text-dim">Confirm Password</label>
            <input type="password" value={deleteForm.password}
              onChange={e => setDeleteForm({ password: e.target.value })}
              className="w-full bg-surface2 border border-red-900/30 p-3 text-[12px] outline-none focus:border-red-500 transition-colors font-mono text-text"
              placeholder="••••••••" />
          </div>
          {deleteError && <p className="text-[11px] text-red-400 font-mono">{deleteError}</p>}
          <button onClick={handleDeleteAccount} disabled={deleteSubmitting || !deleteForm.password}
            className="w-full py-3 border border-red-900/50 bg-red-900/10 text-red-400 text-[10px] uppercase tracking-[0.2em] font-bold hover:bg-red-900/20 transition-all disabled:opacity-40">
            {deleteSubmitting ? 'Deleting...' : 'Permanently Delete Account'}
          </button>
        </div>
      </div>
    );

    // ── AI Instructions ────────────────────────────────────────────────────
    if (settingsView === 'ai-instructions') return (
      <div className="p-8 space-y-8">
        <button onClick={() => setSettingsView('main')} className="flex items-center gap-2 text-text-dim hover:text-silver text-[10px] uppercase tracking-widest transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          Back
        </button>
        <div className="space-y-2">
          <h3 className="text-[10px] uppercase tracking-[0.2em] text-silver font-bold">AI Instructions</h3>
          <p className="text-[11px] text-text-dim leading-relaxed">
            Customize how Zyro responds. These instructions are appended after the model's core behavior, giving you direct control over tone, focus, and style.
          </p>
        </div>
        <div className="space-y-3">
          <textarea
            value={settings.aiInstructions}
            onChange={e => setSettings(s => ({ ...s, aiInstructions: e.target.value }))}
            placeholder="Enter AI Instructions Here..."
            rows={10}
            className="w-full bg-surface2 border border-border p-4 text-[12px] text-text font-mono outline-none focus:border-silver transition-colors resize-none leading-relaxed placeholder:text-text-dim"
          />
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-text-dim">{settings.aiInstructions.length} chars</span>
            <button onClick={() => setSettings(s => ({ ...s, aiInstructions: '' }))}
              className="text-[10px] text-text-dim hover:text-red-400 uppercase tracking-widest transition-colors">
              Clear
            </button>
          </div>
        </div>
        <button onClick={async () => {
          if (currentUser) {
            try {
              await fetch(`${API}/api/auth/ai-instructions`, {
                method: 'PATCH', credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ai_instructions: settings.aiInstructions }),
              });
            } catch {}
          }
          showToast('Instructions saved', 'success');
          setSettingsView('main');
        }}
          className="w-full py-3 bg-silver text-bg text-[10px] uppercase tracking-[0.2em] font-bold hover:opacity-90 transition-all">
          Save Instructions
        </button>
      </div>
    );

    // ── Main settings view ────────────────────────────────────────────────
    return (
      <div className="p-8 space-y-10">
        {/* Actions */}
        <section className="space-y-3">
          <label className="block text-[10px] uppercase tracking-[0.1em] text-text-dim">Actions</label>
          <button onClick={() => { handleNewChat(); setIsSettingsOpen(false); }}
            className="w-full h-10 border border-border-light flex items-center justify-center gap-2 text-text-mid hover:text-silver hover:border-silver transition-all">
            <IconPlus /><span className="uppercase tracking-[0.1em] text-[10px]">New Conversation</span>
          </button>
          <button onClick={() => setSettingsView('ai-instructions')}
            className="w-full h-10 border border-border-light flex items-center justify-center gap-2 text-text-mid hover:text-silver hover:border-silver transition-all">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span className="uppercase tracking-[0.1em] text-[10px]">AI Instructions</span>
          </button>
        </section>

        {/* Model */}
        <section className="space-y-4">
          <label className="block text-[10px] uppercase tracking-[0.1em] text-text-dim">Model</label>
          <button onClick={() => setSettingsView('model-select')}
            className="w-full flex items-center justify-between p-3 border border-border hover:border-silver transition-all group bg-surface2">
            <div className="flex items-center gap-3">
              <IconCpu />
              <div className="text-left">
                <p className="text-[12px] font-bold text-text">{MODEL_NAMES[settings.model] || settings.model}</p>
                <p className="text-[10px] text-text-dim">{settings.model === 'xenon-1.0' ? 'Fast & efficient' : 'Advanced reasoning'}</p>
              </div>
            </div>
            <div className="text-text-dim group-hover:text-silver transition-colors">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </div>
          </button>
        </section>

        {/* Persona */}
        <section className="space-y-4">
          <label className="block text-[10px] uppercase tracking-[0.1em] text-text-dim">Persona</label>
          <div className="grid grid-cols-2 gap-2">
            {(['creative', 'formal', 'concise', 'precise'] as Persona[]).map(p => (
              <button key={p} onClick={() => setSettings({ ...settings, persona:p, personaName:PERSONA_NAMES[p] })}
                className={`py-2.5 text-[10px] uppercase tracking-wider border transition-all ${settings.persona===p ? 'bg-silver text-bg border-silver' : 'border-border text-text-mid hover:border-text-dim hover:text-text'}`}>
                {PERSONA_NAMES[p]}
              </button>
            ))}
            <button onClick={() => setSettings({ ...settings, persona:'default', personaName:'Default' })}
              className={`col-span-2 py-2.5 text-[10px] uppercase tracking-wider border transition-all ${settings.persona==='default' ? 'bg-silver text-bg border-silver' : 'border-border text-text-mid hover:border-text-dim hover:text-text'}`}>
              Default
            </button>
          </div>
        </section>

        {/* Memory */}
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <label className="text-[10px] uppercase tracking-[0.1em] text-text-dim">Memory</label>
            <button onClick={() => setSettings({ ...settings, memoryEnabled: !settings.memoryEnabled })}
              className={`w-8 h-4 border relative transition-colors ${settings.memoryEnabled ? 'border-silver' : 'border-border'}`}>
              <motion.div animate={{ x: settings.memoryEnabled ? 16 : 0 }} className={`absolute top-0.5 left-0.5 w-2.5 h-2.5 ${settings.memoryEnabled ? 'bg-silver' : 'bg-text-dim'}`} />
            </button>
          </div>
          <button onClick={() => setIsConfirmOpen(true)}
            className="w-full py-2 border border-red-900/30 text-red-900/60 text-[10px] uppercase tracking-[0.1em] hover:bg-red-900/10 hover:text-red-400 transition-all">
            Erase Memory
          </button>
        </section>

        {/* Interface */}
        <section className="space-y-4">
          <label className="block text-[10px] uppercase tracking-[0.1em] text-text-dim">Interface</label>
          <div className="flex gap-2">
            {(['dark','dim','light'] as InterfaceTheme[]).map(t => (
              <button key={t} onClick={() => setSettings({ ...settings, interfaceTheme:t })}
                className={`flex-1 py-2 text-[11px] border transition-all ${settings.interfaceTheme===t ? 'bg-silver text-bg border-silver' : 'border-border text-text-mid hover:border-text-dim'}`}>
                {t.charAt(0).toUpperCase()+t.slice(1)}
              </button>
            ))}
          </div>
        </section>

        {/* Color Theme */}
        <section className="space-y-4">
          <label className="block text-[10px] uppercase tracking-[0.1em] text-text-dim">Color Theme</label>
          <div className="grid grid-cols-3 gap-2">
            {(['rose','matcha','purple','skyblue','monochrome','sunset-yellow'] as ColorTheme[]).map(c => {
              const dot: Record<string, string> = {
                rose: '#f43f6e', matcha: '#6dbf5a', purple: '#a855f7',
                skyblue: '#38bdf8', monochrome: '#c8c8d8', 'sunset-yellow': '#fbbf24',
              };
              return (
                <button key={c} onClick={() => setSettings({ ...settings, colorTheme:c })}
                  className={`py-2 px-1 text-[10px] border transition-all flex items-center justify-center gap-1.5 capitalize ${settings.colorTheme===c ? 'bg-silver text-bg border-silver' : 'border-border text-text-mid hover:border-text-dim'}`}>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dot[c] }} />
                  {c === 'sunset-yellow' ? 'Sunset' : c}
                </button>
              );
            })}
          </div>
        </section>

        {/* Account */}
        <section className="space-y-4 pt-6 border-t border-border">
          <label className="block text-[10px] uppercase tracking-[0.2em] text-silver font-bold">Account & Session</label>
          {currentUser ? (
            <div className="space-y-3">
              <div className="flex items-center gap-4 p-4 bg-surface2 border border-border">
                <div className="w-10 h-10 rounded-full bg-accent-soft border border-silver/20 flex items-center justify-center text-silver font-display text-sm shrink-0">
                  {currentUser.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-[12px] font-bold text-text truncate">{currentUser.username}</span>
                  <span className="text-[10px] text-text-dim truncate">{currentUser.email}</span>
                </div>
              </div>
              <button onClick={() => { setProfileForm({ username:'', email:'' }); setProfileError(''); setSettingsView('edit-profile'); }}
                className="w-full py-2.5 border border-border text-text-mid text-[10px] uppercase tracking-[0.12em] hover:text-silver hover:border-silver transition-all flex items-center justify-center gap-2">
                <IconUser /> Edit Profile
              </button>
              <button onClick={() => { setPwForm({ current:'', next:'', confirm:'' }); setPwError(''); setSettingsView('change-password'); }}
                className="w-full py-2.5 border border-border text-text-mid text-[10px] uppercase tracking-[0.12em] hover:text-silver hover:border-silver transition-all flex items-center justify-center gap-2">
                <IconKey /> Change Password
              </button>
              <button onClick={handleSwitchAccount}
                className="w-full py-2.5 border border-border text-text-mid text-[10px] uppercase tracking-[0.12em] hover:text-silver hover:border-silver transition-all flex items-center justify-center gap-2">
                <IconSwitch /> Switch Account
              </button>
              <button onClick={() => { handleLogout(); setIsSettingsOpen(false); }}
                className="w-full py-2.5 bg-surface2 border border-border text-text-mid text-[10px] uppercase tracking-[0.12em] hover:text-silver transition-all flex items-center justify-center gap-2">
                <IconLogout /> Logout
              </button>
              <button onClick={() => { setDeleteForm({ password:'' }); setDeleteError(''); setSettingsView('delete-account'); }}
                className="w-full py-2.5 border border-red-900/30 text-red-900/50 text-[10px] uppercase tracking-[0.12em] hover:bg-red-900/10 hover:text-red-400 transition-all flex items-center justify-center gap-2">
                <IconTrash /> Delete Account
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-[11px] text-text-mid text-center">Login to sync conversations across devices.</p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => { setAuthModal('login'); setAuthError(''); setIsSettingsOpen(false); }}
                  className="py-2.5 border border-silver text-silver text-[10px] uppercase tracking-[0.15em] hover:bg-silver hover:text-bg transition-all">Login</button>
                <button onClick={() => { setAuthModal('register'); setAuthError(''); setIsSettingsOpen(false); }}
                  className="py-2.5 border border-border text-text-mid text-[10px] uppercase tracking-[0.15em] hover:text-silver hover:border-silver transition-all">Register</button>
              </div>
            </div>
          )}
        </section>

        {/* About */}
        <section className="space-y-4 pt-6 border-t border-border">
          <label className="block text-[10px] uppercase tracking-[0.2em] text-silver font-bold">About</label>
          <div className="space-y-3 text-[11px] text-text-mid font-mono">
            <div className="flex justify-between"><span className="text-text-dim">Version</span><span className="text-text">v1.0.0</span></div>
            <div className="flex justify-between"><span className="text-text-dim">Project</span><span className="text-text">Zyro — AI Assistant</span></div>
            <div className="pt-1"><p className="text-text-dim mb-0.5">Built by</p><p className="text-text">John Ruenz</p></div>
            <div><p className="text-text-dim mb-0.5">Powered by</p><p className="text-text">Xenon &amp; Yuruzu Engine</p></div>
            <div className="pt-3 text-[9px] text-text-dim uppercase tracking-widest text-center">© 2026 Zyro AI</div>
          </div>
        </section>
      </div>
    );
  };

  const aiName = getAIDisplayName(settings.model);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen w-full overflow-hidden bg-bg selection:bg-accent-soft selection:text-silver"
      onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>

      {/* Toast */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[500] flex flex-col items-center gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div key={t.id} initial={{ opacity:0,y:10,scale:0.95 }} animate={{ opacity:1,y:0,scale:1 }} exit={{ opacity:0,y:10,scale:0.95 }} transition={{ duration:0.2 }}
              className={`px-4 py-2 text-[11px] uppercase tracking-[0.15em] font-mono border backdrop-blur-sm whitespace-nowrap
                ${t.type==='success' ? 'bg-bg/90 border-silver/30 text-silver' : t.type==='error' ? 'bg-bg/90 border-red-500/30 text-red-400' : 'bg-bg/90 border-border text-text-dim'}`}>
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-[240px] flex-col border-r border-border bg-surface2">
        <div className="p-6 bg-surface flex flex-col gap-4 border-b border-border">
          <span className="font-display font-bold text-[14px] text-silver tracking-[0.15em]">CONVERSATIONS</span>
          <button onClick={handleNewChat}
            className="w-full h-10 border border-border-light flex items-center justify-center gap-2 text-text-mid hover:text-silver hover:border-silver transition-all duration-300">
            <IconPlus /><span className="uppercase tracking-[0.1em] text-[10px]">New Conversation</span>
          </button>
        </div>
        <ConvList />
        <div className="p-4 border-t border-border bg-surface">
          {currentUser ? (
            <button onClick={() => setIsSettingsOpen(true)}
              className="w-full flex items-center gap-3 p-3 hover:bg-surface2 transition-all group">
              <div className="w-8 h-8 rounded-full bg-accent-soft border border-silver/20 flex items-center justify-center text-silver font-display text-xs group-hover:border-silver transition-colors shrink-0">
                {currentUser.username.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col items-start overflow-hidden flex-1">
                <span className="text-[11px] font-bold text-text truncate w-full text-left tracking-wider">{currentUser.username}</span>
                <span className="text-[9px] text-text-dim truncate w-full text-left">{currentUser.email}</span>
              </div>
              <div className="text-text-dim group-hover:text-silver transition-colors shrink-0 ml-auto"><IconChevronDown /></div>
            </button>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <button onClick={() => { setAuthModal('login'); setAuthError(''); }}
                  className="flex-1 py-1.5 border border-border text-text-dim text-[10px] uppercase tracking-widest hover:text-silver hover:border-silver transition-all">Login</button>
                <button onClick={() => { setAuthModal('register'); setAuthError(''); }}
                  className="flex-1 py-1.5 border border-silver/40 text-silver text-[10px] uppercase tracking-widest hover:bg-silver/10 transition-all">Register</button>
              </div>
              <button onClick={() => setIsSettingsOpen(true)}
                className="w-full flex items-center justify-center gap-2 py-2 text-text-dim hover:text-silver transition-colors">
                <IconSettings /><span className="text-[10px] uppercase tracking-widest">Settings</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (<>
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/60 z-40 md:hidden" />
          <motion.aside initial={{ x:'-100%' }} animate={{ x:0 }} exit={{ x:'-100%' }} transition={{ type:'tween', duration:0.3 }}
            className="fixed inset-y-0 left-0 w-[260px] bg-surface border-r border-border z-50 md:hidden flex flex-col">
            <div className="p-6 flex justify-between items-center border-b border-border">
              <span className="font-display font-bold text-[14px] text-silver tracking-[0.12em]">CONVERSATIONS</span>
              <button onClick={() => setIsSidebarOpen(false)} className="text-text-mid hover:text-silver"><IconClose /></button>
            </div>
            <div className="px-4 py-4">
              <button onClick={handleNewChat}
                className="w-full h-10 border border-border-light flex items-center justify-center gap-2 text-text-mid hover:text-silver transition-all">
                <IconPlus /><span className="uppercase tracking-[0.1em] text-[10px]">New Conversation</span>
              </button>
            </div>
            <div className="px-4 pb-2">{visibleConvs.length > 0 && <span className="text-[10px] uppercase tracking-[0.1em] text-text-dim">History</span>}</div>
            <ConvList mobile />
            <div className="p-4 border-t border-border bg-surface2">
              {currentUser ? (
                <button onClick={() => { setIsSettingsOpen(true); setIsSidebarOpen(false); }}
                  className="w-full flex items-center gap-3 p-2 hover:bg-surface transition-colors group">
                  <div className="w-8 h-8 rounded-full bg-accent-soft border border-silver/20 flex items-center justify-center text-silver font-display text-xs group-hover:border-silver transition-all shrink-0">
                    {currentUser.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col items-start overflow-hidden flex-1">
                    <span className="text-[11px] font-bold text-text truncate w-full text-left">{currentUser.username}</span>
                    <span className="text-[9px] text-text-dim truncate w-full text-left">{currentUser.email}</span>
                  </div>
                  <div className="text-text-dim group-hover:text-silver transition-colors shrink-0 ml-auto"><IconChevronDown /></div>
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => { setAuthModal('login'); setAuthError(''); setIsSidebarOpen(false); }}
                    className="flex-1 py-2 border border-border text-text-dim text-[10px] uppercase tracking-widest hover:text-silver hover:border-silver transition-all">Login</button>
                  <button onClick={() => { setAuthModal('register'); setAuthError(''); setIsSidebarOpen(false); }}
                    className="flex-1 py-2 border border-silver/40 text-silver text-[10px] uppercase tracking-widest hover:bg-silver/10 transition-all">Register</button>
                </div>
              )}
            </div>
          </motion.aside>
        </>)}
      </AnimatePresence>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0 relative overflow-hidden">
        <header className="h-[64px] border-b border-border flex items-center px-6 bg-surface2 z-30 shrink-0 relative">
          {/* Mobile: hamburger left */}
          <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-text-mid hover:text-silver shrink-0"><IconHamburger /></button>
          {/* Centered title — absolute so it's truly centered */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5">
            <span className="font-display text-[15px] font-bold tracking-[0.15em] text-silver uppercase leading-none">Zyro</span>
            <span className="hidden md:inline font-mono text-[15px] font-normal tracking-[0.05em] text-text-dim leading-none">— {(MODEL_NAMES[settings.model] || settings.model).toUpperCase()}</span>
          </div>
          {/* Settings always right */}
          <button onClick={() => setIsSettingsOpen(true)} className="ml-auto text-text-mid hover:text-silver transition-colors shrink-0"><IconSettings /></button>
        </header>

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto px-6 py-8 bg-bg min-h-0">
          <div className={`max-w-[660px] w-full mx-auto ${(!activeConversation || activeConversation.messages.length === 0) ? 'h-full flex flex-col items-center justify-center' : ''}`}>

            {(!activeConversation || activeConversation.messages.length === 0) && (
              <motion.div initial={{ opacity:0,y:10 }} animate={{ opacity:1,y:0 }}
                className="flex flex-col items-center justify-center text-center space-y-4 w-full py-12">
                <div className="flex flex-col items-center gap-3 mt-20">
                  {/* Original logo shape — draw-on stroke, then fill + pulse */}
                  <svg viewBox="0 0 100 100" width="100" height="100" style={{ overflow: 'visible' }}>
                    {/* Layer 1: fill — invisible until stroke finishes, then fades in and pulses */}
                    <path
                      d="M 57.444,0.124 L 56.328,0.496 L 42.060,12.903 L 1.861,46.774 L 0.000,48.759 L 1.365,50.000 L 16.749,58.933 L 28.288,66.253 L 32.010,67.990 L 24.194,49.876 L 40.323,36.725 L 41.687,35.980 L 42.060,36.352 L 42.556,48.139 L 42.680,99.876 L 46.154,97.395 L 61.538,83.871 L 67.990,78.784 L 85.856,63.151 L 100.000,51.365 L 99.752,50.620 L 68.362,31.886 L 67.990,32.382 L 75.806,50.124 L 59.553,63.027 L 58.437,63.648 L 58.065,63.275 L 57.444,51.861 Z"
                      fill="currentColor"
                      fillOpacity={0}
                      stroke="none"
                      style={{ color: 'var(--color-silver)' }}
                    >
                      {/* Fade fill in after stroke draw completes */}
                      <animate
                        attributeName="fill-opacity"
                        from="0" to="1"
                        begin="1.8s"
                        dur="0.9s"
                        fill="freeze"
                      />
                      {/* Slow breathe pulse — starts after fill has settled */}
                      <animate
                        attributeName="fill-opacity"
                        values="1;0.9;1"
                        keyTimes="0;0.5;1"
                        keySplines="0.42 0 0.58 1;0.42 0 0.58 1"
                        calcMode="spline"
                        begin="2.7s"
                        dur="3.2s"
                        repeatCount="indefinite"
                      />
                    </path>
                    {/* Layer 2: stroke draw-on — sits on top of fill */}
                    <path
                      className="logo-stroke"
                      d="M 57.444,0.124 L 56.328,0.496 L 42.060,12.903 L 1.861,46.774 L 0.000,48.759 L 1.365,50.000 L 16.749,58.933 L 28.288,66.253 L 32.010,67.990 L 24.194,49.876 L 40.323,36.725 L 41.687,35.980 L 42.060,36.352 L 42.556,48.139 L 42.680,99.876 L 46.154,97.395 L 61.538,83.871 L 67.990,78.784 L 85.856,63.151 L 100.000,51.365 L 99.752,50.620 L 68.362,31.886 L 67.990,32.382 L 75.806,50.124 L 59.553,63.027 L 58.437,63.648 L 58.065,63.275 L 57.444,51.861 Z"
                      strokeDasharray="500"
                      strokeDashoffset="500"
                    >
                      <animate
                        attributeName="stroke-dashoffset"
                        values="500;0"
                        keyTimes="0;1"
                        keySplines="0.4 0 0.2 1"
                        calcMode="spline"
                        dur="1.8s"
                        fill="freeze"
                      />
                    </path>
                  </svg>

                  <p className="text-[17px] text-silver tracking-[0.18em] font-display font-bold uppercase mt-1">Zyro AI</p>
                  <div className="w-20 h-px bg-border-light opacity-60" />
                  <p className="text-[10px] text-text-dim tracking-[0.12em] font-mono">this AI is still under development.</p>
                </div>
                {!currentUser && <p className="text-[9px] text-text-dim uppercase tracking-widest opacity-50 mt-4">Login via Settings to save history</p>}
              </motion.div>
            )}

            <div className="space-y-12">
              {activeConversation?.messages.map((msg) => (
                <motion.div key={msg.id} initial={{ opacity:0,y:6 }} animate={{ opacity:1,y:0 }} transition={{ duration:0.3 }}
                  className={`flex flex-col ${msg.role==='user' ? 'items-end' : 'items-start'} group/msg`}>
                  <span className={`text-[10px] uppercase tracking-[0.1em] mb-3 ${msg.role==='user' ? 'text-text-dim' : 'text-silver font-bold'}`}>
                    {msg.role==='user' ? (currentUser?.username||'You') : aiName}
                  </span>
                  <div className={`max-w-full text-[13px] leading-[1.75] ${msg.role==='user' ? 'text-text-mid text-right' : msg.isError ? 'text-red-400 italic font-mono' : 'text-text font-mono markdown-body'}`}>
                    {msg.role==='assistant' ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown> : msg.content}
                  </div>
                  {msg.role==='assistant' && (
                    <div className="flex items-center gap-4 mt-4 opacity-0 md:group-hover/msg:opacity-100 md:transition-opacity duration-300 max-md:opacity-100">
                      {msg.isError ? (
                        <button onClick={() => refreshResponse(msg.id)} className="flex items-center gap-2 px-3 py-1.5 border border-red-900/30 text-red-400 text-[10px] uppercase tracking-[0.1em] hover:bg-red-900/10 transition-all"><IconRefresh /> Retry</button>
                      ) : (<>
                        <button onClick={() => copyToClipboard(msg.content, msg.id)} className={`p-1.5 transition-colors ${copySuccess===msg.id ? 'text-silver' : 'text-text-dim hover:text-silver'}`} title="Copy"><IconCopy /></button>
                        <button onClick={() => refreshResponse(msg.id)} className="p-1.5 text-text-dim hover:text-silver transition-colors" title="Regenerate"><IconRefresh /></button>
                      </>)}
                    </div>
                  )}
                </motion.div>
              ))}

              {/* Visual loading skeleton while connecting */}
              {isConnecting && (
                <motion.div initial={{ opacity:0,y:6 }} animate={{ opacity:1,y:0 }} className="flex flex-col items-start">
                  <span className="text-[10px] uppercase tracking-[0.1em] mb-4 text-silver font-bold">{aiName}</span>
                  <ResponseSkeleton />
                </motion.div>
              )}

              {/* Streaming response */}
              {isTyping && streamingText && (
                <div className="flex flex-col items-start">
                  <span className="text-[10px] uppercase tracking-[0.1em] mb-3 text-silver font-bold">{aiName}</span>
                  <div className="max-w-full text-[13px] leading-[1.75] text-text font-mono markdown-body">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamingText}</ReactMarkdown>
                    <AnimatePresence>
                      {isTyping && <motion.span initial={{ opacity:1 }} exit={{ opacity:0 }} transition={{ duration:0.4 }} className="inline-block w-[1px] h-[14px] bg-silver ml-1 align-middle animate-cursor-blink" />}
                    </AnimatePresence>
                  </div>
                  <div className="flex items-center gap-4 mt-4">
                    <button onClick={stopGenerating} className="flex items-center gap-2 px-3 py-1.5 border border-border text-text-dim text-[10px] uppercase tracking-[0.1em] hover:text-silver hover:border-silver transition-all">
                      <IconStop /> Stop
                    </button>
                  </div>
                </div>
              )}

              {/* Typing dots when stream hasn't started yet */}
              {isTyping && !streamingText && (
                <div className="flex flex-col items-start">
                  <span className="text-[10px] uppercase tracking-[0.1em] mb-3 text-silver font-bold">{aiName}</span>
                  <TypingIndicator />
                </div>
              )}
            </div>
            <div ref={chatEndRef} className="h-24" />
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-border p-3 sm:p-4 bg-surface2 shrink-0">
          <div className="max-w-[660px] mx-auto flex flex-col gap-2">
            <div className={`relative flex items-end gap-3 p-3 bg-surface border transition-colors duration-300 ${inputValue.length > CHAR_WARN ? 'border-red-500/50 focus-within:border-red-500' : 'border-border focus-within:border-silver'}`}>
              <textarea ref={textareaRef} value={inputValue} onChange={handleTextareaChange} onKeyDown={handleKeyDown}
                placeholder="Reply to Zyro..." rows={1}
                className="flex-1 bg-transparent border-none outline-none resize-none text-[13px] text-text placeholder:text-text-dim py-1 font-mono" />
              {isTyping || isConnecting ? (
                <button onClick={stopGenerating} className="w-7 h-7 border border-border-light flex items-center justify-center text-red-400 hover:bg-red-900/10 transition-all" title="Stop"><IconStop /></button>
              ) : (
                <button onClick={() => handleSend()} disabled={!inputValue.trim()} className="w-7 h-7 border border-border-light flex items-center justify-center text-silver hover:bg-surface2 disabled:opacity-30 transition-all"><IconSend /></button>
              )}
            </div>
            <div className="flex justify-between items-center px-1">
              <span className="text-[10px] uppercase tracking-[0.1em] text-text-dim">
                {isConnecting ? (
                  <span className="flex items-center gap-2">
                    <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.4, repeat: Infinity }}>●</motion.span>
                    Preparing response...
                  </span>
                ) : isTyping ? `${aiName} is responding...` : ''}
              </span>
              <span className={`text-[10px] uppercase tracking-[0.1em] hidden sm:block ${inputValue.length > CHAR_WARN ? 'text-red-500' : 'text-text-dim'}`}>
                {inputValue.length > 0 ? (inputValue.length > CHAR_WARN ? `${inputValue.length}/10000 — too long` : `${inputValue.length} chars`) : 'Shift+Enter for newline'}
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Rename Modal */}
      <AnimatePresence>
        {isRenameModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={() => setIsRenameModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity:0,scale:0.95,y:20 }} animate={{ opacity:1,scale:1,y:0 }} exit={{ opacity:0,scale:0.95,y:20 }}
              className="relative w-full max-w-[400px] bg-surface border border-border p-6 sm:p-8 space-y-6 mx-4">
              <div className="space-y-2">
                <h3 className="font-display text-[12px] tracking-[0.1em] text-silver uppercase">Rename Conversation</h3>
                <p className="text-[10px] text-text-dim uppercase tracking-widest">Enter a new title for this thread</p>
              </div>
              <input autoFocus type="text" value={renameValue} onChange={e => setRenameValue(e.target.value)}
                onKeyDown={e => { if (e.key==='Enter') { if (renameId) renameConversation(renameId, renameValue); setIsRenameModalOpen(false); } if (e.key==='Escape') setIsRenameModalOpen(false); }}
                className="w-full bg-surface2 border border-border p-2 sm:p-3 text-[13px] text-text focus:border-silver outline-none transition-colors font-mono" />
              <div className="flex justify-end gap-4 pt-2">
                <button onClick={() => setIsRenameModalOpen(false)} className="text-[10px] uppercase tracking-widest text-text-dim hover:text-text transition-colors">Cancel</button>
                <button onClick={() => { if (renameId) renameConversation(renameId, renameValue); setIsRenameModalOpen(false); }} className="text-[10px] uppercase tracking-widest text-silver font-bold hover:text-text transition-colors">Save</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Settings Panel */}
      <AnimatePresence>
        {isSettingsOpen && (<>
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={() => setIsSettingsOpen(false)} className="fixed inset-0 bg-black/80 z-40" />
          <motion.div initial={{ x:'100%' }} animate={{ x:0 }} exit={{ x:'100%' }} transition={{ duration:0.38, ease:[0.4,0,0.2,1] }}
            className="fixed inset-y-0 right-0 w-full sm:w-[360px] bg-surface border-l border-border z-50 overflow-y-auto">
            <div className="p-6 border-b border-border flex justify-between items-center sticky top-0 bg-surface z-10">
              <span className="text-[14px] uppercase tracking-[0.15em] text-silver font-bold font-display">
                {settingsView === 'main' ? 'Settings'
                  : settingsView === 'edit-profile' ? 'Edit Profile'
                  : settingsView === 'change-password' ? 'Change Password'
                  : settingsView === 'delete-account' ? 'Delete Account'
                  : settingsView === 'model-select' ? 'Select Model'
                  : 'AI Instructions'}
              </span>
              <button onClick={() => setIsSettingsOpen(false)} className="text-text-mid hover:text-silver"><IconClose /></button>
            </div>
            <AnimatePresence mode="wait">
              <motion.div key={settingsView} initial={{ opacity:0,x:20 }} animate={{ opacity:1,x:0 }} exit={{ opacity:0,x:-20 }} transition={{ duration:0.2 }}>
                {renderSettingsContent()}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </>)}
      </AnimatePresence>

      {/* Confirm erase memory */}
      <AnimatePresence>
        {isConfirmOpen && (<>
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={() => setIsConfirmOpen(false)} className="fixed inset-0 bg-black/90 z-[60]" />
          <motion.div initial={{ scale:0.95,opacity:0 }} animate={{ scale:1,opacity:1 }} exit={{ scale:0.95,opacity:0 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] bg-surface border border-border p-8 z-[70] space-y-6">
            <div className="space-y-2">
              <span className="text-[10px] uppercase tracking-[0.2em] text-silver">Confirm Action</span>
              <p className="text-[12px] text-text-mid leading-relaxed">This will permanently erase all conversation history and memory.</p>
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={eraseMemory} className="w-full py-3 border border-red-900/40 text-red-400 text-[10px] uppercase tracking-[0.1em] hover:bg-red-900/10 transition-all">Confirm Erasure</button>
              <button onClick={() => setIsConfirmOpen(false)} className="w-full py-3 border border-border text-text-mid text-[10px] uppercase tracking-[0.1em] hover:text-text transition-all">Cancel</button>
            </div>
          </motion.div>
        </>)}
      </AnimatePresence>

      {/* Auth Modal */}
      <AnimatePresence>
        {authModal && (<>
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} onClick={() => setAuthModal(null)} className="fixed inset-0 bg-black/90 z-[100]" />
          <motion.div initial={{ scale:0.95,opacity:0 }} animate={{ scale:1,opacity:1 }} exit={{ scale:0.95,opacity:0 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[320px] bg-surface border border-border p-8 z-[110] space-y-8">
            <div className="space-y-2">
              <span className="text-[10px] uppercase tracking-[0.2em] text-silver font-bold">{authModal==='login' ? 'Login' : 'Register'}</span>
              <p className="text-[11px] text-text-mid">{authModal==='login' ? 'Access your Zyro workspace.' : 'Create your Zyro identity.'}</p>
            </div>
            <div className="space-y-4">
              {authModal==='register' && (
                <div className="space-y-2">
                  <label className="text-[9px] uppercase tracking-[0.1em] text-text-dim">Username</label>
                  <input type="text" value={authForm.username} onChange={e => setAuthForm({ ...authForm, username:e.target.value })}
                    className="w-full bg-surface2 border border-border p-3 text-[12px] outline-none focus:border-silver transition-colors font-mono text-text" placeholder="yourname" />
                </div>
              )}
              <div className="space-y-2">
                <label className="text-[9px] uppercase tracking-[0.1em] text-text-dim">Email Address</label>
                <input type="email" value={authForm.email} onChange={e => setAuthForm({ ...authForm, email:e.target.value })}
                  className="w-full bg-surface2 border border-border p-3 text-[12px] outline-none focus:border-silver transition-colors font-mono text-text" placeholder="you@email.com" />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] uppercase tracking-[0.1em] text-text-dim">Password</label>
                <input type="password" value={authForm.password} onChange={e => setAuthForm({ ...authForm, password:e.target.value })}
                  onKeyDown={e => { if (e.key==='Enter' && authModal) handleAuth(authModal); }}
                  className="w-full bg-surface2 border border-border p-3 text-[12px] outline-none focus:border-silver transition-colors font-mono text-text" placeholder="••••••••" />
              </div>
              {authError && <p className="text-[11px] text-red-400 font-mono">{authError}</p>}
              <button onClick={() => authModal && handleAuth(authModal)} disabled={authSubmitting}
                className="w-full py-3 bg-silver text-bg text-[10px] uppercase tracking-[0.2em] font-bold hover:opacity-90 transition-all disabled:opacity-50">
                {authSubmitting ? 'Please wait...' : authModal==='login' ? 'Enter Workspace' : 'Create Account'}
              </button>
              <button onClick={() => setAuthModal(authModal==='login' ? 'register' : 'login')}
                className="w-full text-center text-[10px] text-text-dim hover:text-silver transition-colors uppercase tracking-widest">
                {authModal==='login' ? "Don't have an account? Register" : "Already have an account? Login"}
              </button>
            </div>
          </motion.div>
        </>)}
      </AnimatePresence>

      {/* API Error Modal */}
      <AnimatePresence>
        {apiError && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }} className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 backdrop-blur-md p-6">
            <motion.div initial={{ y:20,opacity:0 }} animate={{ y:0,opacity:1 }} exit={{ y:20,opacity:0 }} className="w-full max-w-md border border-red-900/30 bg-bg p-8 text-center">
              <div className="mb-6 flex justify-center text-red-400">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </div>
              <h3 className="mb-4 text-lg font-bold tracking-tighter uppercase text-red-400">System Error</h3>
              <p className="mb-8 text-[13px] leading-relaxed text-text-dim">{apiError.message}</p>
              <div className="flex flex-col gap-3">
                {apiError.action && <button onClick={() => { apiError.action?.(); setApiError(null); }} className="w-full bg-red-900/20 py-3 text-[11px] uppercase tracking-[0.2em] font-bold text-red-400 hover:bg-red-900/30 transition-all border border-red-900/30">{apiError.actionLabel||'Retry'}</button>}
                <button onClick={() => setApiError(null)} className="w-full border border-border py-3 text-[11px] uppercase tracking-[0.2em] text-text-dim hover:text-text transition-all">Dismiss</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes blink{from,to{opacity:1}50%{opacity:0}}
        .animate-cursor-blink{animation:blink 0.85s step-end infinite}
        @keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
        .shimmer-anim::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,var(--border-light),transparent);animation:shimmer 1.6s ease-in-out infinite}

        /* Logo stroke — draw-on, uses theme accent color */
        .logo-stroke {
          fill: none;
          stroke: var(--color-silver);
          stroke-width: 2.5;
          stroke-linecap: round;
          stroke-linejoin: round;
        }
      `}</style>
    </div>
  );
}
