import { useState } from "react";

const API_BASE_URL = (window as any).__QUANTUM_PULSE_API_BASE_URL__ ?? "https://api.quantumreadyea.org";

/**
 * The embedded signup card: phone + email + timezone + consent checkbox,
 * posts to pulse-api's /pulse/checkout-session, then redirects to Stripe
 * Checkout. This is the ONLY new UI surface added to quantumreadyea.org --
 * everything past payment happens over WhatsApp, not on the website.
 */
export function PulseSignupWidget() {
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!consent) {
      setError("Please confirm you agree to receive WhatsApp messages.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/pulse/checkout-session`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone, email, timezone, consent }),
      });
      if (!res.ok) throw new Error("Could not start checkout. Please try again.");
      const { checkoutUrl } = await res.json();
      window.location.href = checkoutUrl;
    } catch (err: any) {
      setError(err.message ?? "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <div className="qp-widget">
      <h3 className="qp-widget__title">Quantum Ready Pulse</h3>
      <p className="qp-widget__subtitle">21 days. 10 minutes a day. Delivered on WhatsApp.</p>

      <form onSubmit={handleSubmit} className="qp-widget__form">
        <label className="qp-widget__label">
          WhatsApp number
          <input
            type="tel"
            placeholder="+1 415 555 1234"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            className="qp-widget__input"
          />
        </label>

        <label className="qp-widget__label">
          Email (optional, for your receipt)
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="qp-widget__input"
          />
        </label>

        <label className="qp-widget__checkbox-row">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          <span>I agree to receive WhatsApp messages from Quantum Ready Pulse, including daily lessons.</span>
        </label>

        {error && <p className="qp-widget__error">{error}</p>}

        <button type="submit" disabled={loading} className="qp-widget__button">
          {loading ? "Redirecting to checkout…" : "Start the course"}
        </button>
      </form>
    </div>
  );
}
