import type { LessonProgress } from "./academy";

/** A replacement recording must never inherit watch evidence from its predecessor. */
export function currentMediaProgress<T extends LessonProgress>(
  progress: T,
  mediaVersion: string | null | undefined,
): T {
  if (mediaVersion && progress.media_version === mediaVersion) return progress;
  return { ...progress, intervals: [], duration: 0, position: 0 };
}

export type TutorConversationRow = {
  user_id: string;
  lesson_id: string;
  question: string;
  answer: string;
  created_at: string;
};

/** Only this learner's recent exchanges in this lesson can enter the tutor brief. */
export function tutorConversation(
  rows: TutorConversationRow[],
  userId: string,
  lessonId: string,
) {
  return rows
    .filter((row) => row.user_id === userId && row.lesson_id === lessonId)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    .slice(0, 6)
    .reverse()
    .map((row) => ({
      at: row.created_at,
      question: row.question.slice(0, 1500),
      answer: row.answer.slice(0, 2500),
    }));
}

/** Describe the missed concept without exposing a quiz answer key. */
export function missedQuizTopics(
  questions: { prompt: string }[],
  feedback: { correct: boolean; text: string }[],
) {
  return questions.flatMap((question, index) => feedback[index]?.correct === false
    ? [{ question: question.prompt, practice: feedback[index].text }]
    : []);
}
