import type { Metadata } from "next";
import "./globals.css";
import { NavBar } from "@/components/layout/NavBar";
import { ThemeApplier } from "@/components/layout/ThemeApplier";
import { SceneShell } from "@/components/game/SceneShell";
import { GameHUD, GameWatcher } from "@/components/game/HUD";

export const metadata: Metadata = {
  title: "Visual OS Academy — Watch operating systems work",
  description:
    "An interactive operating-systems course disguised as a game world: 14 zones, live machine simulations, boss fights and a codex to collect. Runs entirely in your browser.",
};

/** Restores the saved theme before first paint to avoid a flash. */
const themeBootScript = `
(function(){try{
  var s = localStorage.getItem("visual-os-academy-settings");
  var theme = s ? (JSON.parse(s).state||{}).theme : null;
  if (theme !== "light" && theme !== "dark") theme = "dark";
  document.documentElement.dataset.theme = theme;
}catch(e){document.documentElement.dataset.theme="dark";}})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="flex min-h-screen flex-col">
        <ThemeApplier />
        {/* The persistent MACHINA scene: ONE canvas, behind all DOM (skill architecture). */}
        <SceneShell />
        <NavBar />
        <main className="relative z-10 mx-auto w-full max-w-6xl grow px-4 py-6 pb-28 sm:py-8">
          {children}
        </main>
        <footer className="relative z-10 border-t border-line/70 py-6">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 text-xs text-ink-faint">
            <p>
              Visual OS Academy — an independent, open educational simulator.
              Lessons cite OSTEP, xv6, Linux man-pages and POSIX. Not affiliated
              with any of these projects.
            </p>
            <p className="font-mono">Everything runs locally in your browser.</p>
          </div>
        </footer>
        <GameHUD />
        <GameWatcher />
      </body>
    </html>
  );
}
