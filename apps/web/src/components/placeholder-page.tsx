import Link from "next/link";
import { ArrowRight, CircleDotDashed } from "lucide-react";

import type { PlaceholderPage } from "@/lib/page-content";
import { Button } from "@/components/ui/button";

type PlaceholderPageProps = {
  page: PlaceholderPage;
};

export function PlaceholderPage({ page }: PlaceholderPageProps) {
  return (
    <div className="space-y-8">
      <section className="grid gap-6 border-b pb-8 lg:grid-cols-[1fr_22rem]">
        <div className="max-w-3xl space-y-4">
          <p className="text-sm font-medium text-muted-foreground">
            {page.eyebrow}
          </p>
          <h1 className="text-3xl font-semibold tracking-normal sm:text-4xl">
            {page.title}
          </h1>
          <p className="text-base leading-7 text-muted-foreground">
            {page.description}
          </p>
        </div>
        <aside className="rounded-lg border bg-card p-4 text-card-foreground">
          <p className="text-sm font-medium">Implementation status</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Placeholder route only. Business logic will be added through the
            implementation tickets in docs.
          </p>
        </aside>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {page.plannedScope.map((item) => (
          <div key={item} className="rounded-lg border bg-card p-4">
            <CircleDotDashed className="mb-3 size-5 text-muted-foreground" />
            <p className="text-sm leading-6 text-muted-foreground">{item}</p>
          </div>
        ))}
      </section>

      <section className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/leaderboard">
            View leaderboard
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/scoring-rules">Review scoring rules</Link>
        </Button>
      </section>
    </div>
  );
}
