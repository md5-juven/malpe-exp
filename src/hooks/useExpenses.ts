import { useCallback, useEffect, useRef, useState } from "react";
import type { Expense } from "../types";
import {
  fetchExpenses,
  addExpense as addExpenseToSheet,
  updateExpense as updateExpenseOnSheet,
  deleteExpense as deleteExpenseOnSheet,
  getCachedBootstrap,
  invalidateBootstrapCache,
} from "../services/sheets";
import { isSheetsConfigured } from "../config";

export function useExpenses() {
  const hadCache = useRef(Boolean(getCachedBootstrap()));
  const [expenses, setExpenses] = useState<Expense[]>(
    () => getCachedBootstrap()?.expenses ?? []
  );
  const [loading, setLoading] = useState(!hadCache.current);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const hasDataRef = useRef((getCachedBootstrap()?.expenses.length ?? 0) > 0);

  const load = useCallback(async (options?: { silent?: boolean; force?: boolean }) => {
    if (!options?.silent && !hasDataRef.current) setLoading(true);
    setError(null);
    try {
      if (options?.force) invalidateBootstrapCache();
      const data = await fetchExpenses();
      setExpenses(data);
      hasDataRef.current = data.length > 0 || hasDataRef.current;
      setIsDemo(!isSheetsConfigured());
    } catch (err) {
      if (!hasDataRef.current) {
        setError(err instanceof Error ? err.message : "Failed to load expenses");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load({ silent: hadCache.current });
  }, [load]);

  const addExpense = useCallback(
    async (
      name: string,
      amount: number,
      paidBy: string,
      participants: string[] = [],
      date: string = new Date().toISOString().split("T")[0]
    ) => {
      if (!isSheetsConfigured()) {
        setExpenses((prev) => [
          ...prev,
          {
            id: `local-${Date.now()}`,
            rowIndex: prev.length,
            sheetRow: prev.length + 2,
            name,
            amount,
            paidBy,
            date,
            participants: participants.length > 0 ? participants : undefined,
          },
        ]);
        return;
      }
      await addExpenseToSheet(name, amount, paidBy, participants, date);
      invalidateBootstrapCache();
      await load({ silent: true, force: true });
    },
    [load]
  );

  const updateExpense = useCallback(
    async (
      expense: Expense,
      name: string,
      amount: number,
      participants: string[] = [],
      date?: string
    ) => {
      const participantList = participants.length > 0 ? participants : undefined;
      const nextDate = date ?? expense.date;

      if (!isSheetsConfigured()) {
        setExpenses((prev) =>
          prev.map((e) =>
            e.id === expense.id
              ? { ...e, name, amount, participants: participantList, date: nextDate }
              : e
          )
        );
        return;
      }

      await updateExpenseOnSheet(
        expense.sheetRow,
        name,
        amount,
        expense.name,
        participants,
        nextDate
      );
      setExpenses((prev) =>
        prev.map((e) =>
          e.id === expense.id
            ? { ...e, name, amount, participants: participantList, date: nextDate }
            : e
        )
      );
      invalidateBootstrapCache();
      await load({ silent: true, force: true });
    },
    [load]
  );

  const deleteExpense = useCallback(
    async (expense: Expense) => {
      if (!isSheetsConfigured()) {
        setExpenses((prev) => prev.filter((e) => e.id !== expense.id));
        return;
      }
      await deleteExpenseOnSheet(expense.sheetRow);
      setExpenses((prev) => prev.filter((e) => e.id !== expense.id));
      invalidateBootstrapCache();
      await load({ silent: true, force: true });
    },
    [load]
  );

  return {
    expenses,
    loading,
    error,
    isDemo,
    reload: load,
    addExpense,
    updateExpense,
    deleteExpense,
  };
}
