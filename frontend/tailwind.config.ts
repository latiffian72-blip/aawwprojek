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
        sans: ['var(--font-poppins)', 'Poppins', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'JetBrains Mono', 'monospace'],
      },
      colors: {
        bg:      '#F8F9FC',
        surface: '#F0F2F8',
        card:    '#FFFFFF',
        border:  '#E2E6F0',
        accent:  '#0EA5E9',
        blue:    '#0EA5E9',
        purple:  '#8B5CF6',
        amber:   '#F59E0B',
        danger:  '#EF4444',
        success: '#10B981',
        orange:  '#F97316',
        muted:   '#9BA8BF',
        dim:     '#6B7A99',
        soft:    '#3D4B63',
        text:    '#1A2033',
      },
    },
  },
  plugins: [],
};
export default config;
