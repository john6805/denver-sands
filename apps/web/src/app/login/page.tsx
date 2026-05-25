import { PlaceholderPage } from "@/components/placeholder-page";
import { getPlaceholderPage } from "@/lib/page-content";

export default function LoginPage() {
  return <PlaceholderPage page={getPlaceholderPage("/login")} />;
}
