import React, { useState } from 'react';
import { IconEye, IconEyeOff } from './Icons';

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>;

const BASE = 'w-full bg-surface2 border border-border p-3 pr-10 text-[12px] outline-none focus:border-silver transition-colors font-mono text-text';

export function PasswordInput({ className, ...rest }: Props) {
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <input {...rest} type={shown ? 'text' : 'password'} className={className ?? BASE} />
      <button
        type="button"
        onClick={() => setShown(v => !v)}
        aria-label={shown ? 'Hide password' : 'Show password'}
        aria-pressed={shown}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim hover:text-silver transition-colors"
      >
        {shown ? <IconEyeOff /> : <IconEye />}
      </button>
    </div>
  );
}
