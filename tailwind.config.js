/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        emerald: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
        // Add these custom colors that use CSS variables
        'background-color': 'hsl(var(--background))',
        'foreground-color': 'hsl(var(--foreground))',
        'card': 'hsl(var(--card))',
        'card-foreground': 'hsl(var(--card-foreground))',
        'popover': 'hsl(var(--popover))',
        'popover-foreground': 'hsl(var(--popover-foreground))',
        'primary': 'hsl(var(--primary))',
        'primary-foreground': 'hsl(var(--primary-foreground))',
        'secondary': 'hsl(var(--secondary))',
        'secondary-foreground': 'hsl(var(--secondary-foreground))',
        'muted': 'hsl(var(--muted))',
        'muted-foreground': 'hsl(var(--muted-foreground))',
        'accent': 'hsl(var(--accent))',
        'accent-foreground': 'hsl(var(--accent-foreground))',
        'destructive': 'hsl(var(--destructive))',
        'destructive-foreground': 'hsl(var(--destructive-foreground))',
        'border': 'hsl(var(--border))',
        'input': 'hsl(var(--input))',
        'ring': 'hsl(var(--ring))',
      }
    },
  },
  plugins: [],
}