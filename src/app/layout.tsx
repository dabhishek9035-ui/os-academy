import type { Metadata } from "next";
import "./globals.css";
import { NavBar } from "@/components/layout/NavBar";
import { ThemeApplier } from "@/components/layout/ThemeApplier";
import { AmbientBackdrop } from "@/components/three/AmbientBackdrop";
import { CloudSyncBridge } from "@/lib/sync/useCloudSync";

export const metadata: Metadata = {
  title: "Visual OS Academy — Watch operating systems work",
  description:
    "An interactive learning platform that teaches operating systems from zero to undergraduate level through live simulations, experiments and assessments.",
};

/** Restores the saved theme before first paint to avoid a flash. */
const themeBootScript = `
(function(){try{
  var s = localStorage.getItem("visual-os-academy-settings");
  var theme = s ? (JSON.parse(s).state||{}).theme : null;
  if (theme !== "light" && theme !== "dark") theme = "light";
  document.documentElement.dataset.theme = theme;
}catch(e){document.documentElement.dataset.theme="light";}})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="flex min-h-screen flex-col">
        <ThemeApplier />
        <CloudSyncBridge />
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <AmbientBackdrop />
        <NavBar />
        <main id="main" className="relative z-[1] mx-auto w-full max-w-6xl grow px-4 py-6 sm:py-8">
          {children}
        </main>
        <footer className="relative z-[1] border-t border-line py-6">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 text-xs text-ink-faint">
            <p>
              Visual OS Academy — an independent, open educational simulator.
              Lessons cite OSTEP, xv6, Linux man-pages and POSIX. Not affiliated
              with any of these projects.
            </p>
            <p className="font-mono">
              Runs locally in your browser; signed-in users sync to their own
              database.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
