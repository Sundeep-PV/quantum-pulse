import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Builds to a single IIFE bundle (embed.ts as entry) so quantumreadyea.org
// can drop it in with <script src="pulse-widget.js" defer></script> and
// <div id="quantum-pulse-widget"></div> -- no bundler integration required
// on the main site's side.
export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: "src/embed.ts",
      name: "QuantumPulseWidget",
      fileName: () => "pulse-widget.js",
      formats: ["iife"],
    },
    cssCodeSplit: false,
    outDir: "dist",
  },
});
