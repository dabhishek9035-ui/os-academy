import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        "bg-soft": "var(--bg-soft)",
        panel: "var(--panel)",
        "panel-soft": "var(--panel-soft)",
        line: "var(--line)",
        ink: "var(--ink)",
        "ink-muted": "var(--ink-muted)",
        "ink-faint": "var(--ink-faint)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        "accent-2": "rgb(var(--accent-2) / <alpha-value>)",
        "accent-soft": "var(--accent-soft)",
        "accent-ink": "var(--accent-ink)",
        ok: "rgb(var(--ok) / <alpha-value>)",
        warn: "rgb(var(--warn) / <alpha-value>)",
        bad: "rgb(var(--bad) / <alpha-value>)",
        "p-blue": "rgb(var(--p-blue) / <alpha-value>)",
        "p-green": "rgb(var(--p-green) / <alpha-value>)",
        "p-amber": "rgb(var(--p-amber) / <alpha-value>)",
        "p-red": "rgb(var(--p-red) / <alpha-value>)",
        "p-violet": "rgb(var(--p-violet) / <alpha-value>)",
        "p-cyan": "rgb(var(--p-cyan) / <alpha-value>)",
        "p-pink": "rgb(var(--p-pink) / <alpha-value>)",
        "p-lime": "rgb(var(--p-lime) / <alpha-value>)",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "Liberation Mono",
          "monospace",
        ],
      },
      boxShadow: {
        panel: "0 1px 2px rgb(0 0 0 / 0.08), 0 4px 16px rgb(0 0 0 / 0.08)",
        pop: "0 8px 30px rgb(0 0 0 / 0.18)",
        glow: "0 0 24px rgba(34, 211, 238, 0.22)",
        "glow-lg": "0 0 44px rgba(34, 211, 238, 0.3)",
      },
    },
  },
  plugins: [],
};

export default config;
