import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/actions/admin-season", () => ({
  createCourse: vi.fn(),
  createRosterGolfer: vi.fn(),
  createSeason: vi.fn(),
  createTeeTime: vi.fn(),
  createWeeklyEvent: vi.fn(),
  deleteTeeTime: vi.fn(),
  getAdminData: vi.fn(),
  updateCourse: vi.fn(),
  updateCourseHoles: vi.fn(),
  updateRosterGolfer: vi.fn(),
  updateSeason: vi.fn(),
  updateTeeTime: vi.fn(),
  updateWeeklyEvent: vi.fn(),
}));

import { CourseHoleEditor } from "@/components/admin-season-setup";

describe("admin season setup course holes", () => {
  it("renders an editor for all 18 course hole ratings", () => {
    const html = renderToStaticMarkup(
      <CourseHoleEditor
        course={{
          id: "course-1",
          name: "Overland",
          booking_url: null,
          active: true,
        }}
        courseHoles={[
          {
            course_id: "course-1",
            hole_number: 1,
            par: 4,
            handicap_rank: 7,
          },
        ]}
        saving={null}
        onSave={async () => undefined}
      />,
    );

    expect(html).toContain("Hole handicap ratings");
    expect(html).toContain("Save holes");
    expect(html).toContain("value=\"4\"");
    expect(html).toContain("value=\"7\"");
    expect(html).toContain("#18");
  });
});
