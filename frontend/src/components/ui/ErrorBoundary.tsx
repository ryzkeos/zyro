import React from 'react';

interface State { hasError: boolean; }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError(): State { return { hasError: true }; }
  render() {
    if (this.state.hasError) return (
      <div className="flex items-center justify-center h-full text-text-dim text-[11px] uppercase tracking-widest font-mono">
        Something went wrong — start a new chat
      </div>
    );
    return this.props.children;
  }
}
