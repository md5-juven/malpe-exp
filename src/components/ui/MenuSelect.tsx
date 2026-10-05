import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { inputClass } from "./Field";

export interface MenuSelectOption {
  value: string;
  label: string;
  hint?: string;
}

interface MenuSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: MenuSelectOption[];
  placeholder?: string;
  label?: string;
  className?: string;
}

interface PopoverPos {
  top: number;
  left: number;
  width: number;
  placeAbove: boolean;
  maxHeight: number;
}

/**
 * Custom dark-gold select - no native browser picker chrome.
 */
export function MenuSelect({
  value,
  onChange,
  options,
  placeholder = "Choose…",
  label,
  className = "",
}: MenuSelectProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<PopoverPos | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => options.find((o) => o.value === value) ?? null,
    [options, value]
  );

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }

    const update = () => {
      const el = triggerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const gap = 8;
      const spaceBelow = window.innerHeight - rect.bottom - gap - 12;
      const spaceAbove = rect.top - gap - 12;
      const placeAbove = spaceBelow < 220 && spaceAbove > spaceBelow;
      const maxHeight = Math.min(320, Math.max(160, placeAbove ? spaceAbove : spaceBelow));
      const width = Math.min(Math.max(rect.width, 240), window.innerWidth - 24);
      let left = rect.left;
      if (left + width > window.innerWidth - 12) left = window.innerWidth - width - 12;
      left = Math.max(12, left);

      setPos({
        top: placeAbove ? rect.top - gap : rect.bottom + gap,
        left,
        width,
        placeAbove,
        maxHeight,
      });
    };

    update();
    window.addEventListener("resize", update);
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
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  const menu = (
    <AnimatePresence>
      {open && pos ? (
        <motion.div
          ref={popoverRef}
          role="listbox"
          aria-label={label ?? "Options"}
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
            maxHeight: pos.maxHeight,
            zIndex: 80,
          }}
          className="overflow-y-auto rounded-2xl border border-border bg-surface py-1.5 shadow-[0_24px_60px_-16px_rgba(0,0,0,0.85),0_0_0_1px_rgba(228,181,106,0.1)]"
        >
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition ${
                  active
                    ? "bg-gold/12 text-pearl"
                    : "text-pearl/90 hover:bg-surface-2 hover:text-pearl"
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{opt.label}</span>
                  {opt.hint ? (
                    <span className="mt-0.5 block truncate text-[11px] text-muted">{opt.hint}</span>
                  ) : null}
                </span>
                {active ? (
                  <Check size={16} className="shrink-0 text-gold" strokeWidth={2.5} />
                ) : (
                  <span className="h-4 w-4 shrink-0" />
                )}
              </button>
            );
          })}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  return (
    <div className={`relative block ${className}`}>
      {label ? (
        <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.14em] text-muted">
          {label}
        </span>
      ) : null}

      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`${inputClass} flex items-center justify-between gap-3 text-left ${
          open ? "border-gold/50 ring-2 ring-gold/15" : ""
        }`}
      >
        <span className={`min-w-0 truncate ${selected ? "text-pearl" : "text-muted/50"}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-muted transition ${open ? "rotate-180 text-gold" : ""}`}
        />
      </button>

      {createPortal(menu, document.body)}
    </div>
  );
}
