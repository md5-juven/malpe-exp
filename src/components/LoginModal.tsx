import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { Field, Input } from "./ui/Field";

interface LoginModalProps {
  onConfirm: (name: string) => void;
  verifyPassword: (name: string, password: string) => Promise<string>;
}

export function LoginModal({ onConfirm, verifyPassword }: LoginModalProps) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);

    const trimmed = name.trim();
    if (!trimmed) {
      setError("Enter your username");
      return;
    }
    if (!password) {
      setError("Enter your password");
      return;
    }

    setLoading(true);
    try {
      const canonicalName = await verifyPassword(trimmed, password);
      onConfirm(canonicalName);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col overflow-hidden">
      <div className="relative flex flex-1 flex-col items-center justify-center px-6 pb-8 pt-16">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[-20%] top-[10%] h-56 w-56 rounded-full bg-gold/15 blur-3xl" />
          <div className="absolute bottom-[20%] right-[-10%] h-48 w-48 rounded-full bg-mint/12 blur-3xl" />
        </div>

        <motion.div
          className="relative z-10"
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="relative flex h-44 w-44 items-center justify-center">
            <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-gold/30 via-surface-2 to-mint/20 shadow-[0_30px_80px_rgb(228_181_106/0.25)]" />
            <div className="absolute -right-4 -top-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-mint/20 backdrop-blur">
              <Sparkles className="text-mint" size={22} />
            </div>
            <div className="absolute -bottom-2 -left-5 h-12 w-20 rounded-2xl bg-gold/25 backdrop-blur" />
            <span className="relative font-display text-7xl font-extrabold text-gradient-gold">T</span>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="relative z-10 mt-8 text-center text-sm text-muted"
        >
          Split clean. Settle fast. Stay friends.
        </motion.p>
      </div>

      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 28 }}
        className="relative z-20 rounded-t-[2.5rem] border border-border bg-surface px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-8 shadow-[0_-20px_60px_rgb(0_0_0/0.45)]"
      >
        <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-border-strong" />

        <h1 className="font-display text-4xl font-extrabold tracking-tight text-pearl">TabCheck</h1>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
          Enter the username and password shared by your admin.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <Field label="Username">
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              placeholder="Your username"
              autoComplete="username"
              autoCapitalize="words"
              required
            />
          </Field>

          <Field label="Password">
            <Input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              placeholder="Enter password"
              autoComplete="current-password"
              required
            />
          </Field>

          {error ? (
            <p className="rounded-xl bg-rose/10 px-3 py-2 text-sm text-rose" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex items-center justify-between gap-4 pt-3">
            <span className="text-xs uppercase tracking-[0.16em] text-muted">Sign in</span>

            <motion.button
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.94 }}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-gold-bright to-gold-dim text-ink shadow-[0_12px_36px_rgb(228_181_106/0.45)] disabled:opacity-50"
              aria-label="Sign in"
            >
              {loading ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-ink border-t-transparent" />
              ) : (
                <ArrowRight size={26} strokeWidth={2.5} />
              )}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
