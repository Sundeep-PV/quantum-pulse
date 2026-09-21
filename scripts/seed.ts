/**
 * Seeds the PulseLesson table from content/lessons.json. Run after every
 * migration and every content update:
 *   npx tsx scripts/seed.ts
 *
 * Intentionally lives outside services/pulse-api/src so it can be run
 * standalone against any target DATABASE_URL (e.g. staging) without booting
 * the Fastify app.
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LESSONS_PATH = path.resolve(__dirname, "../content/lessons.json");

const prisma = new PrismaClient();

async function main() {
  const { lessons } = JSON.parse(readFileSync(LESSONS_PATH, "utf-8"));

  for (const lesson of lessons) {
    await prisma.pulseLesson.upsert({
      where: { day: lesson.day },
      update: {
        title: lesson.title,
        hook: lesson.hook,
        articleBody: lesson.articleBody,
        audioFile: lesson.audioFile,
        quizJson: lesson.quiz,
      },
      create: {
        day: lesson.day,
        title: lesson.title,
        hook: lesson.hook,
        articleBody: lesson.articleBody,
        audioFile: lesson.audioFile,
        quizJson: lesson.quiz,
      },
    });
    console.log(`[✓] Seeded day ${lesson.day}: ${lesson.title}`);
  }

  console.log(`Done. ${lessons.length} lessons seeded.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
