import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['var(--font-ibm-plex-mono)'],
        sans: ['var(--font-plus-jakarta-sans)'],
      },
      colors: {
        bg:      '#080d1a',
        surface: '#0d1424',
        card:    '#111c30',
        border:  '#1a2840',
        accent:  '#00d4aa',
        blue:    '#3b82f6',
        purple:  '#8b5cf6',
        amber:   '#f59e0b',
        danger:  '#ef4444',
        success: '#10b981',
        orange:  '#f97316',
        muted:   '#374151',
        dim:     '#6b7280',
        soft:    '#94a3b8',
        text:    '#e2e8f0',
      },
    },
  },
  plugins: [],
};
export default config;
