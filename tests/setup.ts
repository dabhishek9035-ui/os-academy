import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// jsdom (as configured here) has no localStorage implementation — provide a
// minimal in-memory stand-in so zustand persist works in tests.
if (typeof globalThis.localStorage === "undefined" || typeof globalThis.localStorage?.setItem !== "function") {
  const mem = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return mem.size;
    },
    clear: () => mem.clear(),
    getItem: (k: string) => (mem.has(k) ? (mem.get(k) as string) : null),
    key: (i: number) => [...mem.keys()][i] ?? null,
    removeItem: (k: string) => void mem.delete(k),
    setItem: (k: string, v: string) => void mem.set(k, String(v)),
  };
  Object.defineProperty(globalThis, "localStorage", { value: storage, writable: true });
}

afterEach(() => {
  cleanup();
});
