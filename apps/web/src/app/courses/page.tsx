import { PlaceholderPage } from "@/components/placeholder-page";
import { getPlaceholderPage } from "@/lib/page-content";

export default function CoursesPage() {
  return <PlaceholderPage page={getPlaceholderPage("/courses")} />;
}
