"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  ActivityEvent,
  ModuleProgress,
  ProgressStateV1,
  QuizAttempt,
} from "@/types";

const STORAGE_KEY = "visual-os-academy-progress";
const ACTIVITY_LIMIT = 60;

export const emptyModuleProgress = (): ModuleProgress => ({
  lessonsDone: [],
  attempts: [],
  bestScore: 0,
  passed: false,
});

export const emptyProgress = (): ProgressStateV1 => ({
  version: 1,
  modules: {},
  activity: [],
  updatedAt: new Date().toISOString(),
});

/** Defensive parse: anything malformed yields a fresh state. */
function migrate(raw: unknown): ProgressStateV1 {
  if (!raw || typeof raw !== "object") return emptyProgress();
  const r = raw as Partial<ProgressStateV1>;
  if (r.version !== 1 || typeof r.modules !== "object" || r.modules === null) {
    return emptyProgress();
  }
  const modules: Record<string, ModuleProgress> = {};
  for (const [id, mp] of Object.entries(r.modules)) {
    if (!mp || typeof mp !== "object") continue;
    modules[id] = {
      lessonsDone: Array.isArray(mp.lessonsDone) ? mp.lessonsDone.filter((x) => typeof x === "string") : [],
      attempts: Array.isArray(mp.attempts) ? mp.attempts.filter((a) => a && typeof a.score === "number") : [],
      bestScore: typeof mp.bestScore === "number" ? mp.bestScore : 0,
      passed: Boolean(mp.passed),
    };
  }
  const activity = Array.isArray(r.activity) ? r.activity.filter((a) => a && typeof a.label === "string") : [];
  return { version: 1, modules, activity, updatedAt: r.updatedAt ?? new Date().toISOString() };
}

interface ProgressStore extends ProgressStateV1 {
  markLessonDone: (moduleId: string, lessonId: string, lessonTitle: string) => void;
  isLessonDone: (moduleId: string, lessonId: string) => boolean;
  recordAttempt: (attempt: QuizAttempt) => void;
  moduleProgress: (moduleId: string) => ModuleProgress;
  resetProgress: () => void;
}

export const useProgressStore = create<ProgressStore>()(
  persist(
    (set, get) => ({
      ...emptyProgress(),

      markLessonDone: (moduleId, lessonId, lessonTitle) =>
        set((s) => {
          const mp = s.modules[moduleId] ?? emptyModuleProgress();
          if (mp.lessonsDone.includes(lessonId)) return s;
          const activity: ActivityEvent = {
            ts: new Date().toISOString(),
            kind: "lesson",
            label: `Completed lesson “${lessonTitle}”`,
            moduleId,
          };
          return {
            ...s,
            modules: {
              ...s.modules,
              [moduleId]: { ...mp, lessonsDone: [...mp.lessonsDone, lessonId] },
            },
            activity: [activity, ...s.activity].slice(0, ACTIVITY_LIMIT),
            updatedAt: new Date().toISOString(),
          };
        }),

      isLessonDone: (moduleId, lessonId) =>
        Boolean(get().modules[moduleId]?.lessonsDone.includes(lessonId)),

      recordAttempt: (attempt) =>
        set((s) => {
          const mp = s.modules[attempt.moduleId] ?? emptyModuleProgress();
          const bestScore = Math.max(mp.bestScore, attempt.score / Math.max(1, attempt.total));
          const firstPass = !mp.passed && attempt.passed;
          const activity: ActivityEvent = {
            ts: attempt.takenAt,
            kind: "quiz",
            label: firstPass
              ? `Passed the ${attempt.moduleId} assessment (${attempt.score}/${attempt.total})`
              : `Scored ${attempt.score}/${attempt.total} on the ${attempt.moduleId} assessment`,
            moduleId: attempt.moduleId,
          };
          return {
            ...s,
            modules: {
              ...s.modules,
              [attempt.moduleId]: {
                ...mp,
                attempts: [...mp.attempts, attempt].slice(-30),
                bestScore,
                passed: mp.passed || attempt.passed,
              },
            },
            activity: [activity, ...s.activity].slice(0, ACTIVITY_LIMIT),
            updatedAt: new Date().toISOString(),
          };
        }),

      moduleProgress: (moduleId) => get().modules[moduleId] ?? emptyModuleProgress(),

      resetProgress: () =>
        set(() => ({
          ...emptyProgress(),
          activity: [
            {
              ts: new Date().toISOString(),
              kind: "reset",
              label: "All learning progress was reset",
            },
          ],
        })),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      merge: (persisted, current) => ({
        ...current,
        ...migrate(persisted),
      }),
    },
  ),
);
