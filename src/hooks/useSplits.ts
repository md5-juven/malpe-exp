import { useCallback, useEffect, useState } from "react";
import type { ExpenseSplit } from "../types";
import { fetchSplits, saveSplit as saveSplitToSheet } from "../services/sheets";
import { isSheetsConfigured } from "../config";

export function useSplits() {
  const [splits, setSplits] = useState<ExpenseSplit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true);
    setError(null);
    try {
      setSplits(await fetchSplits());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load splits");
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveSplit = useCallback(
    async (expenseName: string, personName: string, amount: number) => {
      setSplits((prev) => {
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
        return [
          ...prev,
          { id: `split-local-${Date.now()}`, expenseName, personName, amount },
        ];
      });

      if (isSheetsConfigured()) {
        await saveSplitToSheet(expenseName, personName, amount);
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
