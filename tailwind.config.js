/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['DM Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        'xs':   ['12px', { lineHeight: '1.5' }],
        'sm':   ['14px', { lineHeight: '1.55' }],
        'base': ['16px', { lineHeight: '1.6' }],
        'lg':   ['18px', { lineHeight: '1.55' }],
        'xl':   ['20px', { lineHeight: '1.5' }],
        '2xl':  ['22px', { lineHeight: '1.4' }],
        '3xl':  ['26px', { lineHeight: '1.35' }],
        '4xl':  ['30px', { lineHeight: '1.25' }],
        '5xl':  ['36px', { lineHeight: '1.2' }],
      },
      colors: {
        brand: {
          // Core brand — Forest Teal
          primary:   '#0D9488',
          mid:       '#14B8A6',
          light:     '#CCFBF1',
          pale:      '#99F6E4',
          dark:      '#0F766E',
          darker:    '#134E4A',
          hero:      '#0F1729',

          // Page / surface
          bg:        '#F8F7F4',
          landing:   '#F0FDFA',
          card:      '#FFFFFF',
          surface:   '#F9FAFB',
          border:    '#E5E7EB',

          // Text
          navy:      '#111827',
          slate:     '#6B7280',
          muted:     '#9CA3AF',
          hint:      '#4B5563',

          // Action — Coral Orange
          coral:     '#EA580C',
          'coral-dark': '#C2410C',
          'coral-light': '#FFF7ED',
          'coral-pale': '#FFEDD5',

          // Amber
          amber:     '#D97706',
          'amber-light': '#FEF3C7',
          'amber-dark': '#B45309',

          // Emerald
          emerald:   '#059669',
          'emerald-light': '#ECFDF5',
          'emerald-dark': '#065F46',

          // Status
          xp:        '#D97706',
          success:   '#059669',
          error:     '#DC2626',
          alert:     '#D97706',

          // Subject ring / accent colors
          physics:   '#2563EB',
          chemistry: '#EA580C',
          biology:   '#059669',
          maths:     '#7C3AED',
          cs:        '#0891B2',
          english:   '#E11D48',
          social:    '#D97706',
        },
      },
      animation: {
        'pulse-slow':   'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-gentle': 'pulseGentle 2.5s ease-in-out infinite',
        'orb-idle':     'orbIdle 4s ease-in-out infinite',
        'bounce-slow':  'bounce 2s infinite',
        'spin-slow':    'spin 3s linear infinite',
        'fade-in':      'fadeIn 0.2s ease-out',
        'slide-up':     'slideUp 0.2s ease-out',
        'slide-in':     'slideIn 0.3s ease-out',
        'scale-in':     'scaleIn 0.2s cubic-bezier(0.34,1.56,0.64,1)',
        'float-up':     'floatUp 2.5s ease-out forwards',
        'shimmer':      'shimmer 1.5s infinite',
        'flame-sway':   'flameSway 3s ease-in-out infinite',
        'score-fill':   'scoreFill 1.5s ease-out forwards',
        'xp-float':     'xpFloat 2.2s ease-out forwards',
        'step-reveal':  'stepReveal 0.3s ease-out forwards',
      },
      keyframes: {
        fadeIn:      { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp:     { '0%': { transform: 'translateY(12px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
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
        'card':       '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
        'card-hover': '0 2px 8px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.05)',
        'orb':        '0 0 32px rgba(13,148,136,0.4), 0 0 64px rgba(13,148,136,0.2)',
        'orb-sm':     '0 0 16px rgba(13,148,136,0.35)',
        'action':     '0 4px 16px rgba(13,148,136,0.15)',
      },
      borderRadius: {
        'card': '12px',
      },
    },
  },
  plugins: [],
}
