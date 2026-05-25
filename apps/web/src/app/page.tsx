import { PlaceholderPage } from "@/components/placeholder-page";
import { getPlaceholderPage } from "@/lib/page-content";

export default function Home() {
  return <PlaceholderPage page={getPlaceholderPage("/")} />;
}
