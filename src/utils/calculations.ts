import type {
  Expense,
  Friend,
  PersonBalance,
  ExpenseSplit,
  PersonDues,
  PayeeSettlement,
  ExpenseOwed,
  ExpenseCollection,
  SubExpense,
  ExpensePersonOwes,
} from "../types";

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Normalize sheet/ISO dates to YYYY-MM-DD for forms & storage. */
export function normalizeExpenseDate(value: string | undefined | null): string {
  if (!value) return "";
  const raw = String(value).trim();
  if (!raw) return "";

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  // Google Sheets sometimes returns "M/D/YYYY"
  const slash = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    const [, m, d, y] = slash;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;

  // Sheets date-only cells serialize as UTC (e.g. 1 Oct IST → 2026-09-30T18:30:00.000Z).
  // Read the calendar day in Asia/Kolkata so the UI matches the sheet.
  if (/T/.test(raw) || /Z$/i.test(raw)) {
    return (
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(parsed)
    );
  }

  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, "0");
  const d = String(parsed.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Human-readable date for expense lists (e.g. "4 Oct 2026"). */
export function formatExpenseDate(value: string | undefined | null): string {
  const iso = normalizeExpenseDate(value);
  if (!iso) return "Recently";
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

export function parseParticipantsList(value: unknown): string[] {
  if (value == null || value === "") return [];
  const str = typeof value === "string" ? value : String(value);
  return str
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function formatParticipantsList(names: string[]): string {
  return names.join(", ");
}

export function getExpenseParticipants(expense: Expense, friends: Friend[]): Friend[] {
  const list = expense.participants;
  if (!list || list.length === 0) return friends;

  const keys = new Set(list.map(normalizeKey));
  const matched = friends.filter((f) => keys.has(normalizeKey(f.name)));
  return matched.length > 0 ? matched : friends;
}

export function getSubExpenseParticipants(sub: SubExpense, friends: Friend[]): Friend[] {
  const list = sub.participants;
  if (!list || list.length === 0) return friends;

  const keys = new Set(list.map(normalizeKey));
  const matched = friends.filter((f) => keys.has(normalizeKey(f.name)));
  return matched.length > 0 ? matched : friends;
}

function nameFromKey(k: string, friends: Friend[], balances: PersonBalance[]): string {
  return (
    friends.find((f) => normalizeKey(f.name) === k)?.name ??
    balances.find((b) => normalizeKey(b.name) === k)?.name ??
    k
  );
}

function phoneFromKey(k: string, friends: Friend[], balances: PersonBalance[]): string {
  return (
    friends.find((f) => normalizeKey(f.name) === k)?.phone ??
    balances.find((b) => normalizeKey(b.name) === k)?.phone ??
    ""
  );
}

function settlementsFromMap(
  amountMap: Map<string, number>,
  friends: Friend[],
  balances: PersonBalance[]
): PayeeSettlement[] {
  return Array.from(amountMap.entries())
    .map(([k, amount]) => ({
      name: nameFromKey(k, friends, balances),
      phone: phoneFromKey(k, friends, balances),
      amount,
    }))
    .filter((p) => p.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}

function netSettlements(
  payees: PayeeSettlement[],
  owedBy: PayeeSettlement[]
): { payees: PayeeSettlement[]; owedBy: PayeeSettlement[] } {
  const payeeMap = new Map(payees.map((p) => [normalizeKey(p.name), p]));
  const owedMap = new Map(owedBy.map((p) => [normalizeKey(p.name), p]));
  const allKeys = new Set([...payeeMap.keys(), ...owedMap.keys()]);

  const netPayees: PayeeSettlement[] = [];
  const netOwedBy: PayeeSettlement[] = [];

  for (const k of allKeys) {
    const payee = payeeMap.get(k);
    const debtor = owedMap.get(k);
    const net = (payee?.amount ?? 0) - (debtor?.amount ?? 0);

    if (net > 0) {
      netPayees.push({
        name: payee?.name ?? debtor?.name ?? k,
        phone: payee?.phone ?? debtor?.phone ?? "",
        amount: net,
      });
    } else if (net < 0) {
      netOwedBy.push({
        name: debtor?.name ?? payee?.name ?? k,
        phone: debtor?.phone ?? payee?.phone ?? "",
        amount: -net,
      });
    }
  }

  netPayees.sort((a, b) => b.amount - a.amount);
  netOwedBy.sort((a, b) => b.amount - a.amount);
  return { payees: netPayees, owedBy: netOwedBy };
}

export function findSplitAmount(
  splits: ExpenseSplit[],
  expenseName: string,
  personName: string
): number | undefined {
  const expenseKey = normalizeKey(expenseName);
  const personKey = normalizeKey(personName);
  return splits.find(
    (s) =>
      normalizeKey(s.expenseName) === expenseKey &&
      normalizeKey(s.personName) === personKey
  )?.amount;
}

/**
 * Net between you and another person from dues.
 * Positive = they owe you. Negative = you owe them. 0 = even.
 */
export function netBalanceWithPerson(
  dues: PersonDues | null | undefined,
  otherName: string
): number {
  if (!dues) return 0;
  const k = normalizeKey(otherName);
  const youOweThem = dues.payees.find((p) => normalizeKey(p.name) === k)?.amount ?? 0;
  const theyOweYou = dues.owedBy.find((p) => normalizeKey(p.name) === k)?.amount ?? 0;
  return theyOweYou - youOweThem;
}

export function getSplitsForExpense(splits: ExpenseSplit[], expenseName: string): ExpenseSplit[] {
  const expenseKey = normalizeKey(expenseName);
  return splits.filter((s) => normalizeKey(s.expenseName) === expenseKey);
}

export function mergeSubExpensesIntoExpenses(
  expenses: Expense[],
  subExpenses: SubExpense[]
): Expense[] {
  const grouped = new Map<string, SubExpense[]>();

  for (const sub of subExpenses) {
    const k = normalizeKey(sub.parentExpenseName);
    const list = grouped.get(k) ?? [];
    list.push(sub);
    grouped.set(k, list);
  }

  return expenses.map((expense) => {
    const subs = grouped.get(normalizeKey(expense.name));
    if (!subs?.length) return expense;
    return {
      ...expense,
      amount: subs.reduce((sum, sub) => sum + sub.amount, 0),
      subExpenses: subs,
      hasSubExpenses: true,
    };
  });
}

export function calculateBalances(
  expenses: Expense[],
  friends: Friend[],
  splits: ExpenseSplit[] = []
): PersonBalance[] {
  const shareMap = new Map<string, number>();
  const paidMap = new Map<string, number>();

  for (const expense of expenses) {
    if (expense.subExpenses?.length) {
      for (const sub of expense.subExpenses) {
        const participants = getSubExpenseParticipants(sub, friends);
        const share = sub.amount / (participants.length || 1);
        for (const participant of participants) {
          const k = normalizeKey(participant.name);
          shareMap.set(k, (shareMap.get(k) ?? 0) + share);
        }
      }
    } else {
      const participants = getExpenseParticipants(expense, friends);
      const share = expense.amount / (participants.length || 1);
      for (const participant of participants) {
        const k = normalizeKey(participant.name);
        shareMap.set(k, (shareMap.get(k) ?? 0) + share);
      }
    }

    const expenseSplits = getSplitsForExpense(splits, expense.name);
    if (expenseSplits.length > 0) {
      for (const split of expenseSplits) {
        const personKey = normalizeKey(split.personName);
        paidMap.set(personKey, (paidMap.get(personKey) ?? 0) + split.amount);
      }
    } else {
      const k = normalizeKey(expense.paidBy);
      paidMap.set(k, (paidMap.get(k) ?? 0) + expense.amount);
    }
  }

  return friends.map((friend) => {
    const k = normalizeKey(friend.name);
    const paid = paidMap.get(k) ?? 0;
    const share = shareMap.get(k) ?? 0;
    return {
      name: friend.name,
      phone: friend.phone,
      paid,
      share,
      balance: paid - share,
    };
  });
}

export function getTotalExpenses(expenses: Expense[]): number {
  return expenses.reduce((sum, e) => sum + e.amount, 0);
}

export function getExpensesPaidBy(personName: string, expenses: Expense[]): Expense[] {
  const k = normalizeKey(personName);
  return expenses.filter((e) => normalizeKey(e.paidBy) === k);
}

export function getTotalPaidBy(personName: string, expenses: Expense[]): number {
  return getExpensesPaidBy(personName, expenses).reduce((sum, e) => sum + e.amount, 0);
}

export function getExpenseOwesBreakdown(
  expense: Expense,
  friends: Friend[],
  splits: ExpenseSplit[]
): ExpensePersonOwes[] {
  const expenseSplits = getSplitsForExpense(splits, expense.name);
  const hasSplits = expenseSplits.length > 0;
  const hasSubs = Boolean(expense.subExpenses?.length);

  if (hasSubs) {
    const shareMap = new Map<string, number>();
    const participantKeys = new Set<string>();

    for (const sub of expense.subExpenses!) {
      const participants = getSubExpenseParticipants(sub, friends);
      const subShare = sub.amount / (participants.length || 1);
      for (const participant of participants) {
        const k = normalizeKey(participant.name);
        participantKeys.add(k);
        shareMap.set(k, (shareMap.get(k) ?? 0) + subShare);
      }
    }

    return friends
      .filter((f) => participantKeys.has(normalizeKey(f.name)))
      .map((friend) => {
        const k = normalizeKey(friend.name);
        const roundedShare = Math.round(shareMap.get(k) ?? 0);
        let paid = 0;
        if (hasSplits) {
          paid = findSplitAmount(splits, expense.name, friend.name) ?? 0;
        } else if (k === normalizeKey(expense.paidBy)) {
          paid = expense.amount;
        }
        return {
          name: friend.name,
          share: roundedShare,
          paid,
          owes: Math.max(0, Math.round(roundedShare - paid)),
        };
      });
  }

  const participants = getExpenseParticipants(expense, friends);
  const roundedShare = Math.round(expense.amount / (participants.length || 1));

  return participants.map((friend) => {
    let paid = 0;
    if (hasSplits) {
      paid = findSplitAmount(splits, expense.name, friend.name) ?? 0;
    } else if (normalizeKey(friend.name) === normalizeKey(expense.paidBy)) {
      paid = expense.amount;
    }
    return {
      name: friend.name,
      share: roundedShare,
      paid,
      owes: Math.max(0, Math.round(roundedShare - paid)),
    };
  });
}

export function calculatePersonDues(
  personName: string,
  expenses: Expense[],
  friends: Friend[],
  splits: ExpenseSplit[],
  balances: PersonBalance[]
): PersonDues | null {
  const personKey = normalizeKey(personName);
  const personBalance = balances.find((b) => normalizeKey(b.name) === personKey);
  if (!personBalance) return null;

  const expenseOwes: ExpenseOwed[] = [];
  const payeeAmounts = new Map<string, number>();
  const breakdownCache = new Map<string, ReturnType<typeof getExpenseOwesBreakdown>>();

  const breakdownFor = (expense: Expense) => {
    let cached = breakdownCache.get(expense.id);
    if (!cached) {
      cached = getExpenseOwesBreakdown(expense, friends, splits);
      breakdownCache.set(expense.id, cached);
    }
    return cached;
  };

  for (const expense of expenses) {
    const breakdown = breakdownFor(expense);
    const person = breakdown.find((p) => normalizeKey(p.name) === personKey);
    if (!person || person.owes <= 0) continue;

    const paidTo = expense.paidBy.trim();
    expenseOwes.push({ expenseName: expense.name, owes: person.owes, paidTo });

    if (normalizeKey(paidTo) !== personKey) {
      const payeeKey = normalizeKey(paidTo);
      payeeAmounts.set(payeeKey, (payeeAmounts.get(payeeKey) ?? 0) + person.owes);
    }
  }

  const payees = settlementsFromMap(payeeAmounts, friends, balances);
  const debtorAmounts = new Map<string, number>();
  const expenseCollections: ExpenseCollection[] = [];

  for (const expense of expenses) {
    if (normalizeKey(expense.paidBy) !== personKey) continue;
    const breakdown = breakdownFor(expense);
    for (const entry of breakdown) {
      if (normalizeKey(entry.name) === personKey || entry.owes <= 0) continue;
      const debtorKey = normalizeKey(entry.name);
      debtorAmounts.set(debtorKey, (debtorAmounts.get(debtorKey) ?? 0) + entry.owes);
      expenseCollections.push({
        expenseName: expense.name,
        debtorName: entry.name,
        amount: entry.owes,
      });
    }
  }

  const owedBy = settlementsFromMap(debtorAmounts, friends, balances);

  if (payees.length === 0 && personBalance.balance < 0) {
    let remaining = Math.round(-personBalance.balance);
    const creditors = balances
      .filter((b) => b.balance > 0 && normalizeKey(b.name) !== personKey)
      .sort((a, b) => b.balance - a.balance);

    for (const creditor of creditors) {
      if (remaining <= 0) break;
      const payAmount = Math.min(Math.round(creditor.balance), remaining);
      payees.push({
        name: creditor.name,
        phone: phoneFromKey(normalizeKey(creditor.name), friends, balances),
        amount: payAmount,
      });
      remaining -= payAmount;
    }
  }

  if (owedBy.length === 0 && personBalance.balance > 0) {
    let remaining = Math.round(personBalance.balance);
    const debtors = balances
      .filter((b) => b.balance < 0 && normalizeKey(b.name) !== personKey)
      .sort((a, b) => a.balance - b.balance);

    for (const debtor of debtors) {
      if (remaining <= 0) break;
      const collectAmount = Math.min(Math.round(-debtor.balance), remaining);
      owedBy.push({
        name: debtor.name,
        phone: phoneFromKey(normalizeKey(debtor.name), friends, balances),
        amount: collectAmount,
      });
      remaining -= collectAmount;
    }
  }

  const netted = netSettlements(payees, owedBy);
  let totalOwes = netted.payees.reduce((sum, p) => sum + p.amount, 0);
  let totalGetsBack = netted.owedBy.reduce((sum, p) => sum + p.amount, 0);

  if (totalOwes === 0 && totalGetsBack === 0) {
    totalOwes = personBalance.balance < 0 ? Math.round(-personBalance.balance) : 0;
    totalGetsBack = personBalance.balance > 0 ? Math.round(personBalance.balance) : 0;
  }

  return {
    name: personName,
    totalOwes,
    totalGetsBack,
    balance: totalGetsBack - totalOwes,
    payees: netted.payees,
    owedBy: netted.owedBy,
    expenseOwes,
    expenseCollections,
  };
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
