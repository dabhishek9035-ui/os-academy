"use client";

import { useEffect, useState } from "react";

/** True after the first client render — guards persisted-store reads. */
export function useHasMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
