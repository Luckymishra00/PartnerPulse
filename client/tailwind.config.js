/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        harbor: { 950: '#081824', 900: '#0B1D2B', 800: '#0E2433', 700: '#17394F', 600: '#24506A', 500: '#3A6A86', 300: '#8FB0C4', 200: '#BCD0DC' },
        paper: '#EDF0EE',
        sheet: '#F8FAF9',
        line: '#D6DDDA',
        line2: '#C2CCC8',
        quiet: '#5B6E6A',
        signal: { DEFAULT: '#3355FF', dark: '#2441D9', tint: '#E6EAFF' },
        ok: { DEFAULT: '#1F9D6B', tint: '#E0F3EA', text: '#136C49' },
        warn: { DEFAULT: '#E3A02B', tint: '#FBF0D9', text: '#7D5200' },
        bad: { DEFAULT: '#D93A4B', tint: '#FBE4E7', text: '#A12333' },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['"Hanken Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: { panel: '10px' },
      keyframes: {
        sheetIn: { from: { transform: 'translateX(24px)', opacity: '0' }, to: { transform: 'none', opacity: '1' } },
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        ring: { '0%': { transform: 'scale(1)', opacity: '0.55' }, '100%': { transform: 'scale(2.6)', opacity: '0' } },
      },
      animation: {
        sheet: 'sheetIn .22s ease-out',
        fade: 'fadeIn .18s ease-out',
        ring: 'ring 1.6s ease-out 1.4s 2',
      },
    },
  },
  plugins: [],
};
