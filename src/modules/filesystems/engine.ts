import type { SimAction, SimEvent, SimulationEngine } from "@/types";

/**
 * Filesystem engine — 32 blocks, three allocation methods, inode-style
 * metadata, permissions, and honest failure modes.
 *
 * Simplifications: single flat directory namespace with full paths; no
 * directories-as-files; free-space bitmap only; "content" is not modelled,
 * only block layout; timestamps are logical operation counters.
 */

export const TOTAL_BLOCKS = 32;

export type AllocationMethod = "contiguous" | "linked" | "indexed";

export interface FsFile {
  name: string;
  inode: number;
  sizeBlocks: number;
  /** contiguous: ascending run; linked: chain order; indexed: data blocks */
  blocks: number[];
  indexBlock?: number;
  perms: string; // 9 chars: rwxr-xr--
  created: number;
  modified: number;
}

export interface FsState {
  totalBlocks: number;
  used: boolean[];
  files: FsFile[];
  allocation: AllocationMethod;
  operationTrace: number[];
  stats: { wastedBlocks: number; externalFragmentation: boolean };
  opCounter: number;
  eventLog: SimEvent[];
  error: string | null;
  nextInode: number;
}

export type FsAction =
  | "create"
  | "delete"
  | "read"
  | "append"
  | "set-allocation"
  | "chmod"
  | "reset";

function freeHoles(used: boolean[]): { start: number; size: number }[] {
  const holes: { start: number; size: number }[] = [];
  let current: { start: number; size: number } | null = null;
  for (let i = 0; i < used.length; i += 1) {
    if (!used[i]) {
      if (!current) current = { start: i, size: 0 };
      current.size += 1;
    } else if (current) {
      holes.push(current);
      current = null;
    }
  }
  if (current) holes.push(current);
  return holes;
}

export function initialFsState(): FsState {
  const used = Array(TOTAL_BLOCKS).fill(false) as boolean[];
  const files: FsFile[] = [];
  // /docs/readme.txt: 2 blocks contiguous at 0-1; /photos/a.png: 3 blocks at 4-6
  used[0] = used[1] = true;
  files.push({
    name: "/docs/readme.txt",
    inode: 1,
    sizeBlocks: 2,
    blocks: [0, 1],
    perms: "rw-r--r--",
    created: 0,
    modified: 0,
  });
  used[4] = used[5] = used[6] = true;
  files.push({
    name: "/photos/a.png",
    inode: 2,
    sizeBlocks: 3,
    blocks: [4, 5, 6],
    perms: "rw-r--r--",
    created: 0,
    modified: 0,
  });
  return {
    totalBlocks: TOTAL_BLOCKS,
    used,
    files,
    allocation: "contiguous",
    operationTrace: [],
    stats: { wastedBlocks: 0, externalFragmentation: false },
    opCounter: 1,
    eventLog: [
      {
        time: 0,
        kind: "info",
        label: "32-block filesystem mounted (contiguous): /docs/readme.txt (2 blocks @0), /photos/a.png (3 blocks @4).",
        severity: "info",
      },
    ],
    error: null,
    nextInode: 3,
  };
}

