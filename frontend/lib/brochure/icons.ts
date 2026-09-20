import {
  GraduationCap,
  Users,
  Clock,
  BarChart3,
  CalendarDays,
  Wallet,
  Receipt,
  PieChart,
  Megaphone,
  BookOpen,
  ClipboardList,
  Gauge,
  BedDouble,
  Bus,
  Library,
  Ticket,
  LayoutGrid,
  Network,
  GitBranch,
  ShieldCheck,
  BellRing,
  Palmtree,
  LayoutDashboard,
  UserPlus,
  CreditCard,
  Boxes,
} from "lucide-react";

// Icons referenced by a stable string key so module icons can be stored as
// plain data (DB / JSON) and chosen in the admin editor.
export const ICON_MAP: Record<string, React.ElementType> = {
  "graduation-cap": GraduationCap,
  users: Users,
  clock: Clock,
  "bar-chart": BarChart3,
  calendar: CalendarDays,
  wallet: Wallet,
  receipt: Receipt,
  "pie-chart": PieChart,
  megaphone: Megaphone,
  book: BookOpen,
  clipboard: ClipboardList,
  gauge: Gauge,
  bed: BedDouble,
  bus: Bus,
  library: Library,
  ticket: Ticket,
  "layout-grid": LayoutGrid,
  network: Network,
  "git-branch": GitBranch,
  shield: ShieldCheck,
  bell: BellRing,
  palmtree: Palmtree,
  "layout-dashboard": LayoutDashboard,
  "user-plus": UserPlus,
  "credit-card": CreditCard,
};

// Stable list for the editor's icon picker.
export const ICON_KEYS = Object.keys(ICON_MAP);

// Fallback icon when a key is unknown.
export const FALLBACK_ICON = Boxes;

export function iconFor(key: string): React.ElementType {
  return ICON_MAP[key] ?? FALLBACK_ICON;
}
