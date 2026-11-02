// Busca la página "Trabajá con nosotros" de cada empresa de empresas.json.
// Corre en GitHub Actions (Node 20+). Respeta robots.txt, va de a una empresa y espera entre pedidos.
// Resultado: fuentes.json (para la tarea diaria) e informe.md (para leer).
import { readFile, writeFile } from 'node:fs/promises';

const UA = 'MasHumanosBot/0.1 (+https://github.com/skielxi-ux/emplea; hub de empleo del NOA)';
const PAUSA = 1200;
const dormir = ms => new Promise(r => setTimeout(r, ms));

const PALABRAS = /trabaj[aáe]\s*con\s*nosotros|trabaj[aá]\s*en|sumate|unite|empleos?\b|carreras?\b|careers?\b|jobs?\b|b[uú]squedas|vacantes|postul|recursos\s*humanos|rrhh|talento|join\s*us|work\s*with\s*us/i;
const RUTAS = ['/trabaja-con-nosotros', '/trabaja-con-nosotros/', '/trabaje-con-nosotros', '/trabajaconnosotros', '/empleos', '/empleo', '/careers', '/carreras', '/rrhh', '/sumate', '/busquedas'];
// Plataformas de selección conocidas. Las de la lista NO_USAR no se recorren por sus reglas de uso.
const ATS = [
  ['Workday', /myworkdayjobs\.com|myworkdaysite\.com/], ['SuccessFactors', /successfactors|jobs\.sap\.com|career\d*\.sapsf/], ['HiringRoom', /hiringroom\.com/],
  ['Gupy', /gupy\.io/], ['Bizneo', /bizneohr\.com|bizneo\.com/], ['Lever', /lever\.co/], ['Greenhouse', /greenhouse\.io/], ['Teamtailor', /teamtailor\.com/],
  ['SmartRecruiters', /smartrecruiters\.com/], ['Recruitee', /recruitee\.com/], ['Breezy', /breezy\.hr/], ['Workable', /workable\.com/], ['iCIMS', /icims\.com/],
  ['Jobvite', /jobvite\.com/], ['Factorial', /factorialhr/], ['Kenjo', /kenjo\.io/], ['Avature', /avature\.net/], ['Taleo', /taleo\.net/], ['Oracle Cloud', /oraclecloud\.com/],
  ['Google Forms', /docs\.google\.com\/forms|forms\.gle/]
];
const NO_USAR = [['LinkedIn', /linkedin\.com/], ['Computrabajo', /computrabajo/], ['Bumeran/ZonaJobs', /bumeran|zonajobs/], ['Indeed', /indeed\./]];

async function pedir(url, ms = 9000) {
  const ac = new AbortController(); const t = setTimeout(() => ac.abort(), ms);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'es-AR,es' }, redirect: 'follow', signal: ac.signal });
    const tipo = r.headers.get('content-type') || '';
    const texto = /html|xml|text|json/.test(tipo) ? (await r.text()).slice(0, 1_500_000) : '';
    return { ok: r.ok, status: r.status, url: r.url, texto };
  } catch (e) { return { ok: false, status: 0, url, texto: '', error: String(e.cause?.code || e.name || e) }; }
  finally { clearTimeout(t); }
}

// robots.txt mínimo: reglas para "*" o para nuestro bot
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

