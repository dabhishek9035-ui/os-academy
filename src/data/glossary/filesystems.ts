import type { GlossaryEntry } from "@/types";

/**
 * Glossary — module 9 (Filesystems & Storage).
 * The Filesystem Lab models a 32-block disk with contiguous/linked/indexed
 * allocation, one index block per indexed file, and a free-space bitmap;
 * the Disk Scheduling Lab models 200 cylinders over the textbook queue.
 */
export const entries: GlossaryEntry[] = [
  {
    id: "filesystem",
    term: "Filesystem",
    simple: "The OS subsystem that turns raw disk blocks into named, durable files and directories.",
    technical:
      "The layer that manages on-disk layout (inodes, data blocks, free-space structures) and exposes the file/directory abstraction: named byte sequences organized in a tree, persistent across crashes and reboots.",
    example:
      "The lab's 32-block filesystem: two startup files, an allocation mode, a free bitmap, and inode numbers handed out sequentially — VSFS in miniature.",
    related: ["inode", "directory-entry", "path", "free-bitmap"],
    moduleId: "filesystems",
    lessonRef: "filesystems/files-directories",
    simId: "filesystem-lab",
    refUrl: "https://pages.cs.wisc.edu/~remzi/OSTEP/file-intro.pdf",
    refLabel: "OSTEP ch. 39: Files and Directories",
  },
  {
    id: "path",
    term: "Path",
    simple: "The address of a file — a chain of directory names walked from the root (or the working directory).",
    technical:
      "A component sequence resolved by successive directory lookups: each component except the last must name a directory; absolute paths start at '/', relative ones at the working directory.",
    example:
      "Resolving /docs/notes.txt reads the root's entries to find 'docs', then the docs directory's entries to find 'notes.txt' — two directory reads before the file's inode is even consulted.",
    related: ["directory-entry", "inode", "filesystem"],
    moduleId: "filesystems",
    lessonRef: "filesystems/files-directories",
    refUrl: "https://man7.org/linux/man-pages/man7/path_resolution.7.html",
    refLabel: "man7: path_resolution(7)",
  },
  {
    id: "directory-entry",
    term: "Directory entry",
    simple: "One line in a directory: a human-readable name plus the inode number it names.",
    technical:
      "A (name, inode-number) pair; a directory is itself a special file whose content is a table of these entries. It holds no file data or metadata — everything else lives in the inode.",
    example:
      "The root directory contains ('docs', 5) and ('photos', 6); each number leads to an inode that may itself be another directory.",
    related: ["inode", "path", "hard-link", "filesystem"],
    moduleId: "filesystems",
    lessonRef: "filesystems/files-directories",
    simId: "filesystem-lab",
  },
  {
    id: "inode",
    term: "Inode",
    fullForm: "index node",
    simple: "A file's real identity: a fixed-size record of metadata and block pointers — the name is just a directory entry elsewhere.",
    technical:
      "Per-file record holding type, size, owner uid/gid, nine permission bits, timestamps, link count, and direct plus indirect block pointers; numbered and allocated from an inode bitmap. Names never appear in it.",
    example:
      "With 1 KiB blocks and 4-byte pointers, an inode's 12 direct pointers plus one single indirect block address 12 + 256 = 268 blocks.",
    related: ["directory-entry", "hard-link", "free-bitmap", "index-block"],
    moduleId: "filesystems",
    lessonRef: "filesystems/inodes-metadata",
    simId: "filesystem-lab",
    refUrl: "https://pages.cs.wisc.edu/~remzi/OSTEP/file-implementation.pdf",
    refLabel: "OSTEP ch. 40: File System Implementation",
  },
  {
    id: "hard-link",
    term: "Hard link",
    simple: "A second name for the exact same inode — one file, two ways to ask for it.",
    technical:
      "An additional directory entry naming an existing inode, with the inode's link count incremented; data and metadata are reclaimed only when the count reaches zero. Contrasts with the symlink, which stores a path.",
    example:
      "a.txt (inode 12, count 1) is linked as b.txt → count 2; deleting a.txt drops the count to 1 and the file remains fully intact behind b.txt.",
    related: ["inode", "symlink", "directory-entry"],
    moduleId: "filesystems",
    lessonRef: "filesystems/files-directories",
    refUrl: "https://man7.org/linux/man-pages/man2/link.2.html",
    refLabel: "man7: link(2)",
  },
  {
    id: "symlink",
    term: "Symbolic link",
    simple: "A tiny separate file whose content is a path to another file — a forwarding address, not a second name.",
    technical:
      "A distinct inode of type symlink holding a path string, resolved at lookup time; it can dangle (target deleted), cross filesystems, and point at directories — unlike a hard link, which shares the inode itself.",
    example:
      "/shared/latest → /home/alice/draft.txt: if draft.txt is deleted, /shared/latest dangles and every access through it fails.",
    related: ["hard-link", "inode", "path"],
    moduleId: "filesystems",
    lessonRef: "filesystems/files-directories",
    refUrl: "https://man7.org/linux/man-pages/man7/symlink.7.html",
    refLabel: "man7: symlink(7)",
  },
  {
    id: "file-descriptor",
    term: "File descriptor",
    simple: "The small integer a process uses to refer to an open file — a ticket the kernel handed out.",
    technical:
      "An index into the process's kernel-maintained open-file table; obtained from open() (or inherited across fork), used by read/write/close, and closed to release it. The process never touches the table itself — only the number crosses the syscall glass.",
    example:
      "The syscall lab's open returns 'new file descriptor 3'; the subsequent read(fd 3) fetches bytes through exactly that ticket.",
    related: ["system-call", "inode", "kernel"],
    moduleId: "filesystems",
    lessonRef: "filesystems/files-directories",
    simId: "syscall-lab",
    refUrl: "https://man7.org/linux/man-pages/man2/open.2.html",
    refLabel: "man7: open(2)",
  },
  {
    id: "contiguous-allocation-fs",
    term: "Contiguous allocation",
    simple: "Store each file as one unbroken run of blocks — fastest to read, hardest to live with.",
    technical:
      "The inode stores a start block and length; sequential reads cost one seek, random access O(1). Files cannot grow in place, and free space external-fragments until creates fail despite sufficient free blocks.",
    example:
      "The lab honestly fails the create: '12 blocks are free but no contiguous run of 3 exists' — the textbook fragmentation condition, verbatim.",
    related: ["external-fragmentation", "index-block", "fat", "free-bitmap"],
    moduleId: "filesystems",
    lessonRef: "filesystems/allocation-methods",
    simId: "filesystem-lab",
  },
  {
    id: "fat",
    term: "FAT",
    fullForm: "File Allocation Table",
    simple: "Linked allocation with all the next-block pointers pulled into one table kept in memory.",
    technical:
      "One table entry per disk block; entry i holds the next block of the chain containing i. Any scattered blocks serve any file, and following links costs RAM lookups, not disk reads — but reaching block n still means following n−1 links: a chain, not a random-access index.",
    example:
      "Reading block 4 of a 6-block FAT file: four table lookups in memory, then one disk read of the data block.",
    related: ["contiguous-allocation-fs", "index-block", "free-bitmap"],
    moduleId: "filesystems",
    lessonRef: "filesystems/allocation-methods",
  },
  {
    id: "index-block",
    term: "Index block",
    simple: "One block per file holding the addresses of all that file's data blocks — the file's private table of contents.",
    technical:
      "An array of block pointers enabling random access (read the index, then the data block) and effortless growth; the cost is one block of overhead per file. Unix's direct-plus-indirect scheme is a graduated version that spares small files the overhead.",
    example:
      "Three files of 2, 1 and 4 data blocks occupy 7 + 3 = 10 blocks under indexed allocation — the lab's wasted-blocks counter ticks once per file.",
    related: ["inode", "fat", "contiguous-allocation-fs"],
    moduleId: "filesystems",
    lessonRef: "filesystems/allocation-methods",
    simId: "filesystem-lab",
    refUrl: "https://pages.cs.wisc.edu/~remzi/OSTEP/file-implementation.pdf",
    refLabel: "OSTEP ch. 40: File System Implementation",
  },
  {
    id: "free-bitmap",
    term: "Free-space bitmap",
    simple: "One bit per disk block saying free (0) or used (1) — the disk's occupancy map.",
    technical:
      "Blocks ÷ 8 bytes of storage; supports both find-first-free (linked/indexed) and find-first-run (contiguous) allocation, and is updated atomically with every create and delete. A second bitmap tracks inode numbers.",
    example:
      "A 32-block disk needs a 4-byte bitmap; deleting a file clears its bits in one operation, making scattered holes instantly visible to the allocator.",
    related: ["inode", "contiguous-allocation-fs", "index-block"],
    moduleId: "filesystems",
    lessonRef: "filesystems/allocation-methods",
    simId: "filesystem-lab",
  },
  {
    id: "journaling",
    term: "Journaling",
    simple: "Write the intended metadata changes to a log and commit them BEFORE touching the real structures — then a crash can be finished or undone, not guessed at.",
    technical:
      "Protocol: T_write (buffer intent in the journal) → T_commit (point of no return) → apply in place → checkpoint (free journal space). Recovery replays committed-but-unapplied entries and discards uncommitted ones. Most Linux filesystems journal metadata only.",
    example:
      "Crash after 'inode 12 grows by block 57' commits but before the update lands: replay applies both the inode change and the bitmap bit — consistent, by construction.",
    related: ["inode", "free-bitmap", "buffer-cache"],
    moduleId: "filesystems",
    lessonRef: "filesystems/permissions-journaling",
    refUrl: "https://pages.cs.wisc.edu/~remzi/OSTEP/file-journaling.pdf",
    refLabel: "OSTEP ch. 42: FSCK and Journaling",
  },
  {
    id: "buffer-cache",
    term: "Buffer cache",
    simple: "Kernel memory holding recently used disk blocks, so repeat reads and writes never touch the slow device.",
    technical:
      "The page cache: file blocks cached in RAM; read hits serve at memory speed, misses fetch and fill. Writes are write-back — write() returns after caching, the kernel flushes dirty pages later, fsync() forces it. Eviction reuses module 6's page-replacement machinery.",
    example:
      "The second read of block 57 comes straight from the cache — no driver, no controller, no device; five orders of magnitude faster than the miss.",
    related: ["buffering", "journaling", "dma"],
    moduleId: "filesystems",
    lessonRef: "filesystems/permissions-journaling",
    refUrl: "https://pages.cs.wisc.edu/~remzi/OSTEP/file-intro.pdf",
    refLabel: "OSTEP ch. 39: Files and Directories (fsync)",
  },
  {
    id: "spooling",
    term: "Spooling",
    fullForm: "Simultaneous Peripheral Operations On-Line",
    simple: "Queue jobs as files on disk so one exclusive device (classically a printer) serves them one at a time, in order.",
    technical:
      "Each submission writes a spool file; a daemon feeds the device serially from the queue. The pattern generalizes anywhere an exclusive server meets many independent clients — the queueing discipline buffer and cache lack.",
    example:
      "Ten users print in the same minute: ten spool files appear, the printer consumes them one by one, and every user's program returned instantly.",
    related: ["device-queue", "buffering", "buffer-cache"],
    moduleId: "filesystems",
    lessonRef: "io-systems/buffering-caching-spooling",
  },
];
