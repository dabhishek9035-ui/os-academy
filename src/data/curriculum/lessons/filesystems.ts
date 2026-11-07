import type { Lesson } from "@/types";

/**
 * Module 9 — Filesystems & Storage.
 * Where bytes live between runs: files, directories, inodes, block
 * allocation, permissions, journaling and disk scheduling.
 * Lab conventions in this course: the Filesystem Lab models a 32-block disk
 * with contiguous / linked / indexed allocation, one index block per indexed
 * file, a free-space bitmap, and honest create failures under external
 * fragmentation; the Disk Scheduling Lab models 200 cylinders with the
 * textbook scenario (head 53, queue 98,183,37,122,14,124,65,67) whose
 * movement totals (FCFS 640, SSTF 236, SCAN 331, LOOK 299, C-SCAN 382,
 * C-LOOK 322) are verified by the lab's engine unit tests.
 */
export const lessons: Lesson[] = [
  {
    id: "filesystems/files-directories",
    moduleId: "filesystems",
    title: "Files, Directories & Paths",
    minutes: 9,
    objectives: [
      "define the file and directory abstractions and what a directory entry actually contains",
      "resolve a path by walking directory entries from the root",
      "explain hard links as multiple names sharing one inode",
    ],
    sections: [
      {
        kind: "problem",
        body: [
          "Every abstraction so far in this course was born to serve a running program — and dies with it. A process is forgettable by design: when it exits, its address space evaporates. But the document you were editing, the game's save file, the OS itself — all of these must *outlive* the processes that created them and survive a power cut. Storage, then, needs its own pair of abstractions with a different contract: **the file**, a named, durable, linear sequence of bytes, and **the directory**, a way to organize files so a growing collection stays findable.",
          "Three requirements shape everything in this module. *Persistence*: bytes must survive crashes and reboots. *Naming*: humans need words like `report.txt`, not block 17,993. *Sharing with control*: many files, many users, and — later lessons — rules about who may touch what. Notice what is *not* on the list: the OS has no opinion about what a file *means*. To the filesystem a file is just bytes; 'this is a PNG' is every program above the OS's problem.",
        ],
      },
      {
        kind: "intuition",
        body: [
          "Picture a filing room. Documents live in **folders** — each folder is a bag of pages, and the room doesn't care what's written on them. Folders sit inside **drawers**, and each drawer holds a labeled divider for a cabinet area: 'Taxes 2025', 'House', 'Insurance'. To find 'House/Insurance/fire.pdf' you walk to the House divider, then the Insurance divider inside it, then pull the fire.pdf folder. The labels are not the documents; they are pointers you follow.",
          "The folders are files; the drawers with dividers are directories; the label chain is the **path**. One more subtlety makes the room honest: a folder can be filed under *two* dividers at once — 'House' and 'Taxes 2025' both point at the same physical folder. There is still exactly one folder with one set of contents; there are just two ways to ask for it. That is a hard link, and it works only because the label and the folder are different things.",
        ],
      },
      {
        kind: "visual",
        simId: "filesystem-lab",
        body: [
          "The **Filesystem Lab** gives you a 32-block disk with two files already on it — `/docs/readme.txt` (2 blocks) and `/photos/a.png` (3 blocks). Create a new file with a path like `/docs/notes.txt`, 2 blocks, and watch the lab: assign it an inode number, claim blocks, and update the free bitmap.",
          "Now read the file back and study the trace: the lab reports which blocks were touched, in what order. Create a second file, delete the first, and create a third — then compare inode numbers. The numbers are never reused within the session, a small hint that the *inode*, not the name, is the file's real identity — the subject of the next lesson.",
        ],
      },
      {
        kind: "technical",
        body: [
          "A **file** is a linear array of bytes that the OS stores durably under a name, together with a little bookkeeping (size, ownership, timestamps). Internally every file has a **low-level name** — a number the filesystem uses internally; Unix calls it the **inode number** — and the user-visible name is a convenience layered on top. A **directory** is itself a special file whose content is a table of **directory entries**: pairs of (name, inode number). The directory maps names to low-level names; it never holds file data.",
          "A **path** like `/docs/notes.txt` is a lookup recipe: start at the **root directory** `/`, read its entries, find the entry named `docs` — which names the inode of a *subdirectory* — read that directory's entries, and find `notes.txt`. Resolution is recursive: each component except the last must name a directory, and each step is a directory read. The **working directory** lets you write the same recipe relative to where you already are (`notes.txt` instead of `/docs/notes.txt`).",
          "Because names live in directories and not in the file itself, the same inode can be named by many entries in many directories: a **hard link**. Creating one (`link()` in Unix) adds another (name, inode) entry and increments the inode's **link count**; deleting a name (`unlink()`) removes one entry and decrements the count. The file's data and metadata are reclaimed only when the link count reaches zero *and* no process holds the file open. One inode, many names; zero names, no file.",
        ],
        equations: [
          {
            expr: "Link count = number of directory entries naming the inode",
            symbols: [
              { sym: "link count", meaning: "metadata stored in the inode, updated on every link() and unlink()" },
            ],
            note: "The file vanishes only when the count hits 0 — the last name is unlinked, not 'the file is deleted'.",
          },
          {
            expr: "resolve(/a/b/c) = lookup(root, a) → lookup(dir a, b) → lookup(dir b, c)",
            symbols: [
              { sym: "lookup(dir, name)", meaning: "read the directory's entries, return the inode number for name" },
            ],
            note: "Every component except the last must resolve to a directory; a miss anywhere is the error the caller sees.",
          },
        ],
      },
      {
        kind: "worked-example",
        steps: [
          {
            title: "Resolving /docs/notes.txt, disk read by disk read",
            body: [
              "The kernel starts at the root directory, whose own inode number is a fixed constant (2 in many Unix filesystems). Read the root's data blocks — they are a table of entries: ('docs', inode 5), ('photos', inode 6), … The first lookup returns inode 5.",
              "Read inode 5: it says the `docs` directory's bytes live in blocks 14–15. Read block 14: entries ('notes.txt', inode 12), ('todo.txt', inode 13). The final component returns inode 12. Only now does the kernel read inode 12 to learn where the file's data blocks are. Three directory-level reads happened before a single byte of the *file* was touched — path resolution is a walk through little tables, and it is why deep paths cost more lookups than shallow ones.",
            ],
          },
          {
            title: "One inode, two names",
            body: [
              "`/home/alice/draft.txt` is inode 12, link count 1. Alice runs `link /home/alice/draft.txt /shared/final.txt`: the `/shared` directory gains an entry ('final.txt', 12), and inode 12's link count becomes 2. Editing the file *through either name* changes the same bytes — there are not two files.",
              "Now `rm /home/alice/draft.txt`: the entry in `/home/alice` disappears, the count drops to 1, and nothing is freed. Only when the second name is unlinked does the count hit 0 — and the inode and its blocks go back to the free pool. Contrast a *symbolic link*, which is a tiny separate file whose content is a *path*; if the target is removed, the symlink dangles. Hard links share fate; symlinks forward mail that may no longer arrive.",
            ],
          },
        ],
      },
      {
        kind: "misconceptions",
        items: [
          {
            wrong: "A directory contains its files.",
            right: "A directory contains only name → inode-number mappings, itself stored as ordinary blocks on disk. The file's data and metadata live entirely elsewhere — which is exactly why hard links and renames are cheap pointer edits.",
          },
          {
            wrong: "Deleting a file immediately erases its data from the disk.",
            right: "Unlinking removes a directory entry and decrements the link count; blocks are freed only when the count reaches zero (and nothing holds the file open). Until then the data is untouched — one reason deleted files can sometimes be recovered.",
          },
        ],
      },
      {
        kind: "knowledge-check",
        questions: [
          {
            id: "kc-m9-fd-1",
            q: "What does a directory entry actually store?",
            options: [
              "A name paired with an inode number",
              "The first few bytes of the file's content",
              "The file's size and modification time",
              "A copy of the file's permission bits",
            ],
            answerIndex: 0,
            explanation:
              "Directories map names to low-level inode numbers and nothing more. Size, times and permissions all live in the inode — which is why several names can share one inode with identical metadata.",
          },
          {
            id: "kc-m9-fd-2",
            q: "A file with one name is hard-linked into a second directory, then the original name is deleted. What remains?",
            options: [
              "The file: one inode, link count 1, still fully readable via the second name",
              "Nothing — deleting the original name destroys the file",
              "A dangling empty shell: the name exists but the data is gone",
              "Two independent files, one per name",
            ],
            answerIndex: 0,
            explanation:
              "The hard link raised the count to 2; deleting one name only lowers it to 1. Data and metadata are reclaimed only at count 0 — there was never a copy to lose.",
          },
        ],
      },
      {
        kind: "references",
        items: [
          {
            label: "OSTEP, Chapter 39: Interlude — Files and Directories",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/file-intro.pdf",
            note: "the file/directory abstraction, path resolution and hard links — this lesson's source text",
          },
          {
            label: "man7: path_resolution(7) — how a pathname is resolved",
            url: "https://man7.org/linux/man-pages/man7/path_resolution.7.html",
            note: "the real Linux lookup algorithm, step by step",
          },
          {
            label: "man7: inode(7) — file characteristics",
            url: "https://man7.org/linux/man-pages/man7/inode.7.html",
            note: "what a real inode holds, including link counts and file types",
          },
        ],
      },
      {
        kind: "note",
        body: [
          "Lab simplifications: the Filesystem Lab keeps one flat namespace — paths are just names starting with '/', and there are no directory files to walk, so path resolution costs nothing. Real directories are files you must read recursively, which the worked example above models honestly. The lab also has no link() distinct from delete: its delete removes the only name and frees the inode at once.",
        ],
      },
    ],
  },
  {
    id: "filesystems/inodes-metadata",
    moduleId: "filesystems",
    title: "Inodes & File Metadata",
    minutes: 10,
    objectives: [
      "list what an inode stores and what it deliberately does not",
      "compute the number of blocks an indirect pointer scheme can address",
      "predict inode link counts across link and unlink operations",
    ],
    sections: [
      {
        kind: "problem",
        body: [
          "A file is more than its bytes. To open `/docs/notes.txt` the kernel must know: where the data blocks are, how big the file is, who owns it, what the permissions are, when it was last modified, and how many names point at it. Call this the file's **metadata** — data about data — and note the design question it forces: *where does it live?* Storing it in the directory entry (the obvious first guess) breaks two things at once: renaming means rewriting directory data, and hard links become impossible, because two names in two directories cannot both 'own' the metadata.",
          "The fix is to promote the metadata to a first-class record of its own — the **inode** (index node) — and reduce directories to nothing but name → inode-number tables. The inode is the file's true identity: fixed size, fixed location, one per file. This lesson opens the inode up and does the arithmetic that makes its most famous trick work: addressing a gigabyte-scale file with a few hundred bytes of pointers.",
        ],
      },
      {
        kind: "intuition",
        body: [
          "In a hospital, a patient is *not* their wristband. The wristband carries a name and an ID number; the **chart** behind the desk carries everything that matters — history, allergies, test results — and it is keyed by the ID number. Two wristbands printed with the same ID (a hard link) still mean one chart. Throw a wristband away and the chart survives; retire the chart and the patient, administratively, ceases to exist.",
          "The wristbands are directory entries; the ID number is the inode number; the chart is the inode. And one more habit of hospitals matters here: the chart has a fixed number of *pockets* (fields), so it cannot grow unboundedly. An inode is a fixed-size record — which is why 'how do I point at a huge file with a small record?' is a real question with a clever answer (indirection) rather than an afterthought.",
        ],
      },
      {
        kind: "visual",
        simId: "filesystem-lab",
        body: [
          "In the lab, every file row carries its inode number, size in blocks, permissions and created/modified stamps — a miniature inode. Create three files in a row and read the event log: inodes are handed out sequentially, mirroring how a real filesystem allocates inode numbers from an inode bitmap.",
          "Now `chmod /docs/readme.txt` to `rw-r-----` and notice *where* the change appears: in the file's metadata row, not in the directory structure. The name never changed; the chart did. Delete a file and the log reports the inode being freed along with its blocks — identity and data retired together, only at the end.",
        ],
      },
      {
        kind: "technical",
        body: [
          "An **inode** is a fixed-size record holding: the file *type* (regular file, directory, device), **size**, the **owner** user and group IDs, the nine **permission bits** you will meet in lesson 4, **timestamps** (creation, modification, metadata change), the **link count**, and — the heart of it — the **block pointers** saying where the data lives. Notably absent: the file's name, which lives only in directories.",
          "The classic Unix pointer scheme layers direct and indirect pointers. The inode holds **12 direct pointers** — block addresses, good for small files with zero extra reads — plus a pointer to a **single indirect block**: a data block full of nothing but block addresses. For 1 KiB blocks with 4-byte addresses, one indirect block holds 256 pointers. Beyond that, a **double indirect** pointer leads to a block of pointers to indirect blocks, and (classically) a **triple indirect** level beyond. Small files pay nothing extra; huge files pay a few extra reads at their edges.",
          "This design also answers 'where does the free space live?' — the **free-space bitmap**: one bit per block (and a second bitmap for inode numbers), 1 meaning taken. A 32-block disk needs 32 bits = 4 bytes of bitmap. VSFS, the teaching filesystem, lays the disk out as superblock, inode bitmap, data bitmap, inode table, then data blocks; the lab collapses all of that into a single 32-bit `used` array, but every create/delete you perform updates exactly that bitmap's logic.",
        ],
        equations: [
          {
            expr: "Pointers per indirect block = block size ÷ pointer size",
            symbols: [
              { sym: "block size", meaning: "bytes per disk block (1 KiB in the classic scheme)" },
              { sym: "pointer size", meaning: "bytes per block address (4 bytes = 32-bit block numbers)" },
            ],
            note: "1024 ÷ 4 = 256 addresses per indirect block — the number every size calculation below builds on.",
          },
          {
            expr: "Max file blocks = 12 + P + P² + P³   (P = pointers per indirect block)",
            symbols: [
              { sym: "12", meaning: "direct pointers in the inode" },
              { sym: "P, P², P³", meaning: "capacity of single, double, triple indirect levels" },
            ],
            note: "With P = 256: 12 + 256 + 65,536 + 16,777,216 ≈ 16 GiB of 1-KiB blocks addressable from one small inode.",
          },
          {
            expr: "Bitmap bytes = blocks ÷ 8",
            symbols: [
              { sym: "blocks", meaning: "total blocks tracked by the free-space bitmap" },
            ],
            note: "One bit per block: a 32-block lab disk needs 4 bytes; a 1 TiB disk of 4-KiB blocks needs 256 MiB — cheap, and why bitmaps won over free lists.",
          },
        ],
      },
      {
        kind: "worked-example",
        steps: [
          {
            title: "Sizing a file through the pointer tree",
            body: [
              "1 KiB blocks, 4-byte pointers, so P = 256. A 250-block file: the first 12 blocks ride the direct pointers; the remaining 238 need the single indirect block. Total disk footprint: 250 data blocks **+ 1 indirect block** = 251 blocks — the indirection itself occupies a block you must read before any of blocks 13–250.",
              "A 300-block file is the first interesting case: 12 direct, then 256 via single indirect (268 so far), leaving 32 for the double indirect level — which costs 1 double-indirect block + 1 first-level indirect block + 32 data blocks. The tree, not just the file, occupies space; filesystem designers live in exactly this arithmetic.",
            ],
          },
          {
            title: "Link counts, step by step",
            body: [
              "Create `a.txt`: inode 12, link count 1. `link a.txt b.txt`: count 2 — two names, one chart. `link b.txt c.txt`: count 3.",
              "`rm b.txt`: count 2. `rm a.txt`: count 1. `rm c.txt`: count 0 — *now* the inode and its data blocks are freed. At every earlier point the file was complete and openable through any remaining name; nothing was 'partially deleted'. Predicting that count is pure bookkeeping, and the quiz will make you do it.",
            ],
          },
        ],
      },
      {
        kind: "misconceptions",
        items: [
          {
            wrong: "The inode stores the file's name.",
            right: "Names live exclusively in directory entries. The inode does not know any of its names — which is precisely what allows one inode to have several, and what makes rename a directory-entry edit rather than a metadata rewrite.",
          },
          {
            wrong: "The inode contains the file's data.",
            right: "The inode contains *pointers* to data blocks. The data lives in the data region; for files beyond 12 blocks, some of those pointers first lead to indirect blocks full of more pointers.",
          },
        ],
      },
      {
        kind: "knowledge-check",
        questions: [
          {
            id: "kc-m9-in-1",
            q: "A file is created (link count 1), hard-linked once (count 2), then the original name is deleted. What is the link count, and does the data survive?",
            options: [
              "1 — the data survives and is fully readable through the second name",
              "0 — the data is freed when the original name goes",
              "2 — links are independent of deletions",
              "1 — but the data is truncated to zero bytes",
            ],
            answerIndex: 0,
            explanation:
              "Each unlink decrements: 1 → 2 (link) → 1 (delete one name). The inode and its blocks are reclaimed only at 0, so the file remains intact behind the surviving name.",
          },
          {
            id: "kc-m9-in-2",
            q: "With 1 KiB blocks and 4-byte block pointers, what is the largest file reachable through the 12 direct pointers plus ONE single indirect block (in blocks)?",
            options: [
              "268 blocks — 12 direct + 256 via the indirect block",
              "1024 blocks — one pointer per byte of the indirect block",
              "256 blocks — the indirect block alone, direct pointers don't count",
              "13 blocks — one block per pointer",
            ],
            answerIndex: 0,
            explanation:
              "The indirect block holds 1024 ÷ 4 = 256 addresses. 12 + 256 = 268 blocks (and the indirect block itself costs one extra block of disk when used).",
          },
        ],
      },
      {
        kind: "references",
        items: [
          {
            label: "OSTEP, Chapter 40: File System Implementation",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/file-implementation.pdf",
            note: "the VSFS layout — inodes, block pointers, bitmaps — that this lesson summarizes",
          },
          {
            label: "man7: stat(2) — file status",
            url: "https://man7.org/linux/man-pages/man2/stat.2.html",
            note: "the real syscall that returns an inode's metadata (the stat struct is the inode, exported)",
          },
          {
            label: "man7: inode(7) — file characteristics",
            url: "https://man7.org/linux/man-pages/man7/inode.7.html",
            note: "every field of a Linux inode, including link counts and timestamps",
          },
        ],
      },
      {
        kind: "note",
        body: [
          "Lab simplifications: the lab shows the inode as a row (number, size, permissions, two logical timestamps) and hides the block-pointer tree — layout is decided by the allocation mode you choose in the next lesson. Timestamps are operation counters, not clock times. There is no separate inode bitmap or superblock on display, though the lab's `used` array is exactly the free-space bitmap in spirit.",
        ],
      },
    ],
  },
  {
    id: "filesystems/allocation-methods",
    moduleId: "filesystems",
    title: "File Allocation Methods",
    minutes: 11,
    objectives: [
      "compare contiguous, linked and indexed allocation on seeks, growth and fragmentation",
      "predict when contiguous allocation fails despite sufficient free space",
      "count the index-block overhead of indexed allocation for a set of files",
    ],
    sections: [
      {
        kind: "problem",
        body: [
          "The inode knows *which* blocks belong to a file — but the filesystem has to decide *which blocks those are*. The disk is a linear array; a file wants to be a set of blocks; and every way of choosing that set trades something away. Three classical answers: **contiguous allocation** (one unbroken run — fastest reads, but files cannot grow and the disk shatters into holes), **linked allocation** (each block points to the next — no external fragmentation, but reading block n means chasing n−1 links), and **indexed allocation** (one block of pointers per file — random access and growth, at the price of one block per file).",
          "There is no winner — only a trade-off triangle you must be able to reason about. Memory management (module 5) faced the same triangle for *processes*; filesystems face it for *files*, with a twist: files change size constantly, so the 'can it grow in place?' question decides cases memory never sees.",
        ],
      },
      {
        kind: "intuition",
        body: [
          "Booking hotel rooms for a tour group: **contiguous** books one corridor — 'rooms 201–210' — so walking the group anywhere is a straight line, but if every corridor has a couple of strangers in it, a group of ten cannot be seated *anywhere* despite ten empty rooms scattered about. **Linked** is a treasure hunt: each room's note names the next room; any scattered rooms will do, but visiting room 5 means collecting notes from rooms 1–4 first. **Indexed** hands the group leader an index card listing every room number: scatter freely, and any room is one glance away — at the cost of one card per group even if the group is a party of one.",
          "The strangers between groups are *external fragmentation* — module 5's old acquaintance, back with a meaner streak, because a disk in use cannot be compacted the way memory sometimes can.",
        ],
      },
      {
        kind: "visual",
        simId: "filesystem-lab",
        body: [
          "The lab's allocation-mode switch reformats the 32-block disk (a real `mkfs` preserves nothing either). With each mode set, **read** a multi-block file and compare the traces: contiguous prints a single run — 'one seek, then straight reads'; linked chases a chain block by block; indexed reads the *index block first*, then the data blocks.",
          "Then watch the lab's honesty feature: under contiguous allocation, delete a middle file, scatter new files around the holes, and try to create a file needing a run — the lab **fails the create** and says exactly why: enough free blocks, no contiguous run. No simulation theater; the failure is the lesson.",
        ],
      },
      {
        kind: "experiment",
        simId: "filesystem-lab",
        prompts: [
          "Start contiguous. Create several 1–2 block files to fill the disk, delete two non-adjacent ones so the freed blocks are isolated, then create a file larger than the biggest remaining run. Confirm the honest failure message counts free blocks correctly — and note that linked and indexed would both have succeeded.",
          "Reformat as linked and repeat the scattered create: it succeeds, taking the lowest-numbered free blocks. Read the file and watch the chain trace. Now reason about deleting one block *in the middle of a chain*: what must a real linked filesystem guarantee before reusing that block, and what happens if a pointer ever corrupts? (Every block after it is lost.)",
          "Reformat as indexed and create a 1-block file. Check the wasted-blocks counter: it rose by 1 — the index block, as big as the file's entire data. Create a second 1-block file: overhead doubles. What fraction of the disk is overhead if it holds sixteen 1-block files? (Half.)",
          "Under contiguous allocation, append 2 blocks to a file whose next-door block is occupied. The append fails — contiguous files cannot grow in place. Real filesystems respond by relocating the file or by using extents; name the allocation method whose growth is effortless (linked/indexed) and the price it paid for that.",
        ],
        body: [
          "Lab conventions: creates take the first hole (contiguous) or lowest free blocks (linked/indexed); indexed charges exactly one index block per file regardless of size; the free-space bitmap updates visibly on every operation; reformats wipe everything, as a real mkfs would.",
        ],
      },
      {
        kind: "technical",
        body: [
          "**Contiguous allocation** stores each file as one run of consecutive blocks; the inode needs only a start block and a length. Sequential reads are unbeatable — one seek, then the head glides — and metadata is tiny. The costs are structural: files cannot grow without relocating, and the free space external-fragments into holes exactly like module 5's memory. The classic fix, **extents**, grants a file *several* runs — a pragmatic middle ground used by ext4 and NTFS.",
          "**Linked allocation** scatters blocks and chains them: each block ends with a pointer to the next. No external fragmentation, growth is trivial, and a directory needs only the first block. The cost is random access: reaching block n costs n−1 pointer-chases — on-disk chases in the pure form, which is ruinous. The **File Allocation Table (FAT)** family moved the chains *into one table kept in memory*: the disk block contains data only, and 'following the link' is a RAM lookup — that is why FAT was viable on small disks and why it degrades as the table grows.",
          "**Indexed allocation** gives each file one **index block**: an array of its data-block addresses. Random access becomes one index read plus one data read; growth just appends entries while the index block has room. The price is fixed and per-file: one block of overhead per file — brutal for a disk of 1-block files (half the disk is indexes), invisible for big ones. Unix's direct-plus-indirect scheme (lesson 2) is indexed allocation *with graduated index blocks*, so small files pay no index block at all. Free space in all modern schemes is a **bitmap**: one bit per block; the allocator finds a run (contiguous) or any free bit (linked/indexed) as its scheme prefers.",
        ],
        equations: [
          {
            expr: "Seeks to reach block n = 1 (contiguous) | n (linked, on-disk) | 2 (indexed)",
            symbols: [
              { sym: "n", meaning: "position of the target block within the file" },
            ],
            note: "Contiguous: one seek then stream. Linked: chase n−1 on-disk pointers first. Indexed: index block, then data block.",
          },
          {
            expr: "Blocks on disk (indexed) = data blocks + 1 per file",
            symbols: [
              { sym: "data blocks", meaning: "the blocks holding the file's bytes" },
            ],
            note: "F files of 1 block each: F data + F index = 2F blocks — indexed overhead is per FILE, not per filesystem.",
          },
          {
            expr: "External fragmentation failure: free blocks ≥ size  AND  max hole < size  ⟹  contiguous create FAILS",
            symbols: [
              { sym: "max hole", meaning: "largest run of consecutive free blocks" },
            ],
            note: "The lab implements exactly this predicate and reports both numbers in its failure message — the textbook condition, made honest.",
          },
        ],
      },
      {
        kind: "misconceptions",
        items: [
          {
            wrong: "FAT is indexed allocation — the table is an index.",
            right: "FAT is *linked* allocation with the chains pulled into a single in-memory table: each FAT entry points to the NEXT block of the same file, so reaching block n still means following n−1 links — fast RAM steps, but a chain, not a random-access index array.",
          },
          {
            wrong: "If enough blocks are free, any create succeeds.",
            right: "Contiguous allocation needs a run as long as the file. The lab's failure — 'N blocks are free but no contiguous run of k exists' — is the honest signature of external fragmentation, and the reason real filesystems abandoned strict contiguity.",
          },
        ],
      },
      {
        kind: "knowledge-check",
        questions: [
          {
            id: "kc-m9-al-1",
            q: "Three files of 2, 1 and 4 data blocks are created under indexed allocation. How many blocks do they occupy in total?",
            options: [
              "10 — 7 data blocks plus 3 index blocks",
              "7 — index blocks are metadata, not disk blocks",
              "11 — one shared index block plus 7 data plus one spare",
              "28 — three index blocks of 9 pointers each",
            ],
            answerIndex: 0,
            explanation:
              "Indexed allocation charges one index block per FILE: 2+1+4 = 7 data blocks + 3 index blocks = 10. The overhead is per file, independent of file size.",
          },
          {
            id: "kc-m9-al-2",
            q: "A 32-block disk uses a free-space bitmap. How many bytes does the bitmap need?",
            options: [
              "4 bytes — 32 blocks at one bit each",
              "32 bytes — one byte per block",
              "1 byte — 32 flags fit in a single 32-bit word",
              "256 bytes — one word per block",
            ],
            answerIndex: 0,
            explanation:
              "One bit per block: 32 bits = 4 bytes. The same arithmetic is why bitmaps scale: a billion-block disk needs only 128 MB of bitmap.",
          },
        ],
      },
      {
        kind: "references",
        items: [
          {
            label: "OSTEP, Chapter 40: File System Implementation",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/file-implementation.pdf",
            note: "contiguous vs linked vs indexed in full, with the free-space bitmap — this lesson's source text",
          },
          {
            label: "OSTEP, Chapter 41: Fast File System (FFS)",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/file-ffs.pdf",
            note: "how a real filesystem engineers block placement to keep files near-contiguous",
          },
          {
            label: "man7: inode(7) — file characteristics",
            url: "https://man7.org/linux/man-pages/man7/inode.7.html",
            note: "where the block pointers this lesson allocates actually live",
          },
        ],
      },
      {
        kind: "note",
        body: [
          "Lab simplifications: the lab's linked mode silently picks the lowest free blocks and never models on-disk link storage or a FAT table in memory; its indexed mode uses exactly one index block (no multi-level growth); 'content' is not stored, only layout. Appends under contiguous allocation fail when the neighbor block is occupied — real systems relocate or use extents. All three modes share one free-space bitmap, updated on every operation, which is faithful to real designs.",
        ],
      },
    ],
  },
  {
    id: "filesystems/permissions-journaling",
    moduleId: "filesystems",
    title: "Permissions, Buffering & Journaling",
    minutes: 10,
    objectives: [
      "read and write Unix permission strings, including the octal encoding",
      "explain the write() → page cache → disk pipeline and its crash window",
      "order the steps of metadata journaling and predict what recovery replays",
    ],
    sections: [
      {
        kind: "problem",
        body: [
          "Two tail problems hang off everything built so far. First, *protection*: a filesystem shared by many users must answer 'may this user read/write/execute this file?' for every access — without a per-access conversation. Second, *crash consistency*: writing one file update touches many places — data blocks, inode, directory entry, free bitmap — and the disk commits them one at a time. Power dies between two of those writes and the filesystem is left telling two different stories about the same file. A filesystem that loses files on every crash is not a filesystem.",
          "Both problems are solved by the same shape of trick. Permissions: store a small decision table *in the inode* and let the kernel apply it mechanically. Crashes: write a note *before* touching anything — the journal — so that after a crash the filesystem can look up what was in flight and finish or discard it, instead of guessing from the wreckage.",
        ],
      },
      {
        kind: "intuition",
        body: [
          "**Permissions** are a hotel mail-room wall: every mailbox has three rows of residents — its owner, the owner's household (group), and everyone else — and three lamp buttons per row: may *read* it, may *drop* something in, and — for a *door*, not a mailbox — may *walk through*. Nine lamps per object; one glance answers every access: find your row, read your lamps.",
          "**Journaling** is a wedding coordinator's run-sheet: before touching the seating chart, the cake or the band, she writes the plan in pen — 'move the chart, then update the cards'. If the power dies mid-move, whoever restarts the job reads the sheet: plan committed but not yet done? Finish it. Never committed? Erase the pencil marks and move on. The sheet costs one extra write — and buys certainty out of chaos.",
        ],
      },
      {
        kind: "visual",
        simId: "filesystem-lab",
        body: [
          "The lab's `chmod` edits the nine permission characters stored in the file's inode row — exactly where a real chmod writes. Try `chmod /docs/readme.txt` to `rw-r-----` and read the string the way the kernel does: owner `rw-`, group `r--`, other `---`.",
          "Predict, before the lab confirms it: may the *owner* still read? May a group member write? May a stranger do anything? The lab applies the same owner → group → other rule the kernel uses; a full interactive version with users and groups lives in module 11's Protection Lab, and that module's access-control lesson builds directly on this one.",
        ],
      },
      {
        kind: "technical",
        body: [
          "**Unix permissions** are nine bits stored in the inode: three operations — read `r`, write `w`, execute `x` — for three subject classes — **owner**, **group**, **other** — written as nine characters (`rwxr-x---`) or three octal digits (each digit = 4·r + 2·w + 1·x; `rwxr-x---` = 750). The kernel's check is *first match*: if you are the owner, only the owner triad applies — even if the group triad is more generous. On a *directory*, `r` lists entries, `w` creates/deletes entries in it, and `x` traverses through it — 'execute a directory' means walk into it, a fact that surprises everyone exactly once.",
          "**Buffering and the page cache**: `write()` does not touch the disk. It copies your bytes into the kernel's **page cache** and returns immediately — that is why writes feel instant. The kernel flushes dirty pages later, in an order of its own choosing, and `fsync()` forces the wait. The performance win is enormous (the cache also serves repeat reads from RAM); the cost is the **crash window**: between `write()` returning and the flush finishing, the data exists only in volatile memory.",
          "**Journaling** closes the crash window for *metadata* (the filesystem's own bookkeeping). Before modifying the on-disk structures, the kernel writes the intended changes to the **journal** — a circular log — and **commits** the journal entry; only then does it apply the changes in place, later freeing the journal space ('checkpoint'). On reboot after a crash, replay finds committed-but-unapplied entries and re-applies them, or discards uncommitted ones: either way the filesystem is a *consistent* older state or the intended newer one — never a half-written chimera. Classic `fsck` did this offline by walking everything; journaling turns a full-disk scan into a log read. (Most Linux filesystems journal metadata by default; data journaling is optional and slower.)",
        ],
        equations: [
          {
            expr: "Octal triad = 4·r + 2·w + 1·x   per class (owner, group, other)",
            symbols: [
              { sym: "r, w, x", meaning: "1 if the bit is set, 0 otherwise" },
            ],
            note: "`rw-r--r--` = 6·100 + 4·10 + 4 = 644; `rwxr-x---` = 750. Read octal fluently and chmod stops being folklore.",
          },
          {
            expr: "Journal protocol: T_write → T_commit → apply in place → checkpoint free",
            symbols: [
              { sym: "T_write", meaning: "the intended metadata updates, buffered in the journal" },
              { sym: "T_commit", meaning: "the commit record marking the entry complete" },
            ],
            note: "Crash before commit → discard (old state stands). Crash after commit → replay the update. The two windows are safe by construction.",
          },
        ],
      },
      {
        kind: "worked-example",
        steps: [
          {
            title: "A crash during an append, two ways",
            body: [
              "Appending to a file writes a data block, updates the inode (size, pointer), and may update the free bitmap — three separate disk writes. Without a journal, power dies after the data block lands but before the inode update: the file's size claims fewer blocks than are written, and the bitmap claims the block is free — a stale write over it later corrupts a *different* file. Recovery by `fsck` means scanning the whole disk to reconcile the three stories.",
              "With metadata journaling, the intent — 'inode 12 grows: add block 57; bitmap: take 57' — is journalled and committed *first*. The crash leaves: journal entry committed, updates not applied. Replay applies both; the filesystem comes up exactly as the append intended. The data block's own contents were never journalled (metadata journaling), so the fresh bytes may be absent — but the *structure* is sound, which is the promise journaling makes.",
            ],
          },
          {
            title: "Reading and writing a permission string",
            body: [
              "`rw-r-x---` — owner: `rw-` (read and write, no execute); group: `r-x` (read and execute); other: `---` (nothing). Octal: owner 4+2 = 6, group 4+1 = 5, other 0 → 650.",
              "Reverse it: `chmod 750 script.sh` → owner `rwx`, group `r-x`, other `---`: the owner can edit and run it, the team can run it, strangers are locked out. One habit to drill: for directories, check `x` first — `rw` without `x` lets you list a directory's names but not open anything in it.",
            ],
          },
        ],
      },
      {
        kind: "misconceptions",
        items: [
          {
            wrong: "Journaling writes the file's data to the journal by default.",
            right: "Most Linux filesystems journal *metadata* only (ext4's default mode journals metadata and orders data writes against it). Full data journaling is opt-in and costs a second write of every byte — the run-sheet records the plan, not the whole wedding.",
          },
          {
            wrong: "The x bit on a directory means the directory can be run like a program.",
            right: "On a directory, x is *traverse* permission: the right to pass through and reach entries inside. `r` without `x` lists names you cannot open; `x` without `r` lets you open files whose names you already know.",
          },
        ],
      },
      {
        kind: "knowledge-check",
        questions: [
          {
            id: "kc-m9-pj-1",
            q: "What is the octal encoding of `rwxr-x---`?",
            options: [
              "750 — 7 = rwx for owner, 5 = r-x for group, 0 = nothing for other",
              "740 — group gets read only",
              "755 — other must also get r-x",
              "550 — execute is not counted",
            ],
            answerIndex: 0,
            explanation:
              "Each triad sums 4 (r) + 2 (w) + 1 (x): owner rwx = 7, group r-x = 5, other --- = 0. Octal digits map one-to-one onto the three triads.",
          },
          {
            id: "kc-m9-pj-2",
            q: "Power fails AFTER the journal entry is committed but BEFORE the metadata updates are applied in place. What does recovery do?",
            options: [
              "Replays the committed entry — applies the intended updates, leaving the new consistent state",
              "Discards the entry — the old state stands",
              "Leaves the filesystem inconsistent until fsck scans every block",
              "Marks the affected file corrupt and unlinks it",
            ],
            answerIndex: 0,
            explanation:
              "A commit record is the point of no return: replay re-applies the journalled updates. (It is a crash BEFORE the commit that is discarded.) The whole design exists to make both windows safe.",
          },
        ],
      },
      {
        kind: "references",
        items: [
          {
            label: "OSTEP, Chapter 42: FSCK and Journaling",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/file-journaling.pdf",
            note: "the full crash-consistency story — fsck first, then the journaling protocol this lesson summarizes",
          },
          {
            label: "man7: inode(7) — file characteristics",
            url: "https://man7.org/linux/man-pages/man7/inode.7.html",
            note: "the permission bits and their meaning for files versus directories",
          },
          {
            label: "man7: chmod(2) — change permissions of a file",
            url: "https://man7.org/linux/man-pages/man2/chmod.2.html",
            note: "the real syscall behind the lab's chmod button",
          },
        ],
      },
      {
        kind: "note",
        body: [
          "Lab simplifications: the lab's chmod is a nine-character edit with no users, groups or owner identity attached (module 11's Protection Lab adds all three), and it stores no octal form. The lab simulates no crashes and has no journal — the crash windows and the T_write/T_commit protocol above are taught conceptually, because a crash button is one thing a filesystem lab should never actually need.",
        ],
      },
    ],
  },
  {
    id: "filesystems/disk-scheduling",
    moduleId: "filesystems",
    title: "Disk Scheduling Algorithms",
    minutes: 11,
    objectives: [
      "trace FCFS, SSTF, SCAN, C-SCAN, LOOK and C-LOOK over a request queue",
      "compute total head movement as a sum of cylinder distances",
      "justify each algorithm by the pathology it fixes — and name the one it introduces",
    ],
    sections: [
      {
        kind: "problem",
        body: [
          "Every lesson so far treated 'read block 57' as one step. On a spinning disk that step has anatomy: the **seek** (the arm moves to the right cylinder — milliseconds), **rotational latency** (the platter spins the sector under the head), and only then the **transfer**. The seek dominates, and the seek cost depends on *where the head is and where it goes next*. With a queue of pending requests, the OS's choice of *order* can halve or triple the total movement.",
          "So disk scheduling is a genuine optimization problem: serve all requests while minimizing head travel, under an arrival stream the OS cannot fully predict. Six algorithms structure the space — from 'do nothing clever' to 'be an elevator' — and every one of them is a lesson in what greed costs, what fairness buys, and why the physical world turns scheduling into geometry.",
        ],
      },
      {
        kind: "intuition",
        body: [
          "An **elevator** in an office tower. **FCFS**: serve floors strictly in button-press order — perfectly fair, absurdly wasteful when floor-30 presses come while you're at floor 2. **SSTF** (shortest seek time first): always hop to the *nearest* pending floor — efficient in bursts, but a quiet 35th-floor request can be skipped forever while the lobby keeps generating closer ones (starvation). **SCAN**: the elevator's actual policy — sweep to the top, then to the bottom, serving everyone along the way: no starvation, bounded waits. **C-SCAN**: a bus route — sweep upward serving, then zip back to the bottom *without* serving, so every floor gets waits of equal *length*. **LOOK** and **C-LOOK**: the honest versions — turn around at the *last request*, not the physical end of the shaft, because nobody is waiting on floor 40 of a 40-floor building.",
          "The geometry is the algorithm: minimize distance, but never at the price of ignoring a direction of travel — SCAN's whole insight is that the head is already going somewhere, so pick up whatever lies ahead.",
        ],
      },
      {
        kind: "visual",
        simId: "disk-scheduling-lab",
        body: [
          "The **Disk Scheduling Lab** loads the textbook scenario: 200 cylinders (0–199), head at 53, direction up, queue `98, 183, 37, 122, 14, 124, 65, 67`. Pick an algorithm and step through: each serviced request reports the cylinders moved, and the finished run reports the total.",
          "Switch algorithms on the *same* queue and compare totals before tracing any of them: the spread (640 down to 236 on the numbers the lab's engine tests verify) is the entire argument for scheduling. Then watch the head path: SSTF's zig-zags versus SCAN's clean sweep tell the same story geometrically that the totals tell numerically.",
        ],
      },
      {
        kind: "experiment",
        simId: "disk-scheduling-lab",
        prompts: [
          "Run all six algorithms on the default queue and confirm the totals verified by the lab's engine tests: FCFS 640, SSTF 236, SCAN 331, LOOK 299, C-SCAN 382, C-LOOK 322. Before each run, predict the service order by hand — SSTF especially, where one greedy choice reshapes everything after it.",
          "SCAN and LOOK differ only in turnaround policy: SCAN rides to cylinder 199 before reversing, LOOK turns at 183 (the farthest request). The lab's verified totals — 331 vs 299 — differ by exactly 32: check that this equals riding up 199−183 and coming back the same 16 cylinders. When would the gap grow to nearly 200?",
          "C-SCAN (382) spends 199 cylinders on the return wrap alone — nearly as much as FCFS wastes on zig-zags. What does C-SCAN *buy* with that flat 199? (Uniform wait times across the disk.) Compare its service order with SCAN's.",
          "Fairness check: SSTF ignores direction entirely. Add a request at cylinder 10, then a stream of requests near the head (60–70), and step SSTF: the cylinder-10 request keeps being postponed. Now run SCAN — it reaches everything on each sweep. Which property is SSTF missing, and which classical CPU scheduler from module 3 starves for the same structural reason?",
        ],
        body: [
          "Lab conventions: 200 cylinders (0–199), movement measured in cylinders (no seek-time curve, no rotational latency), the whole queue known up front, direction defaults to up, and SSTF breaks ties toward the lower cylinder. Totals are computed for the full run before the first step, so switching algorithms re-plans honestly.",
        ],
      },
      {
        kind: "technical",
        body: [
          "**FCFS** serves in arrival order — the baseline every number in this lesson is measured against (640 on the textbook queue). **SSTF** serves the request nearest the current head; total 236 here, a 63% improvement — but it is greedy, direction-blind, and can **starve** distant requests under sustained nearby load. **SCAN** sweeps in one direction serving everything, rides to the disk's edge (199), reverses, and sweeps back: total 331 here (the lab only rides to the edge when requests exist on the far side); wait times are bounded but requests at the extremes wait longest. **LOOK** ('look before you go') is SCAN that reverses at the farthest *request* (183) instead of the edge: 299 — never worse than SCAN on a fixed queue, and what real implementations do.",
          "**C-SCAN** makes waiting uniform: serve upward to the edge (199), fly back to 0 serving nothing, then sweep up again — requests see the head pass at regular intervals. Total 382 here, 199 of which is the return wrap. **C-LOOK** is its honest sibling: turn at the farthest request and jump to the *lowest* request (not to 0): 322, with the jump 183→14 costing 169. Modern practice: SCAN/LOOK variants with fairness weights — and on SSDs, which have no head at all, this entire vocabulary transfers to garbage-collection and request reordering instead.",
          "Two costing notes for the exercises. First, only *seeks* are counted here; rotational latency (~half a revolution) and transfer time ride along but are similar for every algorithm, so movement comparisons survive. Second, the lab computes each run's total before the first step, so switching algorithms re-plans the same queue honestly — you can compare six totals for one workload, which is the whole point.",
        ],
        equations: [
          {
            expr: "Total movement = Σ |cᵢ₊₁ − cᵢ|   over the service path",
            symbols: [
              { sym: "cᵢ", meaning: "the i-th stop on the head's path, starting from the initial head position" },
            ],
            note: "Every algorithm is just a permutation of the queue; the metric never changes. FCFS's 640 = 45+85+146+85+108+110+59+2 on the textbook queue.",
          },
          {
            expr: "SCAN (up) = (199 − head) + (199 − min)      LOOK (up) = (lastUp − head) + (lastUp − min)",
            symbols: [
              { sym: "min", meaning: "the lowest request (14 in the textbook queue)" },
              { sym: "lastUp", meaning: "the highest request (183)" },
            ],
            note: "SCAN: (199−53) + (199−14) = 146 + 185 = 331. LOOK: (183−53) + (183−14) = 130 + 169 = 299. The 32-cylinder gap is pure edge overshoot.",
          },
          {
            expr: "C-SCAN (up) = (199 − head) + 199 + lastDown      C-LOOK (up) = (lastUp − head) + (lastUp − firstDown) + (lastDown − firstDown)",
            symbols: [
              { sym: "lastDown", meaning: "the highest request below the head (37)" },
              { sym: "firstDown", meaning: "the lowest request (14)" },
            ],
            note: "C-SCAN: 146 + 199 + 37 = 382 (the 199 is the counted wrap). C-LOOK: 130 + 169 + 23 = 322 — the jump lands on the lowest request, not the edge.",
          },
        ],
      },
      {
        kind: "worked-example",
        steps: [
          {
            title: "SSTF on the textbook queue, step by step",
            body: [
              "Head 53. Distances: 65→12, 67→14, 37→16, 98→45, 122→69, 124→71, 14→39, 183→130. Nearest: **65** (12). From 65: 67→2 — take it. From 67: 37→30 vs 98→31 — take **37** (and note how close the tie was). From 37: **14** (23). Now only the right side remains: 98 (84), then 122 (24), 124 (2), 183 (59).",
              "Order: 65, 67, 37, 14, 98, 122, 124, 183. Movement: 12+2+30+23+84+24+2+59 = **236** — versus FCFS's 640 on the same queue. The lab's engine unit tests verify exactly this total, so you can trace it in the sim and land on the same number.",
            ],
          },
          {
            title: "Reading the SCAN–LOOK gap",
            body: [
              "SCAN sweeps 53→199 (146 cylinders), then reverses and serves 37 and 14 on the way down (185 more): 331. LOOK serves the same right-side requests but turns at 183, then descends straight to 14: 130 + 169 = 299.",
              "The 32-cylinder difference is (199−183) × 2 — riding up past the last request and coming back. Moral: LOOK is never worse than SCAN on a fixed queue and usually better; SCAN's full sweep buys nothing except *predictability* when new requests keep arriving behind the head. That is the honest trade: LOOK optimizes the past, SCAN optimizes the future.",
            ],
          },
        ],
      },
      {
        kind: "misconceptions",
        items: [
          {
            wrong: "SSTF is the optimal algorithm because it always makes the greedy choice.",
            right: "Greedy-nearest is neither globally optimal (a slightly longer first hop can save much more later) nor fair: sustained traffic near the head starves distant cylinders. SSTF merely beats FCFS; the SCAN family beats it on both totals and fairness.",
          },
          {
            wrong: "SCAN always wastes a full trip to cylinder 199 and back to 0.",
            right: "Classical SCAN does sweep to the edges; the lab's engine (like real implementations, and like LOOK) reverses only when requests exist on the other side — 331, not the ~371 a full out-and-back would cost here. The edge trip is precisely what LOOK deletes.",
          },
        ],
      },
      {
        kind: "knowledge-check",
        questions: [
          {
            id: "kc-m9-ds-1",
            q: "Head at 50, queue: 45, 52, 40, 60. Under SSTF, what is the service order and total movement?",
            options: [
              "52, 45, 40, 60 — total 34",
              "45, 40, 52, 60 — total 45",
              "52, 60, 45, 40 — total 40",
              "45, 52, 40, 60 — total 38",
            ],
            answerIndex: 0,
            explanation:
              "Nearest-first: 52 (2), then 45 (7), then 40 (5), then 60 (20): 2+7+5+20 = 34. The last hop to 60 is huge — the greedy algorithm's structural blind spot.",
          },
          {
            id: "kc-m9-ds-2",
            q: "Which algorithm can starve a distant request indefinitely, and which property of SCAN fixes it?",
            options: [
              "SSTF; SCAN serves every request on each sweep, in both directions",
              "FCFS; SCAN adds priorities",
              "C-SCAN; its full-edge sweeps are slower, so everyone waits equally",
              "LOOK; turning at the last request guarantees urgency",
            ],
            answerIndex: 0,
            explanation:
              "SSTF is direction-blind and nearest-first, so a far request loses to every nearer arrival. SCAN's sweep passes every cylinder once per direction — bounded wait, no starvation.",
          },
        ],
      },
      {
        kind: "references",
        items: [
          {
            label: "OSTEP, Chapter 37: Hard Disk Drives",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/file-disks.pdf",
            note: "seek, rotate, transfer — the anatomy that makes head movement the cost to minimize",
          },
          {
            label: "OSTEP, Chapter 36: I/O Devices",
            url: "https://pages.cs.wisc.edu/~remzi/OSTEP/file-devices.pdf",
            note: "where disk scheduling sits in the I/O stack — module 10's starting point",
          },
        ],
      },
      {
        kind: "note",
        body: [
          "Lab simplifications: movement is counted in cylinders with no seek-time curve (real seeks are nonlinear — long moves amortize), no rotational latency, no transfer phase, and the whole queue is known up front (offline scheduling). C-SCAN counts the 199→0 wrap as a full sweep (a teaching model; some texts count it as free or as ~1 track). SSTF ties break toward the lower cylinder. The lab's six totals — FCFS 640, SSTF 236, SCAN 331, LOOK 299, C-SCAN 382, C-LOOK 322 — are pinned by engine unit tests, so every hand computation above can be checked against it.",
        ],
      },
    ],
  },
];
