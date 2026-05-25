import { describe, expect, it } from "vitest";

import { allPlaceholderPages } from "@/lib/navigation";
import { placeholderPages } from "@/lib/page-content";

describe("placeholder navigation", () => {
  it("has content for every placeholder navigation item", () => {
    const contentHrefs = new Set(placeholderPages.map((page) => page.href));

    expect(allPlaceholderPages.length).toBeGreaterThan(0);
    expect(allPlaceholderPages.every((item) => contentHrefs.has(item.href))).toBe(
      true,
    );
  });
});
