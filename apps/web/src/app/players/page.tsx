import { PlaceholderPage } from "@/components/placeholder-page";
import { getPlaceholderPage } from "@/lib/page-content";

export default function PlayersPage() {
  return <PlaceholderPage page={getPlaceholderPage("/players")} />;
}
