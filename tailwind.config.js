/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        void: '#050608',
        'emerald-deep': '#0a1f1c',
        'emerald-glow': '#22d3aa',
        'cyan-glow': '#67e8f9',
        hope: {
          light: '#fef08a',
          base: '#eab308',
          glow: '#facc15',
        },
        sadness: {
          light: '#93c5fd',
          base: '#3b82f6',
          glow: '#60a5fa',
        },
        curiosity: {
          light: '#6ee7b7',
          base: '#10b981',
          glow: '#34d399',
        },
        fear: {
          light: '#c084fc',
          base: '#6b21a8',
          glow: '#9333ea',
        },
      },
      boxShadow: {
        'glow-cyan': '0 0 25px -5px rgba(103, 232, 249, 0.4)',
        'glow-emerald': '0 0 25px -5px rgba(34, 211, 170, 0.4)',
        'glow-gold': '0 0 25px -5px rgba(250, 204, 21, 0.4)',
        'glow-blue': '0 0 25px -5px rgba(59, 130, 246, 0.4)',
        'glow-purple': '0 0 25px -5px rgba(168, 85, 247, 0.4)',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
}
