import { useCallback, useEffect, useState } from "react";
import type { Expense } from "../types";
import {
  fetchExpenses,
  addExpense as addExpenseToSheet,
  updateExpense as updateExpenseOnSheet,
  deleteExpense as deleteExpenseOnSheet,
} from "../services/sheets";
import { isSheetsConfigured } from "../config";

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  const load = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true);
    setError(null);
    try {
      const data = await fetchExpenses();
      setExpenses(data);
      setIsDemo(!isSheetsConfigured());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load expenses");
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
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
      await load();
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
      await load({ silent: true });
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
      await load({ silent: true });
    },
    [load]
  );

  return { expenses, loading, error, isDemo, reload: load, addExpense, updateExpense, deleteExpense };
}
