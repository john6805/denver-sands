import {
  Award,
  CalendarDays,
  ClipboardList,
  Flag,
  Gauge,
  Home,
  LandPlot,
  LayoutDashboard,
  LogIn,
  NotebookTabs,
  Shuffle,
  Trophy,
  Users,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  description: string;
  icon: typeof Home;
};

export const primaryNavItems: NavItem[] = [
  {
    href: "/",
    label: "Home",
    description: "League operations overview",
    icon: Home,
  },
  {
    href: "/schedule",
    label: "Schedule",
    description: "Season dates, courses, and tee times",
    icon: CalendarDays,
  },
  {
    href: "/players",
    label: "Players",
    description: "Active roster and season golfers",
    icon: Users,
  },
  {
    href: "/courses",
    label: "Courses",
    description: "Course catalog and hole handicap readiness",
    icon: LandPlot,
  },
  {
    href: "/leaderboard",
    label: "Leaderboard",
    description: "Raw and official standings placeholder",
    icon: Trophy,
  },
  {
    href: "/scoring-rules",
    label: "Scoring Rules",
    description: "Workbook and rules-document scoring reference",
    icon: NotebookTabs,
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
    description: "Future weekly pairing workflow",
    icon: Shuffle,
  },
  {
    href: "/weekly-results",
    label: "Weekly Results",
    description: "Future result-entry workflow",
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
    description: "Two-round tournament placeholder",
    icon: Flag,
  },
  {
    href: "/awards-sanctions",
    label: "Awards and Sanctions",
    description: "Season awards, sanctions, and champions",
    icon: Award,
  },
];

export const utilityNavItems: NavItem[] = [
  {
    href: "/login",
    label: "Login",
    description: "Supabase auth placeholder",
    icon: LogIn,
  },
];

export const allPlaceholderPages: NavItem[] = [
  ...primaryNavItems,
  ...adminNavItems,
  ...utilityNavItems,
];
