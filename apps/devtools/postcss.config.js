// PostCSS pipeline for the devtools panel. Vite picks this up automatically and runs it over the
// panel CSS (src/base.css). Without it, @tailwind/@apply are never processed and the panel ships
// unstyled. Tailwind v3 + autoprefixer (both in devDependencies).
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
