/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    './src/**/*.html'
  ],
  theme: {
    extend: {
      colors: {
        border:      'var(--border)',
        input:       'var(--input)',
        ring:        'var(--ring)',
        background:  'var(--background)',
        foreground:  'var(--foreground)',
        primary: {
          DEFAULT:    'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT:    'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        destructive: {
          DEFAULT:    'var(--destructive)',
        },
        muted: {
          DEFAULT:    'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT:    'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        popover: {
          DEFAULT:    'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        card: {
          DEFAULT:    'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        sidebar: {
          DEFAULT:              'var(--sidebar)',
          foreground:           'var(--sidebar-foreground)',
          primary:              'var(--sidebar-primary)',
          'primary-foreground': 'var(--sidebar-primary-foreground)',
          accent:               'var(--sidebar-accent)',
          'accent-foreground':  'var(--sidebar-accent-foreground)',
          border:               'var(--sidebar-border)',
          ring:                 'var(--sidebar-ring)',
        },
        gemini: {
          50:  '#f7f8ff',
          100: '#ebeeff',
          500: '#6a85f1',
          600: '#4f69db',
        },
      },
      borderRadius: {
        lg:  'var(--radius)',
        md:  'calc(var(--radius) - 2px)',
        sm:  'calc(var(--radius) - 4px)',
        xl2: '1.25rem',
      },
      boxShadow: {
        gemini: '0 8px 24px rgba(106, 133, 241, 0.22)',
      },
    },
  },
  plugins: [],
}

