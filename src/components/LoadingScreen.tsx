import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { Button } from "./ui/Button";

interface LoadingScreenProps {
  message?: string;
  error?: string | null;
  onRetry?: () => void;
}

export function LoadingScreen({
  message = "Settling the vibes…",
  error,
  onRetry,
}: LoadingScreenProps) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center px-6">
      <motion.div
        className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-bright to-gold-dim shadow-[0_12px_40px_rgb(228_181_106/0.35)]"
        animate={error ? undefined : { rotate: [0, 6, -6, 0], scale: [1, 1.04, 1] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      >
        <span className="font-display text-2xl font-extrabold text-ink">T</span>
      </motion.div>
      <p className="font-display text-2xl font-bold tracking-tight text-gradient-gold">TabCheck</p>

      {error ? (
        <div className="mt-6 w-full max-w-sm space-y-4 text-center">
          <p className="text-sm text-rose">{error}</p>
          <p className="text-xs text-muted">
            Check your Google Sheet connection, then try again.
          </p>
          {onRetry ? (
            <Button className="w-full" onClick={onRetry}>
              <RefreshCw size={16} />
              Try again
            </Button>
          ) : null}
        </div>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted">{message}</p>
          <div className="mt-8 h-1 w-32 overflow-hidden rounded-full bg-surface-2">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-gold to-mint"
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
              style={{ width: "60%" }}
            />
          </div>
        </>
      )}
    </div>
  );
}
