import { useRef, useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { Check, ChevronRight } from "lucide-react";

interface SwipeSendProps {
  label?: string;
  onComplete: () => void;
  disabled?: boolean;
}

export function SwipeSend({
  label = "Swipe & Send",
  onComplete,
  disabled,
}: SwipeSendProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const [done, setDone] = useState(false);
  const width = useTransform(x, (v) => Math.max(0, v + 52));
  const opacity = useTransform(x, [0, 80], [1, 0.35]);

  const reset = () => {
    void animate(x, 0, { type: "spring", stiffness: 420, damping: 32 });
  };

  return (
    <div
      ref={trackRef}
      className={`relative h-16 overflow-hidden rounded-full border border-gold/30 bg-gradient-to-r from-gold-dim/40 via-gold/25 to-gold/10 ${
        disabled || done ? "opacity-60" : ""
      }`}
    >
      <motion.div
        className="absolute inset-y-0 left-0 bg-gradient-to-r from-gold to-gold-bright"
        style={{ width }}
      />

      <motion.p
        style={{ opacity }}
        className="pointer-events-none absolute inset-0 flex items-center justify-center gap-1 font-display text-sm font-bold tracking-wide text-pearl"
      >
        {done ? (
          <>
            <Check size={16} className="text-ink" />
            Sent
          </>
        ) : (
          <>
            {label}
            <span className="ml-1 tracking-[0.2em] text-pearl/50">{">>>>>>>"}</span>
          </>
        )}
      </motion.p>

      <motion.button
        type="button"
        drag={disabled || done ? false : "x"}
        dragConstraints={trackRef}
        dragElastic={0.05}
        dragMomentum={false}
        style={{ x }}
        aria-label={label}
        className="absolute left-1.5 top-1.5 z-10 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-gold text-ink shadow-[0_8px_24px_rgb(228_181_106/0.45)]"
        onDragEnd={() => {
          if (disabled || done) return;
          const track = trackRef.current;
          if (!track) return;
          const max = track.offsetWidth - 64;
          if (x.get() > max * 0.72) {
            void animate(x, max, { type: "spring", stiffness: 380, damping: 28 }).then(() => {
              setDone(true);
              onComplete();
              window.setTimeout(() => {
                setDone(false);
                reset();
              }, 1600);
            });
          } else {
            reset();
          }
        }}
      >
        {done ? <Check size={22} strokeWidth={2.6} /> : <ChevronRight size={22} strokeWidth={2.6} />}
      </motion.button>
    </div>
  );
}
