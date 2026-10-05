import { initials } from "../utils/calculations";

interface HeaderProps {
  currentUser?: string | null;
  onOpenAccount?: () => void;
  compact?: boolean;
}

export function Header({ currentUser, onOpenAccount, compact }: HeaderProps) {
  if (compact) {
    return (
      <header className="sticky top-0 z-30 bg-ink px-4 py-3 md:bg-ink/70 md:backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg items-center justify-end">
          {currentUser ? (
            <button
              type="button"
              onClick={onOpenAccount}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface/80 font-display text-sm font-bold text-mint transition hover:border-gold/40"
              aria-label="Open account"
            >
              {initials(currentUser)}
            </button>
          ) : null}
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-ink px-4 py-3 md:bg-ink/80 md:backdrop-blur-xl">
      <div className="mx-auto flex max-w-lg items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-gold-bright to-gold-dim shadow-[0_6px_20px_rgb(228_181_106/0.3)]">
            <span className="font-display text-lg font-extrabold text-ink">T</span>
          </div>
          <div>
            <h1 className="font-display text-xl font-bold leading-none tracking-tight text-gradient-gold">
              TabCheck
            </h1>
            <p className="mt-0.5 text-[11px] uppercase tracking-[0.18em] text-muted">
              split · settle · smile
            </p>
          </div>
        </div>

        {currentUser ? (
          <button
            type="button"
            onClick={onOpenAccount}
            className="group flex items-center gap-2 rounded-2xl border border-border bg-surface/80 py-1.5 pl-1.5 pr-3 transition hover:border-border-strong"
            aria-label="Open account"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-mint/15 font-display text-xs font-bold text-mint">
              {initials(currentUser)}
            </span>
            <span className="text-sm font-medium text-pearl">{currentUser}</span>
          </button>
        ) : null}
      </div>
    </header>
  );
}
