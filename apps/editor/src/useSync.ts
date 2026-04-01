import { useState, useEffect, useRef, useCallback } from 'react';
import { deriveUserMasterKey, encryptPayload, decryptPayload, hashUserId } from '@parcel/crypto';
import { fetchBlob, saveBlob } from '@parcel/sync';
import type { BundlePayload } from '@parcel/types';
import { toast } from 'sonner';

export interface UserState {
  version: 1;
  bundles: Record<string, BundlePayload>;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

export function useSync() {
  const [masterKey, setMasterKey] = useState<Uint8Array | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [state, setState] = useState<UserState | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const firstLoad = useRef(false);
  const lastSavedState = useRef<string | null>(null);

  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [authError, setAuthError] = useState(false);

  async function login(pw: string) {
    try {
      firstLoad.current = false;
      setAuthError(false);
      const key = await deriveUserMasterKey(pw);
      const uid = await hashUserId(key);
      setMasterKey(key);
      setUserId(uid);
    } catch (e: unknown) {
      toast.error('Login failed: ' + (e instanceof Error ? e.message : String(e)));
    }
  }

  // Load initial data
  useEffect(() => {
    if (!userId || !masterKey) return;
    if (firstLoad.current) return;

    let active = true;
    firstLoad.current = true;
    (async () => {
      try {
        const authKey = localStorage.getItem('parcel_auth_key') || undefined;
        const encryptedBlob = await fetchBlob(API_URL, userId, authKey);
        if (encryptedBlob && active) {
          const decrypted = (await decryptPayload(masterKey, encryptedBlob)) as UserState;
          lastSavedState.current = JSON.stringify(decrypted);
          setState(decrypted);
        } else if (active) {
          // New user
          const initial = { version: 1 as const, bundles: {} };
          lastSavedState.current = JSON.stringify(initial);
          setState(initial);
        }
      } catch (e: unknown) {
        if (active) {
          firstLoad.current = false;
          setMasterKey(null);
          setUserId(null);
          const message = e instanceof Error ? e.message : String(e);
          if (message === 'ERR_UNAUTHORIZED') {
            setAuthError(true);
            toast.error('Invalid API Auth Key');
          } else {
            toast.error('Failed to load data: ' + message);
          }
        }
      }
    })();
    return () => { active = false; };
  }, [userId, masterKey]);

  const forceSync = useCallback(async () => {
    const currentState = stateRef.current;
    if (!currentState || !userId || !masterKey) return;

    const currentStateStr = JSON.stringify(currentState);
    if (currentStateStr === lastSavedState.current) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setIsSyncing(true);
    try {
      const encryptedInfo = await encryptPayload(masterKey, currentState);
      const authKey = localStorage.getItem('parcel_auth_key') || undefined;
      await saveBlob(API_URL, userId, encryptedInfo, authKey);
      lastSavedState.current = currentStateStr;
    } catch (e: unknown) {
      toast.error('Sync error: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsSyncing(false);
    }
  }, [userId, masterKey]);

  // Save data debounced
  useEffect(() => {
    if (!state || !userId || !masterKey) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      forceSync();
    }, 8000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [state, userId, masterKey, forceSync]);

  return { login, state, setState, isSyncing, hasSession: !!masterKey, forceSync, authError };
}
