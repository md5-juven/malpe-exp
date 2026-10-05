import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, Plus, Trash2, ChevronDown, Users, LayoutDashboard } from "lucide-react";
import type { Expense, Friend, ExpenseSplit, SubExpense } from "../types";
import {
  formatCurrency,
  formatExpenseDate,
  getExpenseOwesBreakdown,
  getExpenseParticipants,
  normalizeExpenseDate,
} from "../utils/calculations";
import { getExpenseVisual } from "../utils/expenseVisual";
import { Button } from "./ui/Button";
import { Field, Input, Select } from "./ui/Field";
import { DateField, todayISO } from "./ui/DateField";
import { Modal } from "./ui/Modal";
import { useAlert } from "./ui/AlertProvider";
import { canModifyExpense } from "../utils/auth";

interface ExpensesViewProps {
  expenses: Expense[];
  friends: Friend[];
  splits: ExpenseSplit[];
  currentUser: string;
  openAdd?: boolean;
  onOpenAddConsumed?: () => void;
  onAdd: (
    name: string,
    amount: number,
    paidBy: string,
    participants: string[],
    date: string
  ) => Promise<void>;
  onUpdate: (
    expense: Expense,
    name: string,
    amount: number,
    participants: string[],
    date: string
  ) => Promise<void>;
  onDelete: (expense: Expense) => Promise<void>;
  onAddSub: (
    parentName: string,
    name: string,
    amount: number,
    participants: string[]
  ) => Promise<void>;
  onDeleteSub: (sub: SubExpense) => Promise<void>;
  onViewSplit: (expense: Expense) => void;
}

