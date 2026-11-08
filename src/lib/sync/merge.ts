/**
 * Conflict policy for cloud sync — pure functions, unit-tested.
 *
 * Every synced blob is `{ data, updatedAt }`. The rule is deliberately
 * boring: **newest write wins, per store** (progress and settings are synced
 * independently). For a single-user learning app this is the honest choice —
 * a true CRDT merge of "which lessons are done" would be better only when
 * the same account learns on two devices at the same time.
 */

export interface SyncedBlob<T> {
  data: T;
  updatedAt: string;
}

/**
 * Decide which side to keep. The server wins ties and malformed local
 * timestamps (the server clock is the shared reference point).
 */
export function newerWins(
  localUpdatedAt?: string | null,
  remoteUpdatedAt?: string | null,
): "local" | "remote" {
  if (!remoteUpdatedAt) return "local";
  if (!localUpdatedAt) return "remote";
  const local = Date.parse(localUpdatedAt);
  const remote = Date.parse(remoteUpdatedAt);
  if (Number.isNaN(local) || Number.isNaN(remote)) return "remote";
  return local > remote ? "local" : "remote";
}

/**
 * Resolve one store: returns the blob that should be adopted, plus which
 * side won — null data means "nothing to adopt" (empty remote + no local).
 */
export function resolveBlob<T>(
  local: { data: T; updatedAt?: string | null } | null,
  remote: SyncedBlob<T> | null,
): { adopt: T | null; winner: "local" | "remote" | "none" } {
  if (!remote && !local) return { adopt: null, winner: "none" };
  if (!remote) return { adopt: local!.data, winner: "local" };
  if (!local) return { adopt: remote.data, winner: "remote" };
  const winner = newerWins(local.updatedAt, remote.updatedAt);
  return { adopt: winner === "remote" ? remote.data : local.data, winner };
}