export const filesystemEngine: SimulationEngine<FsState, FsAction> = {
  id: "filesystem",
  initialState: initialFsState,

  step(state, action: SimAction<FsAction>) {
    switch (action.type) {
      case "create": {
        const { path, sizeBlocks } = action.payload as { path: string; sizeBlocks: number };
        const name = (path ?? "").trim();
        if (!name.startsWith("/")) return { ...state, error: "Paths start with “/” — e.g. /docs/notes.txt." };
        if (!Number.isInteger(sizeBlocks) || sizeBlocks < 1 || sizeBlocks > 8) {
          return { ...state, error: "Size must be 1–8 blocks." };
        }
        if (state.files.some((f) => f.name === name)) {
          return { ...state, error: `${name} already exists.` };
        }
        const used = [...state.used];
        const blocks: number[] = [];
        let indexBlock: number | undefined;

        if (state.allocation === "contiguous") {
          const hole = freeHoles(used).find((h) => h.size >= sizeBlocks);
          if (!hole) {
            const totalFree = used.filter((u) => !u).length;
            return {
              ...state,
              error: null,
              eventLog: [
                ...state.eventLog.slice(-98),
                {
                  time: state.opCounter,
                  kind: "create-failed",
                  label:
                    totalFree >= sizeBlocks
                      ? `create ${name}: FAILED — ${totalFree} blocks are free but no contiguous run of ${sizeBlocks} exists. External fragmentation (or compaction) is the problem.`
                      : `create ${name}: FAILED — disk full.`,
                  severity: "bad",
                },
              ],
            };
          }
          for (let b = hole.start; b < hole.start + sizeBlocks; b += 1) {
            used[b] = true;
            blocks.push(b);
          }
        } else if (state.allocation === "linked") {
          const free = used.map((u, i) => (u ? -1 : i)).filter((i) => i >= 0);
          if (free.length < sizeBlocks) {
            return { ...state, error: "Not enough free blocks." };
          }
          for (let i = 0; i < sizeBlocks; i += 1) {
            used[free[i]] = true;
            blocks.push(free[i]);
          }
        } else {
          // indexed: one index block + sizeBlocks data blocks
          const free = used.map((u, i) => (u ? -1 : i)).filter((i) => i >= 0);
          if (free.length < sizeBlocks + 1) {
            return { ...state, error: "Not enough free blocks (index block included)." };
          }
          indexBlock = free[0];
          used[indexBlock] = true;
          for (let i = 0; i < sizeBlocks; i += 1) {
            used[free[i + 1]] = true;
            blocks.push(free[i + 1]);
          }
        }

        const file: FsFile = {
          name,
          inode: state.nextInode,
          sizeBlocks,
          blocks,
          indexBlock,
          perms: "rw-r--r--",
          created: state.opCounter,
          modified: state.opCounter,
        };
        return {
          ...state,
          error: null,
          used,
          files: [...state.files, file],
          nextInode: state.nextInode + 1,
          opCounter: state.opCounter + 1,
          stats: {
            ...state.stats,
            wastedBlocks: state.stats.wastedBlocks + (indexBlock !== undefined ? 1 : 0),
          },
          eventLog: [
            ...state.eventLog.slice(-98),
            {
              time: state.opCounter,
              kind: "create",
              label: `Created ${name} (inode ${file.inode}, ${sizeBlocks} block(s): ${blocks.join(", ")}${indexBlock !== undefined ? `, index block ${indexBlock}` : ""}).`,
              severity: "ok",
            },
          ],
        };
      }
      case "delete": {
        const name = String(action.payload ?? "");
        const file = state.files.find((f) => f.name === name);
        if (!file) return { ...state, error: `No file ${name}.` };
        const used = [...state.used];
        for (const b of file.blocks) used[b] = false;
        if (file.indexBlock !== undefined) {
          used[file.indexBlock] = false;
        }
        return {
          ...state,
          error: null,
          used,
          files: state.files.filter((f) => f.name !== name),
          opCounter: state.opCounter + 1,
          eventLog: [
            ...state.eventLog.slice(-98),
            {
              time: state.opCounter,
              kind: "delete",
              label: `Deleted ${name}; blocks ${[...(file.indexBlock !== undefined ? [file.indexBlock] : []), ...file.blocks].join(", ")} returned to the free bitmap (inode freed).`,
              severity: "ok",
            },
          ],
        };
      }
      case "read": {
        const name = String(action.payload ?? "");
        const file = state.files.find((f) => f.name === name);
        if (!file) return { ...state, error: `No file ${name}.` };
        // traversal order per allocation method
        const trace =
          state.allocation === "indexed" && file.indexBlock !== undefined
            ? [file.indexBlock, ...file.blocks]
            : [...file.blocks];
        return {
          ...state,
          error: null,
          operationTrace: trace,
          opCounter: state.opCounter + 1,
          eventLog: [
            ...state.eventLog.slice(-98),
            {
              time: state.opCounter,
              kind: "read",
              label:
                state.allocation === "indexed"
                  ? `read ${name}: index block ${file.indexBlock} → data blocks ${file.blocks.join(", ")}.`
                  : state.allocation === "linked"
                    ? `read ${name}: chasing the chain ${file.blocks.join(" → ")}.`
                    : `read ${name}: contiguous run ${file.blocks.join(", ")} — one seek, then straight reads.`,
              severity: "info",
            },
          ],
        };
      }
      case "append": {
        const { path, sizeBlocks } = action.payload as { path: string; sizeBlocks: number };
        const file = state.files.find((f) => f.name === path);
        if (!file) return { ...state, error: `No file ${path}.` };
        if (!Number.isInteger(sizeBlocks) || sizeBlocks < 1 || sizeBlocks > 4) {
          return { ...state, error: "Append size must be 1–4 blocks." };
        }
        const used = [...state.used];
        const blocks: number[] = [];
        if (state.allocation === "contiguous") {
          const next = file.blocks[file.blocks.length - 1] + 1;
          const room = freeHoles(used).find((h) => h.start <= next && h.start + h.size >= next + sizeBlocks);
          if (!room) {
            return {
              ...state,
              error: null,
              opCounter: state.opCounter + 1,
              eventLog: [
                ...state.eventLog.slice(-98),
                {
                  time: state.opCounter,
                  kind: "append-failed",
                  label: `append ${path}: FAILED — the blocks after the file are occupied. Contiguous files cannot grow in place; a real filesystem would relocate the file or use extents.`,
                  severity: "bad",
                },
              ],
            };
          }
          for (let b = next; b < next + sizeBlocks; b += 1) {
            used[b] = true;
            blocks.push(b);
          }
        } else {
          const free = used.map((u, i) => (u ? -1 : i)).filter((i) => i >= 0);
          if (free.length < sizeBlocks) return { ...state, error: "Not enough free blocks." };
          for (let i = 0; i < sizeBlocks; i += 1) {
            used[free[i]] = true;
            blocks.push(free[i]);
          }
        }
        return {
          ...state,
          error: null,
          used,
          files: state.files.map((f) =>
            f.name === path
              ? { ...f, sizeBlocks: f.sizeBlocks + sizeBlocks, blocks: [...f.blocks, ...blocks], modified: state.opCounter + 1 }
              : f,
          ),
          opCounter: state.opCounter + 1,
          eventLog: [
            ...state.eventLog.slice(-98),
            { time: state.opCounter, kind: "append", label: `Appended ${sizeBlocks} block(s) to ${path}: ${blocks.join(", ")}.`, severity: "ok" },
          ],
        };
      }
      case "set-allocation": {
        const allocation = action.payload as AllocationMethod;
        return {
          ...state,
          error: null,
          allocation,
          ...(() => {
            // reformat: keep nothing (formatting wipes the disk)
            const fresh = initialFsState();
            return {
              used: fresh.used,
              files: [],
              nextInode: 1,
              stats: { wastedBlocks: 0, externalFragmentation: false },
            };
          })(),
          eventLog: [
            ...state.eventLog.slice(-98),
            { time: state.opCounter + 1, kind: "format", label: `Disk reformatted as ${allocation}. (A real mkfs would preserve nothing either.)`, severity: "warn" },
          ],
        };
      }
      case "chmod": {
        const { path, perms } = action.payload as { path: string; perms: string };
        const file = state.files.find((f) => f.name === path);
        if (!file) return { ...state, error: `No file ${path}.` };
        if (!/^[rwx-]{9}$/.test(perms)) {
          return { ...state, error: "Permissions are 9 characters of r, w, x or - (e.g. rw-r-----)." };
        }
        return {
          ...state,
          error: null,
          files: state.files.map((f) => (f.name === path ? { ...f, perms } : f)),
          eventLog: [
            ...state.eventLog.slice(-98),
            { time: state.opCounter, kind: "chmod", label: `chmod ${path} → ${perms}.`, severity: "ok" },
          ],
        };
      }
      case "reset":
        return filesystemEngine.initialState();
      default:
        return state;
    }
  },

  explain(state) {
    const free = state.used.filter((u) => !u).length;
    return `${state.allocation} allocation · ${state.files.length} file(s) · ${free}/${state.totalBlocks} blocks free${state.stats.wastedBlocks > 0 ? ` · ${state.stats.wastedBlocks} wasted by index blocks` : ""}.`;
  },
};
