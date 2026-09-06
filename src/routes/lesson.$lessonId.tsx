import { createFileRoute } from "@tanstack/react-router";
import { AcademyClassroom } from "@/components/AcademyClassroom";
export const Route = createFileRoute("/lesson/$lessonId")({
  head: () => ({
    meta: [{ title: "My lesson | AI AutoPilot" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: Lesson,
});
function Lesson() {
  const { lessonId } = Route.useParams();
  return <AcademyClassroom key={lessonId} lessonId={lessonId} />;
}
