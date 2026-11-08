import Link from "next/link";
import { lessonById } from "@/data/curriculum/lessons";
import { MODULE_MAP } from "@/data/curriculum/config";
import { getCloudSession } from "@/lib/supabase/server";
import { LessonContent } from "@/components/lesson/LessonContent";
import { LessonAuthGate } from "@/components/lesson/LessonAuthGate";

/**
 * Lesson route. When cloud sync is configured, lessons are ACCOUNT-GATED at
 * the server: the lesson content is only rendered into the response for a
 * verified session — signed-out visitors get the sign-up gate instead, and
 * the content never reaches their browser. Without Supabase env vars the
 * app runs in pure-local mode and lessons stay open.
 */
export default async function LessonPage({
  params,
}: {
  params: { moduleId: string; lessonId: string };
}) {
  const lesson = lessonById(`${params.moduleId}/${params.lessonId}`);

  // Unknown lesson: show the not-found card without requiring an account.
  if (!lesson) {
    return (
      <div className="card panel-pad">
        <h1 className="text-lg font-semibold text-ink">Lesson not found</h1>
        <p className="mt-2 text-sm text-ink-muted">
          No lesson “{params.moduleId}/{params.lessonId}”.{" "}
          <Link href={`/roadmap/${params.moduleId}`} className="link">
            Back to the module
          </Link>
          .
        </p>
      </div>
    );
  }

  const session = await getCloudSession();
  if (session.kind === "signed-out") {
    return <LessonAuthGate moduleTitle={MODULE_MAP[params.moduleId]?.title} />;
  }

  // Pure-local mode (unconfigured) and signed-in users get the lesson.
  return <LessonContent />;
}
