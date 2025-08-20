import { Gauge } from "lucide-react";
export interface NavItem {
  title: string;
  href?: string;
  icon: React.ElementType;
  children?: NavItem[];
}
export const navItems: NavItem[] = [
  {
    title: "Case",
    href: "/",
    icon: Gauge,
  },
];
