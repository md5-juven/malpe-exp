import { useCallback, useEffect, useState } from "react";
import type { Friend } from "../types";
import { fetchFriends, addFriend as addFriendToSheet } from "../services/sheets";
import { isSheetsConfigured } from "../config";

export function useFriends() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  const load = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true);
    setError(null);
    try {
      const data = await fetchFriends();
      setFriends(data);
      setIsDemo(!isSheetsConfigured());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load friends");
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
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
      await new Promise((r) => setTimeout(r, 800));
      await load();
    },
    [load]
  );

  return { friends, loading, error, isDemo, reload: load, addFriend };
}
