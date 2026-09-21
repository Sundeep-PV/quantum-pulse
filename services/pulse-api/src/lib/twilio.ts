import twilioClient from "twilio";
import { config } from "../config.js";

const client = twilioClient(config.twilio.accountSid || "AC_placeholder", config.twilio.authToken || "placeholder");

/**
 * Sends the daily WhatsApp text message: a short hook + the lesson page link.
 * Uses the pre-approved template SID (required for WhatsApp Business outbound
 * messages outside a 24h user-initiated session window).
 */
export async function sendLessonText(params: {
  to: string; // E.164, e.g. +14155551234
  day: number;
  hook: string;
  lessonUrl: string;
}) {
  return client.messages.create({
    from: config.twilio.whatsappFrom,
    to: `whatsapp:${params.to}`,
    contentSid: config.twilio.templateSid,
    contentVariables: JSON.stringify({
      1: String(params.day),
      2: params.hook,
      3: params.lessonUrl,
    }),
  });
}

/**
 * Sends the day's narrated lesson as a WhatsApp media (voice-note style)
 * message. Twilio WhatsApp supports MediaUrl on outbound messages; the URL
 * must be a stable, direct-fetchable audio URL -- here, the access-worker's
 * signed/gated R2 URL (see edge/access-worker) so a leaked media URL can't
 * be replayed past the subscriber's own course window.
 */
export async function sendLessonAudio(params: { to: string; audioUrl: string; day: number }) {
  return client.messages.create({
    from: config.twilio.whatsappFrom,
    to: `whatsapp:${params.to}`,
    mediaUrl: [params.audioUrl],
    body: `Day ${params.day} audio lesson`,
  });
}
