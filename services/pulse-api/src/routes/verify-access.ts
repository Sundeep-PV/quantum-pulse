import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";

/**
 * GET /pulse/verify-access?phone=...&day=...
 *
 * Internal endpoint the edge access-worker calls (service-to-service, not
 * public) before it will proxy a lesson's text page or stream its audio
 * file. Confirms the subscriber is active/paid AND has reached that day --
 * this is what stops a shared/leaked link from unlocking day 21 on day 2.
 *
 * The worker is the public-facing gate (see edge/access-worker); this route
 * is its source of truth so gating logic lives in one place, not duplicated
 * between the Worker's KV cache and this service.
 */
export default async function verifyAccessRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { phone: string; day: string } }>(
    "/pulse/verify-access",
    async (req, reply) => {
      const { phone, day } = req.query;
      const dayNum = Number(day);

      if (!phone || !Number.isInteger(dayNum)) {
        return reply.code(400).send({ access: "denied", reason: "bad request" });
      }

      const subscriber = await prisma.pulseSubscriber.findUnique({ where: { phone } });

      if (!subscriber || subscriber.status === "opted_out") {
        return reply.code(200).send({ access: "denied", reason: "no active subscription" });
      }

      if (dayNum > subscriber.currentDay) {
        return reply.code(200).send({ access: "denied", reason: "day not yet unlocked" });
      }

      return reply.code(200).send({ access: "granted" });
    }
  );
}
