/**
 * Quantum Ready Pulse — edge access worker.
 *
 * Adapted from the KV-gated access pattern in the Quantum Ready
 * audio-distribution reference (Stripe webhook -> short-lived KV token ->
 * gated fetch), extended here to also proxy the day's R2-hosted audio file
 * with byte-range support so WhatsApp/browsers can seek/stream it directly,
 * rather than only gating a single flat asset.
 *
 * This worker does NOT own subscriber state -- services/pulse-api (Postgres/
 * Prisma) is the source of truth for "is this subscriber active and has
 * they reached day N". This worker calls GET /pulse/verify-access per
 * request and caches a short-lived "granted" marker in KV so repeat plays
 * of the same day don't hit the origin API on every byte-range request.
 *
 * Routes:
 *   GET /verify-access?phone=&day=   -> { access: "granted" | "denied" }
 *   GET /audio/:audioFile?phone=&day= -> proxies the R2 object (range-aware)
 */

export interface Env {
  QUANTUM_AUTH_KV: KVNamespace;
  LESSON_AUDIO_BUCKET: R2Bucket;
  PULSE_API_BASE_URL: string;
  PULSE_API_SERVICE_TOKEN?: string;
}

const ACCESS_CACHE_TTL_SECONDS = 300; // 5 min -- balances origin load vs. staleness

async function checkAccess(env: Env, phone: string, day: string): Promise<boolean> {
  const cacheKey = `access:${phone}:${day}`;
  const cached = await env.QUANTUM_AUTH_KV.get(cacheKey);
  if (cached === "granted") return true;
  if (cached === "denied") return false;

  const url = `${env.PULSE_API_BASE_URL}/pulse/verify-access?phone=${encodeURIComponent(
    phone
  )}&day=${encodeURIComponent(day)}`;
  const res = await fetch(url, {
    headers: env.PULSE_API_SERVICE_TOKEN
      ? { Authorization: `Bearer ${env.PULSE_API_SERVICE_TOKEN}` }
      : {},
  });
  const body = (await res.json()) as { access: "granted" | "denied" };
  const granted = body.access === "granted";

  await env.QUANTUM_AUTH_KV.put(cacheKey, granted ? "granted" : "denied", {
    expirationTtl: ACCESS_CACHE_TTL_SECONDS,
  });
  return granted;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Endpoint A: access verification (used by lesson pages before showing content)
    if (url.pathname === "/verify-access") {
      const phone = url.searchParams.get("phone") ?? "";
      const day = url.searchParams.get("day") ?? "";
      if (!phone || !day) {
        return new Response(JSON.stringify({ access: "denied", reason: "missing params" }), {
          status: 400,
        });
      }
      const granted = await checkAccess(env, phone, day);
      return new Response(JSON.stringify({ access: granted ? "granted" : "denied" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // Endpoint B: audio proxy/stream -- range-aware fetch from R2, gated per subscriber+day
    if (url.pathname.startsWith("/audio/")) {
      const audioFile = url.pathname.replace("/audio/", "");
      const phone = url.searchParams.get("phone") ?? "";
      const day = url.searchParams.get("day") ?? "";

      if (!phone || !day) {
        return new Response("Missing phone or day", { status: 400 });
      }

      const granted = await checkAccess(env, phone, day);
      if (!granted) {
        return new Response(JSON.stringify({ access: "denied" }), { status: 403 });
      }

      const range = request.headers.get("range");
      const object = await env.LESSON_AUDIO_BUCKET.get(audioFile, {
        range: range ? parseRangeHeader(range) : undefined,
      });

      if (!object) {
        return new Response("Not found", { status: 404 });
      }

      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set("etag", object.httpEtag);
      headers.set("accept-ranges", "bytes");
      headers.set("cache-control", "private, max-age=0, must-revalidate");

      return new Response(object.body, {
        status: range ? 206 : 200,
        headers,
      });
    }

    return new Response("Not found", { status: 404 });
  },
};

function parseRangeHeader(rangeHeader: string): R2Range | undefined {
  // "bytes=START-END"
  const match = /^bytes=(\d+)-(\d*)$/.exec(rangeHeader);
  if (!match) return undefined;
  const offset = Number(match[1]);
  const end = match[2] ? Number(match[2]) : undefined;
  return end !== undefined ? { offset, length: end - offset + 1 } : { offset };
}
