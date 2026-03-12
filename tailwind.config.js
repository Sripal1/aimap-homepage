/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Lato', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          teal: 'hsl(176, 47%, 26%)',
          'teal-light': 'hsl(176, 47%, 92%)',
          'teal-dark': 'hsl(176, 47%, 20%)',
        },
        stage: {
          prepare: {
            DEFAULT: 'hsl(215, 70%, 58%)',
            dim: 'hsla(215, 70%, 58%, 0.12)',
            border: 'hsla(215, 70%, 58%, 0.22)',
          },
          scrape: {
            DEFAULT: 'hsl(198, 55%, 55%)',
            dim: 'hsla(198, 55%, 55%, 0.12)',
            border: 'hsla(198, 55%, 55%, 0.22)',
          },
          combine: {
            DEFAULT: 'hsl(182, 50%, 52%)',
            dim: 'hsla(182, 50%, 52%, 0.12)',
            border: 'hsla(182, 50%, 52%, 0.22)',
          },
          summarize: {
            DEFAULT: 'hsl(168, 52%, 50%)',
            dim: 'hsla(168, 52%, 50%, 0.12)',
            border: 'hsla(168, 52%, 50%, 0.22)',
          },
          finalize: {
            DEFAULT: 'hsl(152, 55%, 52%)',
            dim: 'hsla(152, 55%, 52%, 0.12)',
            border: 'hsla(152, 55%, 52%, 0.22)',
          },
          deploy: {
            DEFAULT: 'hsl(142, 62%, 55%)',
            dim: 'hsla(142, 62%, 55%, 0.12)',
            border: 'hsla(142, 62%, 55%, 0.22)',
          },
        },
      },
      borderRadius: {
        'mememo': '5px',
        'mememo-lg': '10px',
      },
      boxShadow: {
        'card': '0px 0px 6px hsla(0, 0%, 0%, 0.07)',
        'card-hover': '0px 0px 10px hsla(0, 0%, 0%, 0.1)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.4)',
        'glass-sm': '0 4px 16px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
        'glass-lg': '0 12px 40px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.5)',
      },
      transitionDuration: {
        'fast': '80ms',
        'normal': '150ms',
        'slow': '300ms',
      },
      animation: {
        'fade-in': 'fadeIn 0.15s ease-out',
        'slide-up': 'slideUp 0.15s ease-out',
        'scale-in': 'scaleIn 0.15s ease-out',
        'shimmer': 'shimmer 2s linear infinite',
        'shine': 'shine 1.5s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
        'bounce-in': 'bounceIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'ping-ring': 'pingRing 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
        'wave': 'wave 1.2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'flip-in': 'flipIn 0.6s ease-out forwards',
        'stagger-in': 'staggerIn 0.3s ease-out both',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        shine: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0) rotate(-180deg)', opacity: '0' },
          '60%': { transform: 'scale(1.15) rotate(10deg)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
        },
        pingRing: {
          '0%': { transform: 'scale(1)', opacity: '0.8' },
          '75%, 100%': { transform: 'scale(2)', opacity: '0' },
        },
        wave: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(15deg)' },
          '75%': { transform: 'rotate(-15deg)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        flipIn: {
          '0%': { transform: 'perspective(400px) rotateY(-90deg)', opacity: '0' },
          '40%': { transform: 'perspective(400px) rotateY(10deg)' },
          '70%': { transform: 'perspective(400px) rotateY(-5deg)' },
          '100%': { transform: 'perspective(400px) rotateY(0deg)', opacity: '1' },
        },
        staggerIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 4px 0px hsla(176, 47%, 26%, 0.3)' },
          '50%': { boxShadow: '0 0 12px 4px hsla(176, 47%, 26%, 0.5)' },
        },
      },
    },
  },
  plugins: [],
}
