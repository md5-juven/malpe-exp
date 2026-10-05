import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Copy, Info, Phone } from "lucide-react";
import type { Expense, Friend, ExpenseSplit, PersonBalance, PersonDues } from "../types";
import {
  formatCurrency,
  getExpenseOwesBreakdown,
  findSplitAmount,
  getSplitsForExpense,
  netBalanceWithPerson,
} from "../utils/calculations";
import { Button } from "./ui/Button";
import { Input } from "./ui/Field";
import { MenuSelect } from "./ui/MenuSelect";
import { useAlert } from "./ui/AlertProvider";
import { SplitBoard } from "./SplitBoard";
import { SwipeSend } from "./SwipeSend";

interface SettleViewProps {
  currentUser: string;
  dues: PersonDues | null;
  balances: PersonBalance[];
  expenses: Expense[];
  friends: Friend[];
  splits: ExpenseSplit[];
  focusExpenseId?: string | null;
  onClearFocus?: () => void;
  onSaveSplit: (expenseName: string, personName: string, amount: number) => Promise<void>;
}

export function SettleView({
  currentUser,
  dues,
  balances,
  expenses,
  friends,
  splits,
  focusExpenseId,
  onClearFocus,
  onSaveSplit,
}: SettleViewProps) {
  const { alert } = useAlert();
  const [copied, setCopied] = useState<string | null>(null);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [mode, setMode] = useState<"split" | "dues" | "payments">(
    focusExpenseId ? "split" : "dues"
  );
  const [selectedId, setSelectedId] = useState(
    focusExpenseId ?? expenses[expenses.length - 1]?.id ?? ""
  );

  useEffect(() => {
    if (focusExpenseId) {
      setMode("split");
      setSelectedId(focusExpenseId);
    }
  }, [focusExpenseId]);

  const selected = useMemo(
    () => expenses.find((e) => e.id === selectedId) ?? expenses[expenses.length - 1],
    [expenses, selectedId]
  );

  const copyPhone = async (phone: string, id: string) => {
    if (!phone) return;
    await navigator.clipboard.writeText(phone.replace(/\s/g, ""));
    setCopied(id);
    window.setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          {focusExpenseId && onClearFocus ? (
            <button
              type="button"
              onClick={onClearFocus}
              className="mb-2 inline-flex items-center gap-1 text-sm text-muted hover:text-pearl"
            >
              <ArrowLeft size={16} />
              Back
            </button>
          ) : null}
          <p className="text-xs uppercase tracking-[0.16em] text-muted">Settle</p>
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-pearl">
            Make it even
          </h2>
        </div>
      </div>

      <div className="no-scrollbar flex gap-1.5 overflow-x-auto rounded-2xl border border-border bg-surface/50 p-1">
        {(["split", "dues", "payments"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`relative flex-1 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
              mode === m ? "text-ink" : "text-muted hover:text-pearl"
            }`}
          >
            {mode === m ? (
              <motion.span
                layoutId="settle-mode"
                className="absolute inset-0 rounded-xl bg-gold"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            ) : null}
            <span className="relative z-10">
              {m === "split" ? "Split board" : m === "dues" ? "My dues" : "Payments"}
            </span>
          </button>
        ))}
      </div>

      {mode === "split" ? (
          <div className="space-y-4">
            {expenses.length > 1 ? (
              <MenuSelect
                label="Tab"
                value={selected?.id ?? ""}
                onChange={setSelectedId}
                placeholder="Choose a tab"
                options={[...expenses].reverse().map((e) => ({
                  value: e.id,
                  label: `${e.name} · ${formatCurrency(e.amount)}`,
                }))}
              />
            ) : null}

            {selected ? (
              <>
                <SplitBoard
                  expense={selected}
                  friends={friends}
                  splits={splits}
                  currentUser={currentUser}
                />

                {(() => {
                  const tabBreakdown = getExpenseOwesBreakdown(selected, friends, splits);
                  const youRow = tabBreakdown.find(
                    (r) => r.name.toLowerCase() === currentUser.toLowerCase()
                  );
                  const othersOwe = tabBreakdown
                    .filter(
                      (r) =>
                        r.owes > 0 &&
                        r.name.toLowerCase() !== currentUser.toLowerCase()
                    )
                    .reduce((s, r) => s + r.owes, 0);
                  const youOwe = youRow?.owes ?? 0;
                  const payTo =
                    selected.paidBy.toLowerCase() !== currentUser.toLowerCase()
                      ? selected.paidBy
                      : null;
                  const netWithPayee = payTo ? netBalanceWithPerson(dues, payTo) : 0;
                  // Overall they still owe you (or you're even) - don't ask to pay them
                  const coveredByNet = Boolean(payTo) && netWithPayee >= 0;

                  const markPaid = async () => {
                    if (!youRow || youOwe <= 0 || markingPaid) return;
                    setMarkingPaid(true);
                    try {
                      const existing = getSplitsForExpense(splits, selected.name);
                      if (
                        existing.length === 0 &&
                        selected.paidBy.toLowerCase() !== currentUser.toLowerCase()
                      ) {
                        await onSaveSplit(selected.name, selected.paidBy, selected.amount);
                      }
                      await onSaveSplit(selected.name, currentUser, youRow.share);
                    } catch (err) {
                      await alert({
                        title: "Couldn’t clear tab",
                        message:
                          err instanceof Error ? err.message : "Something went wrong. Try again.",
                      });
                    } finally {
                      setMarkingPaid(false);
                    }
                  };

                  if (youOwe > 0) {
                    if (coveredByNet && payTo) {
                      return (
                        <div className="space-y-3">
                          <div className="rounded-2xl border border-mint/25 bg-mint/8 px-4 py-3.5">
                            <div className="flex gap-2.5">
                              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-mint/15 text-mint ring-1 ring-inset ring-mint/25">
                                <Info size={15} strokeWidth={2} />
                              </span>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-pearl">
                                  No transfer needed with {payTo}
                                </p>
                                <p className="mt-1 text-sm leading-relaxed text-muted">
                                  This tab shows you owe{" "}
                                  <span className="text-pearl">{formatCurrency(youOwe)}</span>
                                  {netWithPayee > 0 ? (
                                    <>
                                      , but overall {payTo} owes you{" "}
                                      <span className="text-mint">
                                        {formatCurrency(netWithPayee)}
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      , but overall you’re even with {payTo}
                                    </>
                                  )}
                                  . No money to send. Swipe only to clear this tab’s books.
                                </p>
                              </div>
                            </div>
                          </div>
                          <SwipeSend
                            label="Swipe to clear tab"
                            doneLabel="Tab cleared"
                            disabled={markingPaid}
                            onComplete={markPaid}
                          />
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-2">
                        <p className="text-center text-sm text-muted">
                          You still owe{" "}
                          <span className="text-pearl">{formatCurrency(youOwe)}</span> on this
                          tab
                          {payTo ? (
                            <>
                              {" "}
                              · pay <span className="text-pearl">{payTo}</span>
                            </>
                          ) : null}
                        </p>
                        {payTo && netWithPayee < 0 ? (
                          <p className="flex items-start justify-center gap-1.5 text-center text-[11px] text-muted/90">
                            <Info size={12} className="mt-0.5 shrink-0 text-gold" />
                            <span>
                              Overall you still owe {payTo}{" "}
                              {formatCurrency(Math.abs(netWithPayee))} across all tabs.
                            </span>
                          </p>
                        ) : null}
                        <SwipeSend
                          label="Swipe to settle up"
                          doneLabel="You're even"
                          disabled={markingPaid}
                          onComplete={markPaid}
                        />
                      </div>
                    );
                  }

                  if (othersOwe > 0) {
                    return (
                      <div className="rounded-2xl border border-gold/25 bg-gold/8 px-4 py-5 text-center">
                        <p className="font-display text-lg font-bold text-gold">
                          You’re covered
                        </p>
                        <p className="mt-1 text-sm text-muted">
                          Others still owe {formatCurrency(othersOwe)} on this tab. Nothing for
                          you to send.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="rounded-2xl border border-mint/25 bg-mint/8 px-4 py-5 text-center">
                      <p className="font-display text-lg font-bold text-mint">All settled</p>
                      <p className="mt-1 text-sm text-muted">
                        Everyone’s share on this tab is paid up.
                      </p>
                    </div>
                  );
                })()}
              </>
            ) : (
              <EmptyState />
            )}
          </div>
        ) : null}

        {mode === "dues" ? (
            <DuesPanel
              dues={dues}
              balances={balances}
              currentUser={currentUser}
              copied={copied}
              onCopy={copyPhone}
            />
        ) : null}

        {mode === "payments" ? (
            <PaymentsPanel
              expenses={expenses}
              friends={friends}
              splits={splits}
              onSaveSplit={onSaveSplit}
            />
        ) : null}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted">
      Add an expense to see the split board.
    </div>
  );
}

function DuesPanel({
  dues,
  balances,
  currentUser,
  copied,
  onCopy,
}: {
  dues: PersonDues | null;
  balances: PersonBalance[];
  currentUser: string;
  copied: string | null;
  onCopy: (phone: string, id: string) => void;
}) {
  if (!dues) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-[1.4rem] border border-rose/20 bg-rose/8 p-4">
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted">You owe</p>
          <p className="mt-1 font-display text-2xl font-extrabold text-rose">
            {formatCurrency(dues.totalOwes)}
          </p>
          <p className="mt-1 text-[11px] text-muted">Still to pay others</p>
        </div>
        <div className="rounded-[1.4rem] border border-mint/20 bg-mint/8 p-4">
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted">You get</p>
          <p className="mt-1 font-display text-2xl font-extrabold text-mint">
            {formatCurrency(dues.totalGetsBack)}
          </p>
          <p className="mt-1 text-[11px] text-muted">Still to collect</p>
        </div>
      </div>

      {dues.payees[0] ? (
        <SwipeSend
          label={`Pay ${dues.payees[0].name}`}
          onComplete={() => {
            if (dues.payees[0]?.phone) {
              void navigator.clipboard.writeText(dues.payees[0].phone.replace(/\s/g, ""));
            }
          }}
        />
      ) : null}

      {dues.payees.map((p) => (
        <SettlementRow
          key={p.name}
          name={p.name}
          phone={p.phone}
          amount={p.amount}
          tone="owe"
          copied={copied === `pay-${p.name}`}
          onCopy={() => onCopy(p.phone, `pay-${p.name}`)}
        />
      ))}

      {dues.owedBy.map((p) => (
        <SettlementRow
          key={p.name}
          name={p.name}
          phone={p.phone}
          amount={p.amount}
          tone="collect"
          copied={copied === `get-${p.name}`}
          onCopy={() => onCopy(p.phone, `get-${p.name}`)}
        />
      ))}

      {dues.totalOwes === 0 && dues.totalGetsBack === 0 ? (
        <div className="rounded-[1.4rem] border border-mint/25 bg-mint/8 px-4 py-8 text-center">
          <p className="font-display text-xl font-bold text-mint">
            You&apos;re all clear, {currentUser}
          </p>
        </div>
      ) : null}

      <section className="space-y-2 pt-2">
        <h3 className="font-display text-base font-bold text-pearl">Crew snapshot</h3>
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {balances.map((b) => (
            <div
              key={b.name}
              className={`min-w-[7.5rem] rounded-2xl border border-border bg-surface/60 px-3 py-3 ${
                b.name === currentUser ? "ring-1 ring-gold/40" : ""
              }`}
            >
              <p className="truncate text-sm font-medium text-pearl">
                {b.name === currentUser ? "You" : b.name}
              </p>
              <p
                className={`mt-1 font-display text-sm font-bold ${
                  b.balance > 0 ? "text-mint" : b.balance < 0 ? "text-rose" : "text-muted"
                }`}
              >
                {b.balance === 0
                  ? "-"
                  : b.balance > 0
                    ? `+${formatCurrency(b.balance)}`
                    : formatCurrency(b.balance)}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function SettlementRow({
  name,
  phone,
  amount,
  tone,
  copied,
  onCopy,
}: {
  name: string;
  phone: string;
  amount: number;
  tone: "owe" | "collect";
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-[1.4rem] border px-3 py-3 ${
        tone === "owe" ? "border-rose/20 bg-rose/8" : "border-mint/20 bg-mint/8"
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-pearl">
          {tone === "owe" ? `Pay ${name}` : `${name} owes you`}
        </p>
        <p className="truncate text-xs text-muted">{phone || "No phone on file"}</p>
      </div>
      <span
        className={`font-display text-sm font-bold ${
          tone === "owe" ? "text-rose" : "text-mint"
        }`}
      >
        {formatCurrency(amount)}
      </span>
      {phone ? (
        <div className="flex gap-1">
          <a
            href={`tel:${phone.replace(/\s/g, "")}`}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-2 text-muted hover:text-pearl"
          >
            <Phone size={15} />
          </a>
          <button
            type="button"
            onClick={onCopy}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-2 text-muted hover:text-pearl"
          >
            {copied ? <Check size={15} className="text-mint" /> : <Copy size={15} />}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function PaymentsPanel({
  expenses,
  friends,
  splits,
  onSaveSplit,
}: {
  expenses: Expense[];
  friends: Friend[];
  splits: ExpenseSplit[];
  onSaveSplit: (expenseName: string, personName: string, amount: number) => Promise<void>;
}) {
  const [selectedId, setSelectedId] = useState(expenses[0]?.id ?? "");
  const expense = useMemo(
    () => expenses.find((e) => e.id === selectedId) ?? expenses[0],
    [expenses, selectedId]
  );

  if (!expense) return <EmptyState />;

  const breakdown = getExpenseOwesBreakdown(expense, friends, splits);
  const equalShare = Math.round(expense.amount / (breakdown.length || 1));

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">Log how much each person already paid.</p>
      <MenuSelect
        label="Tab"
        value={expense.id}
        onChange={setSelectedId}
        placeholder="Choose a tab"
        options={expenses.map((e) => ({
          value: e.id,
          label: `${e.name} · ${formatCurrency(e.amount)}`,
        }))}
      />

      <div className="space-y-3">
        {breakdown.map((row) => (
          <PaymentRow
            key={row.name}
            expenseName={expense.name}
            personName={row.name}
            share={equalShare}
            current={findSplitAmount(splits, expense.name, row.name)}
            suggested={
              row.name.toLowerCase() === expense.paidBy.toLowerCase() ? expense.amount : 0
            }
            onSave={onSaveSplit}
          />
        ))}
      </div>
    </div>
  );
}

function PaymentRow({
  expenseName,
  personName,
  share,
  current,
  suggested,
  onSave,
}: {
  expenseName: string;
  personName: string;
  share: number;
  current?: number;
  suggested: number;
  onSave: (expenseName: string, personName: string, amount: number) => Promise<void>;
}) {
  const { alert } = useAlert();
  const [value, setValue] = useState(String(current ?? suggested ?? ""));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setValue(String(current ?? suggested ?? ""));
  }, [current, suggested, expenseName, personName]);

  return (
    <div className="rounded-[1.4rem] border border-border bg-surface/50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium text-pearl">{personName}</p>
        <p className="text-xs text-muted">share ~{formatCurrency(share)}</p>
      </div>
      <div className="flex gap-2">
        <Input
          type="number"
          min="0"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Paid amount"
        />
        <Button
          size="md"
          loading={saving}
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            try {
              await onSave(expenseName, personName, Number(value) || 0);
              setSaved(true);
              window.setTimeout(() => setSaved(false), 1200);
            } catch (err) {
              await alert({
                title: "Couldn't save",
                message: err instanceof Error ? err.message : "Try again in a moment.",
                confirmLabel: "OK",
              });
            } finally {
              setSaving(false);
            }
          }}
        >
          {saved ? <Check size={16} /> : "Save"}
        </Button>
      </div>
    </div>
  );
}
