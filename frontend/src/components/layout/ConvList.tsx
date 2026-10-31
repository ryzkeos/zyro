// Conversation list component for Zyro AI Chat

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { Conversation } from '../types';
import { IconPin, IconEdit, IconTrash, IconMore, IconClose } from '../ui/Icons';

interface ConvListProps {
  mobile?: boolean;
  visibleConvs: Conversation[];
  activeConversationId: string | null;
  mobileOptionsId: string | null;
  selectConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  togglePin: (id: string) => void;
  setRenameId: (id: string | null) => void;
  setRenameValue: (v: string) => void;
  setIsRenameModalOpen: (v: boolean) => void;
  setMobileOptionsId: (id: string | null) => void;
}

export const ConvList = React.memo(({ 
  mobile = false, 
  visibleConvs, 
  activeConversationId, 
  mobileOptionsId, 
  selectConversation, 
  deleteConversation, 
  togglePin, 
  setRenameId, 
  setRenameValue, 
  setIsRenameModalOpen, 
  setMobileOptionsId 
}: ConvListProps) => (
  <div className={`flex-1 overflow-y-auto ${mobile ? 'px-4' : 'px-4 py-6'} space-y-1`}>
    {!mobile && visibleConvs.length > 0 && (
      <div className="px-2 pb-4">
        <span className="text-[10px] uppercase tracking-[0.1em] text-text-dim">History</span>
      </div>
    )}
    {visibleConvs.map(conv => (
      <div 
        key={conv.id} 
        onClick={() => selectConversation(conv.id)}
        className={`group relative w-full flex items-center px-3 py-3 text-[11px] truncate transition-all duration-300 border-l-2 cursor-pointer ${
          activeConversationId === conv.id 
            ? 'border-silver bg-surface text-text' 
            : 'border-transparent text-text-mid hover:text-text hover:bg-surface'
        }`}
      >
        <div className="flex items-center gap-2 flex-1 truncate">
          {conv.pinned && <span className="shrink-0 text-silver"><IconPin /></span>}
          <div className="flex flex-col overflow-hidden">
            <span className="truncate">{conv.title}</span>
            <span className="text-[9px] uppercase tracking-[0.1em] text-text-dim mt-0.5">
              {new Date(conv.lastUpdated).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className={`flex items-center gap-1 shrink-0 ml-2 transition-opacity ${mobile ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          {mobile && (
            <button 
              onClick={(e) => { e.stopPropagation(); setMobileOptionsId(mobileOptionsId === conv.id ? null : conv.id); }} 
              className="p-1 hover:text-silver"
            >
              <IconMore />
            </button>
          )}
          <AnimatePresence>
            {!mobile && (
              <div className="flex items-center gap-1">
                <button 
                  onClick={(e) => { e.stopPropagation(); togglePin(conv.id); }} 
                  className="p-1 hover:text-silver"
                >
                  <IconPin />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setRenameId(conv.id); setRenameValue(conv.title); setIsRenameModalOpen(true); }} 
                  className="p-1 hover:text-silver"
                >
                  <IconEdit />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }} 
                  className="p-1 hover:text-red-500"
                >
                  <IconTrash />
                </button>
              </div>
            )}
            {mobile && mobileOptionsId === conv.id && (
              <motion.div 
                initial={{ opacity: 0, x: 10 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: 10 }}
                className="flex items-center gap-1 bg-surface border border-border p-1 shadow-xl z-[100]" 
                onClick={(e) => e.stopPropagation()}
              >
                <button 
                  onClick={(e) => { e.stopPropagation(); togglePin(conv.id); setMobileOptionsId(null); }} 
                  className="p-1 hover:text-silver"
                >
                  <IconPin />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setRenameId(conv.id); setRenameValue(conv.title); setIsRenameModalOpen(true); setMobileOptionsId(null); }} 
                  className="p-1 hover:text-silver"
                >
                  <IconEdit />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); setMobileOptionsId(null); }} 
                  className="p-1 hover:text-red-500"
                >
                  <IconTrash />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setMobileOptionsId(null); }} 
                  className="p-1 hover:text-text-dim border-l border-border ml-1"
                >
                  <IconClose />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    ))}
  </div>
));