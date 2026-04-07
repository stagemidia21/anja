import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        charcoal:     'rgb(var(--charcoal) / <alpha-value>)',
        'char-2':     'rgb(var(--char2) / <alpha-value>)',
        'char-3':     'rgb(var(--char3) / <alpha-value>)',
        gold:         'rgb(var(--gold) / <alpha-value>)',
        'gold-light': 'rgb(var(--gold-light) / <alpha-value>)',
        cream:        'rgb(var(--cream) / <alpha-value>)',
        muted:        'rgb(var(--text-muted) / <alpha-value>)',
        'off-white':  'rgb(var(--off-white) / <alpha-value>)',
        danger:       'rgb(var(--danger) / <alpha-value>)',
        success:      'rgb(var(--success) / <alpha-value>)',
      },
      fontFamily: {
        display: ['var(--font-cormorant)', 'serif'],
        body:    ['var(--font-dm-sans)', 'sans-serif'],
        mono:    ['var(--font-jetbrains)', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
