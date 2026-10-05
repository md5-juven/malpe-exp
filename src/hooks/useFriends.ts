import { useCallback, useEffect, useRef, useState } from "react";
import type { Friend } from "../types";
import {
  fetchFriends,
  addFriend as addFriendToSheet,
  getCachedBootstrap,
  invalidateBootstrapCache,
  consumeBootstrapCacheFallback,
} from "../services/sheets";
import { isSheetsConfigured } from "../config";

export function useFriends() {
  const hadCache = useRef(Boolean(getCachedBootstrap()));
  const [friends, setFriends] = useState<Friend[]>(
    () => getCachedBootstrap()?.friends ?? []
  );
  const [loading, setLoading] = useState(!hadCache.current);
  const [error, setError] = useState<string | null>(null);
  const [softNotice, setSoftNotice] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const hasDataRef = useRef((getCachedBootstrap()?.friends.length ?? 0) > 0);

  const load = useCallback(async (options?: { silent?: boolean; force?: boolean }) => {
    if (!options?.silent && !hasDataRef.current) setLoading(true);
    setError(null);
    try {
      if (options?.force) invalidateBootstrapCache();
      const data = await fetchFriends();
      setFriends(data);
      hasDataRef.current = data.length > 0;
      setIsDemo(!isSheetsConfigured());
      if (consumeBootstrapCacheFallback()) {
        setSoftNotice("Showing your last saved tab while we reconnect.");
      } else {
        setSoftNotice(null);
      }
    } catch (err) {
      if (!hasDataRef.current) {
        setError(err instanceof Error ? err.message : "Failed to load friends");
      } else {
        setSoftNotice("Couldn't refresh right now. You're on the last saved copy.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load({ silent: hadCache.current });
  }, [load]);

  const addFriend = useCallback(
    async (name: string, phone: string, password = "") => {
      if (!isSheetsConfigured()) {
        setFriends((prev) => [
          ...prev,
          {
            id: `local-${Date.now()}`,
            name,
            phone,
            requiresPassword: Boolean(password),
            password: password || undefined,
          },
        ]);
        return;
      }
      await addFriendToSheet(name, phone, password);
      invalidateBootstrapCache();
      await new Promise((r) => setTimeout(r, 500));
      await load({ silent: true, force: true });
    },
    [load]
  );

  return {
    friends,
    loading,
    error,
    softNotice,
    clearSoftNotice: () => setSoftNotice(null),
    isDemo,
    reload: load,
    addFriend,
  };
}
