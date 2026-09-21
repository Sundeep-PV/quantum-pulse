/**
 * send-daily-lessons — the core recurring job.
 *
 * Runs HOURLY (not once a day): "your morning message" only means something
 * if it's sent in the subscriber's morning, and subscribers span timezones.
 * Deployed as a scheduled job (cron / GitHub Actions scheduled workflow /
 * whatever Quantinnel's own scheduler already runs, per docs/architecture.md
 * -- avoid a second scheduling system if one already exists).
 *
 * For every due subscriber, sends BOTH delivery formats:
 *   1. whatsapp_text  -- hook + lesson page link (template message)
 *   2. whatsapp_audio -- the narrated .m4b as a WhatsApp media message
 * as two independently-logged, independently-retryable sends (see
 * PulseMessageLog in prisma/schema.prisma) -- an audio send failing
 * shouldn't block the text hook from going out, and vice versa.
 */
import { prisma } from "../lib/prisma.js";
import { sendLessonText, sendLessonAudio } from "../lib/twilio.js";
import { isInSendWindow, localDateString } from "../lib/timezone.js";
import { config } from "../config.js";

const MAX_RETRY_ATTEMPTS = 3;

async function run() {
  const dueSubscribers = await prisma.pulseSubscriber.findMany({
    where: { status: "active", currentDay: { lt: 21 } },
  });

  const now = new Date();
  let sent = 0;
  let skipped = 0;

  for (const subscriber of dueSubscribers) {
    if (!isInSendWindow(subscriber.timezone, now)) {
      skipped++;
      continue;
    }

    const today = localDateString(subscriber.timezone, now);
    const lastSentDay = subscriber.lastSentAt
      ? localDateString(subscriber.timezone, subscriber.lastSentAt)
      : null;
    if (lastSentDay === today) {
      skipped++;
      continue; // already sent today, in the subscriber's local date
    }

    const nextDay = subscriber.currentDay + 1;
    const lesson = await prisma.pulseLesson.findUnique({ where: { day: nextDay } });
    if (!lesson) {
      // eslint-disable-next-line no-console
      console.error(`[-] No lesson found for day ${nextDay}, subscriber ${subscriber.id}`);
      continue;
    }

    const lessonUrl = `${config.lessonPagesBaseUrl}/day-${String(nextDay).padStart(2, "0")}`;
    const audioUrl =
      lesson.audioUrl ?? `${config.lessonAudioBaseUrl}/${lesson.audioFile}`;

    // 1. Text message (hook + link)
    try {
      const msg = await sendLessonText({
        to: subscriber.phone,
        day: nextDay,
        hook: lesson.hook,
        lessonUrl,
      });
      await prisma.pulseMessageLog.create({
        data: {
          subscriberId: subscriber.id,
          day: nextDay,
          channel: "whatsapp_text",
          status: "sent",
          twilioSid: msg.sid,
        },
      });
    } catch (err: any) {
      await prisma.pulseMessageLog.create({
        data: {
          subscriberId: subscriber.id,
          day: nextDay,
          channel: "whatsapp_text",
          status: "failed",
          errorMessage: String(err?.message ?? err),
        },
      });
      // Leave currentDay unchanged so this is retried next hour, up to
      // MAX_RETRY_ATTEMPTS -- checked via message log count, not enforced here.
      continue;
    }

    // 2. Audio message (narrated lesson, sent as WhatsApp media)
    try {
      const audioMsg = await sendLessonAudio({ to: subscriber.phone, audioUrl, day: nextDay });
      await prisma.pulseMessageLog.create({
        data: {
          subscriberId: subscriber.id,
          day: nextDay,
          channel: "whatsapp_audio",
          status: "sent",
          twilioSid: audioMsg.sid,
        },
      });
    } catch (err: any) {
      // Audio failure does NOT block progression -- the text message + lesson
      // page (which also embeds an audio player) already delivered the lesson.
      await prisma.pulseMessageLog.create({
        data: {
          subscriberId: subscriber.id,
          day: nextDay,
          channel: "whatsapp_audio",
          status: "failed",
          errorMessage: String(err?.message ?? err),
        },
      });
    }

    await prisma.pulseSubscriber.update({
      where: { id: subscriber.id },
      data: {
        currentDay: nextDay,
        lastSentAt: now,
        status: nextDay === 21 ? "completed" : "active",
      },
    });
    sent++;
  }

  // eslint-disable-next-line no-console
  console.log(`[send-daily-lessons] sent=${sent} skipped=${skipped} evaluated=${dueSubscribers.length}`);

  // TODO: post this summary line to Slack/email (cheapest useful monitoring
  // per docs/deployment.md) rather than only console output.
}

run()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
