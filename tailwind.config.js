/** Configuración para el build de producción (npm run build:css).
 *  Es la misma que usa index.html con el Play CDN. */
module.exports = {
  content: ['./index.html', './assets/js/**/*.js'],
  theme: {
    extend: {
      colors: {
            brand: { DEFAULT: '#3B5BFD', dark: '#2A44D6', soft: '#ECEEFF' },
            ink: { DEFAULT: '#14123A', soft: '#4A4868', mute: '#64627C' },
            surface: '#F6F5FB',
            line: '#E3E1EF',
            lilac: '#E7E3FF',
            peach: { DEFAULT: '#FFE9DB', line: '#FFD3B8' },
            sun: { DEFAULT: '#FFC93C', soft: '#FFF3CF' },
            mint: '#D8F3E6',
            ok: '#11946A',
            warn: '#8F5B0F',
            bad: '#D9415E'
          },
          fontFamily: {
            sans: ['Figtree', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
            display: ['"Bricolage Grotesque"', 'Figtree', 'system-ui', 'sans-serif']
          },
          boxShadow: {
            card: '0 1px 0 rgba(20,18,58,.04), 0 10px 28px -18px rgba(20,18,58,.28)',
            lift: '0 22px 44px -20px rgba(59,91,253,.45)'
          }
    }
  }
};
