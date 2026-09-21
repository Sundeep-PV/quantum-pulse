import { createRoot } from "react-dom/client";
import { createElement } from "react";
import { PulseSignupWidget } from "./PulseSignupWidget";
import "./styles.css";

/**
 * Entry point for the IIFE bundle quantumreadyea.org includes directly:
 *
 *   <div id="quantum-pulse-widget"></div>
 *   <script src="https://cdn.quantumreadyea.org/pulse-widget.js" defer></script>
 *
 * Mounts automatically on DOMContentLoaded if the target div is present --
 * no init call required from the main site's own JS.
 */
function mount() {
  const target = document.getElementById("quantum-pulse-widget");
  if (!target) return;
  const root = createRoot(target);
  root.render(createElement(PulseSignupWidget));
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mount);
} else {
  mount();
}
