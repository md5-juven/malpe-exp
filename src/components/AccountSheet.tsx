import { motion } from "framer-motion";
import { LogOut, Phone, Shield, X } from "lucide-react";
import type { Friend } from "../types";
import { initials } from "../utils/calculations";
import { Button } from "./ui/Button";

interface AccountSheetProps {
  user: Friend;
  onClose: () => void;
  onLogout: () => void;
}

export function AccountSheet({ user, onClose, onLogout }: AccountSheetProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <motion.button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-ink/70 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-title"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        transition={{ type: "spring", damping: 28, stiffness: 320 }}
        className="relative z-10 w-full max-w-md rounded-t-[2.5rem] border border-border bg-surface px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-5 shadow-2xl sm:rounded-[2rem] sm:mx-4"
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-border-strong" />

        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-muted">Account</p>
            <h2 id="account-title" className="font-display text-2xl font-extrabold text-pearl">
              Your profile
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-muted transition hover:bg-surface-2 hover:text-pearl"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mb-6 overflow-hidden rounded-[1.75rem] border border-border bg-gradient-to-br from-surface-2 to-ink-soft p-5">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-bright to-gold-dim font-display text-2xl font-extrabold text-ink shadow-[0_10px_30px_rgb(228_181_106/0.35)]">
              {initials(user.name)}
            </span>
            <div className="min-w-0">
              <p className="truncate font-display text-xl font-bold text-pearl">{user.name}</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                <Shield size={14} className="text-mint" />
                Signed in
              </p>
            </div>
          </div>

          {user.phone ? (
            <div className="mt-5 flex items-center gap-3 rounded-2xl border border-border/80 bg-ink/40 px-3 py-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-mint/15 text-mint">
                <Phone size={16} />
              </span>
              <div>
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted">Phone</p>
                <p className="text-sm text-pearl">{user.phone}</p>
              </div>
            </div>
          ) : null}
        </div>

        <p className="mb-4 text-xs leading-relaxed text-muted">
          Your session is saved on this device. Log out to clear it and sign in as someone else.
        </p>

        <div className="space-y-2">
          <Button variant="danger" className="w-full" size="lg" onClick={onLogout}>
            <LogOut size={18} />
            Log out
          </Button>
          <Button variant="ghost" className="w-full" onClick={onClose}>
            Stay signed in
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
