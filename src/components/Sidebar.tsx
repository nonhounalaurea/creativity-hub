"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_NAME, NAV_ITEMS } from "@/config/app";

export default function Sidebar() {
  const pathname = usePathname();
  const [first, ...rest] = APP_NAME.split(".");
  return (
    <aside className="shrink-0 border-b border-border p-4 md:sticky md:top-0 md:h-screen md:w-56 md:border-b-0 md:border-r">
      <Link href="/create" className="block text-lg font-semibold tracking-tight" data-testid="logo">
        {first}
        {rest.length > 0 && (
          <span className="text-accent" data-testid="logo-accent">
            .{rest.join(".")}
          </span>
        )}
      </Link>
      <nav aria-label="navigazione" className="mt-3 flex gap-1 md:mt-8 md:flex-col">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              data-testid={`nav-${item.label}`}
              aria-current={active ? "page" : undefined}
              className={`flex-1 rounded-lg border px-2 py-1.5 text-center text-sm md:flex-none md:px-3 md:text-left ${
                active
                  ? "border-border bg-surface text-accent"
                  : "border-transparent text-muted hover:text-text"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
