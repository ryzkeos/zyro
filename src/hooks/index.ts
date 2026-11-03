import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Settings, User, Toast, Conversation, BeforeInstallPromptEvent } from '../types';
import { API } from '../constants';
import { loadGuestConvs, saveGuestConvs } from '../utils';

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const showToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2500);
  }, []);
  return { toasts, showToast };
}

export function usePWA() {
  const [canInstall, setCanInstall] = useState(false);
  const [pushGranted, setPushGranted] = useState(false);
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
    const onInstallPrompt = (e: BeforeInstallPromptEvent) => { e.preventDefault(); deferredPromptRef.current = e; setCanInstall(true); };
    window.addEventListener('beforeinstallprompt', onInstallPrompt as EventListener);
    if ('Notification' in window) setPushGranted(Notification.permission === 'granted');
    return () => window.removeEventListener('beforeinstallprompt', onInstallPrompt as EventListener);
  }, []);
  return { canInstall, pushGranted, setPushGranted, deferredPromptRef };
}

export function useKeyboardShortcuts(onSearchToggle: () => void, onClose: () => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); onSearchToggle(); }
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onSearchToggle, onClose]);
}

export function useTouchGestures(
  onOpenSidebar: () => void, onCloseSidebar: () => void,
  onOpenSettings: () => void, onCloseSettings: () => void,
  isSidebarOpen: boolean, isSettingsOpen: boolean
) {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => { setTouchEnd(null); setTouchStart(e.targetTouches[0].clientX); setTouchStartY(e.targetTouches[0].clientY); };
  const onTouchMove = (e: React.TouchEvent) => { setTouchEnd(e.targetTouches[0].clientX); };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart || !touchEnd || !touchStartY) return;
    const target = e.target as HTMLElement;
    if (target.closest('textarea') || target.closest('header') || target.closest('[data-no-swipe]') || target.closest('.overflow-y-auto') || target.closest('.overflow-x-auto')) return;
    const dx = touchStart - touchEnd;
    const dy = Math.abs((e.changedTouches[0]?.clientY ?? touchStartY) - touchStartY);
    if (dy > Math.abs(dx)) return;
    if (dx > 50 && !isSidebarOpen && !isSettingsOpen) onOpenSettings();
    if (dx < -50 && !isSettingsOpen && !isSidebarOpen) onOpenSidebar();
    if (dx > 50 && isSidebarOpen) onCloseSidebar();
    if (dx < -50 && isSettingsOpen) onCloseSettings();
  };
  return { onTouchStart, onTouchMove, onTouchEnd };
}

export function useAutoScroll(streamingText: string, activeConversationId: string | null) {
  const chatEndRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!isAtBottomRef.current) return; chatEndRef.current?.scrollIntoView({ behavior: 'instant' as ScrollBehavior }); }, [streamingText]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [activeConversationId]);
  const handleScroll = useCallback(() => {
    const el = chatContainerRef.current;
    if (!el) return;
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }, []);
  return { chatEndRef, chatContainerRef, isAtBottomRef, handleScroll };
}

export function useGuestPersistence(conversations: Conversation[], currentUser: User | null) {
  useEffect(() => {
    if (currentUser) return;
    const t = setTimeout(() => saveGuestConvs(conversations), 500);
    return () => clearTimeout(t);
  }, [conversations, currentUser]);
}

export function useUrlParams(
  setVerifyToken: (t: string) => void,
  setResetToken: (t: string) => void,
  setActiveConversationId: (id: string | null) => void,
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void,
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>
) {
  const hasRun = useRef(false);
  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;
    const params = new URLSearchParams(window.location.search);
    const vt = params.get('verify_token');
    const rt = params.get('reset_token');
    const nc = params.get('new');
    if (vt) {
      setVerifyToken(vt);
      fetch(`${API}/api/auth/verify-email`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: vt }) })
        .then(r => r.json()).then(d => { if (d.message) { showToast('Email verified!', 'success'); setCurrentUser(u => u ? { ...u, email_verified: true } : u); } else { showToast(d.error || 'Verification failed', 'error'); } })
        .catch(() => showToast('Verification failed', 'error'));
      window.history.replaceState({}, '', '/');
    }
    if (rt) { setResetToken(rt); window.history.replaceState({}, '', '/'); }
    if (nc === '1') { setActiveConversationId(null); window.history.replaceState({}, '', '/'); }
  }, []);
}