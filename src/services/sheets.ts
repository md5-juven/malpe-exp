import { SHEETS_CONFIG } from "../config";
import type { Expense, Friend, ExpenseSplit, SubExpense } from "../types";
import { parseParticipantsList, formatParticipantsList, normalizeExpenseDate } from "../utils/calculations";

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

type SheetAction = "expenses" | "friends" | "travellers" | "splits" | "subExpenses";

const FETCH_TIMEOUT_MS = 15000;

async function fetchJson(url: string): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      redirect: "follow",
      headers: { Accept: "application/json,text/plain,*/*" },
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
      throw new Error("Request timed out. Check your Apps Script deployment.");
    }
    if (err instanceof TypeError) {
      throw new Error("Could not reach Google Sheets. Check the script URL / network.");
    }
    throw err;
  } finally {
    window.clearTimeout(timer);
  }
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

function verifyFromFriends(friends: Friend[], name: string, password: string): string {
  const friend = friends.find((f) => f.name.trim().toLowerCase() === name.trim().toLowerCase());
  if (!friend) throw new Error("User not found");
  if (!friend.password) {
    throw new Error("No password set for this user — ask your admin");
  }
  if (friend.password !== password.trim()) {
    throw new Error("Incorrect password");
  }
  return friend.name;
}

export async function fetchExpenses(): Promise<Expense[]> {
  if (!SHEETS_CONFIG.scriptUrl) return DEMO_EXPENSES;
  const rows = await fetchViaScript("expenses");
  return rows
    .slice(1)
    .map((row, i) => parseExpenseRow(row, i))
    .filter((e): e is Expense => e !== null);
}

export async function fetchFriends(): Promise<Friend[]> {
  if (!SHEETS_CONFIG.scriptUrl) return DEMO_FRIENDS;

  let rows: SheetRow[] = [];
  try {
    rows = await fetchViaScript("friends");
  } catch {
    rows = await fetchViaScript("travellers");
  }

  return rows
    .slice(1)
    .map((row, i) => parseFriendRow(row, i))
    .filter((f): f is Friend => f !== null);
}

export async function fetchSplits(): Promise<ExpenseSplit[]> {
  if (!SHEETS_CONFIG.scriptUrl) return [];
  const rows = await fetchViaScript("splits");
  return rows
    .slice(1)
    .map((row, i) => parseSplitRow(row, i))
    .filter((s): s is ExpenseSplit => s !== null);
}

export async function fetchSubExpenses(): Promise<SubExpense[]> {
  if (!SHEETS_CONFIG.scriptUrl) return [];
  const rows = await fetchViaScript("subExpenses");
  return rows
    .slice(1)
    .map((row, i) => parseSubExpenseRow(row, i))
    .filter((s): s is SubExpense => s !== null);
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

  await fetch(SHEETS_CONFIG.scriptUrl, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "addExpense",
      name,
      amount,
      paidBy,
      date,
      participants: formatParticipantsList(participants),
    }),
  });
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

  await fetch(SHEETS_CONFIG.scriptUrl, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "saveSplit", expenseName, personName, amount }),
  });
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

  await fetch(SHEETS_CONFIG.scriptUrl, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "addFriend", name, phone, password }),
  });
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
