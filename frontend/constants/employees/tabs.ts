import { User, Landmark, ShieldCheck, Receipt, Wallet, type LucideIcon } from "lucide-react";
import type { EmployeeTab } from "@/types/pages/employees/page";

export const EMPLOYEE_TABS: Array<{
  id: EmployeeTab;
  label: string;
  icon: LucideIcon;
  accent: string; // tailwind color token used for the active pill + icon tint
}> = [
  { id: "personal", label: "Personal",     icon: User,        accent: "violet" },
  { id: "bank",     label: "Bank Account", icon: Landmark,    accent: "cyan"   },
  { id: "pf_esi",   label: "PF & ESI",     icon: ShieldCheck, accent: "emerald"},
  { id: "tax_nps",  label: "Tax & NPS",    icon: Receipt,     accent: "amber"  },
  { id: "salary",   label: "Salary",       icon: Wallet,      accent: "rose"   },
];
