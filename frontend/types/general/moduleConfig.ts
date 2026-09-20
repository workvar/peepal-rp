import type { LucideIcon } from "lucide-react";

export type CategoryColor =
  | "blue"
  | "purple"
  | "green"
  | "orange"
  | "teal"
  | "pink"
  | "indigo"
  | "red";

export interface ModuleDef {
  id: string;
  label: string;
  description: string;
  href: string;
  baseHref: string;
  icon: LucideIcon;
  color: CategoryColor;
  group: string;
  roles: string[];
}
