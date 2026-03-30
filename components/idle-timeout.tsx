'use client';

import { useEffect, useRef, useCallback } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 dakika
const WARNING_BEFORE_MS = 2 * 60 * 1000; // 2 dakika önceden uyar

const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

export function IdleTimeout() {
  const { status } = useSession();
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningToastIdRef = useRef<string | null>(null);

  const clearTimers = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
  }, []);

  const dismissWarning = useCallback(() => {
    if (warningToastIdRef.current) {
      toast.dismiss(warningToastIdRef.current);
      warningToastIdRef.current = null;
    }
  }, []);

  const resetTimer = useCallback(() => {
    clearTimers();
    dismissWarning();

    warningTimerRef.current = setTimeout(() => {
      const toastId = toast(
        '⚠️ 2 dakika içinde oturumunuz kapanacak. Devam etmek için harekete geçin.',
        { duration: WARNING_BEFORE_MS, icon: '⏰' }
      );
      warningToastIdRef.current = toastId as string;
    }, IDLE_TIMEOUT_MS - WARNING_BEFORE_MS);

    idleTimerRef.current = setTimeout(() => {
      dismissWarning();
      toast.error('Hareketsizlik nedeniyle oturumunuz kapatıldı.');
      signOut({ callbackUrl: '/login' });
    }, IDLE_TIMEOUT_MS);
  }, [clearTimers, dismissWarning]);

  useEffect(() => {
    if (status !== 'authenticated') return;

    resetTimer();

    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, resetTimer, { passive: true }));

    return () => {
      clearTimers();
      dismissWarning();
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [status, resetTimer, clearTimers, dismissWarning]);

  return null;
}
