import { type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";

interface FieldProps {
  label: string;
  children: ReactNode;
  hint?: string;
}

export function Field({ label, children, hint }: FieldProps) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-muted/80">{hint}</span> : null}
    </label>
  );
}

export const inputClass =
  "w-full h-12 rounded-2xl bg-ink-soft border border-border px-4 text-pearl placeholder:text-muted/50 outline-none transition-all focus:border-gold/50 focus:ring-2 focus:ring-gold/15";

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${inputClass} ${className}`} {...props} />;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options?: { value: string; label: string }[];
}

export function Select({ options, className = "", children, ...props }: SelectProps) {
  return (
    <div className="relative">
      <select
        className={`${inputClass} appearance-none pr-11 ${className}`}
        {...props}
      >
        {options
          ? options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))
          : children}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-muted"
        aria-hidden
      />
    </div>
  );
}
