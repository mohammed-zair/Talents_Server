import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          charcoal: "#070A0F",
          cyan: "#00A8E8",
          teal: "#12B5A6",
          premiumFrom: "#2D0B5A",
          premiumTo: "#B8860B",
        },
      },
      boxShadow: {
        glass: "0 24px 60px rgba(0,0,0,0.28)",
        neon: "0 0 22px rgba(0,168,232,0.45)",
        premium: "0 0 28px rgba(168,85,247,0.35)",
      },
      keyframes: {
        "premium-border": {
          "0%, 100%": { boxShadow: "0 0 16px rgba(168,85,247,0.35)" },
          "50%": { boxShadow: "0 0 28px rgba(245,158,11,0.45)" },
        },
      },
      animation: {
        "premium-border": "premium-border 2.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;