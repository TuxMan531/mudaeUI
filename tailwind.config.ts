import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Mudae-ish dark palette
        kakera: '#f0a',
        roll: '#5865f2', // Discord blurple
      },
    },
  },
  plugins: [],
} satisfies Config;
