// Dev-only harness -- NOT part of the production embed bundle (see embed.ts,
// which is the real entry point vite.config.ts builds). Run `npm run dev`
// to preview the widget standalone during development.
import { createRoot } from "react-dom/client";
import { PulseSignupWidget } from "./PulseSignupWidget";
import "./styles.css";

const root = createRoot(document.getElementById("root")!);
root.render(<PulseSignupWidget />);
