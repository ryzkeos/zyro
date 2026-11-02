// Message display components for Zyro AI Chat

import React, { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { motion } from 'motion/react';
import type { Message, PreProps, TdProps } from '../../types';
import { IconCopy, IconRefresh, IconBranch } from './Icons';

const SANITIZE_SCHEMA = { 
  ...defaultSchema, 
  attributes: { 
    ...defaultSchema.attributes, 
    '*': [...(defaultSchema.attributes?.['*'] ?? []), 'className', 'style'] 
  } 
};

interface CodeBlockProps {
  node?: unknown;
  className?: string;
  children?: React.ReactNode;
}

function CodeBlock({ node, className, children, ...props }: CodeBlockProps) {
  const rawCode = String(children);
  const code = rawCode.replace(/\n$/, '');
  const isBlock = !!className || rawCode.endsWith('\n');
  const [copied, setCopied] = useState(false);
  
  if (isBlock) {
    const lang = /language-(\w+)/.exec(className || '')?.[1] || 'text';
    return (
      <div className="code-block-wrap my-0 border border-border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 bg-surface border-b border-border">
          <span className="text-[10px] uppercase tracking-widest text-text-dim">{lang}</span>
          <button 
            onClick={() => { 
              navigator.clipboard.writeText(code); 
              setCopied(true); 
              setTimeout(() => setCopied(false), 2000); 
            }}
            className="text-[10px] uppercase tracking-widest text-text-dim hover:text-silver transition-colors"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}
          onTouchStart={e => e.stopPropagation()} 
          onTouchMove={e => e.stopPropagation()} 
          onTouchEnd={e => e.stopPropagation()}>
          <pre className="p-4 bg-surface2 text-[0.8rem] leading-relaxed font-mono text-text" style={{ minWidth: 'max-content' }}>
            <code>{code}</code>
          </pre>
        </div>
      </div>
    );
  }
  return (
    <code 
      className="mx-0.5 px-2 py-0.5 bg-accent-soft text-silver font-mono text-[0.85em]" 
      style={{ boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone' } as React.CSSProperties} 
      {...props}
    >
      {children}
    </code>
  );
}

interface MessageBubbleProps {
  msg: Message;
  currentUsername: string;
  aiName: string;
  copySuccess: string | null;
  canResume: boolean;
  onCopy: (content: string, id: string) => void;
  onRefresh: (id: string) => void;
  onBranch: (id: string) => void;
  onResume: () => void;
  setViewingImage: (src: string | null) => void;
}

export const MessageBubble = React.memo(({ 
  msg, 
  currentUsername, 
  aiName, 
  copySuccess, 
  canResume,
  onCopy, 
  onRefresh, 
  onBranch, 
  onResume, 
  setViewingImage 
}: MessageBubbleProps) => {
  const renderedMarkdown = useMemo(() => (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw, [rehypeSanitize, SANITIZE_SCHEMA]]}
      components={{ 
        pre: ({ children }: PreProps) => <>{children}</>, 
        code: CodeBlock, 
        td: ({ children, ...tdProps }: TdProps) => { 
          const text = String(children ?? "");
          return <td style={{ whiteSpace: text.length <= 30 ? "nowrap" : "normal" }} {...tdProps}>{children}</td>;
        } 
      }}
    >
      {msg.content.replace(/\\n/g, '\n')}
    </ReactMarkdown>
  ), [msg.content]);

  return (
    <div className={`msg-appear message-row flex flex-col min-w-0 ${msg.role==='user' ? 'items-end' : 'items-start'} group/msg`}>
      <span className={`text-[10px] uppercase tracking-[0.1em] mb-3 ${msg.role==='user' ? 'text-text-dim' : 'text-silver font-bold'}`}>
        {msg.role==='user' ? currentUsername : aiName}
      </span>
      {msg.role === 'user' && msg.image && (
        <div className="mb-2">
          <img 
            src={`data:${msg.imageType || 'image/jpeg'};base64,${msg.image}`} 
            alt="Uploaded"
            className="max-w-[200px] max-h-[200px] object-cover border border-border cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => setViewingImage(`data:${msg.imageType || 'image/jpeg'};base64,${msg.image}`)} 
          />
        </div>
      )}
      <div 
        className={`max-w-full min-w-0 text-[13px] leading-[1.75] overflow-hidden ${msg.role==='user' ? 'text-text-mid text-right' : msg.isError ? 'text-red-400 italic font-mono' : 'text-text font-mono markdown-body'}`} 
        style={{ wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: msg.role === 'user' ? 'pre-wrap' : 'normal' }}
      >
        {msg.role==='assistant' ? renderedMarkdown : msg.content.replace(/\\n/g, '\n')}
      </div>
      {msg.role==='assistant' && (
        <div className="flex items-center gap-4 mt-4 opacity-0 md:group-hover/msg:opacity-100 md:transition-opacity duration-300 max-md:opacity-100">
          {msg.isError ? (
            <div className="flex items-center gap-2">
              <button 
                onClick={() => onRefresh(msg.id)} 
                className="flex items-center gap-2 px-3 py-1.5 border border-red-900/30 text-red-400 text-[10px] uppercase tracking-[0.1em] hover:bg-red-900/10 transition-all"
              >
                <IconRefresh /> Retry
              </button>
              {canResume && (
                <button 
                  onClick={onResume} 
                  className="flex items-center gap-2 px-3 py-1.5 border border-border text-text-dim text-[10px] uppercase tracking-[0.1em] hover:text-silver hover:border-silver transition-all"
                >
                  ↩ Resume
                </button>
              )}
            </div>
          ) : (
            <>
              <button 
                onClick={() => onCopy(msg.content, msg.id)} 
                className={`p-1.5 transition-colors ${copySuccess===msg.id ? 'text-silver' : 'text-text-dim hover:text-silver'}`} 
                title="Copy"
              >
                <IconCopy />
              </button>
              <button 
                onClick={() => onRefresh(msg.id)} 
                className="p-1.5 text-text-dim hover:text-silver transition-colors" 
                title="Regenerate"
              >
                <IconRefresh />
              </button>
              <button 
                onClick={() => onBranch(msg.id)} 
                className="p-1.5 text-text-dim hover:text-silver transition-colors" 
                title="Branch from here"
              >
                <IconBranch />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
});

// Typing indicator
export const TypingIndicator = () => (
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

// Shimmer loading block
export const ShimmerBlock = ({ w = '100%', h = 14 }: { w?: string; h?: number }) => (
  <div 
    className="rounded shimmer-anim"
    style={{ width: w, height: h, background: 'var(--surface2)', position: 'relative', overflow: 'hidden' }} 
  />
);

// Response skeleton
export const ResponseSkeleton = () => (
  <div className="flex flex-col items-start gap-3 w-full max-w-[420px]">
    <ShimmerBlock w="60%" h={10} />
    <ShimmerBlock w="100%" h={10} />
    <ShimmerBlock w="85%" h={10} />
    <ShimmerBlock w="70%" h={10} />
  </div>
);

// Streaming message
interface StreamingMessageProps {
  text: string;
  aiName: string;
  onStop: () => void;
}

export const StreamingMessage = React.memo(({ text, aiName, onStop }: StreamingMessageProps) => (
  <div className="flex flex-col items-start" style={{ contain: 'layout style' }}>
    <span className="text-[10px] uppercase tracking-[0.1em] mb-3 text-silver font-bold">{aiName}</span>
    {text ? <StreamingContent text={text} /> : <TypingIndicator />}
    <div className="flex items-center gap-4 mt-4">
      <button 
        onClick={onStop} 
        className="flex items-center gap-2 px-3 py-1.5 border border-border text-text-dim text-[10px] uppercase tracking-[0.1em] hover:text-silver hover:border-silver transition-all"
      >
        <IconStop /> Stop
      </button>
    </div>
  </div>
));

const StreamingContent = React.memo(({ text }: { text: string }) => (
  <div
    className="text-[13px] leading-[1.75] text-text font-mono"
    style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
  >
    {text}
    <span 
      className="inline-block w-[2px] h-[14px] bg-silver ml-0.5 align-middle" 
      style={{ animation: 'cursor-blink 0.85s step-end infinite' }} 
    />
  </div>
));

const IconStop = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <rect x="4" y="4" width="16" height="16" rx="2" fill="currentColor"/>
  </svg>
);