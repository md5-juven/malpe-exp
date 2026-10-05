import { type ButtonHTMLAttributes, type ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "mint";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md" | "lg" | "icon";
  children: ReactNode;
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-to-br from-gold-bright to-gold text-ink font-semibold shadow-[0_8px_24px_rgb(228_181_106/0.28)] hover:brightness-110 active:scale-[0.97]",
  secondary:
    "bg-surface-2 text-pearl border border-border hover:border-border-strong hover:bg-surface-3 active:scale-[0.97]",
  ghost: "bg-transparent text-muted hover:text-pearl hover:bg-surface-2 active:scale-[0.97]",
  danger:
    "bg-rose/15 text-rose border border-rose/25 hover:bg-rose/25 active:scale-[0.97]",
  mint:
    "bg-mint/15 text-mint border border-mint/25 hover:bg-mint/25 active:scale-[0.97]",
};

const sizes = {
  sm: "h-9 px-3 text-sm rounded-xl",
  md: "h-11 px-4 text-sm rounded-2xl",
  lg: "h-13 px-6 text-base rounded-2xl",
  icon: "h-11 w-11 rounded-2xl inline-flex items-center justify-center",
};

export function Button({
  variant = "primary",
  size = "md",
  children,
  loading,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : null}
      {children}
    </button>
  );
}
