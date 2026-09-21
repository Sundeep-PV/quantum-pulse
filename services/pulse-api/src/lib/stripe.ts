import Stripe from "stripe";
import { config } from "../config.js";

export const stripe = new Stripe(config.stripe.secretKey || "sk_test_placeholder", {
  apiVersion: "2024-06-20",
});
