import type { TabId } from "../types";

export interface AppLocation {
  tab: TabId;
  focusExpenseId: string | null;
  account: boolean;
}

const TAB_TO_PATH: Record<TabId, string> = {
  home: "home",
  expenses: "tabs",
  settle: "settle",
  friends: "crew",
};

const PATH_TO_TAB: Record<string, TabId> = {
  home: "home",
  tabs: "expenses",
  expenses: "expenses",
  settle: "settle",
  crew: "friends",
  friends: "friends",
};

export function parseAppLocation(hash = window.location.hash): AppLocation {
  const raw = hash.replace(/^#\/?/, "").trim();
  if (!raw) {
    return { tab: "home", focusExpenseId: null, account: false };
  }

  const [pathPart, queryPart = ""] = raw.split("?");
  const path = pathPart.replace(/\/+$/, "").toLowerCase() || "home";
  const params = new URLSearchParams(queryPart);

  return {
    tab: PATH_TO_TAB[path] ?? "home",
    focusExpenseId: params.get("focus") || params.get("e") || null,
    account: params.get("account") === "1",
  };
}

export function buildAppHash(loc: AppLocation): string {
  const path = TAB_TO_PATH[loc.tab] ?? "home";
  const params = new URLSearchParams();
  if (loc.focusExpenseId) params.set("focus", loc.focusExpenseId);
  if (loc.account) params.set("account", "1");
  const qs = params.toString();
  return qs ? `#/${path}?${qs}` : `#/${path}`;
}

export function locationsEqual(a: AppLocation, b: AppLocation): boolean {
  return (
    a.tab === b.tab &&
    a.focusExpenseId === b.focusExpenseId &&
    a.account === b.account
  );
}
