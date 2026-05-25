import { PlaceholderPage } from "@/components/placeholder-page";
import { getPlaceholderPage } from "@/lib/page-content";

export default function TournamentPage() {
  return <PlaceholderPage page={getPlaceholderPage("/tournament")} />;
}
