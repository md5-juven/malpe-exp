import { SHEETS_CONFIG } from "../config";
import type { Expense, Friend, ExpenseSplit, SubExpense } from "../types";
import { parseParticipantsList, formatParticipantsList, normalizeExpenseDate } from "../utils/calculations";
import { readSheetCache, writeSheetCache } from "./cache";

const DEMO_FRIENDS: Friend[] = [
  { id: "1", name: "Alex", phone: "+91 98765 43001", requiresPassword: true, password: "tab123" },
  { id: "2", name: "Maya", phone: "+91 98765 43002", requiresPassword: true, password: "tab123" },
  { id: "3", name: "Rohan", phone: "+91 98765 43003", requiresPassword: true, password: "tab123" },
  { id: "4", name: "Priya", phone: "+91 98765 43004", requiresPassword: true, password: "tab123" },
  { id: "5", name: "Kabir", phone: "+91 98765 43005", requiresPassword: true, password: "tab123" },
];

const DEMO_EXPENSES: Expense[] = [
  { id: "exp-0", rowIndex: 0, sheetRow: 2, name: "Airbnb Weekend", amount: 18000, paidBy: "Alex", date: "2026-09-12" },
  { id: "exp-1", rowIndex: 1, sheetRow: 3, name: "Dinner at Olive", amount: 5200, paidBy: "Maya", date: "2026-09-12" },
  { id: "exp-2", rowIndex: 2, sheetRow: 4, name: "Cab rides", amount: 1800, paidBy: "Rohan", date: "2026-09-13" },
  { id: "exp-3", rowIndex: 3, sheetRow: 5, name: "Groceries", amount: 2400, paidBy: "Priya", date: "2026-09-13" },
  { id: "exp-4", rowIndex: 4, sheetRow: 6, name: "Concert tickets", amount: 7500, paidBy: "Kabir", date: "2026-09-14" },
];

type SheetRow = unknown[];

export interface BootstrapData {
  friends: Friend[];
  expenses: Expense[];
  splits: ExpenseSplit[];
  subExpenses: SubExpense[];
}

function cellString(value: unknown): string {
  if (value == null || value === "") return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value).trim();
  if (value instanceof Date) return value.toISOString().split("T")[0];
  return String(value).trim();
}

function parseAmount(value: unknown): number {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  return parseFloat(cellString(value).replace(/[^\d.]/g, ""));
}

function parseExpenseRow(row: SheetRow, index: number): Expense | null {
  const name = cellString(row[0]);
  if (!name) return null;
  const amount = parseAmount(row[1]);
  if (Number.isNaN(amount) || amount <= 0) return null;

  const participants = parseParticipantsList(row[4]);
  return {
    id: `exp-${index}`,
    rowIndex: index,
    sheetRow: index + 2,
    name,
    amount,
    paidBy: cellString(row[2]) || "Unknown",
    date: normalizeExpenseDate(cellString(row[3])) || undefined,
    participants: participants.length > 0 ? participants : undefined,
  };
}

function parseFriendRow(row: SheetRow, index: number): Friend | null {
  const name = cellString(row[0]);
  if (!name) return null;
  const password = cellString(row[2]);
  return {
    id: `friend-${index}`,
    name,
    phone: cellString(row[1]),
    requiresPassword: password.length > 0,
    password: password.length > 0 ? password : undefined,
  };
}

function parseSplitRow(row: SheetRow, index: number): ExpenseSplit | null {
  const expenseName = cellString(row[0]);
  const personName = cellString(row[1]);
  if (!expenseName || !personName) return null;
  const amount = parseAmount(row[2]);
  if (Number.isNaN(amount) || amount < 0) return null;
  return { id: `split-${index}`, expenseName, personName, amount };
}

function parseSubExpenseRow(row: SheetRow, index: number): SubExpense | null {
  const parentExpenseName = cellString(row[0]);
  const name = cellString(row[1]);
  if (!parentExpenseName || !name) return null;
  const amount = parseAmount(row[2]);
  if (Number.isNaN(amount) || amount <= 0) return null;
  const participants = parseParticipantsList(row[3]);
  return {
    id: `sub-${index}`,
    sheetRow: index + 2,
    parentExpenseName,
    name,
    amount,
    participants: participants.length > 0 ? participants : undefined,
  };
}

function mapRows<T>(
  rows: SheetRow[] | undefined,
  parse: (row: SheetRow, index: number) => T | null
): T[] {
  return (rows ?? [])
    .slice(1)
    .map((row, i) => parse(row, i))
    .filter((item): item is T => item !== null);
}

