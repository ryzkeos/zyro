'use client';

import dynamic from 'next/dynamic';

// the app reads localStorage, window and service workers on mount, so it renders client side only
const App = dynamic(() => import('@/App'), { ssr: false });

export default function ClientApp() {
  return <App />;
}
