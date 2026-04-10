/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        brand: {
          primary:   '#7C3AED',  // Electric Violet
          dark:      '#4C1D95',  // Deep Indigo
          secondary: '#14B8A6',  // Vivid Teal
          xp:        '#F59E0B',  // Warm Amber
          success:   '#22C55E',  // Fresh Green
          alert:     '#F87171',  // Soft Coral (never harsh red)
          bg:        '#F5F3FF',  // Cool off-white, slight violet tint
          navy:      '#1E1B4B',  // Text primary (Deep Navy)
          slate:     '#64748B',  // Text secondary
        },
      },
      animation: {
        'pulse-slow':   'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-gentle': 'pulseGentle 2.5s ease-in-out infinite',
        'orb-idle':     'orbIdle 4s ease-in-out infinite',
        'bounce-slow':  'bounce 2s infinite',
        'spin-slow':    'spin 3s linear infinite',
        'fade-in':      'fadeIn 0.3s ease-out',
        'slide-up':     'slideUp 0.25s ease-out',
        'slide-in':     'slideIn 0.3s ease-out',
        'scale-in':     'scaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1)',
        'float-up':     'floatUp 2.5s ease-out forwards',
        'shimmer':      'shimmer 1.5s infinite',
        'flame-sway':   'flameSway 3s ease-in-out infinite',
        'score-fill':   'scoreFill 1.5s ease-out forwards',
        'xp-float':     'xpFloat 2.2s ease-out forwards',
        'step-reveal':  'stepReveal 0.3s ease-out forwards',
      },
      keyframes: {
        fadeIn:      { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp:     { '0%': { transform: 'translateY(20px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        slideIn:     { '0%': { transform: 'translateX(16px)', opacity: '0' }, '100%': { transform: 'translateX(0)', opacity: '1' } },
        scaleIn:     { '0%': { transform: 'scale(0.85)', opacity: '0' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        pulseGentle: { '0%,100%': { opacity: '1', transform: 'scale(1)' }, '50%': { opacity: '0.85', transform: 'scale(0.97)' } },
        orbIdle:     { '0%,100%': { transform: 'scale(1)', opacity: '1' }, '50%': { transform: 'scale(1.05)', opacity: '0.9' } },
        flameSway:   { '0%,100%': { transform: 'rotate(-4deg)' }, '50%': { transform: 'rotate(4deg)' } },
        floatUp:     { '0%': { opacity: '0', transform: 'translateY(8px) scale(0.9)' }, '20%': { opacity: '1', transform: 'translateY(-16px) scale(1)' }, '80%': { opacity: '1', transform: 'translateY(-22px)' }, '100%': { opacity: '0', transform: 'translateY(-30px)' } },
        xpFloat:     { '0%': { opacity: '0', transform: 'translateY(0) scale(0.8)' }, '15%': { opacity: '1', transform: 'translateY(-12px) scale(1)' }, '80%': { opacity: '1', transform: 'translateY(-22px)' }, '100%': { opacity: '0', transform: 'translateY(-30px)' } },
        stepReveal:  { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        shimmer:     { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
      boxShadow: {
        'card':  '0 1px 3px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.04)',
        'card-hover': '0 2px 8px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.06)',
        'orb':   '0 0 32px rgba(124,58,237,0.4), 0 0 64px rgba(124,58,237,0.2)',
        'orb-sm':'0 0 16px rgba(124,58,237,0.35)',
        'action':'0 4px 16px rgba(124,58,237,0.25)',
      },
    },
  },
  plugins: [],
}
