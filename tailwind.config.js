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
    },
  },
  safelist: [
    // Slate colors
    { pattern: /^bg-slate-(100|300|800|900)$/ },
    { pattern: /^text-slate-(300|500|700|900)$/ },
    { pattern: /^border-slate-300$/ },
    // Blue colors
    { pattern: /^bg-blue-(100|300|800|900)$/ },
    { pattern: /^text-blue-(300|500|700|900)$/ },
    { pattern: /^border-blue-300$/ },
    // Green colors
    { pattern: /^bg-green-(100|300|800|900)$/ },
    { pattern: /^text-green-(300|500|700|900)$/ },
    { pattern: /^border-green-300$/ },
    // Purple colors
    { pattern: /^bg-purple-(100|300|800|900)$/ },
    { pattern: /^text-purple-(300|500|700|900)$/ },
    { pattern: /^border-purple-300$/ },
    // Orange colors
    { pattern: /^bg-orange-(100|300|800|900)$/ },
    { pattern: /^text-orange-(300|500|700|900)$/ },
    { pattern: /^border-orange-300$/ },
  ],
  plugins: [],
};