type SheetAction = "expenses" | "friends" | "travellers" | "splits" | "subExpenses" | "bootstrap";

const FETCH_TIMEOUT_MS = 14000;
const MAX_RETRIES = 1;
const MUTATE_TIMEOUT_MS = 18000;

let lastBootstrapUsedCache = false;

/** True when the latest bootstrap served local cache after a network miss. */
export function consumeBootstrapCacheFallback(): boolean {
  const used = lastBootstrapUsedCache;
  lastBootstrapUsedCache = false;
  return used;
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function fetchJsonOnce(url: string, timeoutMs: number): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      redirect: "follow",
      headers: { Accept: "application/json,text/plain,*/*" },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Request failed (${response.status})`);
    }

    const text = await response.text();
    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      throw new Error("Google Script returned an invalid response. Redeploy the web app.");
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("SYNC_TIMEOUT");
    }
    if (err instanceof TypeError) {
      throw new Error("SYNC_NETWORK");
    }
    throw err;
  } finally {
    window.clearTimeout(timer);
  }
}

async function fetchJson(url: string): Promise<Record<string, unknown>> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const timeout = FETCH_TIMEOUT_MS + attempt * 8000;
      return await fetchJsonOnce(url, timeout);
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES) {
        await sleep(600 * (attempt + 1));
      }
    }
  }

  if (lastError instanceof Error) {
    if (lastError.message === "SYNC_TIMEOUT") {
      throw new Error("Taking longer than usual. Retry in a moment.");
    }
    if (lastError.message === "SYNC_NETWORK") {
      throw new Error("Connection hiccup. Retry in a moment.");
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Could not sync");
}

async function fetchViaScript(action: SheetAction): Promise<SheetRow[]> {
  if (!SHEETS_CONFIG.scriptUrl) return [];
  const url = `${SHEETS_CONFIG.scriptUrl}?action=${action}`;
  const data = await fetchJson(url);
  if (data.error) throw new Error(String(data.error));
  return (data.rows as SheetRow[]) ?? [];
}

async function getViaScript(params: Record<string, string>): Promise<Record<string, unknown>> {
  if (!SHEETS_CONFIG.scriptUrl) throw new Error("Google Script URL not configured.");
  const url = `${SHEETS_CONFIG.scriptUrl}?${new URLSearchParams(params)}`;
  const data = await fetchJson(url);
  if (data.error) throw new Error(String(data.error));
  return data;
}

/** Fire-and-forget POST — works with older Apps Script deployments; no-cors avoids hanging the UI. */
function postScriptBeacon(payload: Record<string, unknown>): void {
  if (!SHEETS_CONFIG.scriptUrl) return;
  try {
    void fetch(SHEETS_CONFIG.scriptUrl, {
      method: "POST",
      mode: "no-cors",
      keepalive: true,
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });
  } catch {
    // ignore
  }
}

/**
 * Write helper that never blocks the UI on cold Apps Script.
 * Sends a POST beacon immediately, then optionally confirms via GET in the background.
 */
async function mutateViaScript(
  params: Record<string, string>,
  postBody: Record<string, unknown>
): Promise<void> {
  if (!SHEETS_CONFIG.scriptUrl) throw new Error("Google Script URL not configured.");

  // Immediate delivery path (works with existing doPost saveSplit / addExpense / addFriend)
  postScriptBeacon(postBody);

  // Background confirm via GET when the newer deployment supports it — do not await
  const url = `${SHEETS_CONFIG.scriptUrl}?${new URLSearchParams(params)}`;
  void fetchJsonOnce(url, MUTATE_TIMEOUT_MS).catch(() => {
    // Ignore — beacon already sent
  });
}

function verifyFromFriends(friends: Friend[], name: string, password: string): string {
  const friend = friends.find((f) => f.name.trim().toLowerCase() === name.trim().toLowerCase());
  if (!friend) throw new Error("User not found");
  if (!friend.password) {
    throw new Error("No password set for this user. Ask your admin");
  }
  if (friend.password !== password.trim()) {
    throw new Error("Incorrect password");
  }
  return friend.name;
}

function parseBootstrapPayload(data: Record<string, unknown>): BootstrapData {
  return {
    friends: mapRows(data.friends as SheetRow[] | undefined, parseFriendRow),
    expenses: mapRows(data.expenses as SheetRow[] | undefined, parseExpenseRow),
    splits: mapRows(data.splits as SheetRow[] | undefined, parseSplitRow),
    subExpenses: mapRows(data.subExpenses as SheetRow[] | undefined, parseSubExpenseRow),
  };
}

let bootstrapInflight: Promise<BootstrapData> | null = null;

/** One round-trip for all sheet tabs — shared across hooks. */
export async function fetchBootstrap(options?: { force?: boolean }): Promise<BootstrapData> {
  if (!SHEETS_CONFIG.scriptUrl) {
    return {
      friends: DEMO_FRIENDS,
      expenses: DEMO_EXPENSES,
      splits: [],
      subExpenses: [],
    };
  }

  if (!options?.force && bootstrapInflight) {
    return bootstrapInflight;
  }

  bootstrapInflight = (async () => {
    lastBootstrapUsedCache = false;

    const loadLegacy = async (): Promise<BootstrapData> => {
      const [friends, expenses, splits, subExpenses] = await Promise.all([
        fetchFriendsLegacy(),
        fetchExpensesLegacy(),
        fetchSplitsLegacy(),
        fetchSubExpensesLegacy(),
      ]);
      const parsed = { friends, expenses, splits, subExpenses };
      writeSheetCache(parsed);
      return parsed;
    };

    const fromCacheOrThrow = (err: unknown): BootstrapData => {
      const cached = readSheetCache();
      if (cached) {
        lastBootstrapUsedCache = true;
        return {
          friends: cached.friends,
          expenses: cached.expenses,
          splits: cached.splits,
          subExpenses: cached.subExpenses,
        };
      }
      throw err instanceof Error ? err : new Error("Could not sync");
    };

    const isBootstrapUnsupported = (err: unknown) => {
      if (!(err instanceof Error)) return false;
      const msg = err.message.toLowerCase();
      return (
        err.message === "BOOTSTRAP_UNSUPPORTED" ||
        msg.includes("invalid action") ||
        msg.includes("unknown action")
      );
    };

    try {
      const url = `${SHEETS_CONFIG.scriptUrl}?action=bootstrap`;
      const data = await fetchJson(url);

      // Older deployments reply with { error: "Invalid action" } for bootstrap
      if (data.error) {
        const errMsg = String(data.error);
        if (/invalid action|unknown action/i.test(errMsg)) {
          try {
            return await loadLegacy();
          } catch (legacyErr) {
            return fromCacheOrThrow(legacyErr);
          }
        }
        throw new Error(errMsg);
      }

      if (!("friends" in data) && !("expenses" in data)) {
        try {
          return await loadLegacy();
        } catch (legacyErr) {
          return fromCacheOrThrow(legacyErr);
        }
      }

      const parsed = parseBootstrapPayload(data);
      writeSheetCache(parsed);
      return parsed;
    } catch (err) {
      if (isBootstrapUnsupported(err)) {
        try {
          return await loadLegacy();
        } catch (legacyErr) {
          return fromCacheOrThrow(legacyErr);
        }
      }
      return fromCacheOrThrow(err);
    } finally {
      window.setTimeout(() => {
        bootstrapInflight = null;
      }, 1200);
    }
  })();

  return bootstrapInflight;
}

export function getCachedBootstrap(): BootstrapData | null {
  const cached = readSheetCache();
  if (!cached) return null;
  return {
    friends: cached.friends,
    expenses: cached.expenses,
    splits: cached.splits,
    subExpenses: cached.subExpenses,
  };
}

async function fetchExpensesLegacy(): Promise<Expense[]> {
  const rows = await fetchViaScript("expenses");
  return mapRows(rows, parseExpenseRow);
}

async function fetchFriendsLegacy(): Promise<Friend[]> {
  let rows: SheetRow[] = [];
  try {
    rows = await fetchViaScript("friends");
  } catch {
    rows = await fetchViaScript("travellers");
  }
  return mapRows(rows, parseFriendRow);
}

async function fetchSplitsLegacy(): Promise<ExpenseSplit[]> {
  const rows = await fetchViaScript("splits");
  return mapRows(rows, parseSplitRow);
}

async function fetchSubExpensesLegacy(): Promise<SubExpense[]> {
  const rows = await fetchViaScript("subExpenses");
  return mapRows(rows, parseSubExpenseRow);
}

export async function fetchExpenses(): Promise<Expense[]> {
  if (!SHEETS_CONFIG.scriptUrl) return DEMO_EXPENSES;
  const boot = await fetchBootstrap();
  return boot.expenses;
}

export async function fetchFriends(): Promise<Friend[]> {
  if (!SHEETS_CONFIG.scriptUrl) return DEMO_FRIENDS;
  const boot = await fetchBootstrap();
  return boot.friends;
}

export async function fetchSplits(): Promise<ExpenseSplit[]> {
  if (!SHEETS_CONFIG.scriptUrl) return [];
  const boot = await fetchBootstrap();
  return boot.splits;
}

export async function fetchSubExpenses(): Promise<SubExpense[]> {
  if (!SHEETS_CONFIG.scriptUrl) return [];
  const boot = await fetchBootstrap();
  return boot.subExpenses;
}

/** Drop shared inflight so the next load hits the network. */
export function invalidateBootstrapCache(): void {
  bootstrapInflight = null;
}

export async function addExpense(
  name: string,
  amount: number,
  paidBy: string,
  participants: string[] = [],
  date: string = new Date().toISOString().split("T")[0]
): Promise<void> {
  if (!SHEETS_CONFIG.scriptUrl) {
    throw new Error("Google Script URL not configured.");
  }

  const participantsList = formatParticipantsList(participants);
  await mutateViaScript(
    {
      action: "addExpense",
      name,
      amount: String(amount),
      paidBy,
      date,
      participants: participantsList,
    },
    {
      action: "addExpense",
      name,
      amount,
      paidBy,
      date,
      participants: participantsList,
    }
  );
}

export async function updateExpense(
  sheetRow: number,
  name: string,
  amount: number,
  oldName?: string,
  participants: string[] = [],
  date?: string
): Promise<void> {
  if (!SHEETS_CONFIG.scriptUrl) throw new Error("Google Script URL not configured.");

  const params: Record<string, string> = {
    action: "updateExpense",
    sheetRow: String(sheetRow),
    name,
    amount: String(amount),
    participants: formatParticipantsList(participants),
  };
  if (oldName) params.oldName = oldName;
  if (date) params.date = date;
  await getViaScript(params);
}

export async function deleteExpense(sheetRow: number): Promise<void> {
  if (!SHEETS_CONFIG.scriptUrl) throw new Error("Google Script URL not configured.");
  await getViaScript({ action: "deleteExpense", sheetRow: String(sheetRow) });
}

export async function saveSplit(
  expenseName: string,
  personName: string,
  amount: number
): Promise<void> {
  if (!SHEETS_CONFIG.scriptUrl) throw new Error("Google Script URL not configured.");

  await mutateViaScript(
    {
      action: "saveSplit",
      expenseName,
      personName,
      amount: String(amount),
    },
    { action: "saveSplit", expenseName, personName, amount }
  );
}

export async function addSubExpense(
  parentExpenseName: string,
  name: string,
  amount: number,
  participants: string[] = []
): Promise<void> {
  if (!SHEETS_CONFIG.scriptUrl) throw new Error("Google Script URL not configured.");
  await getViaScript({
    action: "addSubExpense",
    parentExpenseName,
    name,
    amount: String(amount),
    participants: formatParticipantsList(participants),
  });
}

export async function deleteSubExpense(sheetRow: number): Promise<void> {
  if (!SHEETS_CONFIG.scriptUrl) throw new Error("Google Script URL not configured.");
  await getViaScript({ action: "deleteSubExpense", sheetRow: String(sheetRow) });
}

export async function addFriend(name: string, phone: string, password = ""): Promise<void> {
  if (!SHEETS_CONFIG.scriptUrl) throw new Error("Google Script URL not configured.");

  await mutateViaScript(
    { action: "addFriend", name, phone, password },
    { action: "addFriend", name, phone, password }
  );
}

export async function verifyUserPassword(
  name: string,
  password: string,
  friends?: Friend[]
): Promise<string> {
  if (!password.trim()) {
    throw new Error("Password is required");
  }

  if (!SHEETS_CONFIG.scriptUrl) {
    try {
      return verifyFromFriends(DEMO_FRIENDS, name, password);
    } catch (err) {
      if (err instanceof Error && err.message === "User not found") {
        throw new Error(
          "Sheets isn’t connected on this build. Add VITE_GOOGLE_SCRIPT_URL in GitHub Secrets and redeploy."
        );
      }
      throw err;
    }
  }

  try {
    await getViaScript({ action: "verifyUser", name, password });
    const match = friends?.find((f) => f.name.trim().toLowerCase() === name.trim().toLowerCase());
    return match?.name ?? name.trim();
  } catch (err) {
    if (friends?.length) {
      return verifyFromFriends(friends, name, password);
    }
    throw err;
  }
}
