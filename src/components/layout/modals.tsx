// Modal Components for Zyro AI Chat Application

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

// ── AuthModal ────────────────────────────────────────────────────────────────

interface AuthModalProps {
  mode: 'login' | 'register';
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (mode: 'login' | 'register') => void;
  onForgotPassword: () => void;
  onSwitchMode: (mode: 'login' | 'register') => void;
  form: { username: string; email: string; password: string };
  setForm: (form: { username: string; email: string; password: string }) => void;
  error: string;
  isSubmitting: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  mode, isOpen, onClose, onSubmit, onForgotPassword, onSwitchMode,
  form, setForm, error, isSubmitting
}) => (
  <AnimatePresence>
    {isOpen && (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/90 z-[100]"
        />
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[320px] bg-surface border border-border p-8 z-[110] space-y-8"
        >
          <div>
            <span className="text-[10px] uppercase tracking-[0.2em] text-silver font-bold">
              {mode === 'login' ? 'Login' : 'Register'}
            </span>
            <p className="text-[11px] text-text-mid mt-1">
              {mode === 'login' ? 'Access your Zyro workspace.' : 'Create your Zyro identity.'}
            </p>
          </div>
          <div className="space-y-4">
            {mode === 'register' && (
              <div className="space-y-2">
                <label className="text-[9px] uppercase tracking-[0.1em] text-text-dim">Username</label>
                <input
                  type="text"
                  value={form.username}
                  onChange={e => setForm({ ...form, username: e.target.value })}
                  className="w-full bg-surface2 border border-border p-3 text-[12px] outline-none focus:border-silver transition-colors font-mono text-text"
                  placeholder="yourname"
                />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-[9px] uppercase tracking-[0.1em] text-text-dim">Email Address</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full bg-surface2 border border-border p-3 text-[12px] outline-none focus:border-silver transition-colors font-mono text-text"
                placeholder="you@email.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] uppercase tracking-[0.1em] text-text-dim">Password</label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                onKeyDown={e => { if (e.key === 'Enter') onSubmit(mode); }}
                className="w-full bg-surface2 border border-border p-3 text-[12px] outline-none focus:border-silver transition-colors font-mono text-text"
                placeholder="••••••••"
              />
            </div>
            {mode === 'login' && (
              <button
                onClick={onForgotPassword}
                className="text-[10px] text-text-dim hover:text-silver uppercase tracking-widest transition-colors"
              >
                Forgot password?
              </button>
            )}
            {error && <p className="text-[11px] text-red-400 font-mono">{error}</p>}
            <button
              onClick={() => onSubmit(mode)}
              disabled={isSubmitting}
              className="w-full py-3 bg-silver text-bg text-[10px] uppercase tracking-[0.2em] font-bold hover:opacity-90 disabled:opacity-50"
            >
              {isSubmitting ? 'Please wait...' : mode === 'login' ? 'Enter Workspace' : 'Create Account'}
            </button>
            <button
              onClick={() => onSwitchMode(mode === 'login' ? 'register' : 'login')}
              className="w-full text-center text-[10px] text-text-dim hover:text-silver transition-colors uppercase tracking-widest"
            >
              {mode === 'login' ? "Don't have an account? Register" : 'Already have an account? Login'}
            </button>
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

// ── ForgotModal ───────────────────────────────────────────────────────────────

interface ForgotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToLogin: () => void;
  email: string;
  setEmail: (email: string) => void;
  message: string;
  isSubmitting: boolean;
  onSubmit: () => void;
}

export const ForgotModal: React.FC<ForgotModalProps> = ({
  isOpen, onClose, onBackToLogin, email, setEmail, message, isSubmitting, onSubmit
}) => (
  <AnimatePresence>
    {isOpen && (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/90 z-[100]"
        />
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[320px] bg-surface border border-border p-8 z-[110] space-y-6"
        >
          <div>
            <span className="text-[10px] uppercase tracking-[0.2em] text-silver font-bold">Forgot Password</span>
            <p className="text-[11px] text-text-mid mt-1">Enter your email and we'll send a reset link.</p>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[9px] uppercase tracking-[0.1em] text-text-dim">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') onSubmit(); }}
                autoFocus
                className="w-full bg-surface2 border border-border p-3 text-[12px] outline-none focus:border-silver transition-colors font-mono text-text"
                placeholder="you@email.com"
              />
            </div>
            {message && <p className="text-[11px] font-mono text-silver">{message}</p>}
            <button
              onClick={onSubmit}
              disabled={isSubmitting || !email.trim()}
              className="w-full py-3 bg-silver text-bg text-[10px] uppercase tracking-[0.2em] font-bold hover:opacity-90 disabled:opacity-50"
            >
              {isSubmitting ? 'Sending...' : 'Send Reset Link'}
            </button>
            <button
              onClick={onBackToLogin}
              className="w-full text-center text-[10px] text-text-dim hover:text-silver uppercase tracking-widest"
            >
              ← Back to Login
            </button>
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

// ── ResetModal ────────────────────────────────────────────────────────────────

interface ResetModalProps {
  isOpen: boolean;
  password: string;
  setPassword: (pw: string) => void;
  confirm: string;
  setConfirm: (c: string) => void;
  message: string;
  isSubmitting: boolean;
  onSubmit: () => void;
}

export const ResetModal: React.FC<ResetModalProps> = ({
  isOpen, password, setPassword, confirm, setConfirm, message, isSubmitting, onSubmit
}) => (
  <AnimatePresence>
    {isOpen && (
      <>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/90 z-[100]" />
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[320px] bg-surface border border-border p-8 z-[110] space-y-6"
        >
          <div>
            <span className="text-[10px] uppercase tracking-[0.2em] text-silver font-bold">New Password</span>
            <p className="text-[11px] text-text-mid mt-1">Choose a new password for your account.</p>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[9px] uppercase tracking-[0.1em] text-text-dim">New Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoFocus
                className="w-full bg-surface2 border border-border p-3 text-[12px] outline-none focus:border-silver transition-colors font-mono text-text"
                placeholder="At least 8 characters"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] uppercase tracking-[0.1em] text-text-dim">Confirm Password</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') onSubmit(); }}
                className="w-full bg-surface2 border border-border p-3 text-[12px] outline-none focus:border-silver transition-colors font-mono text-text"
                placeholder="Repeat password"
              />
            </div>
            {message && <p className="text-[11px] text-red-400 font-mono">{message}</p>}
            <button
              onClick={onSubmit}
              disabled={isSubmitting || !password || !confirm}
              className="w-full py-3 bg-silver text-bg text-[10px] uppercase tracking-[0.2em] font-bold hover:opacity-90 disabled:opacity-50"
            >
              {isSubmitting ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

// ── VerifyModal ───────────────────────────────────────────────────────────────

interface VerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
}

export const VerifyModal: React.FC<VerifyModalProps> = ({ isOpen, onClose, email }) => (
  <AnimatePresence>
    {isOpen && (
      <>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/80 z-[100]" />
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] bg-surface border border-border p-8 z-[110] text-center space-y-4"
        >
          <p className="text-silver text-2xl">✉</p>
          <p className="text-[12px] font-bold text-silver uppercase tracking-widest">Check your inbox</p>
          <p className="text-[11px] text-text-mid">
            We sent a verification link to<br />
            <span className="text-text font-mono">{email}</span>
          </p>
          <button onClick={onClose} className="w-full py-3 border border-border text-text-mid text-[10px] uppercase tracking-widest hover:text-silver transition-all">
            Dismiss
          </button>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

// ── RenameModal ────────────────────────────────────────────────────────────────

interface RenameModalProps {
  isOpen: boolean;
  onClose: () => void;
  value: string;
  setValue: (v: string) => void;
  onSave: () => void;
}

export const RenameModal: React.FC<RenameModalProps> = ({ isOpen, onClose, value, setValue, onSave }) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-[400px] bg-surface border border-border p-6 sm:p-8 space-y-6 mx-4"
        >
          <div>
            <h3 className="font-display text-[12px] tracking-[0.1em] text-silver uppercase">Rename Conversation</h3>
          </div>
          <input
            autoFocus
            type="text"
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') { onSave(); onClose(); }
              if (e.key === 'Escape') onClose();
            }}
            className="w-full bg-surface2 border border-border p-2 sm:p-3 text-[13px] text-text focus:border-silver outline-none transition-colors font-mono"
          />
          <div className="flex justify-end gap-4">
            <button onClick={onClose} className="text-[10px] uppercase tracking-widest text-text-dim hover:text-text transition-colors">Cancel</button>
            <button onClick={() => { onSave(); onClose(); }} className="text-[10px] uppercase tracking-widest text-silver font-bold">Save</button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

// ── ConfirmModal ──────────────────────────────────────────────────────────────

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen, onClose, onConfirm, title = 'Confirm Action', message = 'Are you sure?', confirmText = 'Confirm'
}) => (
  <AnimatePresence>
    {isOpen && (
      <>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/90 z-[60]" />
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] bg-surface border border-border p-8 z-[70] space-y-6"
        >
          <div>
            <span className="text-[10px] uppercase tracking-[0.2em] text-silver">{title}</span>
            <p className="text-[12px] text-text-mid leading-relaxed mt-2">{message}</p>
          </div>
          <div className="flex flex-col gap-2">
            <button onClick={onConfirm} className="w-full py-3 border border-red-900/40 text-red-400 text-[10px] uppercase tracking-[0.1em] hover:bg-red-900/10 transition-all">
              {confirmText}
            </button>
            <button onClick={onClose} className="w-full py-3 border border-border text-text-mid text-[10px] uppercase tracking-[0.1em] hover:text-text transition-all">
              Cancel
            </button>
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

// ── SearchModal ───────────────────────────────────────────────────────────────

interface SearchResult {
  messageId: string;
  conversationId: string;
  conversationTitle: string;
  role: string;
  snippet: string;
  timestamp: number;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  query: string;
  setQuery: (q: string) => void;
  results: SearchResult[];
  isLoading: boolean;
  onSelectResult: (r: SearchResult) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen, onClose, query, setQuery, results, isLoading, onSelectResult
}) => (
  <AnimatePresence>
    {isOpen && (
      <>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100]" />
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.97 }}
          transition={{ duration: 0.18 }}
          className="fixed top-[8vh] sm:top-[15vh] left-2 right-2 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-full sm:max-w-[560px] z-[110] bg-surface border border-border shadow-2xl overflow-hidden"
        >
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5" />
              <path d="M16.5 16.5L22 22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              autoFocus
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search conversations..."
              className="flex-1 bg-transparent outline-none text-[13px] text-text placeholder:text-text-dim font-mono"
            />
            <span className="text-[10px] text-text-dim uppercase tracking-widest">Esc</span>
          </div>
          <div className="max-h-[50vh] overflow-y-auto">
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.2, repeat: Infinity }} className="text-[11px] uppercase tracking-widest text-text-dim">
                  Searching...
                </motion.div>
              </div>
            )}
            {!isLoading && query.length >= 2 && results.length === 0 && (
              <div className="py-8 text-center text-[11px] uppercase tracking-widest text-text-dim">No results</div>
            )}
            {!isLoading && results.map(r => (
              <button
                key={r.messageId}
                onClick={() => onSelectResult(r)}
                className="w-full text-left px-4 py-3 hover:bg-surface2 transition-colors border-b border-border/50 last:border-0"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] uppercase tracking-widest text-silver truncate max-w-[70%]">{r.conversationTitle}</span>
                  <span className="text-[9px] text-text-dim shrink-0">{new Date(r.timestamp).toLocaleDateString()}</span>
                </div>
                <p className="text-[12px] text-text-mid font-mono leading-relaxed line-clamp-2">{r.snippet}</p>
                <span className={`text-[9px] uppercase tracking-widest mt-1 inline-block ${r.role === 'user' ? 'text-text-dim' : 'text-silver'}`}>{r.role}</span>
              </button>
            ))}
            {!isLoading && query.length < 2 && (
              <div className="py-8 text-center text-[11px] uppercase tracking-widest text-text-dim">Type to search</div>
            )}
          </div>
          <div className="px-4 py-2 border-t border-border flex items-center gap-4">
            <span className="text-[9px] uppercase tracking-widest text-text-dim">⌘K to toggle</span>
            <span className="text-[9px] uppercase tracking-widest text-text-dim">↵ to open</span>
          </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

// ── ImageModal ────────────────────────────────────────────────────────────────

interface ImageModalProps {
  src: string | null;
  onClose: () => void;
}

export const ImageModal: React.FC<ImageModalProps> = ({ src, onClose }) => (
  <AnimatePresence>
    {src && (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-6 cursor-zoom-out"
        >
          <motion.img
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            src={src}
            alt="Full view"
            className="max-w-full max-h-full object-contain border border-border"
            onClick={e => e.stopPropagation()}
          />
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 border border-border text-text-dim hover:text-silver flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
            </svg>
          </button>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);