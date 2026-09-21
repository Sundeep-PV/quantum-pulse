export interface LessonContent {
  day: number;
  title: string;
  hook: string;
  articleBody: string;
  audioFile: string;
  quiz: { question: string; choices: string[]; answer: number } | null;
}
