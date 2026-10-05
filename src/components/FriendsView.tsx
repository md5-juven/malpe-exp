import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Phone, Plus, UserPlus, Check } from "lucide-react";
import type { Friend } from "../types";
import { initials } from "../utils/calculations";
import { Button } from "./ui/Button";
import { Field, Input } from "./ui/Field";
import { Modal } from "./ui/Modal";

interface FriendsViewProps {
  friends: Friend[];
  onAdd: (name: string, phone: string, password?: string) => Promise<void>;
}

export function FriendsView({ friends, onAdd }: FriendsViewProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const copyPhone = async (phone: string, id: string) => {
    if (!phone) return;
    await navigator.clipboard.writeText(phone.replace(/\s/g, ""));
    setCopied(id);
    window.setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted">Crew</p>
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-pearl">
            {friends.length} friends
          </h2>
        </div>
        <Button size="icon" onClick={() => setShowAdd(true)} aria-label="Add friend">
          <UserPlus size={20} />
        </Button>
      </div>

      <div className="space-y-2">
        {friends.map((friend, i) => (
          <motion.div
            key={friend.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: Math.min(i * 0.04, 0.25) }}
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface/60 px-3 py-3"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-gold/25 to-mint/15 font-display text-sm font-bold text-gold">
              {initials(friend.name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-pearl">{friend.name}</p>
              <p className="truncate text-xs text-muted">
                {friend.phone || "No phone"}
                {friend.requiresPassword ? " · protected" : ""}
              </p>
            </div>
            {friend.phone ? (
              <div className="flex gap-1">
                <a
                  href={`tel:${friend.phone.replace(/\s/g, "")}`}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-2 text-muted transition hover:text-pearl"
                  aria-label={`Call ${friend.name}`}
                >
                  <Phone size={15} />
                </a>
                <button
                  type="button"
                  onClick={() => void copyPhone(friend.phone, friend.id)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-2 text-muted transition hover:text-pearl"
                  aria-label="Copy phone"
                >
                  {copied === friend.id ? (
                    <Check size={15} className="text-mint" />
                  ) : (
                    <Copy size={15} />
                  )}
                </button>
              </div>
            ) : null}
          </motion.div>
        ))}
      </div>

      <AddFriendModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSubmit={async (name, phone, password) => {
          await onAdd(name, phone, password);
          setShowAdd(false);
        }}
      />
    </div>
  );
}

function AddFriendModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string, phone: string, password?: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <Modal open={open} onClose={onClose} title="Add friend" subtitle="Grow the crew">
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          setLoading(true);
          try {
            if (!name.trim()) throw new Error("Name is required");
            if (!password.trim()) throw new Error("Password is required for login");
            await onSubmit(name.trim(), phone.trim(), password.trim());
            setName("");
            setPhone("");
            setPassword("");
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not add friend");
          } finally {
            setLoading(false);
          }
        }}
      >
        <Field label="Name">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Friend's name"
            required
          />
        </Field>
        <Field label="Phone">
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 …"
            inputMode="tel"
          />
        </Field>
        <Field label="Password" hint="Required for login — share with this friend">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Login password"
            required
          />
        </Field>
        {error ? (
          <p className="rounded-xl bg-rose/10 px-3 py-2 text-sm text-rose">{error}</p>
        ) : null}
        <Button type="submit" className="w-full" loading={loading}>
          <Plus size={16} />
          Add to crew
        </Button>
      </form>
    </Modal>
  );
}
