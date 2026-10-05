import type { Friend } from "../types";
import { AUTH_TOKEN_KEY, getAdminUsers } from "../config";

const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
const TOKEN_SECRET = "tabcheck-client-session-v1";

export interface SessionPayload {
  sub: string;
  iat: number;
  exp: number;
}

function key(name: string): string {
  return name.trim().toLowerCase();
}

function toBase64Url(value: string): string {
  return btoa(unescape(encodeURIComponent(value)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return decodeURIComponent(escape(atob(padded + pad)));
}

function sign(input: string): string {
  let hash = 0;
  const data = `${input}.${TOKEN_SECRET}`;
  for (let i = 0; i < data.length; i++) {
    hash = (hash << 5) - hash + data.charCodeAt(i);
    hash |= 0;
  }
  return toBase64Url(String(hash));
}

/** Issue a JWT-like session token after successful username/password login. */
export function issueSessionToken(username: string): string {
  const now = Date.now();
  const payload: SessionPayload = {
    sub: username.trim(),
    iat: now,
    exp: now + TOKEN_TTL_MS,
  };
  const body = toBase64Url(JSON.stringify(payload));
  const header = toBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const signature = sign(`${header}.${body}`);
  return `${header}.${body}.${signature}`;
}

export function parseSessionToken(token: string | null | undefined): SessionPayload | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [header, body, signature] = parts;
  if (sign(`${header}.${body}`) !== signature) return null;

  try {
    const payload = JSON.parse(fromBase64Url(body)) as SessionPayload;
    if (!payload?.sub || typeof payload.exp !== "number") return null;
    if (Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function saveSessionToken(token: string) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function readSessionToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function clearSession() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

export function getSessionUser(): string | null {
  return parseSessionToken(readSessionToken())?.sub ?? null;
}

export function createSession(username: string): string {
  const token = issueSessionToken(username);
  saveSessionToken(token);
  return token;
}

export function isAdminUser(name: string): boolean {
  const admins = getAdminUsers();
  if (admins.length === 0) return true;
  return admins.includes(key(name));
}

export function isAuthenticated(name?: string | null): boolean {
  const session = parseSessionToken(readSessionToken());
  if (!session) return false;
  if (!name) return true;
  return key(session.sub) === key(name);
}

/** Only the person who entered/paid for an expense can edit or delete it. */
export function canModifyExpense(
  userName: string | null | undefined,
  expense: { paidBy: string }
): boolean {
  if (!userName) return false;
  if (!isAuthenticated(userName)) return false;
  return key(userName) === key(expense.paidBy);
}

/** @deprecated Use canModifyExpense - deletes are per-expense, not global admin. */
export function canDeleteExpenses(name: string, _friends?: Friend[]): boolean {
  return isAuthenticated(name);
}

export function resolveSessionUser(friends: Friend[]): string | null {
  const session = parseSessionToken(readSessionToken());
  if (!session) return null;
  const match = friends.find((f) => key(f.name) === key(session.sub));
  return match?.name ?? null;
}
