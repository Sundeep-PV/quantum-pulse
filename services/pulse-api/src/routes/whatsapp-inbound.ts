import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";

const STOP_KEYWORDS = ["stop", "unsubscribe", "cancel"];
const HELP_KEYWORDS = ["help"];

/**
 * POST /pulse/whatsapp-inbound
 *
 * Twilio's inbound webhook for replies to our WhatsApp number. No carrier
 * auto-enforces STOP the way US SMS does -- this has to be handled in code.
 * This course doesn't run a two-way conversation, so anything that isn't
 * STOP/HELP is logged and otherwise ignored.
 */
export default async function whatsappInboundRoutes(app: FastifyInstance) {
  app.post("/pulse/whatsapp-inbound", async (req, reply) => {
    const body = req.body as { From?: string; Body?: string };
    const from = (body.From ?? "").replace("whatsapp:", "");
    const text = (body.Body ?? "").trim().toLowerCase();

    if (!from) {
      return reply.code(400).send({ error: "missing From" });
    }

    if (STOP_KEYWORDS.includes(text)) {
      await prisma.pulseSubscriber.updateMany({
        where: { phone: from },
        data: { status: "opted_out" },
      });
      req.log.info({ from }, "subscriber opted out");
    } else if (HELP_KEYWORDS.includes(text)) {
      // TODO: auto-reply with support contact via Twilio. No status change.
      req.log.info({ from }, "subscriber requested help");
    } else {
      req.log.info({ from, text }, "inbound message logged, no action taken");
    }

    return reply.code(200).send("<Response></Response>");
  });
}
