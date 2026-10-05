import { useCallback, useEffect, useRef, useState } from "react";
import type { SubExpense } from "../types";
import {
  fetchSubExpenses,
  addSubExpense as addSubToSheet,
  deleteSubExpense as deleteSubOnSheet,
  getCachedBootstrap,
  invalidateBootstrapCache,
} from "../services/sheets";
import { isSheetsConfigured } from "../config";

export function useSubExpenses() {
  const hadCacheRef = useRef(Boolean(getCachedBootstrap()));
  const [subExpenses, setSubExpenses] = useState<SubExpense[]>(
    () => getCachedBootstrap()?.subExpenses ?? []
  );
  const [loading, setLoading] = useState(!hadCacheRef.current);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (options?: { silent?: boolean; force?: boolean }) => {
    if (!options?.silent && !hadCacheRef.current) setLoading(true);
    setError(null);
    try {
      if (options?.force) invalidateBootstrapCache();
      setSubExpenses(await fetchSubExpenses());
    } catch {
      // Non-blocking
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load({ silent: hadCacheRef.current });
  }, [load]);

  const addSubExpense = useCallback(
    async (
      parentExpenseName: string,
      name: string,
      amount: number,
      participants: string[] = []
    ) => {
      if (!isSheetsConfigured()) {
        setSubExpenses((prev) => [
          ...prev,
          {
            id: `sub-local-${Date.now()}`,
            sheetRow: prev.length + 2,
            parentExpenseName,
            name,
            amount,
            participants: participants.length > 0 ? participants : undefined,
          },
        ]);
        return;
      }
      await addSubToSheet(parentExpenseName, name, amount, participants);
      invalidateBootstrapCache();
      await load({ silent: true, force: true });
    },
    [load]
  );

  const deleteSubExpense = useCallback(
    async (sub: SubExpense) => {
      if (!isSheetsConfigured()) {
        setSubExpenses((prev) => prev.filter((s) => s.id !== sub.id));
        return;
      }
      await deleteSubOnSheet(sub.sheetRow);
      invalidateBootstrapCache();
      await load({ silent: true, force: true });
    },
    [load]
  );

  const renameParent = useCallback((oldName: string, newName: string) => {
    setSubExpenses((prev) =>
      prev.map((s) =>
        s.parentExpenseName.toLowerCase() === oldName.toLowerCase()
          ? { ...s, parentExpenseName: newName }
          : s
      )
    );
  }, []);

  const deleteForParent = useCallback((parentName: string) => {
    setSubExpenses((prev) =>
      prev.filter((s) => s.parentExpenseName.toLowerCase() !== parentName.toLowerCase())
    );
  }, []);

  return {
    subExpenses,
    loading,
    error,
    reload: load,
    addSubExpense,
    deleteSubExpense,
    renameParent,
    deleteForParent,
  };
}
