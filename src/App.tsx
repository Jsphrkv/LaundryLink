import React, { useEffect } from 'react';
import AppRouter from './router';
import { useAuthStore } from './store/auth.store';

export default function App() {
  const { initialize } = useAuthStore();

  // Initialize auth state from localStorage on first load
  useEffect(() => {
    initialize();
  }, [initialize]);

  return <AppRouter />;
}