export function ExpensesView({
  expenses,
  friends,
  splits,
  currentUser,
  openAdd,
  onOpenAddConsumed,
  onAdd,
  onUpdate,
  onDelete,
  onAddSub,
  onDeleteSub,
  onViewSplit,
}: ExpensesViewProps) {
  const { confirm } = useAlert();
  const [filter, setFilter] = useState<"all" | "mine">("all");
  const [personFilter, setPersonFilter] = useState<string>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (openAdd) {
      setShowAdd(true);
      onOpenAddConsumed?.();
    }
  }, [openAdd, onOpenAddConsumed]);

  useEffect(() => {
    if (filter === "mine") setPersonFilter("all");
  }, [filter]);

  const friendNames = friends.map((f) => f.name);

  const payerOptions = useMemo(() => {
    const names = new Set<string>();
    for (const f of friends) names.add(f.name);
    for (const e of expenses) {
      if (e.paidBy.trim()) names.add(e.paidBy.trim());
    }
    return Array.from(names).sort((a, b) => {
      if (a.toLowerCase() === currentUser.toLowerCase()) return -1;
      if (b.toLowerCase() === currentUser.toLowerCase()) return 1;
      return a.localeCompare(b);
    });
  }, [friends, expenses, currentUser]);

  const filtered = useMemo(() => {
    if (filter === "mine") {
      return expenses.filter((e) => e.paidBy.toLowerCase() === currentUser.toLowerCase());
    }
    if (personFilter !== "all") {
      return expenses.filter((e) => e.paidBy.toLowerCase() === personFilter.toLowerCase());
    }
    return expenses;
  }, [expenses, filter, currentUser, personFilter]);

  const total = filtered.reduce((s, e) => s + e.amount, 0);

  const headerLabel =
    filter === "mine"
      ? "Your tabs"
      : personFilter !== "all"
        ? personFilter.toLowerCase() === currentUser.toLowerCase()
          ? "Paid by you"
          : `Paid by ${personFilter}`
        : "All tabs";

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted">{headerLabel}</p>
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-pearl">
            {formatCurrency(total)}
          </h2>
        </div>
        <Button size="icon" onClick={() => setShowAdd(true)} aria-label="Add expense">
          <Plus size={22} />
        </Button>
      </div>

      <div className="space-y-2.5">
        <div className="flex gap-2 rounded-2xl border border-border bg-surface/50 p-1">
          {(["all", "mine"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`relative flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${
                filter === f ? "text-ink" : "text-muted hover:text-pearl"
              }`}
            >
              {filter === f ? (
                <motion.span
                  layoutId="expense-filter"
                  className="absolute inset-0 rounded-xl bg-gold"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              ) : null}
              <span className="relative z-10">{f === "all" ? "Everyone" : "Mine"}</span>
            </button>
          ))}
        </div>

        <AnimatePresence initial={false}>
          {filter === "all" ? (
            <motion.div
              key="person-filter"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div
                className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                role="listbox"
                aria-label="Filter by who paid"
              >
                <button
                  type="button"
                  role="option"
                  aria-selected={personFilter === "all"}
                  onClick={() => setPersonFilter("all")}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    personFilter === "all"
                      ? "bg-pearl/12 text-pearl ring-1 ring-pearl/20"
                      : "text-muted hover:bg-surface-2 hover:text-pearl"
                  }`}
                >
                  All
                </button>
                {payerOptions.map((name) => {
                  const active = personFilter.toLowerCase() === name.toLowerCase();
                  const label =
                    name.toLowerCase() === currentUser.toLowerCase() ? "You" : name;
                  return (
                    <button
                      key={name}
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => setPersonFilter(name)}
                      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        active
                          ? "bg-gold/15 text-gold ring-1 ring-gold/35"
                          : "text-muted hover:bg-surface-2 hover:text-pearl"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <p className="rounded-2xl border border-border/60 bg-surface/40 px-4 py-8 text-center text-sm text-muted">
            {filter === "mine"
              ? "No tabs you’ve paid for yet."
              : personFilter !== "all"
                ? `No tabs paid by ${
                    personFilter.toLowerCase() === currentUser.toLowerCase()
                      ? "you"
                      : personFilter
                  }.`
                : "No tabs yet."}
          </p>
        ) : null}
        <AnimatePresence mode="popLayout">
          {filtered.map((expense, i) => {
            const open = expanded === expense.id;
            const breakdown = getExpenseOwesBreakdown(expense, friends, splits);
            const visual = getExpenseVisual(expense.name);
            const Icon = visual.Icon;
            const people = getExpenseParticipants(expense, friends).length;
            const isOwner = canModifyExpense(currentUser, expense);
            const youRow = breakdown.find(
              (r) => r.name.toLowerCase() === currentUser.toLowerCase()
            );
            const youOwe = youRow?.owes ?? 0;
            const isPayer =
              expense.paidBy.toLowerCase() === currentUser.toLowerCase();
            const showPayCta = youOwe > 0 && !isPayer;

            return (
              <motion.article
                key={expense.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ delay: Math.min(i * 0.03, 0.2) }}
                className="overflow-hidden rounded-[1.5rem] border border-border bg-surface/80 shadow-[0_12px_32px_rgb(0_0_0/0.2)]"
              >
                <div className="p-3 pb-2">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-start gap-3 text-left"
                      onClick={() => setExpanded(open ? null : expense.id)}
                    >
                      <span
                        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${visual.gradient}`}
                      >
                        <Icon size={24} className={visual.accent} strokeWidth={1.75} />
                      </span>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="truncate font-display text-base font-bold text-pearl">
                            {expense.name}
                          </h3>
                          <span className="shrink-0 font-display text-base font-bold text-gold">
                            {formatCurrency(expense.amount)}
                          </span>
                        </div>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted">
                          <span>{formatExpenseDate(expense.date)}</span>
                          <span>·</span>
                          <Users size={11} />
                          <span>{people}</span>
                          <span>·</span>
                          <span>{isPayer ? "You paid" : expense.paidBy}</span>
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setExpanded(open ? null : expense.id)}
                      className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted transition hover:bg-surface-2 hover:text-pearl"
                      aria-label={open ? "Collapse tab" : "Expand tab"}
                    >
                      <ChevronDown
                        size={18}
                        className={`transition ${open ? "rotate-180" : ""}`}
                      />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => onViewSplit(expense)}
                    className={`mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border px-3 py-2.5 text-sm font-semibold transition ${
                      showPayCta
                        ? "border-gold/35 bg-gold/10 text-gold hover:border-gold/50 hover:bg-gold/15"
                        : "border-border bg-surface-2/60 text-pearl/90 hover:border-border-strong hover:bg-surface-2 hover:text-pearl"
                    }`}
                  >
                    <LayoutDashboard size={15} strokeWidth={2.25} />
                    {showPayCta ? `Pay ${formatCurrency(youOwe)}` : "View split"}
                  </button>
                </div>

                <AnimatePresence>
                  {open ? (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-border"
                    >
                      <div className="space-y-3 px-4 py-3">
                        {expense.subExpenses?.length ? (
                          <div className="space-y-2">
                            <p className="text-[10px] uppercase tracking-[0.14em] text-muted">
                              Line items
                            </p>
                            {expense.subExpenses.map((sub) => (
                              <div
                                key={sub.id}
                                className="flex items-center justify-between gap-2 rounded-xl bg-ink-soft px-3 py-2"
                              >
                                <div>
                                  <p className="text-sm text-pearl">{sub.name}</p>
                                  <p className="text-[11px] text-muted">
                                    {(sub.participants?.length
                                      ? sub.participants
                                      : getExpenseParticipants(expense, friends).map((f) => f.name)
                                    ).join(", ")}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-gold">
                                    {formatCurrency(sub.amount)}
                                  </span>
                                  {isOwner ? (
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        const ok = await confirm({
                                          title: "Delete line item?",
                                          message: `"${sub.name}" will be removed from this tab.`,
                                          confirmLabel: "Delete",
                                          cancelLabel: "Keep",
                                          tone: "danger",
                                        });
                                        if (!ok) return;
                                        await onDeleteSub(sub);
                                      }}
                                      className="rounded-lg p-1.5 text-muted hover:bg-rose/15 hover:text-rose"
                                      aria-label="Delete line item"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : null}

                        <div className="space-y-1.5">
                          <p className="text-[10px] uppercase tracking-[0.14em] text-muted">
                            Who owes
                          </p>
                          {breakdown.map((row) => (
                            <div
                              key={row.name}
                              className="flex items-center justify-between text-sm"
                            >
                              <span className="text-pearl/80">{row.name}</span>
                              <span className={row.owes > 0 ? "text-rose" : "text-mint"}>
                                {row.owes > 0
                                  ? `owes ${formatCurrency(row.owes)}`
                                  : "settled"}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="flex gap-2 pt-1">
                          {isOwner ? (
                            <>
                              <Button
                                variant="secondary"
                                size="sm"
                                className="flex-1"
                                onClick={() => setEditing(expense)}
                              >
                                <Pencil size={14} />
                                Edit
                              </Button>
                              <AddSubInline
                                friends={friendNames}
                                onAdd={(name, amount, participants) =>
                                  onAddSub(expense.name, name, amount, participants)
                                }
                              />
                            </>
                          ) : (
                            <p className="w-full rounded-xl bg-surface-2/80 px-3 py-2 text-center text-xs text-muted">
                              Only {expense.paidBy} can edit this tab
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </motion.article>
            );
          })}
        </AnimatePresence>
      </div>

      <ExpenseFormModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="New tab"
        friends={friendNames}
        defaultPaidBy={currentUser}
        lockPaidBy
        onSubmit={async (name, amount, paidBy, participants, date) => {
          await onAdd(name, amount, paidBy, participants, date);
          setShowAdd(false);
        }}
      />

      {editing && canModifyExpense(currentUser, editing) ? (
        <ExpenseFormModal
          key={editing.id}
          open
          onClose={() => setEditing(null)}
          title="Edit tab"
          friends={friendNames}
          initial={{
            name: editing.name,
            amount: editing.hasSubExpenses ? undefined : editing.amount,
            paidBy: editing.paidBy,
            participants: editing.participants ?? friendNames,
            date: normalizeExpenseDate(editing.date) || todayISO(),
          }}
          lockAmount={editing.hasSubExpenses}
          canDelete
          onDelete={async () => {
            await onDelete(editing);
            setEditing(null);
          }}
          onSubmit={async (name, amount, _paidBy, participants, date) => {
            await onUpdate(editing, name, amount, participants, date);
            setEditing(null);
          }}
        />
      ) : null}
    </div>
  );
}

function AddSubInline({
  friends,
  onAdd,
}: {
  friends: string[];
  onAdd: (name: string, amount: number, participants: string[]) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) {
    return (
      <Button variant="mint" size="sm" className="flex-1" onClick={() => setOpen(true)}>
        <Plus size={14} />
        Line item
      </Button>
    );
  }

  return (
    <form
      className="flex w-full flex-col gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
          await onAdd(name.trim(), Number(amount), friends);
          setName("");
          setAmount("");
          setOpen(false);
        } finally {
          setLoading(false);
        }
      }}
    >
      <Input
        placeholder="Item name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <Input
        type="number"
        min="1"
        step="1"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
      />
      <div className="flex gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button type="submit" size="sm" loading={loading}>
          Add
        </Button>
      </div>
    </form>
  );
}

interface ExpenseFormModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  friends: string[];
  defaultPaidBy?: string;
  initial?: {
    name: string;
    amount?: number;
    paidBy: string;
    participants: string[];
    date?: string;
  };
  lockAmount?: boolean;
  /** When true, expense is always attributed to defaultPaidBy (the signed-in user). */
  lockPaidBy?: boolean;
  canDelete?: boolean;
  onDelete?: () => Promise<void>;
  onSubmit: (
    name: string,
    amount: number,
    paidBy: string,
    participants: string[],
    date: string
  ) => Promise<void>;
}

function ExpenseFormModal({
  open,
  onClose,
  title,
  friends,
  defaultPaidBy,
  initial,
  lockAmount,
  lockPaidBy,
  canDelete,
  onDelete,
  onSubmit,
}: ExpenseFormModalProps) {
  const { confirm } = useAlert();
  const [name, setName] = useState(initial?.name ?? "");
  const [amount, setAmount] = useState(initial?.amount != null ? String(initial.amount) : "");
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [paidBy, setPaidBy] = useState(
    lockPaidBy
      ? (defaultPaidBy ?? friends[0] ?? "")
      : (initial?.paidBy ?? defaultPaidBy ?? friends[0] ?? "")
  );
  const [participants, setParticipants] = useState<string[]>(
    initial?.participants ?? [...friends]
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleParticipant = (friend: string) => {
    setParticipants((prev) =>
      prev.includes(friend) ? prev.filter((p) => p !== friend) : [...prev, friend]
    );
  };

  const submitPaidBy = lockPaidBy ? (defaultPaidBy ?? paidBy) : paidBy;

  return (
    <Modal open={open} onClose={onClose} title={title} subtitle="Keep the crew in the loop">
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          setLoading(true);
          try {
            const value = lockAmount ? initial?.amount ?? 0 : Number(amount);
            if (!lockAmount && (!value || value <= 0)) throw new Error("Enter a valid amount");
            if (!date) throw new Error("Pick a date");
            if (participants.length === 0) throw new Error("Pick at least one person");
            await onSubmit(name.trim(), value, submitPaidBy, participants, date);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
          } finally {
            setLoading(false);
          }
        }}
      >
        <Field label="What for?">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Dinner, Uber, Airbnb…"
            required
          />
        </Field>

        {!lockAmount ? (
          <Field label="Amount (₹)">
            <Input
              type="number"
              min="1"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              required
            />
          </Field>
        ) : (
          <p className="rounded-xl bg-mint/10 px-3 py-2 text-sm text-mint">
            Amount is synced from line items.
          </p>
        )}

        <DateField value={date} onChange={setDate} />

        {!initial && !lockPaidBy ? (
          <Field label="Paid by">
            <Select
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
              options={friends.map((f) => ({ value: f, label: f }))}
            />
          </Field>
        ) : (
          <p className="rounded-xl bg-surface-2/80 px-3 py-2 text-sm text-muted">
            Paid by{" "}
            <span className="font-medium text-pearl">
              {initial?.paidBy ?? submitPaidBy}
            </span>
          </p>
        )}

        <Field label="Split between">
          <div className="flex flex-wrap gap-2">
            {friends.map((friend) => {
              const active = participants.includes(friend);
              return (
                <button
                  key={friend}
                  type="button"
                  onClick={() => toggleParticipant(friend)}
                  className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-gold text-ink"
                      : "bg-surface-2 text-muted hover:text-pearl"
                  }`}
                >
                  {friend}
                </button>
              );
            })}
          </div>
        </Field>

        {error ? (
          <p className="rounded-xl bg-rose/10 px-3 py-2 text-sm text-rose">{error}</p>
        ) : null}

        <Button type="submit" className="w-full" loading={loading}>
          Save
        </Button>

        {canDelete && onDelete ? (
          <Button
            type="button"
            variant="danger"
            className="w-full"
            onClick={async () => {
              const ok = await confirm({
                title: "Delete this expense?",
                message: "This tab and its splits will be removed for everyone.",
                confirmLabel: "Delete",
                cancelLabel: "Keep",
                tone: "danger",
              });
              if (!ok) return;
              setLoading(true);
              try {
                await onDelete();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Delete failed");
              } finally {
                setLoading(false);
              }
            }}
          >
            <Trash2 size={16} />
            Delete expense
          </Button>
        ) : null}
      </form>
    </Modal>
  );
}
