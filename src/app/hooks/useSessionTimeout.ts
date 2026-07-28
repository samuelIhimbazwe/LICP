import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart'] as const;

export function useSessionTimeout() {
  const { user, logout, isAuthenticated } = useAuth();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const minutes = user?.sessionTimeoutMinutes ?? 30;

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const handleExpire = useCallback(async () => {
    toast.error('Your session expired due to inactivity.');
    await logout();
    window.location.href = '/login';
  }, [logout]);

  const resetTimer = useCallback(() => {
    if (!isAuthenticated || !user?.emailVerified) return;
    clearTimer();
    timeoutRef.current = setTimeout(() => {
      void handleExpire();
    }, minutes * 60 * 1000);
  }, [clearTimer, handleExpire, isAuthenticated, minutes, user?.emailVerified]);

  useEffect(() => {
    if (!isAuthenticated || !user?.emailVerified) {
      clearTimer();
      return;
    }

    resetTimer();
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, resetTimer, { passive: true });
    }

    return () => {
      clearTimer();
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, resetTimer);
      }
    };
  }, [clearTimer, isAuthenticated, resetTimer, user?.emailVerified]);
}
