const {
  light,
  dark
} = require('@charcoal-ui/theme');
const {
  createTailwindConfig
} = require('@charcoal-ui/tailwind-config');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  // デフォルトのTailwindのclassが効かないのはコイツのせい
  presets: [
    createTailwindConfig({
      version: 'v3',
      theme: {
        ':root': light,
      },
    }),
  ],
  theme: {
    extend: {
      colors: {
        primary: '#000000',
        'primary-hover': '#1a1a1a',
        'primary-press': '#333333',
        'primary-disabled': '#0000004D',
        secondary: '#3B82F6',
        'secondary-hover': '#60A5FA',
        'secondary-press': '#93C5FD',
        'secondary-disabled': '#3B82F64D',
        base: '#F3F4F6',
        'text-primary': '#514062',

        // トースト用のより鮮明な色定義
        'toast-info': '#007BFF',
        'toast-info-hover': '#0056B3',
        'toast-error': '#DC3545',
        'toast-error-hover': '#BD2130',
        'toast-success': '#28A745',
        'toast-success-hover': '#218838',
      },
      fontFamily: {
        M_PLUS_2: ['Montserrat', 'M_PLUS_2', 'sans-serif'],
        Montserrat: ['Montserrat', 'sans-serif'],
        'noto-sans-jp': ['Noto Sans JP', 'sans-serif'],
      },
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px',
      },
      width: {
        '1/2': '50%',
      },
      zIndex: {
        5: '5',
        15: '15',
      },
    },
  },
  plugins: [require('@tailwindcss/line-clamp')],
};