import type { Expense, Friend, ExpenseSplit, SubExpense } from "../types";

const CACHE_KEY = "tabcheck-sheet-cache-v1";
const CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24; // 24h

export interface SheetCachePayload {
  savedAt: number;
  friends: Friend[];
  expenses: Expense[];
  splits: ExpenseSplit[];
  subExpenses: SubExpense[];
}

export function readSheetCache(): SheetCachePayload | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SheetCachePayload;
    if (!parsed?.savedAt || !Array.isArray(parsed.friends)) return null;
    if (Date.now() - parsed.savedAt > CACHE_MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeSheetCache(
  data: Omit<SheetCachePayload, "savedAt">
): void {
  try {
    const payload: SheetCachePayload = { ...data, savedAt: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Quota / private mode — ignore
  }
}

export function clearSheetCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore
  }
}
