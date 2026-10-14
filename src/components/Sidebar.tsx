"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_NAME, NAV_ITEMS } from "@/config/app";
import { signOut } from "@/app/actions";

export default function Sidebar({ email }: { email?: string | null }) {
  const pathname = usePathname();
  if (pathname === "/login") return null;
  const [first, ...rest] = APP_NAME.split(".");
  return (
    <aside className="flex shrink-0 flex-col border-b border-border p-4 md:sticky md:top-0 md:h-screen md:w-56 md:border-b-0 md:border-r">
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
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3 md:mt-auto">
        <span className="min-w-0 truncate text-xs text-muted" title={email ?? ""} data-testid="user-email">
          {email}
        </span>
        <form action={signOut}>
          <button type="submit" className="shrink-0 rounded-lg border border-border px-2 py-1 text-xs text-muted hover:text-text" data-testid="logout">
            esci
          </button>
        </form>
      </div>
    </aside>
  );
}
