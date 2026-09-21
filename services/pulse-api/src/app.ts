import Fastify from "fastify";
import cors from "@fastify/cors";
import healthRoutes from "./routes/health.js";
import checkoutRoutes from "./routes/checkout.js";
import stripeWebhookRoutes from "./routes/stripe-webhook.js";
import whatsappInboundRoutes from "./routes/whatsapp-inbound.js";
import verifyAccessRoutes from "./routes/verify-access.js";

export async function buildApp() {
  const app = Fastify({ logger: true });

  // Only quantumreadyea.org needs to call this service directly (checkout
  // creation from the embedded widget); everything else is server-to-server.
  await app.register(cors, { origin: ["https://quantumreadyea.org"] });

  // Stripe webhook signature verification needs the RAW body, so this route
  // is registered with its own raw content-type parser rather than Fastify's
  // default JSON body parser.
  app.addContentTypeParser("application/json", { parseAs: "string" }, (req, body, done) => {
    (req as any).rawBody = body;
    try {
      done(null, body.length ? JSON.parse(body as string) : {});
    } catch (err) {
      done(err as Error, undefined);
    }
  });

  await app.register(healthRoutes);
  await app.register(checkoutRoutes);
  await app.register(stripeWebhookRoutes);
  await app.register(whatsappInboundRoutes);
  await app.register(verifyAccessRoutes);

  return app;
}
