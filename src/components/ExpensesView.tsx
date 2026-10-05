import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, Plus, Trash2, ChevronDown, Users } from "lucide-react";
import type { Expense, Friend, ExpenseSplit, SubExpense } from "../types";
import {
  formatCurrency,
  getExpenseOwesBreakdown,
  getExpenseParticipants,
} from "../utils/calculations";
import { getExpenseVisual } from "../utils/expenseVisual";
import { Button } from "./ui/Button";
import { Field, Input, Select } from "./ui/Field";
import { Modal } from "./ui/Modal";

interface ExpensesViewProps {
  expenses: Expense[];
  friends: Friend[];
  splits: ExpenseSplit[];
  currentUser: string;
  openAdd?: boolean;
  onOpenAddConsumed?: () => void;
  onAdd: (name: string, amount: number, paidBy: string, participants: string[]) => Promise<void>;
  onUpdate: (
    expense: Expense,
    name: string,
    amount: number,
    participants: string[]
  ) => Promise<void>;
  onDelete: (expense: Expense) => Promise<void>;
  onAddSub: (
    parentName: string,
    name: string,
    amount: number,
    participants: string[]
  ) => Promise<void>;
  onDeleteSub: (sub: SubExpense) => Promise<void>;
  canDelete: boolean;
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
  canDelete,
}: ExpensesViewProps) {
  const [filter, setFilter] = useState<"all" | "mine">("all");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (openAdd) {
      setShowAdd(true);
      onOpenAddConsumed?.();
    }
  }, [openAdd, onOpenAddConsumed]);

  const friendNames = friends.map((f) => f.name);

  const filtered = useMemo(() => {
    if (filter === "mine") {
      return expenses.filter((e) => e.paidBy.toLowerCase() === currentUser.toLowerCase());
    }
    return expenses;
  }, [expenses, filter, currentUser]);

  const total = filtered.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted">
            {filter === "mine" ? "Your tabs" : "All tabs"}
          </p>
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-pearl">
            {formatCurrency(total)}
          </h2>
        </div>
        <Button size="icon" onClick={() => setShowAdd(true)} aria-label="Add expense">
          <Plus size={22} />
        </Button>
      </div>

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

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {filtered.map((expense, i) => {
            const open = expanded === expense.id;
            const breakdown = getExpenseOwesBreakdown(expense, friends, splits);
            const visual = getExpenseVisual(expense.name);
            const Icon = visual.Icon;
            const people = getExpenseParticipants(expense, friends).length;

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
                <button
                  type="button"
                  className="flex w-full items-center gap-3 p-3 text-left"
                  onClick={() => setExpanded(open ? null : expense.id)}
                >
                  <span
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${visual.gradient}`}
                  >
                    <Icon size={24} className={visual.accent} strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="truncate font-display text-base font-bold text-pearl">
                        {expense.name}
                      </h3>
                      <span className="shrink-0 font-display text-base font-bold text-gold">
                        {formatCurrency(expense.amount)}
                      </span>
                    </div>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                      <span>{expense.date || "Recently"}</span>
                      <span>·</span>
                      <Users size={11} />
                      <span>{people}</span>
                      <span>·</span>
                      <span>{expense.paidBy}</span>
                    </p>
                  </div>
                  <ChevronDown
                    size={18}
                    className={`shrink-0 text-muted transition ${open ? "rotate-180" : ""}`}
                  />
                </button>

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
                                  <button
                                    type="button"
                                    onClick={() => void onDeleteSub(sub)}
                                    className="rounded-lg p-1.5 text-muted hover:bg-rose/15 hover:text-rose"
                                    aria-label="Delete line item"
                                  >
                                    <Trash2 size={14} />
                                  </button>
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
                        </div>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </motion.article>
            );
          })}
        </AnimatePresence>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border px-4 py-12 text-center">
            <p className="font-display text-lg font-semibold text-pearl">No tabs yet</p>
            <p className="mt-1 text-sm text-muted">Add your first shared expense.</p>
          </div>
        ) : null}
      </div>

      <ExpenseFormModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="New tab"
        friends={friendNames}
        defaultPaidBy={currentUser}
        onSubmit={async (name, amount, paidBy, participants) => {
          await onAdd(name, amount, paidBy, participants);
          setShowAdd(false);
        }}
      />

      {editing ? (
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
          }}
          lockAmount={editing.hasSubExpenses}
          canDelete={canDelete}
          onDelete={async () => {
            await onDelete(editing);
            setEditing(null);
          }}
          onSubmit={async (name, amount, _paidBy, participants) => {
            await onUpdate(editing, name, amount, participants);
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
  };
  lockAmount?: boolean;
  canDelete?: boolean;
  onDelete?: () => Promise<void>;
  onSubmit: (
    name: string,
    amount: number,
    paidBy: string,
    participants: string[]
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
  canDelete,
  onDelete,
  onSubmit,
}: ExpenseFormModalProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [amount, setAmount] = useState(initial?.amount != null ? String(initial.amount) : "");
  const [paidBy, setPaidBy] = useState(initial?.paidBy ?? defaultPaidBy ?? friends[0] ?? "");
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
            if (participants.length === 0) throw new Error("Pick at least one person");
            await onSubmit(name.trim(), value, paidBy, participants);
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

        {!initial ? (
          <Field label="Paid by">
            <Select
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
              options={friends.map((f) => ({ value: f, label: f }))}
            />
          </Field>
        ) : null}

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
              if (!confirm("Delete this expense?")) return;
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
