import {
  Beer,
  Car,
  Coffee,
  Film,
  Home,
  Music,
  Plane,
  ShoppingBag,
  Ticket,
  Utensils,
  Waves,
  type LucideIcon,
} from "lucide-react";

export interface ExpenseVisual {
  Icon: LucideIcon;
  gradient: string;
  accent: string;
  label: string;
}

const VISUALS: { match: RegExp; visual: ExpenseVisual }[] = [
  {
    match: /hotel|airbnb|stay|room|villa|resort/i,
    visual: {
      Icon: Home,
      gradient: "from-gold/40 via-gold-dim/20 to-surface-2",
      accent: "text-gold",
      label: "Stay",
    },
  },
  {
    match: /dinner|lunch|food|restaurant|cafe|coffee|olive|burger|pizza|meal|breakfast|grocery/i,
    visual: {
      Icon: Utensils,
      gradient: "from-rose/35 via-gold/15 to-surface-2",
      accent: "text-rose",
      label: "Food",
    },
  },
  {
    match: /cab|uber|ola|taxi|scooter|rental|fuel|petrol|ride/i,
    visual: {
      Icon: Car,
      gradient: "from-mint/35 via-mint-dim/15 to-surface-2",
      accent: "text-mint",
      label: "Ride",
    },
  },
  {
    match: /flight|trip|travel|goa|beach|wave|water/i,
    visual: {
      Icon: Waves,
      gradient: "from-mint/40 via-gold/10 to-surface-2",
      accent: "text-mint",
      label: "Trip",
    },
  },
  {
    match: /ticket|concert|movie|show|event/i,
    visual: {
      Icon: Ticket,
      gradient: "from-gold/45 via-rose/15 to-surface-2",
      accent: "text-gold-bright",
      label: "Event",
    },
  },
  {
    match: /music|party|club/i,
    visual: {
      Icon: Music,
      gradient: "from-rose/30 via-gold/20 to-surface-2",
      accent: "text-rose",
      label: "Night out",
    },
  },
  {
    match: /shop|amazon|clothes|mall/i,
    visual: {
      Icon: ShoppingBag,
      gradient: "from-gold/30 via-surface-3 to-surface-2",
      accent: "text-gold",
      label: "Shopping",
    },
  },
  {
    match: /plane|airport/i,
    visual: {
      Icon: Plane,
      gradient: "from-mint/30 via-surface-3 to-surface-2",
      accent: "text-mint",
      label: "Flight",
    },
  },
  {
    match: /drink|bar|beer|wine/i,
    visual: {
      Icon: Beer,
      gradient: "from-gold/35 via-rose/10 to-surface-2",
      accent: "text-gold",
      label: "Drinks",
    },
  },
  {
    match: /film|cinema/i,
    visual: {
      Icon: Film,
      gradient: "from-surface-3 via-gold/15 to-surface-2",
      accent: "text-pearl",
      label: "Cinema",
    },
  },
];

const FALLBACK: ExpenseVisual = {
  Icon: Coffee,
  gradient: "from-gold/30 via-mint/10 to-surface-2",
  accent: "text-gold",
  label: "Tab",
};

export function getExpenseVisual(name: string): ExpenseVisual {
  for (const entry of VISUALS) {
    if (entry.match.test(name)) return entry.visual;
  }
  return FALLBACK;
}

export function avatarTone(name: string): string {
  const tones = [
    "from-gold/30 to-gold-dim/40 text-gold",
    "from-mint/25 to-mint-dim/35 text-mint",
    "from-rose/25 to-rose-dim/35 text-rose",
    "from-gold/20 to-mint/25 text-pearl",
    "from-mint/20 to-gold/30 text-gold-bright",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash + name.charCodeAt(i) * (i + 1)) % tones.length;
  return tones[hash];
}
