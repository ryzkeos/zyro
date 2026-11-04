'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { Conversation, Message, Settings, Persona, InterfaceTheme, ColorTheme, User, SettingsView, AuthForm, ProfileForm, PasswordForm, DeleteForm, PendingImage, SearchResult } from './types';
import { buildSystemPrompt } from './services/aiConfig';
import { PROJECT } from './services/project';
import { CHAR_WARN, COLOR_THEME_DOTS, MODEL_NAMES, PERSONA_NAMES } from './constants';
import { authApi, conversationsApi, aiApi, searchApi, pushApi } from './api';
import { checkGuestRateLimit, urlB64ToUint8Array, loadGuestConvs, saveGuestConvs, makeLocalConv, getAIDisplayName } from './utils';
import { useToast, usePWA, useKeyboardShortcuts, useTouchGestures, useAutoScroll, useGuestPersistence, useUrlParams } from './hooks';
import {
  IconHamburger, IconSettings, IconStop, IconSend, IconClose, IconPlus, IconTrash, IconChevronDown, IconLogout, IconUser, IconKey, IconBell, IconDownload, IconImage, IconBack, IconPencil, IconGithub, IconFacebook, IconInstagram, IconTikTok,
  MessageBubble, StreamingMessage, ResponseSkeleton, ErrorBoundary,
  ToastContainer, ZyroLogo, ConvList, SidebarSearch, PasswordInput,
  AuthModal, ForgotModal, ResetModal, VerifyModal, RenameModal, ConfirmModal, SearchModal, ImageModal
} from './components';