const titulo = h => (h.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').replace(/\s+/g, ' ').trim().slice(0, 120);
const limpiar = s => s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
function enlaces(html, base) {
  const out = [];
  for (const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const href = m[1].match(/href\s*=\s*["']([^"']+)["']/i)?.[1]; if (!href || /^(mailto|tel|javascript|#)/i.test(href)) continue;
    let abs; try { abs = new URL(href, base).href; } catch { continue; }
    out.push({ url: abs, texto: limpiar(m[2]).slice(0, 80) });
  }
  return out;
}
const atsDe = url => ATS.find(([, re]) => re.test(url))?.[0] || null;
const prohibida = url => NO_USAR.find(([, re]) => re.test(url))?.[0] || null;
function avisosJsonLd(html) {
  let n = 0;
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try { const j = JSON.parse(m[1]); const arr = [j, ...(j['@graph'] || []), ...(Array.isArray(j) ? j : [])].flat(); n += arr.filter(x => x && /JobPosting/.test(x['@type'])).length; } catch { /* json roto */ }
  }
  return n;
}

async function revisarEmpresa(e) {
  const r = { nombre: e.nombre, rubro: e.rubro, web: null, tituloWeb: null, empleo: null, tipo: null, plataforma: null, robotsOk: null, avisosJsonLd: 0, redes: [], nota: '' };
  if (!e.dominios.length && !e.urlsEmpleo.length) { r.nota = 'Sin web conocida: falta el dominio.'; return r; }
  let home = null;
  for (const d of e.dominios) {
    for (const pre of ['https://www.', 'https://']) {
      const x = await pedir(pre + d + '/'); await dormir(PAUSA);
      if (x.ok && x.texto) { home = x; break; }
    }
    if (home) break;
  }
  const candidatos = [];
  if (home) {
    r.web = home.url; r.tituloWeb = titulo(home.texto);
    for (const l of enlaces(home.texto, home.url)) {
      const host = new URL(l.url).host;
      if (prohibida(l.url)) { const p = prohibida(l.url); if (!r.redes.includes(p)) r.redes.push(p); continue; }
      if (atsDe(l.url) || PALABRAS.test(l.texto) || PALABRAS.test(new URL(l.url).pathname)) candidatos.push({ ...l, host });
    }
  }
  for (const u of e.urlsEmpleo) candidatos.unshift({ url: u, texto: 'conocida' });
  if (home && !candidatos.length) {
    for (const ruta of RUTAS) {
      const u = new URL(ruta, home.url).href;
      if (!(await permitido(u))) continue;
      const x = await pedir(u); await dormir(PAUSA);
      if (x.ok && x.texto && PALABRAS.test(titulo(x.texto) + ' ' + limpiar(x.texto).slice(0, 4000))) { candidatos.push({ url: x.url, texto: 'ruta probada' }); break; }
    }
  }
  // Se queda con el mejor candidato: plataforma de selección > texto "trabajá con nosotros" > el resto
  const puntaje = c => (atsDe(c.url) ? 3 : 0) + (/trabaj|career|empleo|sumate|unite|búsquedas|busquedas|vacantes/i.test(c.texto + c.url) ? 2 : 0) + (c.texto === 'conocida' ? 4 : 0);
  const vistos = new Set();
  const orden = candidatos.filter(c => !vistos.has(c.url) && vistos.add(c.url)).sort((a, b) => puntaje(b) - puntaje(a)).slice(0, 3);
  for (const c of orden) {
    const ok = await permitido(c.url);
    if (!ok) { r.empleo = c.url; r.robotsOk = false; r.tipo = 'bloqueada'; r.nota = 'robots.txt no permite el acceso automático.'; continue; }
    const x = await pedir(c.url); await dormir(PAUSA);
    if (!x.ok || !x.texto) continue;
    const txt = limpiar(x.texto).slice(0, 20000);
    r.empleo = x.url; r.robotsOk = true; r.plataforma = atsDe(x.url) || atsDe(c.url) || ATS.find(([, re]) => re.test(x.texto))?.[0] || null;
    r.avisosJsonLd = avisosJsonLd(x.texto);
    const formulario = /<form[\s\S]*?(type=["']file|cv|curr[ií]culum)/i.test(x.texto);
    r.tipo = r.avisosJsonLd ? 'avisos (datos estructurados)' : r.plataforma && r.plataforma !== 'Google Forms' ? 'avisos (plataforma)' : formulario || /dej[aá] tu cv|envi[aá] tu cv|carg[aá] tu cv|base de datos/i.test(txt) ? 'solo formulario de CV' : 'página informativa';
    r.nota = `"${titulo(x.texto)}"`;
    break;
  }
  if (!home && !r.empleo) r.nota = 'No respondió ninguno de los dominios probados.';
  else if (!r.empleo) r.nota = 'No encontré página de empleo en la web.';
  return r;
}

const empresas = JSON.parse(await readFile(new URL('./empresas.json', import.meta.url)));
// Varias empresas a la vez (cada una es un sitio distinto); a un mismo sitio se le pide de a uno y con pausa.
const res = new Array(empresas.length); let sig = 0;
const LIMITE = Date.now() + 40 * 60e3;
await Promise.all(Array.from({ length: 8 }, async () => {
  while (sig < empresas.length && Date.now() < LIMITE) {
    const i = sig++; const e = empresas[i];
    const r = await Promise.race([revisarEmpresa(e), dormir(150e3).then(() => ({ nombre: e.nombre, rubro: e.rubro, redes: [], nota: 'Tardó demasiado en responder.' }))]);
    res[i] = r; console.log(`${r.nombre}: ${r.tipo || '-'} ${r.empleo || r.nota}`);
  }
}));
for (let i = 0; i < empresas.length; i++) if (!res[i]) res[i] = { nombre: empresas[i].nombre, rubro: empresas[i].rubro, redes: [], nota: 'No llegó a revisarse.' };
await writeFile(new URL('./fuentes.json', import.meta.url), JSON.stringify({ revisado: new Date().toISOString(), empresas: res }, null, 1));
const md = ['# Páginas de empleo encontradas', '', `Revisado: ${new Date().toISOString().slice(0, 10)}. Se respetó robots.txt de cada sitio.`, '',
  '| Empresa | Web | Página de empleo | Tipo | Plataforma | Nota |', '|---|---|---|---|---|---|',
  ...res.map(r => `| ${r.nombre} | ${r.web ? `[${(r.tituloWeb || r.web).replace(/\|/g, '/').slice(0, 50)}](${r.web})` : '—'} | ${r.empleo ? `[link](${r.empleo})` : '—'} | ${r.tipo || '—'} | ${r.plataforma || '—'} | ${(r.nota + (r.redes.length ? ` Publica en: ${r.redes.join(', ')}.` : '')).replace(/\|/g, '/')} |`)];
await writeFile(new URL('./informe.md', import.meta.url), md.join('\n') + '\n');
