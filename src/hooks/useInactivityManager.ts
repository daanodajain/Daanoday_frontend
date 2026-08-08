import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';

const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll', 'wheel', 'mousemove'];

/**
 * Store-admin-configurable inactivity behavior:
 *  - After `inactivityLockMinutes` of no activity -> show lock screen (re-enter password to resume).
 *  - After `sessionTimeoutMinutes` of no activity -> full auto-logout, all local session data cleared.
 *  - If a value is not configured (null) for a store, that behavior is disabled — there is
 *    intentionally no hardcoded fallback duration.
 *  - Any activity while unlocked resets the clock. While locked, activity does NOT count
 *    (a locked screen is not "activity") — only unlocking resets it.
 */
export const useInactivityManager = () => {
  const {
    isAuthenticated,
    isLocked,
    lockSession,
    logout,
    sessionTimeoutMinutes,
    inactivityLockMinutes,
  } = useAuthStore();

  const lastActivityRef = useRef<number>(Date.now());
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleActivity = useCallback(() => {
    if (isLocked) return; // ignore activity while locked; only explicit unlock resumes the clock
    lastActivityRef.current = Date.now();
  }, [isLocked]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!sessionTimeoutMinutes && !inactivityLockMinutes) return; // both disabled — nothing to do

    lastActivityRef.current = Date.now();
    ACTIVITY_EVENTS.forEach((ev) => document.addEventListener(ev, handleActivity, { passive: true }));

    checkIntervalRef.current = setInterval(() => {
      if (isLocked) return; // logout timer keeps running below even while locked

      const idleMs = Date.now() - lastActivityRef.current;

      if (sessionTimeoutMinutes && idleMs >= sessionTimeoutMinutes * 60 * 1000) {
        logout();
        return;
      }
      if (inactivityLockMinutes && idleMs >= inactivityLockMinutes * 60 * 1000) {
        lockSession();
      }
    }, 5000);

    return () => {
      ACTIVITY_EVENTS.forEach((ev) => document.removeEventListener(ev, handleActivity));
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
    };
  }, [isAuthenticated, sessionTimeoutMinutes, inactivityLockMinutes, isLocked, handleActivity, lockSession, logout]);

  // Separate timer that keeps counting toward full logout even while locked,
  // so a locked-but-abandoned session still fully clears after sessionTimeoutMinutes.
  const lockedAtRef = useRef<number | null>(null);
  useEffect(() => {
    if (isLocked) {
      lockedAtRef.current = Date.now();
    } else {
      lockedAtRef.current = null;
    }
  }, [isLocked]);

  useEffect(() => {
    if (!isLocked || !sessionTimeoutMinutes) return;
    const remainingFromLock = sessionTimeoutMinutes * 60 * 1000 - (Date.now() - lastActivityRef.current);
    const t = setTimeout(() => logout(), Math.max(0, remainingFromLock));
    return () => clearTimeout(t);
  }, [isLocked, sessionTimeoutMinutes, logout]);
};

export default useInactivityManager;
