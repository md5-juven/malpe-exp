import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { inputClass } from "./Field";

function todayISO(): string {
  return toISO(new Date());
}

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseISO(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function formatDisplayDate(value: string): string {
  if (!value) return "Pick a date";
  const d = parseISO(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const POPOVER_GAP = 8;
const POPOVER_EST_HEIGHT = 340;

interface DateFieldProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

interface PopoverPos {
  top: number;
  left: number;
  width: number;
  placeAbove: boolean;
}

/** Custom dark-gold calendar — floats above modals via portal. */
export function DateField({ value, onChange, label = "Date" }: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<PopoverPos | null>(null);
  const selected = value || todayISO();
  const selectedDate = useMemo(() => parseISO(selected), [selected]);
  const [view, setView] = useState(() => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setView(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
    }
  }, [open, selectedDate]);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }

    const update = () => {
      const el = triggerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom - POPOVER_GAP;
      const placeAbove = spaceBelow < POPOVER_EST_HEIGHT && rect.top > spaceBelow;
      const width = Math.min(Math.max(rect.width, 280), window.innerWidth - 24);
      let left = rect.left;
      if (left + width > window.innerWidth - 12) {
        left = window.innerWidth - width - 12;
      }
      left = Math.max(12, left);

      setPos({
        top: placeAbove ? rect.top - POPOVER_GAP : rect.bottom + POPOVER_GAP,
        left,
        width,
        placeAbove,
      });
    };

    update();
    window.addEventListener("resize", update);
    // Capture scroll from modal and page so the popover stays anchored
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onPointer = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      setOpen(false);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      e.preventDefault();
      setOpen(false);
    };

    document.addEventListener("mousedown", onPointer);
    // Capture so Escape closes the picker without closing the parent modal
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  const days = useMemo(() => {
    const year = view.getFullYear();
    const month = view.getMonth();
    const firstDow = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < firstDow; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [view]);

  const monthLabel = view.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const today = new Date();

  const pick = (d: Date) => {
    onChange(toISO(d));
    setOpen(false);
  };

  const calendar = (
    <AnimatePresence>
      {open && pos ? (
        <motion.div
          ref={popoverRef}
          role="dialog"
          aria-label="Choose date"
          initial={{ opacity: 0, y: pos.placeAbove ? 6 : -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: pos.placeAbove ? 4 : -4, scale: 0.98 }}
          transition={{ type: "spring", damping: 26, stiffness: 380 }}
          style={{
            position: "fixed",
            top: pos.placeAbove ? undefined : pos.top,
            bottom: pos.placeAbove ? window.innerHeight - pos.top : undefined,
            left: pos.left,
            width: pos.width,
            zIndex: 80,
          }}
          className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_24px_60px_-16px_rgba(0,0,0,0.85),0_0_0_1px_rgba(228,181,106,0.1)]"
        >
          <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
            <button
              type="button"
              onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-muted transition hover:bg-surface-2 hover:text-gold"
              aria-label="Previous month"
            >
              <ChevronLeft size={18} />
            </button>
            <p className="font-display text-sm font-semibold tracking-tight text-pearl">{monthLabel}</p>
            <button
              type="button"
              onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-muted transition hover:bg-surface-2 hover:text-gold"
              aria-label="Next month"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="px-3 pt-3 pb-2">
            <div className="mb-2 grid grid-cols-7 gap-0.5">
              {WEEKDAYS.map((d) => (
                <div
                  key={d}
                  className="py-1 text-center text-[10px] font-medium uppercase tracking-[0.12em] text-muted"
                >
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-0.5">
              {days.map((day, i) => {
                if (!day) {
                  return <div key={`empty-${i}`} className="aspect-square" />;
                }
                const isSelected = sameDay(day, selectedDate);
                const isToday = sameDay(day, today);

                return (
                  <button
                    key={toISO(day)}
                    type="button"
                    onClick={() => pick(day)}
                    className={`aspect-square rounded-xl text-sm font-medium transition ${
                      isSelected
                        ? "bg-gold text-ink shadow-[0_0_20px_-4px_rgba(228,181,106,0.55)]"
                        : isToday
                          ? "bg-gold/12 text-gold ring-1 ring-inset ring-gold/35"
                          : "text-pearl hover:bg-surface-2 hover:text-gold-bright"
                    }`}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2.5">
            <button
              type="button"
              onClick={() => {
                onChange(todayISO());
                setOpen(false);
              }}
              className="rounded-xl px-3 py-1.5 text-sm font-medium text-gold transition hover:bg-gold/10"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-xl px-3 py-1.5 text-sm font-medium text-muted transition hover:bg-surface-2 hover:text-pearl"
            >
              Done
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  return (
    <div className="relative block space-y-1.5">
      <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted">{label}</span>

      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`${inputClass} flex items-center justify-between gap-3 text-left ${
          open ? "border-gold/50 ring-2 ring-gold/15" : ""
        }`}
      >
        <span className="text-pearl">{formatDisplayDate(selected)}</span>
        <Calendar size={18} className="shrink-0 text-gold" strokeWidth={1.75} />
      </button>

      {createPortal(calendar, document.body)}
    </div>
  );
}

export { todayISO };
