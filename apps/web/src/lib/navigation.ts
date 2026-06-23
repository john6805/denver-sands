import {
  Award,
  ClipboardList,
  Flag,
  Gauge,
  History,
  LayoutDashboard,
  Shuffle,
  Trophy,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  description: string;
  icon: typeof Trophy;
};

export const primaryNavItems: NavItem[] = [
  {
    href: "/leaderboard",
    label: "Leaderboard",
    description: "Public raw and official standings",
    icon: Trophy,
  },
];

export const adminNavItems: NavItem[] = [
  {
    href: "/admin",
    label: "Admin Dashboard",
    description: "Commissioner workflow launch point",
    icon: LayoutDashboard,
  },
  {
    href: "/match-generator",
    label: "Weekly Match Generator",
    description: "Draft weekly pairings from confirmed golfers",
    icon: Shuffle,
  },
  {
    href: "/weekly-results",
    label: "Weekly Results",
    description: "Weekly result review and point breakdowns",
    icon: ClipboardList,
  },
  {
    href: "/handicap-history",
    label: "Handicap History",
    description: "Weekly handicap snapshots",
    icon: Gauge,
  },
  {
    href: "/tournament",
    label: "End-of-Season Tournament",
    description: "Two-round tournament setup and standings",
    icon: Flag,
  },
  {
    href: "/awards-sanctions",
    label: "Awards and Sanctions",
    description: "Season awards, sanctions, and champions",
    icon: Award,
  },
  {
    href: "/admin/audit",
    label: "Audit Trail",
    description: "Read-only correction and override history",
    icon: History,
  },
];