export default function App() {
  const { toasts, showToast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authModal, setAuthModal] = useState<'login' | 'register' | null>(null);
  const [authForm, setAuthForm] = useState<AuthForm>({ username: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsView, setSettingsView] = useState<SettingsView>('main');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [mobileOptionsId, setMobileOptionsId] = useState<string | null>(null);
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [convFilter, setConvFilter] = useState('');
  const [forgotModal, setForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  const [forgotMsg, setForgotMsg] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [resetModal, setResetModal] = useState(false);
  const [resetPw, setResetPw] = useState('');
  const [resetConfirm, setResetConfirm] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetMsg, setResetMsg] = useState('');
  const [verifyModal, setVerifyModal] = useState(false);
  const { canInstall, pushGranted, setPushGranted, deferredPromptRef } = usePWA();
  const [profileForm, setProfileForm] = useState<ProfileForm>({ username: '', email: '' });
  const [profileError, setProfileError] = useState('');
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [pwForm, setPwForm] = useState<PasswordForm>({ current: '', next: '', confirm: '' });
  const [pwError, setPwError] = useState('');
  const [pwSubmitting, setPwSubmitting] = useState(false);
  const [deleteForm, setDeleteForm] = useState<DeleteForm>({ password: '' });
  const [deleteError, setDeleteError] = useState('');
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [settings, setSettings] = useState<Settings>(() => { const d: Settings = { model: 'xenon-1.0', persona: 'default', personaName: 'Default', interfaceTheme: 'dark', colorTheme: 'monochrome', memoryEnabled: true, aiInstructions: '' }; try { const s = localStorage.getItem('zyro_settings'); return s ? { ...d, ...JSON.parse(s) } : d; } catch { return d; } });
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [canResume, setCanResume] = useState(false);
  const streamIdRef = useRef('');
  const lastFailedConvIdRef = useRef<string | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedConvsRef = useRef<Set<string>>(new Set());
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<(() => void) | null>(null);
  const isSendingRef = useRef(false);
  const streamBufferRef = useRef('');
  const rafRef = useRef<number | null>(null);
  const conversationsRef = useRef<Conversation[]>([]);
  useEffect(() => { conversationsRef.current = conversations; }, [conversations]);
  const { chatEndRef, chatContainerRef, isAtBottomRef, handleScroll } = useAutoScroll(streamingText, activeConversationId);
  useGuestPersistence(conversations, currentUser);
  useUrlParams(setVerifyToken, setResetToken, setActiveConversationId, showToast, setCurrentUser);
  useKeyboardShortcuts(() => setSearchOpen(s => !s), () => { setSearchOpen(false); setViewingImage(null); });
  const { onTouchStart, onTouchMove, onTouchEnd } = useTouchGestures(() => setIsSidebarOpen(true), () => setIsSidebarOpen(false), () => setIsSettingsOpen(true), () => setIsSettingsOpen(false), isSidebarOpen, isSettingsOpen);

  function setVerifyToken(t: string) { if (t) setVerifyModal(true); }

  useEffect(() => {
    document.documentElement.setAttribute('data-color-theme', settings.colorTheme);
    document.documentElement.setAttribute('data-theme', settings.interfaceTheme === 'dark' ? '' : settings.interfaceTheme);
  }, [settings.colorTheme, settings.interfaceTheme]);

  useEffect(() => { localStorage.setItem('zyro_settings', JSON.stringify(settings)); }, [settings]);

  useEffect(() => { const h = () => setMobileOptionsId(null); window.addEventListener('click', h); return () => window.removeEventListener('click', h); }, []);
  useEffect(() => { if (isSettingsOpen) setSettingsView('main'); }, [isSettingsOpen]);
  useEffect(() => { if (resetToken) setResetModal(true); }, [resetToken]);

  useEffect(() => {
    if (!searchOpen || !currentUser) return;
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    setSearchLoading(true);
    searchDebounceRef.current = setTimeout(async () => {
      try { const r = await searchApi.search(searchQuery); setSearchResults(Array.isArray(r) ? r : []); }
      catch { setSearchResults([]); }
      finally { setSearchLoading(false); }
    }, 400);
  }, [searchQuery, searchOpen, currentUser]);

  const loadConversations = useCallback(async () => {
    try { const c = await conversationsApi.list(); if (Array.isArray(c)) setConversations(c.map(x => ({ ...x, messages: x.messages ?? [] }))); } catch {}
  }, []);

  const sessionCheckedRef = useRef(false);
  const restoreSession = useCallback(async () => {
    let checked = false; let user: User | null = null;
    for (let i = 0; i < 4 && !checked; i++) {
      try { const data = await authApi.me(); user = data.user ?? null; checked = true; }
      catch { if (i < 3) await new Promise(r => setTimeout(r, 700 * (i + 1))); }
    }
    sessionCheckedRef.current = checked;
    if (user) { setCurrentUser(user); await loadConversations(); }
    else if (checked) setConversations(loadGuestConvs());
    else setConversations(prev => (prev.length ? prev : loadGuestConvs()));
    setAuthLoading(false);
  }, [loadConversations]);

  useEffect(() => { restoreSession(); }, [restoreSession]);

  useEffect(() => {
    const retry = () => { if (!sessionCheckedRef.current && !currentUser) restoreSession(); };
    window.addEventListener('focus', retry);
    document.addEventListener('visibilitychange', retry);
    return () => { window.removeEventListener('focus', retry); document.removeEventListener('visibilitychange', retry); };
  }, [currentUser, restoreSession]);

  const activeConversation = useMemo(() => conversations.find(c => c.id === activeConversationId) ?? null, [conversations, activeConversationId]);
  const sortedConversations = useMemo(() => [...conversations.filter(c => c.pinned), ...conversations.filter(c => !c.pinned)], [conversations]);
  const visibleConvs = useMemo(() => sortedConversations.filter(c => (c.messages.length > 0 || c.hasMessages) && (convFilter === '' || c.title.toLowerCase().includes(convFilter.toLowerCase()))), [sortedConversations, convFilter]);

  const handleNewChat = useCallback(() => {
    const local = makeLocalConv();
    setConversations(prev => [local, ...prev]);
    setActiveConversationId(local.id);
    setIsSidebarOpen(false);
    setInputValue('');
    setTimeout(() => textareaRef.current?.focus(), 100);
  }, []);

  const selectConversation = useCallback(async (id: string) => {
    streamIdRef.current = ''; lastFailedConvIdRef.current = null;
    setActiveConversationId(id);
    setIsSidebarOpen(false);
    if (currentUser && !loadedConvsRef.current.has(id)) {
      loadedConvsRef.current.add(id);
      try { const msgs = await conversationsApi.getMessages(id); if (Array.isArray(msgs)) setConversations(prev => prev.map(c => c.id === id ? { ...c, messages: msgs } : c)); } catch {}
    }
  }, [currentUser]);

  const deleteConversation = useCallback(async (id: string) => {
    if (currentUser) conversationsApi.delete(id).catch(() => {});
    setConversations(prev => prev.filter(c => c.id !== id));
    if (activeConversationId === id) setActiveConversationId(null);
  }, [currentUser, activeConversationId]);

  const togglePin = useCallback(async (id: string) => {
    if (currentUser) {
      try { const u = await conversationsApi.togglePin(id); setConversations(prev => prev.map(c => c.id === id ? { ...c, pinned: u.pinned } : c)); } catch {}
    } else { setConversations(prev => prev.map(c => c.id === id ? { ...c, pinned: !c.pinned } : c)); }
  }, [currentUser]);

  const renameConversation = useCallback(async (id: string, title: string) => {
    if (!title.trim()) return;
    setConversations(prev => prev.map(c => c.id === id ? { ...c, title } : c));
    if (currentUser) conversationsApi.updateTitle(id, title).catch(() => {});
  }, [currentUser]);

  const eraseMemory = useCallback(async () => {
    if (currentUser) await Promise.allSettled(conversationsRef.current.map(c => conversationsApi.delete(c.id)));
    setConversations([]); setActiveConversationId(null); setIsConfirmOpen(false);
    showToast('All conversations erased', 'success');
  }, [currentUser, showToast]);

  const stopGenerating = useCallback(() => {
    if (abortRef.current) abortRef.current();
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const text = streamBufferRef.current;
    streamBufferRef.current = '';
    setIsTyping(false); setIsConnecting(false); setStreamingText(''); isSendingRef.current = false;
    if (text) {
      const convId = activeConversationId;
      if (convId) {
        const msg: Message = { id: Date.now().toString(), role: 'assistant', content: text, timestamp: Date.now(), model: settings.model };
        setConversations(prev => prev.map(c => c.id === convId ? { ...c, messages: [...c.messages, msg] } : c));
        if (currentUser) conversationsApi.saveMessage(convId, msg).catch(() => {});
      }
    }
    setCanResume(true);
  }, [activeConversationId, settings.model, currentUser]);

  const copyToClipboard = useCallback(async (text: string, id: string) => {
    try { await navigator.clipboard.writeText(text); setCopySuccess(id); setTimeout(() => setCopySuccess(null), 2000); } catch {}
  }, []);

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { const r = ev.target?.result as string; setPendingImage({ base64: r.split(',')[1], type: file.type, preview: r }); };
    reader.readAsDataURL(file); e.target.value = '';
  }, []);

  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    const ta = e.target; ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
  }, []);

  const handleSend = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? inputValue).trim();
    if ((!text && !pendingImage) || isTyping || isConnecting) return;
    if (isSendingRef.current) return; isSendingRef.current = true;
    if (!currentUser && !checkGuestRateLimit()) { showToast('Guest limit reached — login to continue', 'error'); setAuthModal('login'); isSendingRef.current = false; return; }
    setInputValue('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setCanResume(false); setIsConnecting(true); streamBufferRef.current = '';

    let convId = activeConversationId;
    let isNewConv = false;
    if (!convId || !conversationsRef.current.find(c => c.id === convId)) {
      if (currentUser) {
        try { const nc = await conversationsApi.create('New Conversation'); convId = nc.id; setConversations(prev => [{ ...nc, messages: [] }, ...prev]); }
        catch { const lc = makeLocalConv(); convId = lc.id; setConversations(prev => [lc, ...prev]); }
      } else { const lc = makeLocalConv(); convId = lc.id; setConversations(prev => [lc, ...prev]); }
      setActiveConversationId(convId); isNewConv = true;
    }

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text, timestamp: Date.now(), ...(pendingImage ? { image: pendingImage.base64, imageType: pendingImage.type } : {}) };
    setConversations(prev => prev.map(c => c.id === convId ? { ...c, messages: [...c.messages, userMsg], lastUpdated: Date.now(), hasMessages: true } : c));
    setPendingImage(null);
    if (currentUser) conversationsApi.saveMessage(convId!, userMsg).catch(() => {});

    const history = (conversationsRef.current.find(c => c.id === convId)?.messages ?? []).slice(-19);
    const chatMessages = [...history.map(m => ({ role: m.role, content: m.content, ...(m.image ? { image: m.image, imageType: m.imageType } : {}) })), { role: 'user' as const, content: text, ...(pendingImage ? { image: (pendingImage as any).base64, imageType: (pendingImage as any).type } : {}) }];
    const systemPrompt = buildSystemPrompt(settings.persona as Persona, settings.model, settings.aiInstructions);
    const streamId = Date.now().toString(); streamIdRef.current = streamId; lastFailedConvIdRef.current = null;

    const { stream, abort } = aiApi.chat(chatMessages, systemPrompt, settings.model, streamId);
    abortRef.current = abort;
    setIsConnecting(false); setIsTyping(true);

    let fullText = ''; let renderScheduled = false;
    const scheduleRender = () => {
      if (renderScheduled) return; renderScheduled = true;
      rafRef.current = requestAnimationFrame(() => { renderScheduled = false; setStreamingText(streamBufferRef.current); });
    };

    try {
      for await (const chunk of stream()) {
        if (chunk.error && chunk.done) {
          if (chunk.error !== 'Request aborted') {
            const errMsg: Message = { id: Date.now().toString(), role: 'assistant', content: chunk.error, timestamp: Date.now(), isError: true, model: settings.model };
            setConversations(prev => prev.map(c => c.id === convId ? { ...c, messages: [...c.messages, errMsg] } : c));
            lastFailedConvIdRef.current = convId; setCanResume(true);
          }
          break;
        }
        if (chunk.text) { fullText += chunk.text; streamBufferRef.current = fullText; scheduleRender(); }
        if (chunk.done) break;
      }
    } catch {}

    setIsTyping(false); setStreamingText(''); streamBufferRef.current = ''; isSendingRef.current = false;

    if (fullText) {
      const aiMsg: Message = { id: Date.now().toString(), role: 'assistant', content: fullText, timestamp: Date.now(), model: settings.model };
      setConversations(prev => prev.map(c => c.id === convId ? { ...c, messages: [...c.messages, aiMsg], lastUpdated: Date.now() } : c));
      if (currentUser) conversationsApi.saveMessage(convId!, aiMsg).catch(() => {});
      if (currentUser && (isNewConv || (conversationsRef.current.find(c => c.id === convId)?.messages.length ?? 0) <= 2)) {
        aiApi.autoTitle([{ role: 'user', content: text }, { role: 'assistant', content: fullText }]).then(r => { if (r.title) renameConversation(convId!, r.title); }).catch(() => {});
      }
    }
  }, [inputValue, pendingImage, isTyping, isConnecting, currentUser, activeConversationId, settings, showToast, renameConversation]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [handleSend]);

  const refreshResponse = useCallback(async (msgId: string) => {
    const conv = conversationsRef.current.find(c => c.id === activeConversationId); if (!conv) return;
    const idx = conv.messages.findIndex(m => m.id === msgId); if (idx < 0) return;
    const prev = conv.messages.slice(0, idx);
    const lastUser = [...prev].reverse().find(m => m.role === 'user'); if (!lastUser) return;
    setConversations(p => p.map(c => c.id === activeConversationId ? { ...c, messages: prev } : c));
    await handleSend(lastUser.content);
  }, [activeConversationId, handleSend]);

  const handleBranch = useCallback(async (msgId: string) => {
    if (!currentUser || !activeConversationId) { showToast('Login to branch conversations', 'info'); return; }
    try { const r = await conversationsApi.branch(activeConversationId, msgId); setConversations(p => [...p, { ...r, messages: r.messages }]); setActiveConversationId(r.id); showToast('Branch created', 'success'); }
    catch { showToast('Failed to branch', 'error'); }
  }, [currentUser, activeConversationId, showToast]);

  const handleResume = useCallback(async () => {
    if (!streamIdRef.current) return;
    try {
      const r = await aiApi.resumeStream(streamIdRef.current);
      if (r.text) {
        const convId = lastFailedConvIdRef.current || activeConversationId;
        if (convId) {
          const aiMsg: Message = { id: Date.now().toString(), role: 'assistant', content: r.text, timestamp: Date.now(), model: settings.model };
          setConversations(p => p.map(c => c.id === convId ? { ...c, messages: [...c.messages.filter(m => !m.isError), aiMsg] } : c));
          if (currentUser) conversationsApi.saveMessage(convId, aiMsg).catch(() => {});
        }
        setCanResume(false);
      }
    } catch { showToast('Resume failed', 'error'); }
  }, [activeConversationId, settings.model, currentUser, showToast]);

  const goToSearchResult = useCallback((r: SearchResult) => { setSearchOpen(false); selectConversation(r.conversationId); }, [selectConversation]);

  const handleAuthSubmit = useCallback(async (mode: 'login' | 'register') => {
    setAuthError(''); setAuthSubmitting(true);
    try {
      const data = mode === 'login' ? await authApi.login(authForm.email, authForm.password) : await authApi.register(authForm.username, authForm.email, authForm.password);
      if (data.error) { setAuthError(data.error); return; }
      setCurrentUser(data.user); sessionStorage.removeItem('zyro_guest'); setAuthModal(null); setAuthForm({ username: '', email: '', password: '' });
      await loadConversations(); showToast(mode === 'login' ? 'Welcome back!' : 'Account created!', 'success');
    } catch { setAuthError('Something went wrong'); }
    finally { setAuthSubmitting(false); }
  }, [authForm, loadConversations, showToast]);

  const handleLogout = useCallback(async () => {
    loadedConvsRef.current.clear(); await authApi.logout().catch(() => {}); setCurrentUser(null); setConversations([]); setActiveConversationId(null); setIsSettingsOpen(false); showToast('Logged out', 'info');
  }, [showToast]);

  const handleForgotSubmit = useCallback(async () => {
    setForgotSubmitting(true);
    try { const r = await authApi.forgotPassword(forgotEmail); setForgotMsg(r.message || r.error || 'Check your email'); }
    catch { setForgotMsg('Something went wrong'); } finally { setForgotSubmitting(false); }
  }, [forgotEmail]);

  const handleResetSubmit = useCallback(async () => {
    if (resetPw !== resetConfirm) { setResetMsg('Passwords do not match'); return; }
    setResetSubmitting(true);
    try { const r = await authApi.resetPassword(resetToken, resetPw); setResetMsg(r.message || r.error || ''); if (r.message) setTimeout(() => { setResetModal(false); setResetToken(''); setResetPw(''); setResetConfirm(''); }, 2000); }
    catch { setResetMsg('Something went wrong'); } finally { setResetSubmitting(false); }
  }, [resetToken, resetPw, resetConfirm]);

  const handleProfileSave = useCallback(async () => {
    setProfileError(''); setProfileSubmitting(true);
    try { const r = await authApi.updateProfile(profileForm); if (r.error) { setProfileError(r.error); return; } setCurrentUser(r.user); showToast('Profile updated', 'success'); setSettingsView('main'); }
    catch { setProfileError('Something went wrong'); } finally { setProfileSubmitting(false); }
  }, [profileForm, showToast]);

  const handlePasswordSave = useCallback(async () => {
    setPwError(''); if (pwForm.next !== pwForm.confirm) { setPwError('Passwords do not match'); return; }
    setPwSubmitting(true);
    try { const r = await authApi.changePassword(pwForm.current, pwForm.next); if (r.error) { setPwError(r.error); return; } showToast('Password changed', 'success'); setPwForm({ current: '', next: '', confirm: '' }); setSettingsView('main'); }
    catch { setPwError('Something went wrong'); } finally { setPwSubmitting(false); }
  }, [pwForm, showToast]);

  const handleDeleteAccount = useCallback(async () => {
    setDeleteError(''); setDeleteSubmitting(true);
    try { const r = await authApi.deleteAccount(deleteForm.password); if (r.error) { setDeleteError(r.error); return; } setCurrentUser(null); setConversations([]); setActiveConversationId(null); setIsSettingsOpen(false); showToast('Account deleted', 'info'); }
    catch { setDeleteError('Something went wrong'); } finally { setDeleteSubmitting(false); }
  }, [deleteForm.password, showToast]);

  const handleAiInstructionsSave = useCallback(async () => {
    if (currentUser) authApi.setAiInstructions(settings.aiInstructions).catch(() => {});
    showToast('Instructions saved', 'success'); setSettingsView('main');
  }, [currentUser, settings.aiInstructions, showToast]);

  const installPWA = useCallback(async () => {
    if (!deferredPromptRef.current) return;
    await deferredPromptRef.current.prompt();
    const c = await deferredPromptRef.current.userChoice;
    if (c.outcome === 'accepted') showToast('App installed!', 'success');
  }, [deferredPromptRef, showToast]);

  const handlePushToggle = useCallback(async () => {
    if (pushGranted) {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) { await pushApi.unsubscribe(sub.endpoint).catch(() => {}); await sub.unsubscribe(); setPushGranted(false); showToast('Notifications disabled', 'info'); }
    } else {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        try {
          const { publicKey } = await pushApi.getVapidPublicKey();
          const reg = await navigator.serviceWorker.ready;
          const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8Array(publicKey) });
          const json = sub.toJSON() as any;
          await pushApi.subscribe({ endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } });
          setPushGranted(true); showToast('Notifications enabled', 'success');
        } catch { showToast('Failed to enable notifications', 'error'); }
      }
    }
  }, [pushGranted, setPushGranted, showToast]);

  const renderSettingsContent = useCallback((): React.ReactNode => {
    if (settingsView === 'edit-profile') return (
      <div className="p-6 space-y-6">
        <button onClick={() => setSettingsView('main')} className="flex items-center gap-2 text-text-dim hover:text-silver text-[10px] uppercase tracking-widest"><IconBack /><span>Back</span></button>
        <div className="space-y-4">
          {(['username', 'email'] as const).map(k => (
            <div key={k} className="space-y-2">
              <label className="text-[9px] uppercase tracking-[0.1em] text-text-dim">{k}</label>
              <input value={profileForm[k]} onChange={e => setProfileForm(f => ({ ...f, [k]: e.target.value }))} className="w-full bg-surface2 border border-border p-3 pr-10 text-[12px] outline-none focus:border-silver font-mono text-text" />
            </div>
          ))}
          {profileError && <p className="text-[11px] text-red-400 font-mono">{profileError}</p>}
          <button onClick={handleProfileSave} disabled={profileSubmitting} className="w-full py-3 bg-silver text-bg text-[10px] uppercase tracking-[0.2em] font-bold disabled:opacity-50">{profileSubmitting ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </div>
    );

    if (settingsView === 'change-password') return (
      <div className="p-6 space-y-6">
        <button onClick={() => setSettingsView('main')} className="flex items-center gap-2 text-text-dim hover:text-silver text-[10px] uppercase tracking-widest"><IconBack /><span>Back</span></button>
        <div className="space-y-4">
          {([['current', 'Current Password'], ['next', 'New Password'], ['confirm', 'Confirm Password']] as const).map(([k, label]) => (
            <div key={k} className="space-y-2">
              <label className="text-[9px] uppercase tracking-[0.1em] text-text-dim">{label}</label>
              <PasswordInput value={pwForm[k]} onChange={e => setPwForm(f => ({ ...f, [k]: e.target.value }))} className="w-full bg-surface2 border border-border p-3 pr-10 text-[12px] outline-none focus:border-silver font-mono text-text" />
            </div>
          ))}
          {pwError && <p className="text-[11px] text-red-400 font-mono">{pwError}</p>}
          <button onClick={handlePasswordSave} disabled={pwSubmitting} className="w-full py-3 bg-silver text-bg text-[10px] uppercase tracking-[0.2em] font-bold disabled:opacity-50">{pwSubmitting ? 'Saving...' : 'Update Password'}</button>
        </div>
      </div>
    );

    if (settingsView === 'delete-account') return (
      <div className="p-6 space-y-6">
        <button onClick={() => setSettingsView('main')} className="flex items-center gap-2 text-text-dim hover:text-silver text-[10px] uppercase tracking-widest"><IconBack /><span>Back</span></button>
        <p className="text-[11px] text-red-400 font-mono">This action is irreversible. All data will be permanently deleted.</p>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[9px] uppercase tracking-[0.1em] text-text-dim">Confirm Password</label>
            <PasswordInput value={deleteForm.password} onChange={e => setDeleteForm({ password: e.target.value })} className="w-full bg-surface2 border border-border p-3 pr-10 text-[12px] outline-none focus:border-silver font-mono text-text" />
          </div>
          {deleteError && <p className="text-[11px] text-red-400 font-mono">{deleteError}</p>}
          <button onClick={handleDeleteAccount} disabled={deleteSubmitting || !deleteForm.password} className="w-full py-3 border border-red-900/40 text-red-400 text-[10px] uppercase tracking-[0.1em] hover:bg-red-900/10 disabled:opacity-50">{deleteSubmitting ? 'Deleting...' : 'Delete Account'}</button>
        </div>
      </div>
    );

    if (settingsView === 'ai-instructions') return (
      <div className="p-6 space-y-6">
        <button onClick={() => setSettingsView('main')} className="flex items-center gap-2 text-text-dim hover:text-silver text-[10px] uppercase tracking-widest"><IconBack /><span>Back</span></button>
        <p className="text-[10px] text-text-dim uppercase tracking-widest">Custom instructions for Zyro</p>
        <textarea value={settings.aiInstructions} onChange={e => setSettings(s => ({ ...s, aiInstructions: e.target.value }))} rows={8} placeholder="e.g. Always respond in Filipino." className="w-full bg-surface2 border border-border p-3 text-[12px] outline-none focus:border-silver font-mono text-text resize-none" />
        <button onClick={handleAiInstructionsSave} className="w-full py-3 bg-silver text-bg text-[10px] uppercase tracking-[0.2em] font-bold">Save Instructions</button>
      </div>
    );

    if (settingsView === 'model-select' || settingsView === 'persona-select' || settingsView === 'theme-select') {
      const options: [string, string, string][] =
        settingsView === 'model-select'
          ? Object.entries(MODEL_NAMES).map(([k, n]) => [k, n, k === 'xenon-1.0' ? 'Fast & efficient' : 'Advanced reasoning & vision'])
          : settingsView === 'persona-select'
            ? Object.entries(PERSONA_NAMES).map(([k, n]) => [k, n, ''])
            : (['dark', 'dim', 'light'] as InterfaceTheme[]).map(t => [t, t, '']);
      const current = settingsView === 'model-select' ? settings.model : settingsView === 'persona-select' ? settings.persona : settings.interfaceTheme;
      const pick = (key: string) => {
        if (settingsView === 'model-select') setSettings(s => ({ ...s, model: key }));
        else if (settingsView === 'persona-select') setSettings(s => ({ ...s, persona: key as Persona, personaName: PERSONA_NAMES[key] || key }));
        else setSettings(s => ({ ...s, interfaceTheme: key as InterfaceTheme }));
        setSettingsView('main');
      };
      return (
        <div className="p-6 space-y-4">
          <button onClick={() => setSettingsView('main')} className="flex items-center gap-2 text-text-dim hover:text-silver text-[10px] uppercase tracking-widest"><IconBack /><span>Back</span></button>
          {options.map(([key, name, desc]) => (
            <button key={key} onClick={() => pick(key)} className={`w-full text-left p-4 border transition-all ${current === key ? 'border-silver text-silver' : 'border-border text-text-mid hover:border-border-light'}`}>
              <div className="text-[11px] font-bold uppercase tracking-widest">{name}</div>
              {desc && <div className="text-[10px] text-text-dim mt-1">{desc}</div>}
            </button>
          ))}
        </div>
      );
    }

    return (
      <div className="p-6 space-y-8">
        {currentUser ? (
          <div className="space-y-1">
            <p className="text-[11px] text-silver font-mono">{currentUser.username}</p>
            <p className="text-[10px] text-text-dim">{currentUser.email}</p>
            {!currentUser.email_verified && (
              <button onClick={() => { authApi.sendVerification().catch(() => {}); setVerifyModal(true); }} className="text-[9px] text-yellow-500 uppercase tracking-widest hover:text-yellow-400 mt-1">Verify Email</button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-[10px] text-text-dim uppercase tracking-widest">Guest Mode</p>
            <div className="flex gap-2">
              <button onClick={() => { setIsSettingsOpen(false); setAuthModal('login'); }} className="flex-1 py-2 border border-border text-[10px] uppercase tracking-widest text-silver hover:bg-silver/5">Login</button>
              <button onClick={() => { setIsSettingsOpen(false); setAuthModal('register'); }} className="flex-1 py-2 bg-silver text-bg text-[10px] uppercase tracking-widest font-bold hover:opacity-90">Register</button>
            </div>
          </div>
        )}
        <div className="space-y-0">
          <p className="text-[9px] uppercase tracking-[0.1em] text-text-dim mb-3">Engine</p>
          <button onClick={() => setSettingsView('model-select')} className="w-full flex justify-between items-center py-3 border-b border-border hover:text-silver">
            <span className="text-[10px] uppercase tracking-widest text-text-mid">Model</span>
            <span className="text-[11px] text-silver flex items-center gap-1">{MODEL_NAMES[settings.model] || settings.model}<IconChevronDown /></span>
          </button>
          <button onClick={() => setSettingsView('persona-select')} className="w-full flex justify-between items-center py-3 border-b border-border hover:text-silver">
            <span className="text-[10px] uppercase tracking-widest text-text-mid">Persona</span>
            <span className="text-[11px] text-silver flex items-center gap-1">{PERSONA_NAMES[settings.persona] || settings.persona}<IconChevronDown /></span>
          </button>
        </div>
        <div className="space-y-0">
          <p className="text-[9px] uppercase tracking-[0.1em] text-text-dim mb-3">Appearance</p>
          <button onClick={() => setSettingsView('theme-select')} className="w-full flex justify-between items-center py-3 border-b border-border hover:text-silver">
            <span className="text-[10px] uppercase tracking-widest text-text-mid">Theme</span>
            <span className="text-[11px] text-silver flex items-center gap-1 capitalize">{settings.interfaceTheme}<IconChevronDown /></span>
          </button>
          <div className="flex justify-between items-center py-3 border-b border-border">
            <span className="text-[10px] uppercase tracking-widest text-text-mid">Color</span>
            <div className="flex gap-2">
              {Object.entries(COLOR_THEME_DOTS).map(([k, v]) => (
                <button key={k} onClick={() => setSettings(s => ({ ...s, colorTheme: k as ColorTheme }))} className={`w-4 h-4 rounded-full border-2 transition-all ${settings.colorTheme === k ? 'border-silver scale-125' : 'border-transparent'}`} style={{ background: v }} title={k} />
              ))}
            </div>
          </div>
        </div>
        {currentUser && (
          <div className="space-y-0">
            <p className="text-[9px] uppercase tracking-[0.1em] text-text-dim mb-3">Account</p>
            {[['Edit Profile', <IconUser />, () => { setProfileForm({ username: currentUser.username, email: currentUser.email }); setSettingsView('edit-profile'); }],
              ['Change Password', <IconKey />, () => { setPwForm({ current: '', next: '', confirm: '' }); setSettingsView('change-password'); }],
              ['AI Instructions', <IconPencil />, () => setSettingsView('ai-instructions')],
              ['Delete Account', <IconTrash />, () => setSettingsView('delete-account')],
            ].map(([label, icon, action]: any) => (
              <button key={label as string} onClick={action} className="w-full flex items-center gap-3 py-3 border-b border-border text-text-mid hover:text-silver transition-colors">
                <span className="w-4 h-4 flex-shrink-0">{icon}</span>
                <span className="text-[10px] uppercase tracking-widest">{label as string}</span>
              </button>
            ))}
          </div>
        )}
        <div className="space-y-0">
          <p className="text-[9px] uppercase tracking-[0.1em] text-text-dim mb-3">Data</p>
          <button onClick={() => setIsConfirmOpen(true)} className="w-full flex items-center gap-3 py-3 border-b border-border text-text-mid hover:text-red-400 transition-colors">
            <IconTrash /><span className="text-[10px] uppercase tracking-widest">Erase All History</span>
          </button>
        </div>
        {(canInstall || ('Notification' in window && currentUser)) && (
          <div className="space-y-0">
            <p className="text-[9px] uppercase tracking-[0.1em] text-text-dim mb-3">App</p>
            {canInstall && <button onClick={installPWA} className="w-full flex items-center gap-3 py-3 border-b border-border text-text-mid hover:text-silver"><IconDownload /><span className="text-[10px] uppercase tracking-widest">Install App</span></button>}
            {'Notification' in window && currentUser && (
              <button onClick={handlePushToggle} className="w-full flex items-center gap-3 py-3 border-b border-border text-text-mid hover:text-silver"><IconBell /><span className="text-[10px] uppercase tracking-widest">{pushGranted ? 'Disable Notifications' : 'Enable Notifications'}</span></button>
            )}
          </div>
        )}
        <div className="space-y-0">
          <p className="text-[9px] uppercase tracking-[0.1em] text-text-dim mb-3">About</p>
          <div className="py-3 border-b border-border flex justify-between"><span className="text-[10px] uppercase tracking-widest text-text-dim">Version</span><span className="text-[10px] font-mono text-silver">{PROJECT.version}</span></div>
          <div className="py-3 border-b border-border flex justify-between"><span className="text-[10px] uppercase tracking-widest text-text-dim">By</span><span className="text-[10px] font-mono text-silver">{PROJECT.author} · {PROJECT.company}</span></div>
          <div className="pt-4 flex gap-4">
            {PROJECT.socials.github && <a href={PROJECT.socials.github} target="_blank" rel="noreferrer" className="text-text-dim hover:text-silver"><IconGithub /></a>}
            {PROJECT.socials.facebook && <a href={PROJECT.socials.facebook} target="_blank" rel="noreferrer" className="text-text-dim hover:text-silver"><IconFacebook /></a>}
            {PROJECT.socials.instagram && <a href={PROJECT.socials.instagram} target="_blank" rel="noreferrer" className="text-text-dim hover:text-silver"><IconInstagram /></a>}
            {PROJECT.socials.tiktok && <a href={PROJECT.socials.tiktok} target="_blank" rel="noreferrer" className="text-text-dim hover:text-silver"><IconTikTok /></a>}
          </div>
        </div>
        {currentUser && (
          <button onClick={handleLogout} className="w-full flex items-center gap-3 py-3 text-text-dim hover:text-red-400 transition-colors">
            <IconLogout /><span className="text-[10px] uppercase tracking-widest">Log Out</span>
          </button>
        )}
      </div>
    );
  }, [settingsView, currentUser, settings, profileForm, profileError, profileSubmitting, pwForm, pwError, pwSubmitting, deleteForm, deleteError, deleteSubmitting, canInstall, pushGranted, handleProfileSave, handlePasswordSave, handleDeleteAccount, handleAiInstructionsSave, installPWA, handlePushToggle, handleLogout]);

  if (authLoading) return (
    <div className="flex items-center justify-center bg-bg" style={{ position: 'fixed', inset: 0 }}>
      <div className="flex flex-col items-center gap-6">
        <span className="font-display text-2xl tracking-[0.25em] text-silver font-bold">ZYRO</span>
        <div className="flex gap-1.5">{[0, 1, 2].map(i => <motion.div key={i} animate={{ y: [0, -6, 0] }} transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }} style={{ width: 6, height: 6, borderRadius: '50%', background: '#c0c0c0' }} />)}</div>
      </div>
    </div>
  );

  return (
    <div className="flex overflow-hidden bg-bg selection:bg-accent-soft selection:text-silver" style={{ position: 'fixed', inset: 0 }} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <ToastContainer toasts={toasts} />
      <aside className="hidden md:flex w-[260px] xl:w-[300px] flex-col border-r border-border bg-surface2">
        <div className="p-6 border-b border-border flex justify-between items-center shrink-0">
          <span className="font-display font-bold text-[13px] text-silver tracking-[0.12em] uppercase">Conversations</span>
          <button onClick={handleNewChat} className="text-text-dim hover:text-silver transition-colors"><IconPlus /></button>
        </div>
        <SidebarSearch convFilter={convFilter} setConvFilter={setConvFilter} currentUser={currentUser} onOpenSearch={() => { setSearchOpen(true); setSearchQuery(''); setSearchResults([]); }} />
        <ConvList visibleConvs={visibleConvs} activeConversationId={activeConversationId} mobileOptionsId={mobileOptionsId} selectConversation={selectConversation} deleteConversation={deleteConversation} togglePin={togglePin} setRenameId={setRenameId} setRenameValue={setRenameValue} setIsRenameModalOpen={setIsRenameModalOpen} setMobileOptionsId={setMobileOptionsId} />
      </aside>

      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/60 z-40 md:hidden" />
            <motion.aside initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'tween', duration: 0.3 }} className="fixed inset-y-0 left-0 w-[260px] bg-surface border-r border-border z-50 md:hidden flex flex-col">
              <div className="p-6 flex justify-between items-center border-b border-border shrink-0">
                <span className="font-display font-bold text-[14px] text-silver tracking-[0.12em]">CONVERSATIONS</span>
                <button onClick={() => setIsSidebarOpen(false)} className="text-text-mid hover:text-silver"><IconClose /></button>
              </div>
              <div className="px-4 py-4 shrink-0">
                <button onClick={handleNewChat} className="w-full h-10 border border-border-light flex items-center justify-center gap-2 text-text-mid hover:text-silver transition-all"><IconPlus /><span className="uppercase tracking-[0.1em] text-[10px]">New Conversation</span></button>
              </div>
              <SidebarSearch convFilter={convFilter} setConvFilter={setConvFilter} currentUser={currentUser} onOpenSearch={() => { setSearchOpen(true); setIsSidebarOpen(false); setSearchQuery(''); setSearchResults([]); }} />
              {visibleConvs.length > 0 && <div className="px-6 pb-2 shrink-0"><span className="text-[10px] uppercase tracking-[0.1em] text-text-dim">History</span></div>}
              <ConvList mobile visibleConvs={visibleConvs} activeConversationId={activeConversationId} mobileOptionsId={mobileOptionsId} selectConversation={selectConversation} deleteConversation={deleteConversation} togglePin={togglePin} setRenameId={setRenameId} setRenameValue={setRenameValue} setIsRenameModalOpen={setIsRenameModalOpen} setMobileOptionsId={setMobileOptionsId} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1 flex flex-col min-w-0 relative overflow-hidden">
        <header className="h-[64px] border-b border-border flex items-center px-6 bg-surface2 z-30 shrink-0 relative">
          <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-text-mid hover:text-silver shrink-0"><IconHamburger /></button>
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5">
            <span className="font-display text-[15px] font-bold tracking-[0.15em] text-silver uppercase leading-none">Zyro</span>
            <span className="hidden md:inline font-mono text-[15px] font-normal tracking-[0.05em] text-text-dim leading-none">— {(MODEL_NAMES[settings.model] || settings.model).toUpperCase()}</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <button onClick={() => setIsSettingsOpen(true)} className="text-text-mid hover:text-silver transition-colors shrink-0"><IconSettings /></button>
          </div>
        </header>

        <div ref={chatContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-6 py-8 bg-bg min-h-0" style={{ overflowAnchor: 'none' }}>
          <div className={`max-w-[660px] xl:max-w-[820px] w-full mx-auto ${(!activeConversation || activeConversation.messages.length === 0) ? 'h-full flex flex-col items-center justify-center' : ''}`}>
            {(!activeConversation || activeConversation.messages.length === 0) && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center text-center space-y-4 w-full py-12">
                <div className="flex flex-col items-center gap-3 mt-20">
                  <ZyroLogo size={100} />
                  <p className="text-[17px] text-silver tracking-[0.18em] font-display font-bold uppercase mt-1">Zyro AI</p>
                  <div className="w-20 h-px bg-border-light opacity-60" />
                  <p className="text-[10px] text-text-dim tracking-[0.12em] font-mono">this AI is still under development.</p>
                </div>
                {!currentUser && <p className="text-[9px] text-text-dim uppercase tracking-widest opacity-50 mt-4">Login via Settings to save history</p>}
              </motion.div>
            )}
            <div className="space-y-12">
              <ErrorBoundary>
              {activeConversation?.messages.map((msg: Message) => (
                <MessageBubble key={msg.id} msg={msg} currentUsername={currentUser?.username || 'You'} aiName={msg.model ? getAIDisplayName(msg.model) : getAIDisplayName(settings.model)} copySuccess={copySuccess} canResume={canResume} onCopy={copyToClipboard} onRefresh={refreshResponse} onBranch={handleBranch} onResume={handleResume} setViewingImage={setViewingImage} />
              ))}
              </ErrorBoundary>
              {isConnecting && <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-start"><span className="text-[10px] uppercase tracking-[0.1em] mb-4 text-silver font-bold">{getAIDisplayName(settings.model)}</span><ResponseSkeleton /></motion.div>}
              {isTyping && <StreamingMessage text={streamingText} aiName={getAIDisplayName(settings.model)} onStop={stopGenerating} />}
            </div>
            <div ref={chatEndRef} className="h-24" />
          </div>
        </div>

        <div className="border-t border-border p-3 sm:p-4 bg-surface2 shrink-0" data-no-swipe>
          <div className="max-w-[660px] xl:max-w-[820px] mx-auto flex flex-col gap-2">
            {pendingImage && (
              <div className="flex items-center gap-2 px-1">
                <div className="relative inline-block">
                  <img src={pendingImage.preview} alt="Pending" className="h-14 w-14 object-cover border border-border" />
                  <button onClick={() => setPendingImage(null)} className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-surface border border-border text-text-dim hover:text-silver flex items-center justify-center text-[10px]">×</button>
                </div>
                <span className="text-[10px] uppercase tracking-widest text-text-dim">Image ready</span>
              </div>
            )}
            <div className={`relative flex items-end gap-2 p-3 bg-surface border transition-colors duration-300 ${inputValue.length > CHAR_WARN ? 'border-red-500/50 focus-within:border-red-500' : 'border-border focus-within:border-silver'}`}>
              {settings.model === 'yuruzu-1.0' && (<><button onClick={() => fileInputRef.current?.click()} className="w-7 h-7 shrink-0 border border-border-light flex items-center justify-center text-text-dim hover:text-silver hover:border-silver transition-all mb-0.5" title="Upload image"><IconImage /></button><input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} /></>)}
              <textarea ref={textareaRef} value={inputValue} onChange={handleTextareaChange} onKeyDown={handleKeyDown} placeholder="Reply to Zyro..." rows={1} className="flex-1 bg-transparent border-none outline-none resize-none text-[13px] text-text placeholder:text-text-dim py-1 font-mono" />
              {isTyping || isConnecting
                ? <button onClick={stopGenerating} className="w-7 h-7 shrink-0 border border-border-light flex items-center justify-center text-red-400 hover:bg-red-900/10 transition-all mb-0.5"><IconStop /></button>
                : <button onClick={() => handleSend()} disabled={!inputValue.trim() && !pendingImage} className="w-7 h-7 shrink-0 border border-border-light flex items-center justify-center text-silver hover:bg-surface2 disabled:opacity-30 transition-all mb-0.5"><IconSend /></button>
              }
            </div>
            <div className="flex justify-between items-center px-1">
              <span className="text-[10px] uppercase tracking-[0.1em] text-text-dim">
                {isConnecting ? <span className="flex items-center gap-2"><motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.4, repeat: Infinity }}>●</motion.span>Preparing response...</span> : isTyping ? `${getAIDisplayName(settings.model)} is responding...` : ''}
              </span>
              <span className={`text-[10px] uppercase tracking-[0.1em] hidden sm:block ${inputValue.length > CHAR_WARN ? 'text-red-500' : 'text-text-dim'}`}>
                {inputValue.length > 0 ? (inputValue.length > CHAR_WARN ? `${inputValue.length}/10000 — too long` : `${inputValue.length} chars`) : 'Shift+Enter for newline'}
              </span>
            </div>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {isSettingsOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsSettingsOpen(false)} className="fixed inset-0 bg-black/80 z-40" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: 0.38, ease: [0.4, 0, 0.2, 1] }} className="fixed inset-y-0 right-0 w-full sm:w-[380px] xl:w-[440px] bg-surface border-l border-border z-50 overflow-y-auto">
              <div className="p-6 border-b border-border flex justify-between items-center sticky top-0 bg-surface z-10">
                <span className="text-[14px] uppercase tracking-[0.15em] text-silver font-bold font-display">
                  {settingsView === 'main' ? 'Settings' : settingsView === 'edit-profile' ? 'Edit Profile' : settingsView === 'change-password' ? 'Change Password' : settingsView === 'delete-account' ? 'Delete Account' : settingsView === 'model-select' ? 'Select Model' : settingsView === 'persona-select' ? 'Select Persona' : settingsView === 'theme-select' ? 'Select Theme' : 'AI Instructions'}
                </span>
                <button onClick={() => setIsSettingsOpen(false)} className="text-text-mid hover:text-silver"><IconClose /></button>
              </div>
              <AnimatePresence mode="wait">
                <motion.div key={settingsView} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                  {renderSettingsContent()}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AuthModal mode={authModal || 'login'} isOpen={!!authModal} onClose={() => { setAuthModal(null); setAuthError(''); }} onSubmit={handleAuthSubmit} onForgotPassword={() => { setAuthModal(null); setForgotModal(true); }} onSwitchMode={setAuthModal} form={authForm} setForm={setAuthForm} error={authError} isSubmitting={authSubmitting} />
      <ForgotModal isOpen={forgotModal} onClose={() => { setForgotModal(false); setForgotMsg(''); setForgotEmail(''); }} onBackToLogin={() => { setForgotModal(false); setAuthModal('login'); }} email={forgotEmail} setEmail={setForgotEmail} message={forgotMsg} isSubmitting={forgotSubmitting} onSubmit={handleForgotSubmit} />
      <ResetModal isOpen={resetModal} password={resetPw} setPassword={setResetPw} confirm={resetConfirm} setConfirm={setResetConfirm} message={resetMsg} isSubmitting={resetSubmitting} onSubmit={handleResetSubmit} />
      <VerifyModal isOpen={verifyModal} onClose={() => setVerifyModal(false)} email={currentUser?.email || ''} />
      <RenameModal isOpen={isRenameModalOpen} onClose={() => setIsRenameModalOpen(false)} value={renameValue} setValue={setRenameValue} onSave={() => renameId && renameConversation(renameId, renameValue)} />
      <ConfirmModal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={eraseMemory} title="Confirm Action" message="This will permanently erase all conversation history." confirmText="Confirm Erasure" />
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} query={searchQuery} setQuery={setSearchQuery} results={searchResults} isLoading={searchLoading} onSelectResult={goToSearchResult} />
      <ImageModal src={viewingImage} onClose={() => setViewingImage(null)} />

      <style>{`@keyframes cursor-blink{from,to{opacity:1}50%{opacity:0}}@keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(200%)}}@keyframes msg-appear{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}.message-row{animation:msg-appear 0.2s ease-out}.shimmer-anim::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent,var(--border-light),transparent);animation:shimmer 1.6s ease-in-out infinite}.logo-stroke{fill:none;stroke:var(--color-silver);stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round}`}</style>
    </div>
  );
}
