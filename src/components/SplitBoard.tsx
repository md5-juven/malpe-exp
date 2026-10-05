import { memo, useMemo } from "react";
import type { Expense, Friend, ExpenseSplit } from "../types";
import {
  formatCurrency,
  getExpenseOwesBreakdown,
  initials,
} from "../utils/calculations";
import { avatarTone, getExpenseVisual } from "../utils/expenseVisual";

interface SplitBoardProps {
  expense: Expense;
  friends: Friend[];
  splits: ExpenseSplit[];
  currentUser: string;
}

export const SplitBoard = memo(function SplitBoard({
  expense,
  friends,
  splits,
  currentUser,
}: SplitBoardProps) {
  const breakdown = useMemo(
    () => getExpenseOwesBreakdown(expense, friends, splits),
    [expense, friends, splits]
  );
  const visual = getExpenseVisual(expense.name);
  const maxOwes = Math.max(...breakdown.map((b) => b.owes), 0);
  const sharesEqual = breakdown.every((b) => b.share === breakdown[0]?.share);
  const eachShare = breakdown[0]?.share ?? 0;
  const stillOwing = breakdown.filter((b) => b.owes > 0).length;

  return (
    <div className="rounded-[2rem] border border-border bg-surface/70">
      <div
        className={`relative overflow-hidden rounded-t-[2rem] bg-gradient-to-br ${visual.gradient} px-5 pb-6 pt-6`}
      >
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-surface/70 to-transparent" />
        <p className="relative text-xs uppercase tracking-[0.18em] text-pearl/60">Total bill</p>
        <p className="relative mt-1 font-display text-4xl font-extrabold tracking-tight text-pearl">
          {formatCurrency(expense.amount)}
        </p>
        <p className="relative mt-1 text-sm text-pearl/70">{expense.name}</p>
        <p className="relative mt-3 text-xs text-pearl/55">
          {sharesEqual
            ? `${formatCurrency(eachShare)} each · equal split`
            : "Uneven split from line items"}
          {stillOwing > 0
            ? ` · ${stillOwing} still owing`
            : " · everyone settled"}
        </p>
      </div>

      <div className="relative z-10 -mt-1 px-3 pb-5 pt-4">
        <p className="mb-4 px-2 text-[10px] font-medium uppercase tracking-[0.14em] text-muted">
          Remaining to settle
        </p>

        <div className="no-scrollbar flex touch-pan-x items-end justify-between gap-1 overflow-x-auto">
          {breakdown.map((row) => {
            const isYou = row.name.toLowerCase() === currentUser.toLowerCase();
            const tone = avatarTone(row.name);
            const settled = row.owes <= 0;
            const height = settled
              ? 14
              : 36 + (row.owes / Math.max(maxOwes, 1)) * 120;

            return (
              <div
                key={row.name}
                className="flex min-w-[3.4rem] flex-1 flex-col items-center"
              >
                <div
                  className={`mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br font-display text-xs font-bold ring-2 ${
                    isYou ? "ring-gold" : "ring-transparent"
                  } ${tone}`}
                >
                  {initials(row.name)}
                </div>
                <p className="mb-2 max-w-[4.2rem] truncate text-center text-[11px] font-medium text-muted">
                  {isYou ? "You" : row.name.split(" ")[0]}
                </p>

                <div className="relative flex h-40 w-full flex-col items-center justify-end">
                  <div className="absolute inset-y-2 w-px bg-border-strong/40" />
                  <div
                    className={`split-bar relative z-10 w-full rounded-full ${
                      settled
                        ? "bg-mint/35"
                        : "bg-gradient-to-t from-gold/85 to-gold/25"
                    }`}
                    style={{ height, maxWidth: 10, marginInline: "auto" }}
                  >
                    <span
                      className={`absolute -top-2 left-1/2 h-3.5 w-3.5 -translate-x-1/2 rounded-full border-2 border-ink shadow ${
                        settled ? "bg-mint" : "bg-pearl"
                      }`}
                    />
                  </div>
                </div>

                <p
                  className={`mt-2 font-display text-xs font-bold ${
                    settled ? "text-mint" : "text-rose"
                  }`}
                >
                  {settled ? "Settled" : formatCurrency(row.owes)}
                </p>
                <p className="mt-0.5 text-[10px] text-muted/80">
                  share {formatCurrency(row.share)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});
