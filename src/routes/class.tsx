import { createFileRoute } from "@tanstack/react-router";
import { AcademyClassroom } from "@/components/AcademyClassroom";
export const Route = createFileRoute("/class")({
  head: () => ({ meta: [{ title: "Free classroom | AI AutoPilot" }] }),
  component: () => <AcademyClassroom lessonId="free-webinar" />,
});
