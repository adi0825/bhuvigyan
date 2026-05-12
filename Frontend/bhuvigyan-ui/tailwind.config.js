/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary:   { DEFAULT:'#1a6b3c', light:'#d1fae5', dark:'#14532d' },
        secondary: '#f47920',
        govblue:   { DEFAULT:'#0057a8', light:'#dbeafe' },
        success:   '#2d8653',
        warning:   '#e07b00',
        danger:    '#c0392b',
        surface:   '#ffffff',
        muted:     '#6b7280',
      },
      fontFamily: {
        sans: ['Noto Sans', 'sans-serif'],
        deva: ['Noto Sans Devanagari', 'sans-serif'],
      },
      boxShadow: {
        card:    '0 2px 16px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04)',
        'card-hover': '0 6px 24px rgba(0,0,0,0.10)',
        input:   '0 0 0 3px rgba(26,107,60,0.12)',
      },
      animation: {
        shimmer:    'shimmer 1.4s infinite',
        dotPulse:   'dotPulse 1.5s ease-in-out infinite',
        fadeInUp:   'fadeInUp 0.4s ease-out',
        slideIn:    'slideIn 0.3s ease-out',
      },
      keyframes: {
        shimmer:  {'0%,100%':{backgroundPosition:'-200% 0'},'50%':{backgroundPosition:'200% 0'}},
        dotPulse: {'0%,100%':{opacity:'1',transform:'scale(1)'},'50%':{opacity:'0.5',transform:'scale(1.3)'}},
        fadeInUp: {'0%':{opacity:'0',transform:'translateY(16px)'},'100%':{opacity:'1',transform:'translateY(0)'}},
        slideIn:  {'0%':{opacity:'0',transform:'translateX(-12px)'},'100%':{opacity:'1',transform:'translateX(0)'}},
      }
    },
  },
  plugins: [],
};