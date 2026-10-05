import { useCallback, useEffect, useState } from "react";
import type { SubExpense } from "../types";
import {
  fetchSubExpenses,
  addSubExpense as addSubToSheet,
  deleteSubExpense as deleteSubOnSheet,
} from "../services/sheets";
import { isSheetsConfigured } from "../config";

export function useSubExpenses() {
  const [subExpenses, setSubExpenses] = useState<SubExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true);
    setError(null);
    try {
      setSubExpenses(await fetchSubExpenses());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load line items");
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
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
      await load({ silent: true });
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
      await load({ silent: true });
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
    addSubExpense,
    deleteSubExpense,
    renameParent,
    deleteForParent,
    reload: load,
  };
}
