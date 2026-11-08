import { describe, expect, it } from "vitest";
import { newerWins, resolveBlob, type SyncedBlob } from "@/lib/sync/merge";

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
