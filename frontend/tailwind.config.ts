import type { Config } from "tailwindcss";

const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./context/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // ── Semantic tokens (CSS var → Tailwind utilities) ──────────────────
      colors: {
        background:  v("background"),
        foreground:  v("foreground"),
        border:      v("border"),
        input:       v("input"),
        ring:        v("ring"),
        card:        { DEFAULT: v("card"), foreground: v("card-foreground") },
        popover:     { DEFAULT: v("popover"), foreground: v("popover-foreground") },
        primary:     { DEFAULT: v("primary"), foreground: v("primary-foreground") },
        secondary:   { DEFAULT: v("secondary"), foreground: v("secondary-foreground") },
        accent:      { DEFAULT: v("accent"), foreground: v("accent-foreground") },
        muted:       { DEFAULT: v("muted"), foreground: v("muted-foreground") },
        destructive: { DEFAULT: v("destructive"), foreground: v("destructive-foreground") },

        forest: {
          50:  "#f0f5f1",
          100: "#dcebe0",
          200: "#b9d6c2",
          300: "#93c2a0",
          400: "#4f9268",
          500: "#2d7a4a",
          600: "#1f5d36",
          700: "#163f25",
          800: "#0e2d1a",
        },
      },

      // ── Apple typography scale ───────────────────────────────────────────
      // Use as: text-large-title, text-headline, text-caption-1, etc.
      fontSize: {
        "large-title": ["2.125rem",  { lineHeight: "2.5625rem" }], // 34px / 41px
        "title-1":     ["1.75rem",   { lineHeight: "2.125rem" }],  // 28px / 34px
        "title-2":     ["1.375rem",  { lineHeight: "1.75rem" }],   // 22px / 28px
        "title-3":     ["1.25rem",   { lineHeight: "1.5625rem" }], // 20px / 25px
        "headline":    ["1.0625rem", { lineHeight: "1.375rem" }],  // 17px / 22px
        "body":        ["1.0625rem", { lineHeight: "1.375rem" }],  // 17px / 22px
        "callout":     ["1rem",      { lineHeight: "1.3125rem" }], // 16px / 21px
        "subhead":     ["0.9375rem", { lineHeight: "1.25rem" }],   // 15px / 20px
        "footnote":    ["0.8125rem", { lineHeight: "1.125rem" }],  // 13px / 18px
        "caption-1":   ["0.75rem",   { lineHeight: "1rem" }],      // 12px / 16px
        "caption-2":   ["0.6875rem", { lineHeight: "0.8125rem" }], // 11px / 13px

        // Marketing-only display sizes (do not use in dashboard UI)
        "display-1":   ["6rem",     { lineHeight: "1.02", letterSpacing: "-0.025em" }], // 96px
        "display-2":   ["4.5rem",   { lineHeight: "1.04", letterSpacing: "-0.025em" }], // 72px
        "display-3":   ["3.5rem",   { lineHeight: "1.05", letterSpacing: "-0.02em"  }], // 56px
      },

      // ── Apple border radii (override Tailwind defaults) ─────────────────
      // Existing code using rounded-xl, rounded-2xl etc. auto-migrates.
      borderRadius: {
        DEFAULT: "10px",
        sm:    "6px",
        md:    "10px",
        lg:    "12px",
        xl:    "16px",
        "2xl": "20px",
        "3xl": "24px",
        "4xl": "32px",
        full:  "9999px",
      },

      // ── System-UI font stack (SF Pro on Apple, system font elsewhere) ────
      fontFamily: {
        sans: [
          "system-ui", "-apple-system", "SF Pro Display",
          "Helvetica Neue", "sans-serif",
        ],
        serif: [
          "Iowan Old Style", "Georgia", "serif",
        ],
      },

      // ── Functional shadows only — no glow effects ───────────────────────
      boxShadow: {
        sm:  "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
        md:  "0 2px 8px rgba(0,0,0,0.08)",
        lg:  "0 4px 16px rgba(0,0,0,0.10)",
        xl:  "0 8px 24px rgba(0,0,0,0.12)",
      },

      // ── Functional animations only ───────────────────────────────────────
      animation: {
        "fade-in":   "fadeIn 0.2s cubic-bezier(0.4,0,0.2,1) both",
        "slide-up":  "slideInFromBottom 0.2s cubic-bezier(0.4,0,0.2,1) both",
        "scale-in":  "scaleIn 0.2s cubic-bezier(0.4,0,0.2,1) both",
        "skeleton":  "skeletonPulse 1.2s ease-in-out infinite",
        "spin":      "spin 1s linear infinite",
      },

      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        slideInFromBottom: {
          from: { opacity: "0", transform: "translateY(16px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          from: { opacity: "0", transform: "scale(0.92)" },
          to:   { opacity: "1", transform: "scale(1)" },
        },
        skeletonPulse: {
          "0%,100%": { opacity: "0.4" },
          "50%":     { opacity: "0.7" },
        },
      },

      transitionTimingFunction: {
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
