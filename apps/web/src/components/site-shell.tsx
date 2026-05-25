import Link from "next/link";
import type { ReactNode } from "react";
import { Flag, LayoutDashboard, LogIn } from "lucide-react";

import {
  adminNavItems,
  primaryNavItems,
  utilityNavItems,
} from "@/lib/navigation";
import { Button } from "@/components/ui/button";

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-background/95">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link href="/" className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Flag className="size-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-base font-semibold">
                  Denver Sands
                </span>
                <span className="block text-sm text-muted-foreground">
                  Golf league operations
                </span>
              </span>
            </Link>
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link href={utilityNavItems[0].href}>
                  <LogIn aria-hidden="true" />
                  {utilityNavItems[0].label}
                </Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href="/admin">
                  <LayoutDashboard aria-hidden="true" />
                  Admin
                </Link>
              </Button>
            </div>
          </div>
          <nav aria-label="Primary navigation" className="flex flex-wrap gap-2">
            {primaryNavItems.map((item) => (
              <Button key={item.href} asChild variant="ghost" size="sm">
                <Link href={item.href}>{item.label}</Link>
              </Button>
            ))}
          </nav>
          <nav aria-label="Admin navigation" className="flex flex-wrap gap-2">
            {adminNavItems.map((item) => {
              const Icon = item.icon;

              return (
                <Button key={item.href} asChild variant="outline" size="sm">
                  <Link href={item.href}>
                    <Icon aria-hidden="true" />
                    {item.label}
                  </Link>
                </Button>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
