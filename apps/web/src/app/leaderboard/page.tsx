import { PlaceholderPage } from "@/components/placeholder-page";
import { getPlaceholderPage } from "@/lib/page-content";

export default function LeaderboardPage() {
  return <PlaceholderPage page={getPlaceholderPage("/leaderboard")} />;
}
