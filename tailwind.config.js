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
    { pattern: /^text-slate-(300|400|500|700|900)$/ },
    { pattern: /^border-slate-(200|300|500)$/ },
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
    // Yellow colors
    { pattern: /^bg-yellow-(100|300|800|900)$/ },
    { pattern: /^text-yellow-(300|500|700|900)$/ },
    { pattern: /^border-yellow-300$/ },
    // Pink colors
    { pattern: /^bg-pink-(100|300|800|900)$/ },
    { pattern: /^text-pink-(300|500|700|900)$/ },
    { pattern: /^border-pink-300$/ },
    // Red colors
    { pattern: /^bg-red-(100|300|600|700|800|900)$/ },
    { pattern: /^text-red-(300|500|600|700|900)$/ },
    { pattern: /^border-red-(200|300)$/ },
    // Amber colors
    { pattern: /^bg-amber-(50|100|200|700)$/ },
    { pattern: /^text-amber-700$/ },
    { pattern: /^border-amber-200$/ },
    // Indigo colors
    { pattern: /^bg-indigo-(100|700)$/ },
    { pattern: /^text-indigo-700$/ },
  ],
  corePlugins: {
    preflight: true,
  },
  plugins: [],
};
