import { ArrowRight, Plus, Users } from "lucide-react";
import { motion } from "framer-motion";
import type { Expense, Friend, PersonDues } from "../types";
import { formatCurrency, formatExpenseDate, getExpenseParticipants } from "../utils/calculations";
import { getExpenseVisual } from "../utils/expenseVisual";

interface HomeViewProps {
  currentUser: string;
  dues: PersonDues | null;
  expenses: Expense[];
  friends: Friend[];
  onGoSettle: () => void;
  onGoExpenses: () => void;
  onOpenExpense: (expense: Expense) => void;
  onAddExpense: () => void;
}

export function HomeView({
  currentUser,
  dues,
  expenses,
  friends,
  onGoSettle,
  onGoExpenses,
  onOpenExpense,
  onAddExpense,
}: HomeViewProps) {
  const featured = expenses[expenses.length - 1] ?? null;
  const recent = [...expenses].reverse().slice(0, 4);
  const youOwe = dues?.totalOwes ?? 0;
  const youGet = dues?.totalGetsBack ?? 0;
  const featuredVisual = featured ? getExpenseVisual(featured.name) : null;
  const FeaturedIcon = featuredVisual?.Icon;

  const duesBlurb =
    youOwe < 1 && youGet < 1
      ? "You're all clear. Nice."
      : youOwe > 0 && youGet > 0
        ? `You owe ${formatCurrency(youOwe)} · ${formatCurrency(youGet)} coming back.`
        : youOwe > 0
          ? `${formatCurrency(youOwe)} left to settle.`
          : `${formatCurrency(youGet)} coming your way.`;

  return (
    <div className="space-y-6">
      {/* Greeting - reference middle screen */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="pr-12"
      >
        <p className="text-base text-muted">Hi {currentUser}</p>
        <h2 className="mt-1 font-display text-[2.35rem] leading-[1.05] font-extrabold tracking-tight text-pearl">
          Split your bill
        </h2>
        <p className="mt-2 text-sm text-muted">{duesBlurb}</p>
      </motion.div>

      {/* Featured bill card */}
      {featured && FeaturedIcon ? (
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="relative"
        >
          <div
            className={`relative overflow-hidden rounded-[2rem] bg-gradient-to-br ${featuredVisual.gradient} p-6 shadow-[0_24px_60px_rgb(0_0_0/0.35)]`}
          >
            <div className="pointer-events-none absolute -right-6 top-4 h-36 w-36 rounded-full bg-pearl/5 blur-2xl" />
            <div className="pointer-events-none absolute -left-8 bottom-0 h-28 w-28 rounded-full bg-ink/20 blur-2xl" />

            <div className="relative flex flex-col items-center text-center">
              <motion.div
                animate={{ y: [0, -8, 0], rotate: [0, -3, 3, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="mb-4 flex h-28 w-28 items-center justify-center rounded-[2rem] bg-ink/25 shadow-inner backdrop-blur-sm"
              >
                <FeaturedIcon size={56} className={featuredVisual.accent} strokeWidth={1.5} />
              </motion.div>

              <p className="text-xs uppercase tracking-[0.18em] text-pearl/55">Total bill</p>
              <p className="mt-1 font-display text-4xl font-extrabold tracking-tight text-pearl">
                {formatCurrency(featured.amount)}
              </p>
              <p className="mt-2 text-sm text-pearl/75">
                {featured.name}
                <span className="text-pearl/45">
                  {" "}
                  · {getExpenseParticipants(featured, friends).length} people
                </span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onOpenExpense(featured)}
            className="absolute -bottom-5 left-1/2 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full bg-gold text-ink shadow-[0_10px_30px_rgb(228_181_106/0.45)] transition hover:brightness-110 active:scale-95"
            aria-label="Open featured bill"
          >
            <ArrowRight size={22} strokeWidth={2.5} />
          </button>
        </motion.section>
      ) : (
        <motion.button
          type="button"
          onClick={onAddExpense}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex w-full flex-col items-center gap-3 rounded-[2rem] border border-dashed border-border-strong bg-surface/40 px-6 py-14"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gold text-ink">
            <Plus size={26} />
          </span>
          <span className="font-display text-xl font-bold text-pearl">Add your first tab</span>
          <span className="text-sm text-muted">Dinner, trip, anything shared</span>
        </motion.button>
      )}

      {/* Quick actions - same language as Settle → My dues */}
      <div className={`grid gap-3 ${featured ? "pt-4" : ""} grid-cols-2`}>
        <button
          type="button"
          onClick={onGoSettle}
          className={`rounded-2xl border px-4 py-3 text-left transition ${
            youOwe > 0
              ? "border-rose/25 bg-rose/10 hover:bg-rose/15"
              : youGet > 0
                ? "border-mint/25 bg-mint/10 hover:bg-mint/15"
                : "border-gold/25 bg-gold/10 hover:bg-gold/15"
          }`}
        >
          {youOwe > 0 && youGet > 0 ? (
            <>
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted">Your dues</p>
              <p className="mt-1 font-display text-sm font-bold leading-snug">
                <span className="text-rose">Owe {formatCurrency(youOwe)}</span>
                <span className="text-muted"> · </span>
                <span className="text-mint">Get {formatCurrency(youGet)}</span>
              </p>
            </>
          ) : youOwe > 0 ? (
            <>
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted">You owe</p>
              <p className="mt-1 font-display text-lg font-bold text-rose">
                {formatCurrency(youOwe)}
              </p>
            </>
          ) : youGet > 0 ? (
            <>
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted">You get</p>
              <p className="mt-1 font-display text-lg font-bold text-mint">
                {formatCurrency(youGet)}
              </p>
            </>
          ) : (
            <>
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted">Your dues</p>
              <p className="mt-1 font-display text-lg font-bold text-pearl">Settled</p>
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onAddExpense}
          className="rounded-2xl border border-border bg-surface/70 px-4 py-3 text-left transition hover:border-border-strong"
        >
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted">New tab</p>
          <p className="mt-1 flex items-center gap-1 font-display text-lg font-bold text-pearl">
            <Plus size={16} className="text-gold" />
            Add
          </p>
        </button>
      </div>

      {/* Recent bills */}
      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <h3 className="font-display text-xl font-bold text-pearl">Recent tabs</h3>
          <button
            type="button"
            onClick={onGoExpenses}
            className="text-sm font-medium text-gold hover:text-gold-bright"
          >
            View all
          </button>
        </div>

        <div className="space-y-3">
          {recent.map((expense, i) => {
            const visual = getExpenseVisual(expense.name);
            const Icon = visual.Icon;
            const people = getExpenseParticipants(expense, friends).length;
            const isLast = i === recent.length - 1 && recent.length > 2;

            return (
              <motion.button
                key={expense.id}
                type="button"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}
                onClick={() => onOpenExpense(expense)}
                className={`flex w-full items-center gap-3 rounded-[1.4rem] border border-border bg-surface/80 p-3 text-left shadow-[0_10px_30px_rgb(0_0_0/0.18)] transition hover:border-border-strong ${
                  isLast ? "origin-bottom rotate-[-1.2deg]" : ""
                }`}
              >
                <span
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${visual.gradient}`}
                >
                  <Icon size={24} className={visual.accent} strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-base font-bold text-pearl">
                    {expense.name}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                    <span>{formatExpenseDate(expense.date)}</span>
                    <span className="text-border-strong">·</span>
                    <Users size={11} />
                    <span>{people}</span>
                  </p>
                </div>
                <span className="font-display text-base font-bold text-gold">
                  {formatCurrency(expense.amount)}
                </span>
              </motion.button>
            );
          })}

          {recent.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
              No tabs yet. Add one to get started.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
