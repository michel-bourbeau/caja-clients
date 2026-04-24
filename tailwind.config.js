/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
      },
      screens: {
        'sm': '640px',
        'md': '768px',
        'lg': '920px',  // Changed from 1024px to 920px for cart responsive behavior
        'xl': '1280px',
        '2xl': '1536px',
      },
    },
  },
  safelist: [],
  corePlugins: {
    preflight: true,
  },
  plugins: [],
};
