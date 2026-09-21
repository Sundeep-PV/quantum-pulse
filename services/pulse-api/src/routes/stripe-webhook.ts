import type { FastifyInstance, FastifyRequest } from "fastify";
import { stripe } from "../lib/stripe.js";
import { config } from "../config.js";
import { prisma } from "../lib/prisma.js";
import { sendLessonText } from "../lib/twilio.js";

/**
 * POST /pulse/stripe-webhook
 *
 * IMPORTANT: this route must receive the RAW request body (not JSON-parsed)
 * so stripe.webhooks.constructEvent can verify the signature. Register this
 * route with Fastify's raw-body content-type parser -- see app.ts.
 *
 * Idempotency: Stripe can and will deliver the same event more than once.
 * We upsert on stripeCheckoutSessionId rather than blindly inserting.
 */
export default async function stripeWebhookRoutes(app: FastifyInstance) {
  app.post("/pulse/stripe-webhook", async (req: FastifyRequest, reply) => {
    const signature = req.headers["stripe-signature"];
    if (!signature || typeof signature !== "string") {
      return reply.code(400).send({ error: "missing stripe-signature header" });
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.rawBody as string, // populated by the raw-body plugin, see app.ts
        signature,
        config.stripe.webhookSecret
      );
    } catch (err) {
      req.log.error({ err }, "stripe webhook signature verification failed");
      return reply.code(400).send({ error: "invalid signature" });
    }

    if (event.type !== "checkout.session.completed") {
      return reply.send({ received: true, ignored: event.type });
    }

    const session = event.data.object as any;
    const { phone, country, timezone, consent_at } = session.metadata ?? {};

    if (!phone || !timezone) {
      req.log.error({ sessionId: session.id }, "checkout session missing required metadata");
      return reply.code(200).send({ received: true, warning: "missing metadata" });
    }

    // tomorrow, in the SUBSCRIBER's local date -- not server date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const subscriber = await prisma.pulseSubscriber.upsert({
      where: { stripeCheckoutSessionId: session.id },
      update: {}, // idempotent replay: no-op if we've already processed this session
      create: {
        phone,
        email: session.customer_details?.email ?? null,
        country: country || null,
        timezone,
        status: "active",
        currentDay: 0,
        startDate: tomorrow,
        stripeCheckoutSessionId: session.id,
        consentAt: consent_at ? new Date(consent_at) : new Date(),
      },
    });

    // Day-0 confirmation, sent immediately -- closes the loop on WhatsApp
    // right away rather than making the subscriber wait until tomorrow's cron.
    await sendLessonText({
      to: subscriber.phone,
      day: 0,
      hook: "You're in — Day 1 arrives tomorrow morning.",
      lessonUrl: config.lessonPagesBaseUrl,
    });

    return reply.send({ received: true });
  });
}
