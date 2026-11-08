"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useSettingsStore } from "@/lib/settings/store";
import { MoonIcon, SunIcon, TerminalIcon, CubeIcon } from "@/components/ui/icons";
import { CloudAuthNav } from "@/components/layout/CloudAuthNav";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/roadmap", label: "Learn" },
  { href: "/playground", label: "Playground" },
  { href: "/glossary", label: "Glossary" },
  { href: "/progress", label: "Progress" },
];

export function NavBar() {
  const pathname = usePathname();
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4">
        <Link href="/" className="flex min-h-[44px] items-center gap-2 font-semibold text-ink">
          <span
            className="grid h-7 w-7 place-items-center rounded-md bg-ink font-mono text-xs font-semibold text-bg"
            aria-hidden
          >
            OS
          </span>
          <span className="hidden sm:inline">
            Visual OS Academy
          </span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="Primary">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={isActive(l.href) ? "page" : undefined}
              className={`inline-flex min-h-[44px] items-center rounded-lg px-3 text-sm transition-colors ${
                isActive(l.href)
                  ? "bg-accent-soft text-ink"
                  : "text-ink-muted hover:bg-panel-soft hover:text-ink"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/playground/terminal"
            className={`flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 text-sm transition-colors ${
              isActive("/playground/terminal")
                ? "bg-accent-soft text-ink"
                : "text-ink-muted hover:bg-panel-soft hover:text-ink"
            }`}
          >
            <TerminalIcon width={14} height={14} />
            Terminal
          </Link>
          <Link
            href="/3d"
            className={`flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 text-sm transition-colors ${
              isActive("/3d")
                ? "bg-accent-soft text-ink"
                : "text-ink-muted hover:bg-panel-soft hover:text-ink"
            }`}
          >
            <CubeIcon width={14} height={14} />
            3D
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <CloudAuthNav />
          <Link href="/settings" className="btn btn-ghost px-2" aria-label="Settings" title="Settings">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
              <circle cx="8" cy="8" r="2.4" />
              <path d="M8 1.8v1.7M8 12.5v1.7M2.5 8h1.7M11.8 8h1.7M4.1 4.1l1.2 1.2M10.7 10.7l1.2 1.2M11.9 4.1l-1.2 1.2M5.3 10.7l-1.2 1.2" />
            </svg>
          </Link>
          <button
            type="button"
            className="btn btn-ghost px-2"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          >
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>
          <button
            type="button"
            className="btn btn-ghost px-2 md:hidden"
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.6" aria-hidden>
              {open ? <path d="M4 4l8 8M12 4l-8 8" /> : <path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" />}
            </svg>
          </button>
        </div>
      </div>

      {open ? (
        <nav className="border-t border-line bg-panel px-4 py-2 md:hidden" aria-label="Mobile">
          {LINKS.concat([
            { href: "/playground/terminal", label: "Terminal" },
            { href: "/3d", label: "3D View" },
            { href: "/settings", label: "Settings" },
          ]).map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="flex min-h-[44px] items-center rounded-lg px-3 text-sm text-ink-muted hover:bg-panel-soft hover:text-ink"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
