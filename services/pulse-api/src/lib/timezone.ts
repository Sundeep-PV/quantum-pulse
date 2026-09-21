/**
 * Timezone helpers for the daily send loop.
 *
 * Why this matters: "your morning message" only means something if it's sent
 * in the SUBSCRIBER'S morning, not server time. The send job runs hourly and
 * calls isInSendWindow() per subscriber rather than firing once a day.
 */

const SEND_WINDOW_START_HOUR = 8; // 8am
const SEND_WINDOW_END_HOUR = 9; // 9am, exclusive

export function isInSendWindow(timezone: string, now: Date = new Date()): boolean {
  const hourInTz = Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: timezone,
    }).format(now)
  );
  return hourInTz >= SEND_WINDOW_START_HOUR && hourInTz < SEND_WINDOW_END_HOUR;
}

export function localDateString(timezone: string, now: Date = new Date()): string {
  // YYYY-MM-DD in the subscriber's local timezone -- used to dedupe "already
  // sent today" instead of comparing raw UTC timestamps (DST-safe).
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(now);
}
