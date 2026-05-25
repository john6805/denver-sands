import { PlaceholderPage } from "@/components/placeholder-page";
import { getPlaceholderPage } from "@/lib/page-content";

export default function AdminDashboardPage() {
  return <PlaceholderPage page={getPlaceholderPage("/admin")} />;
}
