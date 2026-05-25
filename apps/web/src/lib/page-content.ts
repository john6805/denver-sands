import type { NavItem } from "@/lib/navigation";
import { allPlaceholderPages } from "@/lib/navigation";

export type PlaceholderPage = {
  title: string;
  eyebrow: string;
  description: string;
  href: string;
  plannedScope: string[];
};

export const placeholderPages: PlaceholderPage[] = [
  {
    title: "Home",
    eyebrow: "League App Scaffold",
    href: "/",
    description:
      "A starting point for replacing the Denver Sands spreadsheet workflow with a focused web app.",
    plannedScope: [
      "Keep the first version centered on schedule, players, courses, weekly results, match generation, and leaderboards.",
      "Preserve existing spreadsheet behavior before adding enhancements.",
      "Use the documents in /docs as the implementation source of truth.",
    ],
  },
  {
    title: "Login",
    eyebrow: "Access",
    href: "/login",
    description:
      "Supabase authentication will live here when admin and golfer access are implemented.",
    plannedScope: [
      "Prepare for commissioner/admin access.",
      "Keep public leaderboard and rule pages reachable without adding auth complexity yet.",
      "Avoid role-heavy workflows until core league operations are working.",
    ],
  },
  {
    title: "Admin Dashboard",
    eyebrow: "Admin",
    href: "/admin",
    description:
      "A future command center for managing each weekly league cycle from setup through locking.",
    plannedScope: [
      "Review season, roster, schedule, and course readiness.",
      "Generate matchups, enter results, review calculations, and lock weeks.",
      "Surface audit history for corrections and overrides.",
    ],
  },
  {
    title: "Schedule",
    eyebrow: "Season Setup",
    href: "/schedule",
    description:
      "Placeholder for season dates, courses, tee times, and week status.",
    plannedScope: [
      "Represent Tuesday weekly play and editable season dates.",
      "Support blank future courses and tee times while setup is in progress.",
      "Keep the final season end date editable per docs/OPEN_QUESTIONS.md.",
    ],
  },
  {
    title: "Players",
    eyebrow: "Roster",
    href: "/players",
    description:
      "Placeholder for active golfers, season roster status, and current handicaps.",
    plannedScope: [
      "Track active season golfers.",
      "Keep current handicaps editable from 18Birdies updates.",
      "Seed Stefan's temporary handicap as editable when import work begins.",
    ],
  },
  {
    title: "Courses",
    eyebrow: "Course Catalog",
    href: "/courses",
    description:
      "Placeholder for approved courses, booking links, and hole handicap ratings.",
    plannedScope: [
      "Normalize workbook course names.",
      "Capture hole handicap ratings before stroke allocation.",
      "Avoid course voting in the first version.",
    ],
  },
  {
    title: "Weekly Match Generator",
    eyebrow: "Matchmaking",
    href: "/match-generator",
    description:
      "Placeholder for random weekly pairings using confirmed golfers and handicap snapshots.",
    plannedScope: [
      "Prefer 2v2, with 1v1 and 1v1v1 fallbacks.",
      "Avoid third consecutive 2v2 partnerships when possible.",
      "Store generated matchups historically instead of copying workbook tabs.",
    ],
  },
  {
    title: "Weekly Results",
    eyebrow: "Score Entry",
    href: "/weekly-results",
    description:
      "Placeholder for entering attendance, match result, gross, net, putts, and social beer counts.",
    plannedScope: [
      "Use admin-entered net score from 18Birdies.",
      "Calculate point breakdowns from raw results.",
      "Support week locking and audited corrections later.",
    ],
  },
  {
    title: "Leaderboard",
    eyebrow: "Standings",
    href: "/leaderboard",
    description:
      "Placeholder for raw points, official points after drops, and supporting season stats.",
    plannedScope: [
      "Calculate standings dynamically from weekly results.",
      "Show raw and official points separately.",
      "Keep beer points as social only, never official.",
    ],
  },
  {
    title: "Handicap History",
    eyebrow: "Snapshots",
    href: "/handicap-history",
    description:
      "Placeholder for weekly handicap snapshots used by match and scoring calculations.",
    plannedScope: [
      "Snapshot handicaps for each weekly event.",
      "Protect historical results from later handicap edits.",
      "Display half-handicap references for weekly nine-hole play.",
    ],
  },
  {
    title: "End-of-Season Tournament",
    eyebrow: "Tournament",
    href: "/tournament",
    description:
      "Placeholder for the two-day, two-round end-of-season tournament workflow.",
    plannedScope: [
      "Track tournament setup separately from weekly events.",
      "Use net score placement and documented tie-breakers.",
      "Keep tournament points out of Points Champion calculations.",
    ],
  },
  {
    title: "Awards and Sanctions",
    eyebrow: "Season Outcomes",
    href: "/awards-sanctions",
    description:
      "Placeholder for MVP, Going Low, Stroke King, sanctions, and champions.",
    plannedScope: [
      "Preview awards and sanctions from source weekly data.",
      "Use tie-breakers defined in docs/SCORING_RULES.md.",
      "Do not add payout handling in the first version.",
    ],
  },
  {
    title: "Scoring Rules",
    eyebrow: "Rules Reference",
    href: "/scoring-rules",
    description:
      "Placeholder for the scoring rules translated from the workbook and Word document.",
    plannedScope: [
      "Show attendance, match, gross, net, putt, and drop-week rules.",
      "Reference docs/SCORING_RULES.md as the source during implementation.",
      "Do not guess unresolved rule ambiguity.",
    ],
  },
];

export function getPlaceholderPage(href: string): PlaceholderPage {
  const page = placeholderPages.find((item) => item.href === href);

  if (!page) {
    throw new Error(`Missing placeholder page content for ${href}`);
  }

  return page;
}

export function navItemForPage(href: string): NavItem {
  const item = allPlaceholderPages.find((navItem) => navItem.href === href);

  if (!item) {
    throw new Error(`Missing navigation item for ${href}`);
  }

  return item;
}
