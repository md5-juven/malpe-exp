import { Home, Receipt, Scale, Users } from "lucide-react";
import { motion } from "framer-motion";
import type { TabId } from "../types";

const tabs: { id: TabId; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "expenses", label: "Tabs", icon: Receipt },
  { id: "settle", label: "Settle", icon: Scale },
  { id: "friends", label: "Crew", icon: Users },
];

interface TabNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export function TabNav({ activeTab, onTabChange }: TabNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-[max(0.85rem,env(safe-area-inset-bottom))] pt-2">
      <div className="mx-auto flex max-w-lg items-center gap-1 rounded-[1.75rem] border border-border/80 bg-surface p-1.5 shadow-[0_16px_48px_rgb(0_0_0/0.45)] md:bg-surface/90 md:backdrop-blur-xl">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className="relative flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-2.5 transition"
            >
              {active ? (
                <motion.span
                  layoutId="tab-pill"
                  className="absolute inset-0 rounded-2xl bg-gold/15"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              ) : null}
              <Icon
                size={20}
                className={`relative z-10 transition ${active ? "text-gold" : "text-muted"}`}
                strokeWidth={active ? 2.4 : 2}
              />
              <span
                className={`relative z-10 text-[11px] font-medium tracking-wide ${
                  active ? "text-gold" : "text-muted"
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
