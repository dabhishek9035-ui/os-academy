import { describe, expect, it } from "vitest";
import {
  isPristineProgress,
  newerWins,
  resolveBlob,
  type SyncedBlob,
} from "@/lib/sync/merge";

describe("newerWins", () => {
  it("remote wins on tie (server clock is the shared reference)", () => {
    const t = "2026-11-08T10:00:00.000Z";
    expect(newerWins(t, t)).toBe("remote");
  });

  it("strictly newer local wins", () => {
    expect(newerWins("2026-11-08T11:00:00.000Z", "2026-11-08T10:00:00.000Z")).toBe("local");
  });

  it("strictly newer remote wins", () => {
    expect(newerWins("2026-11-08T09:00:00.000Z", "2026-11-08T10:00:00.000Z")).toBe("remote");
  });

  it("missing remote means keep local; missing local means adopt remote", () => {
    expect(newerWins("2026-11-08T09:00:00.000Z", null)).toBe("local");
    expect(newerWins(null, "2026-11-08T09:00:00.000Z")).toBe("remote");
  });

  it("malformed timestamps trust the server", () => {
    expect(newerWins("not-a-date", "2026-11-08T10:00:00.000Z")).toBe("remote");
    expect(newerWins("2026-11-08T10:00:00.000Z", "also-not-a-date")).toBe("remote");
  });
});

describe("resolveBlob", () => {
  interface Thing {
    lessons: string[];
  }
  const localBlob = { data: { lessons: ["a"] }, updatedAt: "2026-11-08T09:00:00.000Z" };
  const remoteBlob: SyncedBlob<Thing> = {
    data: { lessons: ["a", "b"] },
    updatedAt: "2026-11-08T10:00:00.000Z",
  };

  it("adopts the newer side", () => {
    expect(resolveBlob(localBlob, remoteBlob)).toEqual({
      adopt: { lessons: ["a", "b"] },
      winner: "remote",
    });
    // Same rule with the sides swapped: whichever timestamp is newer wins.
    expect(resolveBlob(remoteBlob, localBlob as unknown as SyncedBlob<Thing>)).toEqual({
      adopt: { lessons: ["a", "b"] },
      winner: "local",
    });
  });

  it("keeps local when nothing exists remotely", () => {
    expect(resolveBlob(localBlob, null)).toEqual({
      adopt: { lessons: ["a"] },
      winner: "local",
    });
  });

  it("adopts remote when nothing exists locally", () => {
    expect(resolveBlob(null, remoteBlob)).toEqual({
      adopt: { lessons: ["a", "b"] },
      winner: "remote",
    });
  });

  it("reports none when both sides are empty", () => {
    expect(resolveBlob(null, null)).toEqual({ adopt: null, winner: "none" });
  });
});

describe("isPristineProgress (the clear-site-data rule)", () => {
  interface TestProgress {
    modules: Record<string, { lessonsDone: string[] }>;
    activity: { ts: string; kind: string; label: string }[];
  }
  const empty: TestProgress = { modules: {}, activity: [] };
  const withWork: TestProgress = {
    modules: { "intro-computers-os": { lessonsDone: ["intro-computers-os/what-is-a-computer"] } },
    activity: [{ ts: "2026-11-08T10:00:00Z", kind: "lesson", label: "Completed lesson" }],
  };

  it("a fresh boot after a wipe is pristine — the cloud must win over it", () => {
    expect(isPristineProgress(empty)).toBe(true);
    // The failing scenario, end to end: empty local stamped "now" must NOT
    // out-rank older cloud progress.
    const local = { data: empty, updatedAt: new Date().toISOString() };
    const remote = {
      data: withWork,
      updatedAt: "2026-11-08T16:18:04.000Z", // hours older than "now"
    };
    const decision = isPristineProgress(local.data)
      ? { adopt: remote.data, winner: "remote" as const }
      : resolveBlob(local, remote);
    expect(decision.winner).toBe("remote");
    expect(
      (decision.adopt as typeof withWork).modules["intro-computers-os"],
    ).toBeDefined();
  });

  it("real local work is not pristine — timestamps decide as before", () => {
    expect(isPristineProgress(withWork)).toBe(false);
  });

  it("malformed shapes count as pristine (fail safe toward the cloud)", () => {
    expect(isPristineProgress({ modules: null, activity: "junk" })).toBe(true);
  });
});
