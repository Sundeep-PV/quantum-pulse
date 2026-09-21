import type { FastifyInstance } from "fastify";
import { stripe } from "../lib/stripe.js";
import { config } from "../config.js";

interface CreateCheckoutBody {
  phone: string; // E.164
  email?: string;
  country?: string;
  timezone: string; // IANA, e.g. "America/New_York"
  consent: boolean;
}

/**
 * POST /pulse/checkout-session
 *
 * Called by web-embed/pulse-widget on quantumreadyea.org. Creates a Stripe
 * Checkout Session with phone/country/timezone/consent as metadata so the
 * webhook (stripe-webhook.ts) can upsert the subscriber without a second
 * round trip -- same pattern validated in the "Quantum in 10" plan.
 */
export default async function checkoutRoutes(app: FastifyInstance) {
  app.post<{ Body: CreateCheckoutBody }>("/pulse/checkout-session", async (req, reply) => {
    const { phone, email, country, timezone, consent } = req.body;

    if (!consent) {
      return reply.code(400).send({ error: "consent is required" });
    }
    if (!phone || !timezone) {
      return reply.code(400).send({ error: "phone and timezone are required" });
    }

    // TODO: validate phone as E.164 (e.g. libphonenumber-js) before creating
    // the session -- reject early rather than accepting garbage numbers.

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: config.stripe.priceId, quantity: 1 }],
      success_url: `${config.lessonPagesBaseUrl}/welcome?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.lessonPagesBaseUrl}/cancelled`,
      customer_email: email,
      metadata: {
        phone,
        country: country ?? "",
        timezone,
        consent_at: new Date().toISOString(),
      },
    });

    return reply.send({ checkoutUrl: session.url });
  });
}
