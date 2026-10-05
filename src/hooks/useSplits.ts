import { useCallback, useEffect, useRef, useState } from "react";
import type { ExpenseSplit } from "../types";
import {
  fetchSplits,
  saveSplit as saveSplitToSheet,
  getCachedBootstrap,
  invalidateBootstrapCache,
} from "../services/sheets";
import { writeSheetCache } from "../services/cache";
import { isSheetsConfigured } from "../config";

function nextSplits(
  prev: ExpenseSplit[],
  expenseName: string,
  personName: string,
  amount: number
): ExpenseSplit[] {
  const idx = prev.findIndex(
    (s) =>
      s.expenseName.toLowerCase() === expenseName.toLowerCase() &&
      s.personName.toLowerCase() === personName.toLowerCase()
  );
  if (amount <= 0) {
    return idx >= 0 ? prev.filter((_, i) => i !== idx) : prev;
  }
  if (idx >= 0) {
    return prev.map((s, i) => (i === idx ? { ...s, amount } : s));
  }
  return [...prev, { id: `split-local-${Date.now()}`, expenseName, personName, amount }];
}

export function useSplits() {
  const hadCacheRef = useRef(Boolean(getCachedBootstrap()));
  const [splits, setSplits] = useState<ExpenseSplit[]>(
    () => getCachedBootstrap()?.splits ?? []
  );
  const [loading, setLoading] = useState(!hadCacheRef.current);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (options?: { silent?: boolean; force?: boolean }) => {
    if (!options?.silent && !hadCacheRef.current) setLoading(true);
    setError(null);
    try {
      if (options?.force) invalidateBootstrapCache();
      setSplits(await fetchSplits());
    } catch {
      // Splits can stay empty; don't block the app
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load({ silent: hadCacheRef.current });
  }, [load]);

  const saveSplit = useCallback(
    async (expenseName: string, personName: string, amount: number) => {
      if (isSheetsConfigured()) {
        await saveSplitToSheet(expenseName, personName, amount);
      }

      setSplits((prev) => {
        const updated = nextSplits(prev, expenseName, personName, amount);
        const cached = getCachedBootstrap();
        if (cached) {
          writeSheetCache({
            friends: cached.friends,
            expenses: cached.expenses,
            splits: updated,
            subExpenses: cached.subExpenses,
          });
        }
        return updated;
      });

      if (isSheetsConfigured()) {
        invalidateBootstrapCache();
      }
    },
    []
  );

  const removeSplitsForExpense = useCallback((expenseName: string) => {
    setSplits((prev) =>
      prev.filter((s) => s.expenseName.toLowerCase() !== expenseName.toLowerCase())
    );
  }, []);

  return { splits, loading, error, saveSplit, removeSplitsForExpense, reload: load };
}
