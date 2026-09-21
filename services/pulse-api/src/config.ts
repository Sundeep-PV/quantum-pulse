function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    // Fail loudly at boot, not on first request -- matches Quantinnel's
    // existing service convention of validating env vars up front.
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: required("DATABASE_URL"),
  quantinnelServiceToken: process.env.QUANTINNEL_SERVICE_TOKEN ?? "",

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY ?? "",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
    priceId: process.env.STRIPE_PRICE_ID ?? "",
  },

  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID ?? "",
    authToken: process.env.TWILIO_AUTH_TOKEN ?? "",
    whatsappFrom: process.env.TWILIO_WHATSAPP_FROM ?? "",
    templateSid: process.env.TWILIO_TEMPLATE_SID ?? "",
  },

  lessonPagesBaseUrl: process.env.LESSON_PAGES_BASE_URL ?? "https://pulse.quantumreadyea.org",
  lessonAudioBaseUrl: process.env.LESSON_AUDIO_BASE_URL ?? "https://pulse.quantumreadyea.org/audio",
};
