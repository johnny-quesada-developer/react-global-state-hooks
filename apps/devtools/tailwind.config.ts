import type { Config } from 'tailwindcss';
import { themeExtend } from './src/shared/theme';

export default {
  content: ['./**.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: ['class'],
  theme: {
    extend: themeExtend,
  },
  plugins: [],
} satisfies Config;
