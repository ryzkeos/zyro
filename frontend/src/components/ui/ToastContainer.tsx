// Toast notification component for Zyro AI Chat

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { Toast as ToastType } from '../types';

interface ToastContainerProps {
  toasts: ToastType[];
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts }) => (
  <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[500] flex flex-col items-center gap-2 pointer-events-none">
    <AnimatePresence>
      {toasts.map(t => (
        <motion.div 
          key={t.id} 
          initial={{ opacity: 0, y: 10, scale: 0.95 }} 
          animate={{ opacity: 1, y: 0, scale: 1 }} 
          exit={{ opacity: 0, y: 10, scale: 0.95 }} 
          transition={{ duration: 0.2 }}
          className={`px-4 py-2 text-[11px] uppercase tracking-[0.15em] font-mono border backdrop-blur-sm whitespace-nowrap ${
            t.type === 'success' 
              ? 'bg-bg/90 border-silver/30 text-silver' 
              : t.type === 'error' 
                ? 'bg-bg/90 border-red-500/30 text-red-400' 
                : 'bg-bg/90 border-border text-text-dim'
          }`}
        >
          {t.message}
        </motion.div>
      ))}
    </AnimatePresence>
  </div>
);