// Junta los correos que cada empresa publica en su propia web (inicio, contacto y "Trabajá con nosotros").
// Solo casillas que la empresa muestra al público; no adivina direcciones ni busca personas.
// Corre en GitHub Actions. Respeta robots.txt. Resultado: contactos.json y contactos.md.
import { readFile, writeFile } from 'node:fs/promises';

const UA = 'MasHumanosBot/0.1 (+https://github.com/skielxi-ux/emplea; hub de empleo del NOA)';
const PAUSA = 1200;
const dormir = ms => new Promise(r => setTimeout(r, ms));

async function pedir(url, ms = 9000) {
  const ac = new AbortController(); const t = setTimeout(() => ac.abort(), ms);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'es-AR,es' }, redirect: 'follow', signal: ac.signal });
    const tipo = r.headers.get('content-type') || '';
    return { ok: r.ok, url: r.url, texto: /html|text/.test(tipo) ? (await r.text()).slice(0, 1_500_000) : '' };
  } catch { return { ok: false, url, texto: '' }; } finally { clearTimeout(t); }
}
function leerRobots(txt) {
  const grupos = []; let g = null, ultimoUA = false;
  for (const l of txt.split(/\r?\n/)) {
    const m = l.replace(/#.*/, '').trim().match(/^([\w-]+)\s*:\s*(.*)$/); if (!m) continue;
    const k = m[1].toLowerCase(), v = m[2].trim();
    if (k === 'user-agent') { if (!ultimoUA) { g = { ua: [], reglas: [] }; grupos.push(g); } g.ua.push(v.toLowerCase()); ultimoUA = true; }
    else { ultimoUA = false; if (g && (k === 'allow' || k === 'disallow')) g.reglas.push([k, v]); }
  }
  const mio = grupos.filter(x => x.ua.some(u => u !== '*' && 'mashumanosbot'.includes(u)));
  const usar = (mio.length ? mio : grupos.filter(x => x.ua.includes('*'))).flatMap(x => x.reglas);
  return path => {
    let mejor = null;
    for (const [k, v] of usar) {
      if (!v) continue;
      const re = new RegExp('^' + v.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$'));
      if (re.test(path) && (!mejor || v.length > mejor[1].length || (v.length === mejor[1].length && k === 'allow'))) mejor = [k, v];
    }
    return !mejor || mejor[0] === 'allow';
  };
}
const robotsCache = new Map();
async function permitido(url) {
  const u = new URL(url);
  if (!robotsCache.has(u.origin)) {
    const r = await pedir(u.origin + '/robots.txt', 7000);
    robotsCache.set(u.origin, r.ok && r.texto && !/<html/i.test(r.texto.slice(0, 500)) ? leerRobots(r.texto) : () => true);
    await dormir(PAUSA);
  }
  return robotsCache.get(u.origin)(u.pathname + u.search);
}
const limpiar = s => s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
function enlaces(html, base) {
  const out = [];
  for (const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const href = m[1].match(/href\s*=\s*["']([^"']+)["']/i)?.[1]; if (!href || /^(tel|javascript|#)/i.test(href)) continue;
    let abs; try { abs = new URL(href, base).href; } catch { continue; }
    out.push({ url: abs, texto: limpiar(m[2]).slice(0, 80) });
  }
  return out;
}
// Cloudflare oculta los correos con data-cfemail: se decodifican igual que lo hace el navegador
function cf(hex) { const k = parseInt(hex.slice(0, 2), 16); let s = ''; for (let i = 2; i < hex.length; i += 2) s += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16) ^ k); return s; }
function correos(html) {
  const set = new Set();
  const txt = html.replace(/&#64;|&#x40;|\[at\]|\(at\)/gi, '@');
  for (const m of txt.matchAll(/mailto:([^"'?\s>]+)/gi)) set.add(decodeURIComponent(m[1]));
  for (const m of txt.matchAll(/data-cfemail=["']([0-9a-f]+)["']/gi)) set.add(cf(m[1]));
  for (const m of limpiar(txt).matchAll(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g)) set.add(m[0]);
  return [...set].map(x => x.toLowerCase().replace(/[.,;:]+$/, ''))
    .filter(x => /^[\w.+-]+@[\w-]+(\.[\w-]+)+$/.test(x) && !/\.(png|jpe?g|gif|webp|svg|css|js)$/.test(x) && !/(sentry|wixpress|example|dominio|tuemail|email\.com|yourdomain|@2x)/.test(x));
}
const RRHH = /rrhh|r\.r\.h\.h|recursos|humanos|seleccion|selección|talento|empleo|cv|curriculum|postulac|busquedas|jobs|careers|trabaj|personal|people|capital\.?humano|reclut/i;
const PAG = /contact|rrhh|trabaj|empleo|career|carrera|sumate|unite|recursos|talento|nosotros|about/i;

async function revisar(e, fuente) {
  const r = { nombre: e.nombre, rubro: e.rubro, web: fuente?.web || null, rrhh: [], generales: [], paginas: [] };
  if (!r.web) return r;
  const visitar = [r.web]; if (fuente.empleo && !/docs\.google|accounts\.google/.test(fuente.empleo)) visitar.push(fuente.empleo);
  const vistos = new Set();
  for (let i = 0; i < visitar.length && vistos.size < 5; i++) {
    const u = visitar[i]; if (vistos.has(u)) continue; vistos.add(u);
    if (!(await permitido(u))) continue;
    const x = await pedir(u); await dormir(PAUSA);
    if (!x.ok || !x.texto) continue;
    const host = new URL(r.web).host.replace(/^www\./, '');
    for (const c of correos(x.texto)) {
      const pal = c.split('@')[0];
      const lista = RRHH.test(pal) || (RRHH.test(u) && !/info|contacto|ventas|admin/.test(pal)) ? r.rrhh : r.generales;
      if (!r.rrhh.includes(c) && !r.generales.includes(c)) { lista.push(c); r.paginas.push(x.url); }
    }
    if (i === 0) for (const l of enlaces(x.texto, x.url)) {
      try { if (new URL(l.url).host.replace(/^www\./, '') !== host) continue; } catch { continue; }
      if (PAG.test(l.texto) || PAG.test(new URL(l.url).pathname)) visitar.push(l.url.split('#')[0]);
    }
  }
  r.paginas = [...new Set(r.paginas)];
  return r;
}

const empresas = JSON.parse(await readFile(new URL('./empresas.json', import.meta.url)));
const fuentes = JSON.parse(await readFile(new URL('./fuentes.json', import.meta.url))).empresas;
const res = new Array(empresas.length); let sig = 0; const LIMITE = Date.now() + 40 * 60e3;
await Promise.all(Array.from({ length: 8 }, async () => {
  while (sig < empresas.length && Date.now() < LIMITE) {
    const i = sig++; const e = empresas[i];
    const f = e.dominios.length ? fuentes.find(x => x.nombre === e.nombre) : null; // sin dominio = la web encontrada era de otra empresa
    res[i] = await Promise.race([revisar(e, f), dormir(150e3).then(() => ({ nombre: e.nombre, rubro: e.rubro, web: f?.web || null, rrhh: [], generales: [], paginas: [], nota: 'Tardó demasiado.' }))]);
    console.log(`${e.nombre}: ${res[i].rrhh.join(', ') || '-'} / ${res[i].generales.join(', ') || '-'}`);
  }
}));
for (let i = 0; i < empresas.length; i++) if (!res[i]) res[i] = { nombre: empresas[i].nombre, rubro: empresas[i].rubro, web: null, rrhh: [], generales: [], paginas: [], nota: 'No llegó a revisarse.' };
await writeFile(new URL('./contactos.json', import.meta.url), JSON.stringify({ revisado: new Date().toISOString(), empresas: res }, null, 1));
const md = ['# Correos publicados por las empresas', '', `Revisado: ${new Date().toISOString().slice(0, 10)}. Solo casillas que cada empresa muestra en su web.`, '',
  '| Empresa | Rubro | Correo de RRHH | Otros correos | Web |', '|---|---|---|---|---|',
  ...res.map(r => `| ${r.nombre} | ${r.rubro} | ${r.rrhh.join(', ') || '—'} | ${r.generales.slice(0, 3).join(', ') || '—'} | ${r.web || '—'} |`)];
await writeFile(new URL('./contactos.md', import.meta.url), md.join('\n') + '\n');
