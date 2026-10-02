/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        game: {
          bg: '#E0F2FE',       // Sky blue canvas
          bgTile: '#BAE6FD',   // Checkerboard diamond tile
          skyLight: '#F0F9FF',
          sky: '#7DD3FC',
          skyDeep: '#38BDF8',
          binder: '#67E8F9',   // Light cyan/sky binder
          binderDark: '#0891B2',
          border: '#0F172A',   // Thick pixel border
          cardYellow: '#FEF08A',
          cardYellowBorder: '#EAB308',
          accentRed: '#F87171',
          accentRedDark: '#DC2626',
          accentGreen: '#4ADE80',
          accentGreenDark: '#16A34A',
          cream: '#FEF9C3',
          paper: '#FFFFFF',
          ink: '#0F172A',
        }
      },
      fontFamily: {
        game: ['"Press Start 2P"', 'monospace'],
        pixel: ['"Silkscreen"', 'monospace'],
        chunky: ['"Fredoka"', 'sans-serif'],
        sans: ['"Fredoka"', 'Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'pixel': '0 4px 0 #0F172A',
        'pixel-sm': '0 2px 0 #0F172A',
        'pixel-lg': '0 6px 0 #0F172A',
        'pixel-inset': 'inset 0 3px 0 rgba(255,255,255,0.6), inset 0 -3px 0 rgba(0,0,0,0.15)',
        'pixel-button': '0 4px 0 #0F172A',
      },
      animation: {
        'bounce-subtle': 'bounceSubtle 2s infinite',
        'wiggle': 'wiggle 0.5s ease-in-out infinite',
      },
      keyframes: {
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-3px)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        }
      }
    },
  },
  plugins: [],
}
