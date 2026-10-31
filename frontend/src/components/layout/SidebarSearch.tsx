// Sidebar search component for Zyro AI Chat

import React from 'react';
import { IconSearch, IconClose } from '../ui/Icons';
import type { User } from '../../types';

interface SidebarSearchProps {
  convFilter: string;
  setConvFilter: (v: string) => void;
  currentUser: User | null;
  onOpenSearch: () => void;
}

export const SidebarSearch = React.memo(({ 
  convFilter, 
  setConvFilter, 
  currentUser, 
  onOpenSearch 
}: SidebarSearchProps) => (
  <div className="px-4 pb-3">
    <div className="flex items-center gap-2 bg-surface border border-border px-3 py-2 focus-within:border-silver transition-colors">
      <IconSearch />
      <input
        type="text"
        value={convFilter}
        onChange={e => setConvFilter(e.target.value)}
        placeholder="Search conversations..."
        className="flex-1 bg-transparent outline-none text-[11px] text-text placeholder:text-text-dim font-mono"
      />
      {convFilter && (
        <button onClick={() => setConvFilter('')} className="text-text-dim hover:text-silver">
          <IconClose />
        </button>
      )}
      {currentUser && (
        <button 
          onClick={onOpenSearch} 
          className="text-text-dim hover:text-silver ml-1 pl-2 border-l border-border" 
          title="Search messages (⌘K)"
        >
          <IconExternalLink />
        </button>
      )}
    </div>
  </div>
));

const IconExternalLink = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
    <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);