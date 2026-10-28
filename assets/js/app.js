/* +Humanos · prototipo SPA (sin build). Rutas por hash:
   #/                     Inicio
   #/chat                 Asistente (preguntas iniciales)
   #/vacantes             Vacantes para vos (?job=ID abre una)
   #/guardadas            Vacantes guardadas
   #/postulaciones        Mis postulaciones
   #/empresa              Panel empresa · vacantes
   #/empresa/busquedas    Búsquedas de la empresa (por cliente)
   #/empresa/b?id=ID      Página de una búsqueda: postulantes, tablero, terna, del banco
   #/empresa/candidatos   Panel empresa · buscar candidatos */

(() => {
  'use strict';

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const view = $('#view'), topbar = $('#topbar'), bottombar = $('#bottombar'), sheetRoot = $('#sheet-root'), toastRoot = $('#toast-root');
  const S = { talentTab: 'bank', bank: { q: '', job: '', tags: [], fav: false }, chatPreset: null, filter: null, q: '', swipers: [], appJob: 'all', appView: 'list', appSort: 'match', appClient: 'all', dashClient: 'all', appStatus: 'all', cand: { q: '', area: '', province: '' }, dirty: false };
  const STATUSES = ['Nuevo', 'En revisión', 'Entrevista', 'Terna', 'Contratado', 'Descartado'];
  const PALETTE = ['#0866FF', '#7B3FE4', '#0F9D8A', '#E2582B', '#D23B6E', '#3B8C3A', '#C9821B', '#2B4C7E'];

  /* ---------------- Utilidades ---------------- */
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ñ/g, 'n');
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const daysSince = iso => Math.floor((Date.now() - new Date(iso)) / 864e5);
  function ago(iso) {
    const d = daysSince(iso);
    if (d <= 0) return 'Hoy';
    if (d === 1) return 'Ayer';
    if (d < 7) return `Hace ${d} días`;
    const w = Math.floor(d / 7);
    return w === 1 ? 'Hace 1 semana' : `Hace ${w} semanas`;
  }
  const fmtSize = b => b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
  const initials = n => String(n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const areaOf = id => AREAS.find(a => a.id === id) || { label: 'Otra área', icon: 'ph-briefcase' };
  const senLabel = id => (SENIORITIES.find(s => s.id === id) || {}).label || '';
  const hashColor = s => PALETTE[[...String(s)].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];
  // Fotos propias del sitio (cada ruta aparece una sola vez: en el index.html único se incrustan)
  const LOCAL_IMG = { equipo: 'assets/img/hero-equipo.webp', p1: 'assets/img/pain-1.webp', p2: 'assets/img/pain-2.webp', p3: 'assets/img/pain-3.webp', p4: 'assets/img/pain-4.webp', p5: 'assets/img/pain-5.webp', p6: 'assets/img/pain-6.webp' };
  // Imagen de una nota o slide: 'lib:p2' (foto propia), data URL, ruta local o id de Unsplash
  const imgSrc = (id, w = 1600) => !id ? '' : id.startsWith('lib:') ? (LOCAL_IMG[id.slice(4)] || '') : /^(assets\/|data:|https?:)/.test(id) ? id : `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=70`;
  // Rubro de la lista fija (los escritos a mano antes se reconocen por palabras clave)
  const industryOf = t => { t = String(t || '').trim(); if (!t) return ''; if (INDUSTRIES.includes(t)) return t; const n = norm(t); const hit = INDUSTRY_KW.find(([rx]) => rx.test(n)); return hit ? hit[1] : 'Otro'; };
  const industryOpts = sel => `<option value="">Elegí un rubro</option>${INDUSTRIES.map(x => `<option ${industryOf(sel) === x ? 'selected' : ''}>${x}</option>`).join('')}`;
  const companyOf = name => COMPANIES[name] || { type: 'Empresa', color: hashColor(name), benefits: [] };
  const finePointer = () => window.matchMedia('(pointer: fine)').matches;
  const digits = s => String(s || '').replace(/\D/g, '');

  /* Empresa cliente de una búsqueda de consultora.
     Candidato: ve el nombre solo si la consultora lo hizo visible. Consultora: siempre lo ve. */
  const clientPublic = j => !j.client ? '' : j.showClient ? j.client : `Empresa confidencial${j.clientIndustry ? ` · ${j.clientIndustry}` : ''}`;
  function clientLine(j, cls = 'text-[0.95rem]') {
    if (!j.client) return '';
    return `<p class="${cls} text-ink-soft flex items-center gap-1.5 min-w-0"><i class="ph ph-buildings shrink-0"></i><span class="truncate">Para ${esc(clientPublic(j))}</span></p>`;
  }
  function clientChip(j) {
    if (!j.client) return '';
    return `<span class="inline-flex items-center gap-1.5 max-w-full rounded-lg bg-surface px-2.5 py-1 text-[0.9rem] font-semibold text-ink"><i class="ph-fill ph-buildings text-brand shrink-0"></i><span class="truncate">${esc(j.client)}</span>${j.showClient ? '' : '<i class="ph ph-eye-slash text-ink-mute shrink-0" title="Oculto para candidatos"></i>'}</span>`;
  }
  const clientsOf = jobs => [...new Set(jobs.map(j => j.client).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
  const NO_CLIENT = '__propias';
  const COMMON_BENEFITS = ['Obra social', 'Prepaga', 'Home office', 'Horario flexible', 'Capacitaciones', 'Bono por desempeño',
    'Premio por presentismo', 'Comedor o viandas', 'Transporte', 'Vacaciones extra', 'Clases de inglés', 'Descuentos en productos'];

  function logoBox(name, src, size = 'w-12 h-12 text-base') {
    if (src) return `<div class="${size} shrink-0 rounded-xl bg-white border border-line overflow-hidden grid place-items-center p-0.5" aria-hidden="true"><img src="${src}" alt="" class="w-full h-full object-contain"></div>`;
    return `<div class="${size} shrink-0 rounded-xl grid place-items-center font-bold text-white" style="background:${companyOf(name).color}" aria-hidden="true">${esc(initials(name))}</div>`;
  }
  function logo(name, size = 'w-12 h-12 text-base') {
    const src = Store.logoOf(name);
    if (src) return logoBox(name, src, size);
    return `<div class="${size} shrink-0 rounded-xl grid place-items-center font-bold text-white" style="background:${companyOf(name).color}" aria-hidden="true">${esc(initials(name))}</div>`;
  }
  function avatar(name, size = 'w-12 h-12 text-base') {
    return `<div class="${size} shrink-0 rounded-full grid place-items-center font-bold text-white" style="background:${hashColor(name)}" aria-hidden="true">${esc(initials(name))}</div>`;
  }
  // Un toast por vez: el nuevo reemplaza al anterior
  function toast(msg, icon = 'ph-check-circle') {
    [...toastRoot.children].forEach(old => old.remove());
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `<i class="ph-fill ${icon} text-xl text-[#5BE38F]"></i><span>${esc(msg)}</span>`;
    toastRoot.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 2800);
  }
  function waLink(phone, text) {
    let d = digits(phone).replace(/^0/, '');
    if (!d) return null;
    if (!d.startsWith('54')) d = '549' + d;
    return `https://wa.me/${d}?text=${encodeURIComponent(text)}`;
  }

  /* ---------------- Skills y competencias ---------------- */
  // Sinónimos para reconocer una skill escrita de distintas formas (en el CV o en el chat)
  const SKILL_SYN = {
    'licencia de conducir': ['licencia de conducir', 'registro de conducir', 'licencia b1', 'registro b1', 'registro'],
    'liquidacion de sueldos': ['liquidacion de sueldos', 'liquidador', 'liquidadora', 'liquidacion de haberes', 'sueldos'],
    'matricula vigente': ['matricula'], 'atencion al publico': ['atencion al publico', 'atencion al cliente', 'atencion de clientes'],
    'redaccion': ['redaccion', 'copys', 'copywriting', 'redactar'], 'sim/malvina': ['malvina', 'sim'], 'crm': ['crm', 'hubspot', 'salesforce'],
    'ventas b2b': ['b2b'], 'licencia profesional': ['licencia profesional', 'registro profesional'], 'atencion telefonica': ['atencion telefonica', 'telefon'],
    'conciliaciones bancarias': ['conciliacion'], 'gestion de agenda': ['agenda'], 'entrevistas por competencias': ['entrevistas'], 'ingles': ['ingles', 'english'],
    'node.js': ['node'], 'manipulacion de alimentos': ['manipulacion de alimentos'], 'documentacion aduanera': ['aduan', 'despacho']
  };
  const skillKeys = name => SKILL_SYN[norm(name)] || [norm(name)];
  const boundary = (t, k) => new RegExp(`(^|[^a-z0-9])${k.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}([^a-z0-9]|$)`).test(t);
  const hasSkillIn = (text, name) => { const t = norm(text); return skillKeys(name).some(k => k.length <= 4 ? boundary(t, k) : t.includes(k)); };
  const hasSkillList = (list, name) => (list || []).some(x => hasSkillIn(x, name) || skillKeys(x).some(k => norm(name).includes(k) && k.length > 3));
  function skillFit(job, p) {
    const sk = job.skills || [];
    if (!sk.length) return { none: true };
    const mine = (p && p.skills) || [];
    if (!mine.length) return { unknown: true, missMust: [] };
    let tot = 0, got = 0; const have = [], miss = [], missMust = [];
    sk.forEach(x => { const w = x.must ? 2 : 1; tot += w; if (hasSkillList(mine, x.n)) { got += w; have.push(x.n); } else { miss.push(x.n); if (x.must) missMust.push(x.n); } });
    return { pts: got / tot, have, miss, missMust, total: sk.length };
  }
  const compFit = (job, p) => { const c = job.comps || []; const m = (p && p.comps) || []; return c.length && m.length ? c.filter(x => m.includes(x)).length / c.length : null; };

  /* ---------------- Afinidad del candidato con una vacante ----------------
     Área 30 · Provincia 20 · Modalidad 8 · Experiencia 12 · Skills clave 20 · Competencias 6 · Palabras del puesto 4.
     Si al candidato le falta una skill excluyente (y la declaró), la afinidad queda en 69% como máximo. */
  function score(job, p) {
    if (!p) return 0;
    let s = 0;
    if (p.area && job.area === p.area) s += 30;
    if (p.province === 'any') s += 15;
    else if (job.province === p.province) s += 20;
    else if (job.modality === 'Remoto') s += 14;
    if (!p.modality || p.modality === 'any' || job.modality === p.modality) s += 8;
    else if (job.modality === 'Híbrido' && p.modality !== 'Remoto') s += 3;
    const order = SENIORITIES.map(x => x.id);
    if (!p.seniority) s += 6;
    else { const d = Math.abs(order.indexOf(job.seniority) - order.indexOf(p.seniority)); s += d === 0 ? 12 : d === 1 ? 6 : 0; }
    const sf = skillFit(job, p);
    s += sf.none ? 12 : sf.unknown ? 9 : Math.round(20 * sf.pts);
    const cf = compFit(job, p);
    s += cf == null ? 3 : Math.round(6 * cf);
    if (p.roleText) {
      const words = norm(p.roleText).split(/[^a-z0-9]+/).filter(w => w.length > 3);
      if (words.some(w => norm(`${job.title} ${job.description || ''}`).includes(w.slice(0, 5)))) s += 4;
    }
    s = Math.min(99, s);
    if (sf.missMust && sf.missMust.length) s = Math.min(s, 69);
    return s;
  }
  const isForYou = (job, p) => !!p && job.area === p.area && (p.province === 'any' || job.province === p.province || job.modality === 'Remoto');
  function reasons(job, p) {
    const r = [];
    if (job.area === p.area) r.push('área');
    if (p.province !== 'any' && job.province === p.province) r.push('provincia');
    else if (job.modality === 'Remoto') r.push('trabajo remoto');
    if (p.modality === 'any' || job.modality === p.modality) r.push('modalidad');
    if (job.seniority === p.seniority) r.push('experiencia');
    let out = r.length ? 'Coincide en ' + (r.length > 1 ? r.slice(0, -1).join(', ') + ' y ' + r[r.length - 1] : r[0]) + '.' : 'Puede interesarte aunque no coincide del todo con tu búsqueda.';
    const sf = skillFit(job, p);
    if (!sf.none && !sf.unknown) out += ` Tenés ${sf.have.length} de ${sf.total} skills clave.`;
    if (sf.missMust && sf.missMust.length) out += ` Te falta${sf.missMust.length > 1 ? 'n' : ''} ${listEs(sf.missMust)}, que es excluyente.`;
    return out;
  }

  /* ---------------- Interpretación del texto libre del chat ---------------- */
  const KW = AREAS.flatMap(a => [...a.kw, norm(a.label)].map(k => [norm(k), a.id])).sort((a, b) => b[0].length - a[0].length);
  function detectArea(text) {
    const t = ' ' + norm(text) + ' ';
    for (const [k, id] of KW) {
      if (new RegExp('(^|[^a-z])' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(t)) return id;
    }
    return null;
  }
  function detectProvince(text) {
    const t = norm(text);
    const aliases = Object.entries(PROVINCE_ALIASES).sort((a, b) => b[0].length - a[0].length);
    for (const [k, v] of aliases) if (t.includes(k)) return v;
    const sorted = [...PROVINCES].sort((a, b) => b.length - a.length);
    for (const p of sorted) if (t.includes(norm(p))) return p;
    return null;
  }
  function detectModality(text) {
    const t = norm(text);
    if (/remot|casa|home/.test(t)) return 'Remoto';
    if (/hibri|mixt/.test(t)) return 'Híbrido';
    if (/presen|oficina|lugar/.test(t)) return 'Presencial';
    if (/igual|cualquier|todas|indistint|no importa/.test(t)) return 'any';
    return null;
  }
  function detectSeniority(text) {
    const t = norm(text);
    if (/sin exp|primer|ningun|nunca|0/.test(t)) return 'sin-exp';
    if (/semi|ssr/.test(t)) return 'semi';
    if (/senior|sr\b/.test(t)) return 'senior';
    if (/junior|jr\b/.test(t)) return 'junior';
    const n = parseInt(t.match(/\d+/)?.[0], 10);
    if (!isNaN(n)) return n < 1 ? 'sin-exp' : n <= 2 ? 'junior' : n <= 5 ? 'semi' : 'senior';
    return null;
  }

  /* ---------------- Confirmación propia (reemplaza a confirm() del navegador) ----------------
     askConfirm({ title, text, ok, cancel, danger, icon }) → Promise<boolean>. Va por encima de cualquier panel. */
  function askConfirm({ title, text = '', ok = 'Confirmar', cancel = 'Cancelar', danger = false, icon } = {}) {
    return new Promise(resolve => {
      const prevFocus = document.activeElement;
      const root = document.createElement('div');
      root.className = 'cf-wrap';
      root.setAttribute('role', 'alertdialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-labelledby', 'cf-t');
      const ic = icon || (danger ? 'ph-trash' : 'ph-question');
      root.innerHTML = `<div class="cf-overlay" data-cf="0"></div>
        <div class="cf-panel bg-white shadow-lift p-6 sm:p-7">
          <div class="w-12 h-12 rounded-full grid place-items-center ${danger ? 'bg-bad/10 text-bad' : 'bg-brand-soft text-brand'}"><i class="ph-fill ${ic} text-2xl"></i></div>
          <h2 id="cf-t" class="mt-4 text-[1.35rem] leading-tight font-extrabold">${title}</h2>
          ${text ? `<p class="mt-2 text-ink-soft">${text}</p>` : ''}
          <div class="mt-6 grid grid-cols-2 gap-2.5">
            <button type="button" class="btn btn-outline h-12" data-cf="0">${cancel}</button>
            <button type="button" class="btn h-12 ${danger ? 'bg-bad text-white hover:brightness-95' : 'btn-primary'}" data-cf="1">${ok}</button>
          </div>
        </div>`;
      document.body.appendChild(root);
      requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('cf-open')));
      const done = v => {
        document.removeEventListener('keydown', onKey, true);
        root.classList.remove('cf-open'); setTimeout(() => root.remove(), 200);
        if (prevFocus && prevFocus.focus) try { prevFocus.focus({ preventScroll: true }); } catch (e) { /* noop */ }
        resolve(v);
      };
      const onKey = e => {
        if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); done(false); }
        if (e.key === 'Tab') { const f = [...root.querySelectorAll('button')]; const i = f.indexOf(document.activeElement); e.preventDefault(); f[(i + (e.shiftKey ? f.length - 1 : 1)) % f.length].focus(); }
      };
      document.addEventListener('keydown', onKey, true);
      root.addEventListener('click', e => { const b = e.target.closest('[data-cf]'); if (b) done(b.dataset.cf === '1'); });
      // Foco en "Cancelar" cuando la acción borra algo; si no, en la acción
      setTimeout(() => root.querySelector(`button[data-cf="${danger ? 0 : 1}"]`).focus(), 30);
    });
  }

  /* ---------------- Sheet (bottom sheet en mobile, modal en desktop) ---------------- */
  function openSheet(content, mount, opts = {}) {
    if (sheetRoot.firstElementChild) return setSheet(content, mount);
    sheetRoot.innerHTML = `
      <div class="sheet-wrap ${opts.side ? 'sheet-side' : ''}" role="dialog" aria-modal="true">
        <div class="sheet-overlay" data-close-sheet></div>
        <div class="sheet-panel">
          <div class="sheet-handle"></div>
          <button class="icon-btn absolute top-2.5 right-3 z-10 bg-white/90" data-close-sheet aria-label="Cerrar"><i class="ph-bold ph-x text-xl"></i></button>
          <div id="sheet-content" class="flex flex-col min-h-0 flex-1"></div>
        </div>
      </div>`;
    setSheet(content, mount);
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => requestAnimationFrame(() => sheetRoot.firstElementChild && sheetRoot.firstElementChild.classList.add('sheet-open')));
  }
  function setSheet(content, mount) {
    const c = $('#sheet-content');
    c.innerHTML = content;
    const sc = c.querySelector('.sheet-scroll');
    if (sc) sc.scrollTop = 0;
    if (mount) mount(c);
  }
  function closeSheet(instant) {
    const w = sheetRoot.firstElementChild;
    if (!w) return;
    document.body.style.overflow = '';
    if (instant) sheetRoot.innerHTML = '';
    else { w.classList.remove('sheet-open'); setTimeout(() => { if (sheetRoot.firstElementChild === w) sheetRoot.innerHTML = ''; }, 300); }
    if (S.dirty && !instant) { S.dirty = false; refresh(); }
  }
  const sheetScroll = inner => `<div class="sheet-scroll flex-1 overflow-y-auto overscroll-contain px-5 sm:px-7 pt-3 pb-6">${inner}</div>`;
  const sheetFoot = inner => `<div class="border-t border-line bg-white px-5 sm:px-7 pt-3 pb-safe flex items-center gap-3 rounded-b-none md:rounded-b-3xl">${inner}</div>`;

  /* Desplegable propio: el <select> sigue existiendo (valor y eventos "change"), pero la lista se dibuja
     con la estética del sitio y siempre se abre hacia abajo. */
  let ddOpen = null;
  function enhanceSelect(sel) {
    if (!sel || sel._dd) return;
    const host = sel.parentElement; if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = sel.className + ' dd-btn';
    btn.setAttribute('aria-haspopup', 'listbox'); btn.setAttribute('aria-expanded', 'false');
    const lab = sel.getAttribute('aria-label') || (sel.id && (document.querySelector(`label[for="${sel.id}"] .sr-only`) || document.querySelector(`label[for="${sel.id}"]`))?.textContent.trim()) || '';
    if (lab) btn.setAttribute('aria-label', lab);
    sel.classList.add('sr-only'); sel.tabIndex = -1; sel.setAttribute('aria-hidden', 'true');
    sel.after(btn);
    const sync = () => {
      const o = sel.options[sel.selectedIndex];
      btn.textContent = o ? o.textContent : '';
      if (lab) btn.setAttribute('aria-label', `${lab}: ${btn.textContent}`);
      const on = !!sel.value && [...sel.options].some(o => o.value === '') && /\binput\b/.test(sel.className);
      btn.classList.toggle('text-brand', on); btn.classList.toggle('!border-brand', on);
    };
    sel._dd = btn; sel._ddSync = sync; sync();
    sel.addEventListener('change', sync);
    if (sel.id) { const l = document.querySelector(`label[for="${sel.id}"]`); if (l) l.addEventListener('click', e => { if (e.target === l || !e.target.closest('.dd-pop')) { e.preventDefault(); if (!e.target.closest('.dd-btn')) btn.click(); } }); }
    const close = (focus) => { if (ddOpen && ddOpen.btn === btn) { ddOpen.pop.remove(); ddOpen = null; btn.setAttribute('aria-expanded', 'false'); if (focus) btn.focus(); } };
    const open = () => {
      if (ddOpen) ddOpen.close();
      const pop = document.createElement('ul');
      pop.setAttribute('role', 'listbox'); pop.tabIndex = -1;
      pop.className = 'dd-pop absolute top-full left-0 mt-2 z-50 min-w-full w-max max-w-[min(22rem,calc(100vw-1.5rem))] max-h-[min(20rem,60vh)] overflow-y-auto overscroll-contain bg-white rounded-2xl border border-line shadow-[0_24px_48px_-20px_rgba(20,18,58,.35)] p-1.5 text-[1rem] text-ink font-normal';
      pop.innerHTML = [...sel.options].map((o, i) => `<li role="option" data-i="${i}" aria-selected="${i === sel.selectedIndex}" class="flex items-center gap-3 px-3 min-h-[44px] rounded-xl cursor-pointer select-none hover:bg-surface aria-selected:text-brand aria-selected:font-semibold data-[act=true]:bg-surface">
        <span class="flex-1 truncate">${esc(o.textContent)}</span>${i === sel.selectedIndex ? '<i class="ph-bold ph-check text-brand"></i>' : ''}</li>`).join('');
      host.appendChild(pop);
      // si no entra a la derecha, se alinea al borde derecho
      const r = pop.getBoundingClientRect(); if (r.right > window.innerWidth - 8) { pop.style.left = 'auto'; pop.style.right = '0'; }
      const items = [...pop.children]; let act = Math.max(0, sel.selectedIndex);
      const setAct = i => { act = Math.max(0, Math.min(items.length - 1, i)); items.forEach((li, k) => li.dataset.act = String(k === act)); items[act].scrollIntoView({ block: 'nearest' }); };
      const choose = i => { if (sel.selectedIndex !== i) { sel.selectedIndex = i; sel.dispatchEvent(new Event('change', { bubbles: true })); } close(true); };
      pop.addEventListener('click', e => { const li = e.target.closest('[data-i]'); if (li) { e.preventDefault(); e.stopPropagation(); choose(+li.dataset.i); } });
      pop.addEventListener('mousedown', e => e.preventDefault());
      let typed = '', tt;
      const key = e => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setAct(act + 1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setAct(act - 1); }
        else if (e.key === 'Home') { e.preventDefault(); setAct(0); }
        else if (e.key === 'End') { e.preventDefault(); setAct(items.length - 1); }
        else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(act); }
        else if (e.key === 'Escape' || e.key === 'Tab') { if (e.key === 'Escape') e.preventDefault(); close(e.key === 'Escape'); }
        else if (e.key.length === 1) { clearTimeout(tt); typed += norm(e.key); tt = setTimeout(() => { typed = ''; }, 600); const k = [...sel.options].findIndex(o => norm(o.textContent).startsWith(typed)); if (k >= 0) setAct(k); }
      };
      ddOpen = { btn, pop, close: () => close(false), key };
      btn.setAttribute('aria-expanded', 'true');
      setAct(act);
    };
    btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); if (ddOpen && ddOpen.btn === btn) close(true); else open(); });
    btn.addEventListener('keydown', e => {
      if (ddOpen && ddOpen.btn === btn) { ddOpen.key(e); return; }
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); open(); }
    });
  }
  const enhanceSelects = root => $$('select[data-dd]', root || document).forEach(enhanceSelect);
  document.addEventListener('click', e => { if (ddOpen && !e.target.closest('.dd-pop') && e.target !== ddOpen.btn) ddOpen.close(); });
  window.addEventListener('resize', () => { if (ddOpen) ddOpen.close(); });

  /* ---------------- Componentes ---------------- */
  function saveBtn(id, big) {
    const on = Store.isSaved(id);
    return `<button type="button" data-save-job="${id}" aria-label="${on ? 'Quitar de guardadas' : 'Guardar vacante'}" aria-pressed="${on}"
      class="icon-btn ${big ? 'w-12 h-12 border border-line' : '-mr-2 -mt-1'} ${on ? 'text-brand' : ''}"><i class="${on ? 'ph-fill' : 'ph'} ph-bookmark-simple text-2xl"></i></button>`;
  }
  function matchBadge(s) {
    const cls = s >= 80 ? 'bg-sun text-ink' : s >= 60 ? 'bg-sun-soft text-ink' : 'bg-surface text-ink-soft';
    return `<span class="inline-flex items-center gap-1 text-[0.9rem] font-bold ${cls} px-2.5 py-1 rounded-full"><i class="ph-fill ph-sun"></i>${s}% para vos</span>`;
  }
  // Postulantes de una vacante (las de ejemplo suman una base fija para que la demo se vea real)
  const DEMO_BASE = id => /^j\d+$/.test(id) ? 4 + ([...id].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) % 34) : 0;
  const applicantsOf = j => DEMO_BASE(j.demoOf ? '' : j.id) + Store.apps().filter(a => a.jobId === j.id).length;
  const featPill = (cls = '') => `<span class="inline-flex items-center gap-1 rounded-full bg-sun-soft text-ink px-2 py-0.5 text-[0.78rem] font-bold ${cls}"><i class="ph-fill ph-star text-warn"></i>Destacada</span>`;
  function jobCard(j, s, opts = {}) {
    const applied = Store.hasApplied(j.id);
    const feat = opts.feat ?? Store.isFeatured(j), nApp = applicantsOf(j);
    const tag = (ic, t) => `<span class="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-[0.9rem] text-ink-soft"><i class="ph ${ic} text-[1.05rem]"></i>${esc(t)}</span>`;
    return `
      <article ${opts.preview ? 'aria-hidden="true"' : `data-open-job="${j.id}" tabindex="0" role="button" aria-label="${esc(j.title)} en ${esc(j.company)}${feat ? ', vacante destacada' : ''}"`}
        class="group bg-white text-ink rounded-[22px] border border-line ${opts.preview ? 'pointer-events-none' : 'cursor-pointer'} p-4 sm:p-5 flex flex-col gap-3 hover:border-brand/40 hover:shadow-lift transition h-full">
        ${feat ? `<div class="-mb-1">${featPill()}</div>` : ''}
        <div class="flex items-center gap-3">
          ${logo(j.company, 'w-11 h-11 text-sm')}
          <div class="min-w-0 flex-1">
            <p class="font-semibold truncate">${esc(j.company)}</p>
            <p class="text-[0.92rem] text-ink-mute flex items-center gap-1 truncate"><i class="ph ph-map-pin shrink-0"></i>${esc(j.province)}</p>
          </div>
          ${opts.preview ? '' : saveBtn(j.id)}
        </div>
        <div>
          <h3 class="text-[1.28rem] leading-[1.15] font-bold group-hover:text-brand transition-colors">${esc(j.title)}</h3>
          ${j.description ? `<p class="mt-1.5 text-ink-soft text-[0.97rem] leading-snug line-clamp-2">${esc(j.description)}</p>` : ''}
        </div>
        <div class="flex flex-wrap gap-1.5">
          ${tag(j.modality === 'Remoto' ? 'ph-house-line' : 'ph-buildings', j.modality)}
          ${tag('ph-clock', j.type)}
        </div>
        ${j.salary ? `<p class="font-semibold text-[1.05rem]">${esc(j.salary)}</p>` : ''}
        <div class="mt-auto pt-1 space-y-3">
          <div class="flex items-center justify-between gap-2">
            <div class="min-w-0 text-[0.9rem] leading-tight">
              <p class="text-ink-mute">${ago(j.postedAt)}</p>
              ${j.external ? `<p class="font-semibold mt-0.5 text-ink-soft flex items-center gap-1"><i class="ph ${extSrc(j.external.src)[2]}"></i>Vía ${esc(extSrc(j.external.src)[1])}</p>` : `<p class="font-semibold mt-0.5 ${nApp < 3 ? 'text-ok' : 'text-ink-soft'} flex items-center gap-1"><i class="ph ${nApp < 3 ? 'ph-lightning' : 'ph-users'}"></i>${nApp < 3 ? 'Sé de los primeros' : `${nApp} postulantes`}</p>`}
            </div>
          </div>
          ${opts.preview ? '' : applied
            ? '<div class="btn btn-sm w-full h-11 justify-center bg-mint text-ok cursor-default"><i class="ph-bold ph-check"></i>Ya te postulaste</div>'
            : j.external ? `<button type="button" data-apply-job="${j.id}" class="btn btn-outline btn-sm w-full h-11 justify-center"><i class="ph ph-paper-plane-tilt text-lg"></i>Cómo postularme</button>`
            : `<button type="button" data-apply-job="${j.id}" class="btn btn-primary btn-sm w-full h-11 justify-center"><i class="ph-fill ph-file-pdf text-lg"></i>Postularme</button>`}
        </div>
      </article>`;
  }
  function emptyState(icon, title, text, cta = '') {
    return `<div class="card px-6 py-12 text-center col-span-full">
      <div class="w-16 h-16 mx-auto rounded-full bg-brand-soft text-brand grid place-items-center"><i class="ph ${icon} text-3xl"></i></div>
      <h3 class="mt-4 text-xl font-bold">${title}</h3>
      <p class="mt-1 text-ink-soft max-w-sm mx-auto">${text}</p>
      ${cta ? `<div class="mt-5">${cta}</div>` : ''}
    </div>`;
  }
  function initSwipers(root = view) {
    if (!window.Swiper) return;
    $$('.js-swiper', root).forEach(el => {
      S.swipers.push(new Swiper(el, {
        slidesPerView: 1.08, spaceBetween: 12, grabCursor: true,
        pagination: { el: el.querySelector('.swiper-pagination'), clickable: true },
        breakpoints: { 640: { slidesPerView: 2.1, spaceBetween: 16 }, 1024: { slidesPerView: 3, spaceBetween: 20 } }
      }));
    });
  }
  function initHero() {
    const el = $('.js-hero', view); if (!el || !window.Swiper) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const tabs = $$('[data-hero-go]', view), pauseBtn = $('#hero-pause', view);
    const DELAY = 6500;
    const sw = new Swiper(el, {
      effect: 'fade', fadeEffect: { crossFade: true }, speed: 800, loop: true, grabCursor: true,
      keyboard: { enabled: true, onlyInViewport: true },
      a11y: { enabled: true, prevSlideMessage: 'Anterior', nextSlideMessage: 'Siguiente' },
      autoplay: reduce ? false : { delay: DELAY, disableOnInteraction: false, pauseOnMouseEnter: true }
    });
    const mark = () => tabs.forEach((t, i) => {
      const on = i === sw.realIndex;
      t.classList.toggle('is-on', on); t.setAttribute('aria-selected', on);
      const f = t.querySelector('.hero-fill'); if (!on) f.style.width = i < sw.realIndex ? '100%' : '0%';
    });
    sw.on('slideChange', mark);
    sw.on('autoplayTimeLeft', (s, ms, p) => { const f = tabs[sw.realIndex] && tabs[sw.realIndex].querySelector('.hero-fill'); if (f) f.style.width = `${(1 - p) * 100}%`; });
    tabs.forEach(t => t.onclick = () => sw.slideToLoop(+t.dataset.heroGo));
    $('#hero-prev', view).onclick = () => sw.slidePrev();
    $('#hero-next', view).onclick = () => sw.slideNext();
    const setPaused = paused => {
      pauseBtn.innerHTML = `<i class="ph-fill ${paused ? 'ph-play' : 'ph-pause'} text-lg"></i>`;
      pauseBtn.setAttribute('aria-label', paused ? 'Reproducir' : 'Pausar');
    };
    let paused = reduce; setPaused(paused);
    pauseBtn.onclick = () => { paused = !paused; if (paused) sw.autoplay && sw.autoplay.stop(); else { sw.params.autoplay = { delay: DELAY, disableOnInteraction: false, pauseOnMouseEnter: true }; sw.autoplay.start(); } setPaused(paused); };
    if (reduce) tabs.forEach(t => { t.querySelector('.hero-fill').style.width = '0%'; });
    mark();
    if (reduce) { const f = tabs[0].querySelector('.hero-fill'); f.style.width = '100%'; sw.on('slideChange', () => { tabs.forEach((t, i) => t.querySelector('.hero-fill').style.width = i === sw.realIndex ? '100%' : '0%'); }); }
    S.swipers.push(sw);
  }
  // Slider de fotos genérico (mismo comportamiento que el del hero), con controles data-ps-*
  function initPhotoSlider(root) {
    const el = root && $('.swiper', root); if (!el || !window.Swiper) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches, DELAY = 6500;
    const tabs = $$('[data-ps-go]', root), pauseBtn = $('[data-ps-pause]', root);
    const sw = new Swiper(el, {
      effect: 'fade', fadeEffect: { crossFade: true }, speed: 800, loop: true, grabCursor: true,
      keyboard: { enabled: true, onlyInViewport: true },
      a11y: { enabled: true, prevSlideMessage: 'Anterior', nextSlideMessage: 'Siguiente' },
      autoplay: reduce ? false : { delay: DELAY, disableOnInteraction: false, pauseOnMouseEnter: true }
    });
    const fill = (t, w) => { const f = t.querySelector('.hero-fill'); if (f) f.style.width = w; };
    const mark = () => tabs.forEach((t, i) => { const on = i === sw.realIndex; t.classList.toggle('is-on', on); t.setAttribute('aria-selected', on); if (!on || reduce) fill(t, reduce ? (on ? '100%' : '0%') : (i < sw.realIndex ? '100%' : '0%')); });
    sw.on('slideChange', mark);
    sw.on('autoplayTimeLeft', (s2, ms, p) => { const t = tabs[sw.realIndex]; if (t) fill(t, `${(1 - p) * 100}%`); });
    tabs.forEach(t => t.onclick = () => sw.slideToLoop(+t.dataset.psGo));
    const pv = $('[data-ps-prev]', root), nx = $('[data-ps-next]', root);
    if (pv) pv.onclick = () => sw.slidePrev(); if (nx) nx.onclick = () => sw.slideNext();
    let paused = reduce;
    const setPaused = () => { pauseBtn.innerHTML = `<i class="ph-fill ${paused ? 'ph-play' : 'ph-pause'} text-lg"></i>`; pauseBtn.setAttribute('aria-label', paused ? 'Reproducir' : 'Pausar'); };
    setPaused();
    pauseBtn.onclick = () => { paused = !paused; if (paused) sw.autoplay && sw.autoplay.stop(); else { sw.params.autoplay = { delay: DELAY, disableOnInteraction: false, pauseOnMouseEnter: true }; sw.autoplay.start(); } setPaused(); };
    // No corre mientras no se ve: arranca al entrar en pantalla
    if (!reduce && 'IntersectionObserver' in window) {
      sw.autoplay.stop();
      const io = new IntersectionObserver(en => en.forEach(x => { if (sw.destroyed || !sw.autoplay || !document.body.contains(root)) { io.disconnect(); return; } if (paused) return; if (x.isIntersecting) sw.autoplay.start(); else sw.autoplay.stop(); }), { threshold: 0.3 });
      io.observe(root);
    }
    mark();
    S.swipers.push(sw);
  }
  function initSteps() {
    const el = $('.js-steps', view); if (!el || !window.Swiper) return;
    S.swipers.push(new Swiper(el, {
      slidesPerView: 1.12, spaceBetween: 12, grabCursor: true,
      pagination: { el: el.querySelector('.swiper-pagination'), clickable: true },
      a11y: { enabled: true, prevSlideMessage: 'Paso anterior', nextSlideMessage: 'Paso siguiente' },
      breakpoints: { 640: { slidesPerView: 2.1, spaceBetween: 16 }, 1024: { slidesPerView: 3, spaceBetween: 20, allowTouchMove: false } }
    }));
  }
  function destroySwipers() { S.swipers.forEach(s => { try { s.destroy(true, true); } catch (e) { /* noop */ } }); S.swipers = []; }
  const swiperOf = cards => `<div class="swiper js-swiper !overflow-visible md:!overflow-hidden"><div class="swiper-wrapper">${cards.map(c => `<div class="swiper-slide">${c}</div>`).join('')}</div><div class="swiper-pagination"></div></div>`;

  /* ---------------- Barra superior e inferior ---------------- */
  // Marca +Humanos: el "+" del logo (barra azul marino y barra coral)
  const MARK = (cls = 'w-9 h-9') => `<svg viewBox="0 0 40 40" class="${cls} shrink-0" aria-hidden="true"><path d="M6 20h28" stroke="#1B2550" stroke-width="5.5" stroke-linecap="round"/><path d="M20 6v28" stroke="#F2715A" stroke-width="5.5" stroke-linecap="round"/></svg>`;
  const LOGO_SRC = 'assets/img/logo-humanos.webp';
  const BRAND = `<a href="#/" class="flex items-center min-w-0 shrink" aria-label="+Humanos, Hub de RRHH, inicio"><img src="${LOGO_SRC}" alt="+Humanos · Hub de RRHH" class="h-7 min-[400px]:h-8 sm:h-10 w-auto max-w-full object-contain object-left" width="198" height="40"></a>`;
  // Ícono de +Humanos para avisos y sugerencias del sistema (antes, avatar del asistente Fedfu)
  const fedfu = (cls = 'w-10 h-10') => `<span class="${cls} shrink-0 rounded-full bg-white border border-line grid place-items-center" aria-hidden="true">${MARK('w-3/5 h-3/5')}</span>`;

  function navItems(mode) {
    if (mode === 'candidate') return [['/vacantes', 'ph-magnifying-glass', 'Vacantes'], ['/guardadas', 'ph-bookmark-simple', 'Guardadas'], ['/postulaciones', 'ph-paper-plane-tilt', 'Postulaciones'], ['/notificaciones', 'ph-bell', 'Notificaciones']];
    if (mode === 'company' && Store.company()) return [['/empresa', 'ph-house', 'Inicio'], ['/empresa/busquedas', 'ph-briefcase', 'Búsquedas'], ['/empresa/entrevistas', 'ph-calendar-blank', 'Entrevistas'], ['/empresa/candidatos', 'ph-database', 'Base de datos', 'Base'], ['/empresa/hub', 'ph-users-three', 'Hub'], ['/empresa/reportes', 'ph-chart-bar', 'Reportes'], ['/empresa/perfil', 'ph-identification-card', 'Perfil']];
    return null;
  }
  function newAppsCount() {
    const co = Store.company(); if (!co) return 0;
    const ids = new Set(Store.jobs().filter(j => j.company === co.name).map(j => j.id));
    return Store.apps().filter(a => ids.has(a.jobId) && a.status === 'Nuevo').length;
  }
  // Subpáginas que marcan una sección del menú
  const navPath = path => path === '/empresa/b' || path === '/empresa/cliente' ? '/empresa/busquedas' : path === '/empresa/candidato' ? '/empresa/candidatos' : path === '/empresa/planes' ? '/empresa/perfil' : path;
  function renderTop(mode, path) {
    path = navPath(path);
    if (mode === 'chat') { topbar.innerHTML = ''; return; }
    if (mode === 'admin') {
      topbar.innerHTML = `<div class="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-line"><div class="max-w-6xl mx-auto h-16 px-4 sm:px-6 flex items-center gap-3">${BRAND}
        <span class="shrink-0 inline-flex items-center gap-1.5 text-[0.85rem] font-bold text-white bg-ink rounded-full px-3 py-1"><i class="ph-fill ph-shield-check"></i><span class="max-[379px]:hidden">Admin</span></span>
        <span class="ml-auto"></span>
        <a href="#/" class="hidden sm:inline-flex btn btn-ghost h-10 px-4">Ver sitio</a>
        ${adminOn() ? '<button type="button" data-admin-out class="btn btn-outline h-10 px-3 sm:px-4 shrink-0" aria-label="Salir"><i class="ph-bold ph-sign-out"></i><span class="max-sm:hidden">Salir</span></button>' : ''}</div></div>`;
      const out = $('[data-admin-out]', topbar); if (out) out.onclick = () => { adminSet(false); toast('Saliste del panel', 'ph-sign-out'); render(); };
      return;
    }
    if (mode === 'terna') {
      topbar.innerHTML = `<div class="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-line"><div class="max-w-3xl mx-auto h-16 px-4 sm:px-6 flex items-center gap-3">${BRAND}
        <span class="ml-auto inline-flex items-center gap-1.5 text-[0.9rem] font-semibold text-ink-soft bg-surface rounded-full px-3 py-1.5"><i class="ph-fill ph-lock-simple"></i>Link privado</span></div></div>`;
      return;
    }
    const co = Store.company();
    if (mode !== 'company') { renderPublicTop(path); return; }
    const items = navItems(mode) || [];
    const compact = items.length > 3;
    const links = items.map(([h, ic, l, short]) => `<a href="#${h}" title="${l}" class="relative inline-flex items-center gap-2 h-10 whitespace-nowrap ${compact ? 'px-3' : 'px-4'} rounded-full font-semibold ${path === h ? 'bg-brand-soft text-brand' : 'text-ink-soft hover:bg-surface'}"><i class="${path === h ? 'ph-fill' : 'ph'} ${ic} text-xl"></i><span class="${compact ? (items.length > 6 ? 'hidden xl:inline' : 'hidden lg:inline') : ''}">${short && compact ? `<span class="2xl:hidden">${short}</span><span class="max-2xl:hidden">${l}</span>` : l}</span></a>`).join('');
    const right = co ? `<a href="#/empresa/perfil" class="rounded-xl hover:opacity-90" title="Mi perfil" aria-label="Mi perfil de ${esc(co.name)}">${logo(co.name, 'w-10 h-10 text-sm')}</a>` : '';
    topbar.innerHTML = `
      <div class="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-line">
        <div class="max-w-6xl mx-auto h-16 px-4 sm:px-6 flex items-center gap-3">
          ${BRAND}
          <span class="max-[379px]:hidden shrink-0 whitespace-nowrap text-[0.8rem] font-bold uppercase tracking-wide text-brand bg-brand-soft px-2.5 py-1 rounded-full">Empresas</span>
          <nav class="hidden md:flex items-center gap-1 ml-6">${links}</nav>
          <div class="ml-auto flex items-center gap-2 shrink-0">${right}</div>
        </div>
      </div>`;
  }

  /* Barra superior del sitio público (portada, vacantes, candidato, páginas institucionales): siempre fija arriba.
     Izquierda: Inicio · Nosotros · Empresas. Derecha: Enviar CV · Empresa · Candidato. En pantallas chicas, menú. */
  function renderPublicTop(path) {
    const co = Store.company(), cand = Store.candidate(), nU = cand ? notifUnread() : 0;
    const L = [['/', 'Inicio'], ['/nosotros', 'Nosotros'], ['/empresas', 'Empresas']];
    const on = h => h === '/' ? path === '/' : path === h || (h === '/empresas' && path === '/e');
    const badge = n => n ? `<span class="min-w-5 h-5 px-1 rounded-full bg-bad text-white text-[0.7rem] font-bold grid place-items-center">${n}</span>` : '';
    const candItems = cand
      ? [['/postulaciones', 'ph-paper-plane-tilt', 'Mis postulaciones'], ['/notificaciones', 'ph-bell', 'Notificaciones', nU], ['/guardadas', 'ph-bookmark-simple', 'Guardadas'], ['/vacantes', 'ph-magnifying-glass', 'Vacantes']]
      : [['/postulaciones', 'ph-sign-in', 'Ingresar'], ['/vacantes', 'ph-magnifying-glass', 'Vacantes'], ['/guardadas', 'ph-bookmark-simple', 'Guardadas']];
    const item = ([h, ic, l, n]) => `<a href="#${h}" class="flex items-center gap-3 px-3 min-h-[2.75rem] py-2 leading-tight rounded-xl font-semibold hover:bg-surface ${path === h ? 'text-brand' : 'text-ink'}"><i class="ph ${ic} text-xl ${path === h ? '' : 'text-ink-soft'} shrink-0"></i><span class="flex-1">${l}</span>${badge(n)}</a>`;
    const pop = 'hidden absolute right-0 top-full mt-2 z-50 w-64 bg-white rounded-2xl border border-line shadow-[0_24px_48px_-20px_rgba(20,18,58,.35)] p-1.5 dd-pop';
    const candHead = cand ? `<div class="px-3 pt-2 pb-2.5 mb-1 border-b border-line"><p class="font-bold leading-tight">${esc(cand.name || 'Mi cuenta')}</p><p class="text-ink-mute text-[0.9rem]">${esc(cand.phone || '')}</p></div>` : '';
    const candOut = cand ? `<button type="button" data-cand-out class="w-full flex items-center gap-3 px-3 min-h-[2.75rem] py-2 leading-tight rounded-xl font-semibold text-ink-soft hover:bg-surface"><i class="ph ph-sign-out text-xl shrink-0"></i>Salir</button>` : '';
    topbar.innerHTML = `
      <div class="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-line">
        <div class="max-w-6xl mx-auto h-16 px-4 sm:px-6 flex items-center gap-3">
          ${BRAND}
          <nav class="hidden lg:flex items-center gap-1 ml-4 xl:ml-8" aria-label="Principal">${L.map(([h, l]) => `<a href="#${h}" class="inline-flex items-center h-10 px-3 xl:px-4 rounded-full font-semibold ${on(h) ? 'bg-brand-soft text-brand' : 'text-ink-soft hover:bg-surface hover:text-ink'}" ${on(h) ? 'aria-current="page"' : ''}>${l}</a>`).join('')}</nav>
          <div class="ml-auto flex items-center gap-2">
            <button type="button" data-send-cv class="btn btn-primary btn-sm justify-center shrink-0 whitespace-nowrap max-[349px]:w-10 max-[349px]:px-0" aria-label="Enviar CV"><i class="ph-bold ph-upload-simple text-lg"></i><span class="max-[349px]:hidden">Enviar CV</span></button>
            <a href="#/empresa" class="hidden lg:inline-flex btn btn-outline btn-sm" title="${co ? `Panel de ${esc(co.name)}` : 'Ingresar como empresa o consultora'}"><i class="ph ph-buildings text-lg"></i>Empresa</a>
            <div class="relative hidden lg:block" data-menu-wrap>
              <button type="button" data-menu="cand" class="btn btn-outline btn-sm relative" aria-haspopup="true" aria-expanded="false">${cand ? `<span class="w-6 h-6 rounded-full bg-brand-soft text-brand grid place-items-center"><i class="ph-fill ph-user"></i></span>${esc((cand.name || '').split(' ')[0] || 'Candidato')}` : '<i class="ph ph-user text-lg"></i>Candidato'}<i class="ph-bold ph-caret-down text-ink-mute"></i>${nU ? `<span class="absolute -top-1.5 -right-1.5">${badge(nU)}</span>` : ''}</button>
              <div data-menu-panel="cand" class="${pop}">${candHead}${candItems.map(item).join('')}${candOut}</div>
            </div>
            <div class="relative lg:hidden" data-menu-wrap>
              <button type="button" data-menu="mob" class="icon-btn border border-line relative shrink-0" aria-label="Menú" aria-haspopup="true" aria-expanded="false"><i class="ph-bold ph-list text-xl"></i>${nU ? '<span class="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-bad ring-2 ring-white"></span>' : ''}</button>
              <div data-menu-panel="mob" class="${pop} w-72 max-w-[calc(100vw-2rem)]">
                ${L.map(([h, l]) => `<a href="#${h}" class="flex items-center px-3 min-h-[2.75rem] py-2 leading-tight rounded-xl font-semibold hover:bg-surface ${on(h) ? 'text-brand' : 'text-ink'}">${l}</a>`).join('')}
                <div class="my-1.5 border-t border-line"></div>
                <a href="#/empresa" class="flex items-center gap-3 px-3 min-h-[2.75rem] py-2 leading-tight rounded-xl font-semibold hover:bg-surface"><i class="ph ph-buildings text-xl text-ink-soft shrink-0"></i>Empresa${co ? ` <span class="text-ink-mute font-normal truncate">· ${esc(co.name)}</span>` : ''}</a>
                <p class="px-3 pt-2 pb-1 text-[0.8rem] font-bold uppercase tracking-wide text-ink-mute">Candidato${cand ? ` · ${esc((cand.name || '').split(' ')[0])}` : ''}</p>
                ${candItems.map(item).join('')}${candOut}
              </div>
            </div>
          </div>
        </div>
      </div>`;
    $$('[data-menu]', topbar).forEach(b => b.onclick = e => {
      e.stopPropagation();
      const panel = b.parentElement.querySelector('[data-menu-panel]'), open = panel.classList.contains('hidden');
      closeMenus(); if (open) { panel.classList.remove('hidden'); b.setAttribute('aria-expanded', 'true'); }
    });
    $$('[data-menu-panel] a', topbar).forEach(a => a.addEventListener('click', () => closeMenus()));
    $$('[data-cand-out]', topbar).forEach(b => b.onclick = async () => { closeMenus(); if (await askConfirm({ title: '¿Salir de tu cuenta?', text: 'Tus postulaciones quedan guardadas. Para volver a verlas, ingresá con tu celular.', ok: 'Salir', icon: 'ph-sign-out' })) { Store.logoutCandidate(); toast('Saliste de tu cuenta', 'ph-sign-out'); location.hash = '#/'; render(); } });
  }
  function closeMenus() { $$('[data-menu-panel]').forEach(p => p.classList.add('hidden')); $$('[data-menu]').forEach(b => b.setAttribute('aria-expanded', 'false')); }
  document.addEventListener('click', e => { if (!e.target.closest('[data-menu-wrap]')) closeMenus(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenus(); });
  function renderBottom(mode, path) {
    path = navPath(path);
    // En el celular entran 5: si hay más, las últimas van a un botón "Más" (Reportes, Perfil, Planes)
    const all = navItems(mode);
    const extra = all && all.length > 5 ? all.slice(4) : [];
    const items = all && (extra.length ? [...all.slice(0, 4), ['#more', 'ph-dots-three-circle', 'Más']] : all);
    document.body.classList.toggle('has-bottom', !!items);
    if (!items) { bottombar.innerHTML = ''; return; }
    const nNew = mode === 'company' ? newAppsCount() : 0;
    bottombar.innerHTML = `
      <div class="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-line pb-safe">
        <div class="grid ${({ 3: 'grid-cols-3', 4: 'grid-cols-4', 5: 'grid-cols-5' })[items.length] || 'grid-cols-4'}">
          ${items.map(([h, ic, l, short]) => {
            if (h === '#more') {
              const on = extra.some(x => x[0] === path) || path === '/empresa/planes';
              return `<button type="button" data-nav-more class="flex flex-col items-center gap-0.5 pt-2.5 pb-1 px-0.5 min-w-0 text-center leading-tight text-[0.82rem] font-semibold ${on ? 'text-brand' : 'text-ink-mute'}" aria-haspopup="dialog">
                <span class="relative"><i class="${on ? 'ph-fill' : 'ph'} ${ic} text-[1.6rem]"></i></span><span class="block w-full truncate">${on ? esc((extra.find(x => x[0] === path) || ['', '', 'Más'])[2]) : 'Más'}</span></button>`;
            }
            const a = path === h;
            const nb = h === '/empresa/busquedas' ? nNew : h === '/notificaciones' ? notifUnread() : 0;
            const badge = nb ? `<span class="absolute -top-1 -right-2.5 min-w-5 h-5 px-1 rounded-full bg-bad text-white text-[0.7rem] font-bold grid place-items-center">${nb}</span>` : '';
            return `<a href="#${h}" class="flex flex-col items-center gap-0.5 pt-2.5 pb-1 px-0.5 min-w-0 text-center leading-tight ${mode === 'candidate' ? 'text-[0.74rem] min-[380px]:text-[0.78rem]' : 'text-[0.82rem]'} font-semibold ${a ? 'text-brand' : 'text-ink-mute'}" ${a ? 'aria-current="page"' : ''}>
              <span class="relative"><i class="${a ? 'ph-fill' : 'ph'} ${ic} text-[1.6rem]"></i>${badge}</span><span class="block w-full truncate">${short || l}</span></a>`;
          }).join('')}
        </div>
      </div>`;
    const mb = $('[data-nav-more]', bottombar);
    if (mb) mb.onclick = () => {
      const co = Store.company();
      const links = [...extra, ...(BILLING ? [['/empresa/planes', 'ph-crown-simple', 'Planes y pagos']] : [])];
      openSheet(sheetScroll(`<h2 class="text-[1.4rem] font-extrabold pr-10">Más</h2>
        ${co ? `<p class="text-ink-soft mt-0.5">${esc(co.name)}</p>` : ''}
        <ul class="mt-4 space-y-1.5">${links.map(([h, ic, l]) => `<li><a href="#${h}" data-close-sheet class="flex items-center gap-3 rounded-2xl px-3 py-3 font-semibold ${path === h ? 'bg-brand-soft text-brand' : 'hover:bg-surface'}"><span class="w-10 h-10 rounded-xl bg-surface grid place-items-center"><i class="ph ${ic} text-xl"></i></span>${esc(l)}<i class="ph-bold ph-caret-right ml-auto text-ink-mute"></i></a></li>`).join('')}</ul>`));
    };
  }

  /* ================= VISTAS: CANDIDATO ================= */

  function Welcome() {
    const p = Store.profile();
    const jobs = Store.activeJobs();
    const recent = [...jobs].sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt)).slice(0, 8);
    const companies = [...new Set(jobs.map(j => j.company))];
    const byProv = PROVINCES.map(pr => [pr, jobs.filter(j => j.province === pr).length]).filter(x => x[1]).sort((a, b) => b[1] - a[1]).slice(0, 7);
    const remote = jobs.filter(j => j.modality === 'Remoto').length;
    // Destacadas: las más recientes primero
    const featured = [...Store.featuredJobs()].sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt));
    // Slider del hero: cada slide lleva a un camino distinto
    const topProv = byProv[0] || ['Tucumán', 0];
    const IMG = id => /^(assets\/|data:)/.test(id) ? id : `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1800&q=70`;
    const SLIDES = [
      { key: 'buscar', label: 'Buscá trabajo', img: 'photo-1595986630530-969786b19b4d', pos: '60% 30%', tint: '#3B5BFD',
        tag: ['ph-briefcase', `${jobs.length} vacantes activas`],
        title: 'Tu próximo trabajo está acá',
        text: 'Vacantes de consultoras y empresas de todo el país. Buscá por puesto, provincia, modalidad y rubro.',
        cta: ['Ver todas las vacantes', 'data-hs-jobs'] },
      { key: 'cerca', label: 'Cerca de casa', img: LOCAL_IMG.equipo, pos: '50% 30%', tint: '#11946A',
        tag: ['ph-map-pin', `${topProv[1]} vacantes en ${topProv[0]}`],
        title: `Trabajo cerca de casa, en ${topProv[0]}`,
        text: 'Consultoras y empresas de tu provincia publican acá todas las semanas.',
        cta: [`Ver vacantes en ${topProv[0]}`, `data-hero-prov="${esc(topProv[0])}"`] },
      { key: 'remoto', label: 'Desde tu casa', img: 'photo-1743865319071-929ac8a27bcd', pos: '50% 40%', tint: '#B7791F',
        tag: ['ph-house-line', `${remote} vacantes remotas`],
        title: 'Trabajá desde tu casa',
        text: 'Vacantes 100% remotas para postularte desde cualquier provincia.',
        cta: ['Ver vacantes remotas', 'data-hero-remote'] },
      { key: 'empresas', label: 'Para empresas', img: 'photo-1698047682091-782b1e5c6536', pos: '50% 35%', tint: '#14123A',
        tag: ['ph-buildings', 'Para consultoras y empresas'],
        title: 'Encontrá a la persona indicada',
        text: 'Publicá una búsqueda en dos minutos y recibí los CVs ordenados por cliente, listos para revisar y calificar.',
        cta: ['Publicar una búsqueda', 'data-hs-company'], cta2: ['Probar la cuenta demo', 'id="hero-demo"'] }
    ];
    const heroSlider = `
      <section class="relative bg-ink" aria-roledescription="carrusel" aria-label="Destacados">
        <div class="swiper js-hero h-[560px] sm:h-[580px] lg:h-[660px] !pb-0">
          <div class="swiper-wrapper">
            ${SLIDES.map((sl, i) => `
            <div class="swiper-slide relative overflow-hidden" style="background:${sl.tint}" aria-label="${i + 1} de ${SLIDES.length}">
              <img src="${IMG(sl.img)}" alt="" class="hero-img absolute inset-0 w-full h-full object-cover" style="object-position:${sl.pos}" ${i ? 'loading="lazy"' : 'fetchpriority="high"'} onerror="this.remove()">
              <div class="absolute inset-0 hero-shade" aria-hidden="true"></div>
              <div class="relative h-full max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-32 sm:pb-36 lg:pb-44 flex items-end">
                <div class="max-w-[40rem] lg:max-w-[48rem] text-white">
                  <span class="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3.5 py-1.5 font-semibold text-[0.95rem]"><i class="ph-fill ${sl.tag[0]}"></i>${esc(sl.tag[1])}</span>
                  <${i ? 'h2' : 'h1'} class="mt-4 text-[2.5rem] sm:text-[3.4rem] lg:text-[4rem] leading-[0.98] font-extrabold tracking-[-0.035em]">${esc(sl.title)}</${i ? 'h2' : 'h1'}>
                  <p class="mt-4 text-[1.1rem] sm:text-[1.2rem] text-white/85 max-w-[32rem]">${esc(sl.text)}</p>
                  <div class="mt-6 flex flex-wrap gap-3">
                    <button type="button" ${sl.cta[1]} class="btn h-14 px-7 text-[1.05rem] bg-white text-ink hover:bg-sun">${esc(sl.cta[0])}</button>
                    ${sl.cta2 ? `<button type="button" ${sl.cta2[1]} class="btn h-14 px-6 text-white border border-white/40 hover:bg-white/10">${esc(sl.cta2[0])}</button>` : ''}
                  </div>
                </div>
              </div>
            </div>`).join('')}
          </div>
        </div>
        <div class="absolute inset-x-0 bottom-14 sm:bottom-16 lg:bottom-[72px] z-10 pointer-events-none">
          <div class="max-w-6xl mx-auto px-4 sm:px-6 flex items-center gap-3">
            <div class="hero-tabs flex-1 grid grid-cols-4 gap-2 sm:gap-3 pointer-events-auto" role="tablist" aria-label="Elegí un destacado">
              ${SLIDES.map((sl, i) => `<button type="button" role="tab" class="hero-tab text-left" data-hero-go="${i}" aria-label="${esc(sl.label)}">
                <span class="block h-1 rounded-full bg-white/30 overflow-hidden"><span class="hero-fill block h-full bg-white"></span></span>
                <span class="hidden sm:block mt-2 text-[0.92rem] font-semibold text-white/70">${esc(sl.label)}</span></button>`).join('')}
            </div>
            <div class="flex gap-2 pointer-events-auto">
              <button type="button" id="hero-pause" class="w-11 h-11 rounded-full bg-white/15 backdrop-blur text-white grid place-items-center hover:bg-white/25" aria-label="Pausar"><i class="ph-fill ph-pause text-lg"></i></button>
              <button type="button" id="hero-prev" class="hidden md:grid w-11 h-11 rounded-full bg-white/15 backdrop-blur text-white place-items-center hover:bg-white/25" aria-label="Anterior"><i class="ph-bold ph-caret-left text-lg"></i></button>
              <button type="button" id="hero-next" class="hidden md:grid w-11 h-11 rounded-full bg-white/15 backdrop-blur text-white place-items-center hover:bg-white/25" aria-label="Siguiente"><i class="ph-bold ph-caret-right text-lg"></i></button>
            </div>
          </div>
        </div>
      </section>`;

    // "Del primer mensaje a la entrevista": 3 tarjetas (Swiper: carrusel en mobile, las 3 visibles en escritorio)
    const STEPS = [
      { bg: 'bg-[#E8ECFF]', num: 'text-brand', title: 'Armá tu alerta', text: 'Puesto, provincia, modalidad y experiencia. Con tus palabras o tocando una opción.',
        ui: `<div class="space-y-2"><div class="flex gap-1.5 items-end">${fedfu('w-7 h-7')}<p class="bg-white rounded-[14px] rounded-bl-md px-3 py-1.5 text-[0.92rem]">¿En qué provincia?</p></div>
          <div class="flex flex-wrap gap-1.5 justify-end">${['Salta', 'Tucumán', 'Jujuy'].map((x, i) => `<span class="rounded-full px-3 py-1 text-[0.88rem] font-semibold ${i === 1 ? 'bg-brand text-white' : 'bg-white text-ink'}">${x}</span>`).join('')}</div></div>` },
      { bg: 'bg-[#DDE4FF]', num: 'text-brand', title: 'Mirá lo que encaja con vos', text: 'Filtramos las vacantes por tu rubro y tu provincia, de consultoras y empresas que publican acá.',
        ui: `<div class="bg-white rounded-[16px] p-3 flex items-center gap-2.5">${logo('Clínica del Parque', 'w-10 h-10 text-xs')}<div class="min-w-0 flex-1"><p class="font-display font-bold leading-tight truncate">Enfermero/a profesional</p><p class="text-[0.82rem] text-ink-mute truncate">San Miguel de Tucumán</p></div><span class="shrink-0 inline-flex items-center gap-1 bg-sun rounded-full px-2 py-0.5 text-[0.8rem] font-bold">Nueva</span></div>` },
      { bg: 'bg-[#C9D4FF]', num: 'text-brand', title: 'Postulate con tu PDF', text: 'Subís el CV y completamos tus datos solos. La próxima vez es un toque.',
        ui: `<div class="bg-white rounded-[16px] p-3 flex items-center gap-2.5"><span class="w-10 h-10 rounded-[10px] bg-bad/10 text-bad grid place-items-center"><i class="ph-fill ph-file-pdf text-xl"></i></span><div class="flex-1"><p class="font-semibold">mi-cv.pdf</p><p class="text-[0.82rem] text-ink-mute">Datos completados</p></div><span class="w-8 h-8 rounded-full bg-ok text-white grid place-items-center"><i class="ph-bold ph-check"></i></span></div>` }
    ];
    const stepsSlider = `
      <section id="pasos" class="max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-4 overflow-hidden" aria-label="Cómo funciona">
        <h2 class="text-[1.9rem] sm:text-[2.3rem] leading-[1.05] font-extrabold">Del primer mensaje a la entrevista</h2>
        <div class="swiper js-steps mt-6 !overflow-visible lg:!overflow-hidden">
          <ol class="swiper-wrapper">
            ${STEPS.map((st, i) => `
            <li class="swiper-slide">
              <article class="${st.bg} h-full rounded-[24px] p-5 flex flex-col">
                <div class="flex items-center gap-3">
                  <span class="w-10 h-10 shrink-0 rounded-full bg-white grid place-items-center font-display font-extrabold text-lg ${st.num}">${i + 1}</span>
                  <h3 class="text-[1.3rem] leading-tight font-bold">${st.title}</h3>
                </div>
                <p class="mt-3 text-ink-soft">${st.text}</p>
                <div class="mt-auto pt-4">${st.ui}</div>
              </article>
            </li>`).join('')}
          </ol>
          <div class="swiper-pagination lg:!hidden"></div>
        </div>
      </section>`;

    const html = `
      ${heroSlider}

      <section class="relative z-20 px-3 sm:px-6 -mt-10" aria-label="Buscar empleo">
        <div class="max-w-6xl mx-auto">${searchBar('hero')}</div>
      </section>

      <section class="max-w-6xl mx-auto px-4 sm:px-6 pt-16 md:pt-24" aria-labelledby="hub-t">
        <div class="rounded-[28px] bg-white border border-line p-6 sm:p-10 grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-12 items-center">
          <div>
            <p class="font-bold text-brand uppercase tracking-wide text-[0.85rem] flex items-center gap-1.5"><i class="ph-fill ph-map-pin"></i>Tucumán</p>
            <h2 id="hub-t" class="mt-2 text-[1.8rem] sm:text-[2.3rem] leading-[1.1] font-extrabold">${HUB_TITLE}</h2>
            <p class="mt-4 text-ink-soft text-[1.08rem] leading-relaxed">${HUB_TEXT}</p>
            <p class="mt-3 font-semibold text-ink text-[1.08rem]">${HUB_CLOSE}</p>
            <button type="button" data-hub-join class="mt-6 btn btn-primary h-14 px-7 text-[1.05rem]"><i class="ph-bold ph-users-three text-lg"></i>Sumate al Hub</button>
          </div>
          <ul class="grid grid-cols-2 gap-3">${HUB_PILLARS.map(([ic, l]) => `<li class="rounded-[20px] bg-surface p-4 sm:p-5"><i class="ph-fill ${ic} text-[1.9rem] text-brand"></i><p class="mt-2 font-display font-bold leading-tight">${l}</p></li>`).join('')}</ul>
        </div>
      </section>

      <section class="pt-16 md:pt-24 pb-14 md:pb-20" aria-labelledby="trust-t">
        <div class="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 id="trust-t" class="text-[1.75rem] sm:text-[2.2rem] leading-tight font-extrabold">Empresas que confían en +Humanos</h2>
          <p class="mt-2 text-ink-soft text-[1.08rem]">Consultoras y empresas que ya publican sus búsquedas acá.</p>
        </div>
        ${(() => {
          const item = (t, hid) => `<li><a href="#/e?n=${encodeURIComponent(t.name)}" ${hid ? 'tabindex="-1"' : ''} title="${esc(t.name)}" class="flex items-center gap-2.5 h-16 px-2 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 focus-visible:grayscale-0 focus-visible:opacity-100 transition duration-300">
            ${t.src ? `<img src="${esc(t.src)}" alt="${esc(t.name)}" class="h-10 sm:h-12 w-auto max-w-[11rem] object-contain" loading="lazy">`
              : `${logo(t.name, 'w-10 h-10 text-[0.8rem]')}<span class="font-display font-extrabold text-[1.3rem] sm:text-[1.4rem] tracking-tight text-ink whitespace-nowrap">${esc(t.name)}</span>`}</a></li>`;
          const group = hid => `<ul class="marquee-group !gap-12 sm:!gap-16 !pr-12 sm:!pr-16" ${hid ? 'aria-hidden="true"' : ''}>${TRUSTED.map(t => item(t, hid)).join('')}</ul>`;
          return `<div class="marquee mt-10 md:mt-12"><div class="marquee-track">${group(false)}${group(true)}</div></div>`;
        })()}
      </section>

      ${(() => {
        const act = Store.activeJobs();
        const feat = act.filter(j => Store.isFeatured(j)).sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt));
        const rest = act.filter(j => !Store.isFeatured(j)).sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt));
        const list = [...feat, ...rest].slice(0, 9);
        if (!list.length) return '';
        return `<section class="max-w-6xl mx-auto px-4 sm:px-6 pb-16 md:pb-24" aria-labelledby="ads-t">
          <div class="flex flex-wrap items-end justify-between gap-3">
            <div><h2 id="ads-t" class="text-[1.75rem] sm:text-[2.2rem] leading-tight font-extrabold">${BILLING ? 'Anuncios destacados' : 'Últimos avisos'}</h2>
              <p class="mt-1 text-ink-soft text-[1.08rem]">Las búsquedas abiertas más nuevas de consultoras y empresas.</p></div>
            <a href="#/vacantes" data-ads-all class="inline-flex items-center gap-1.5 font-semibold text-brand hover:underline underline-offset-4">Ver todas las vacantes<i class="ph-bold ph-arrow-right"></i></a>
          </div>
          <ul class="mt-8 grid gap-x-5 gap-y-6 sm:gap-y-7 md:grid-cols-2 lg:grid-cols-3">${list.map(adCard).join('')}</ul>
        </section>`;
      })()}

      <section class="max-w-6xl mx-auto px-4 sm:px-6 pb-16 md:pb-24" aria-labelledby="cons-t">
        <div class="grid gap-12 lg:gap-16 lg:grid-cols-2 items-center">
          <div class="relative h-[340px] sm:h-[420px] lg:h-[460px]" aria-hidden="true">
            <div class="absolute right-0 top-0 w-[60%] h-full rounded-[22px] overflow-hidden bg-brand-soft">
              <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=70" alt="" class="w-full h-full object-cover" loading="lazy" onerror="this.remove()"></div>
            <div class="absolute left-0 bottom-0 w-[46%] h-[62%] rounded-[22px] overflow-hidden bg-lilac ring-8 ring-surface">
              <img src="https://images.unsplash.com/photo-1698047682091-782b1e5c6536?auto=format&fit=crop&w=700&q=70" alt="" class="w-full h-full object-cover" loading="lazy" onerror="this.remove()"></div>
            <div class="absolute left-[18%] top-[22%] bg-white rounded-2xl shadow-[0_24px_48px_-20px_rgba(20,18,58,.35)] border border-line px-4 py-3.5 flex items-center gap-3.5 max-w-[17rem]">
              <span class="w-12 h-12 rounded-xl bg-sun-soft text-warn grid place-items-center shrink-0"><i class="ph-fill ph-tray text-2xl"></i></span>
              <span class="leading-tight"><span class="block font-display font-bold text-[1.05rem]">12 CVs nuevos</span><span class="block text-ink-soft text-[0.92rem] mt-0.5">Listos para revisar</span></span>
            </div>
          </div>
          <div>
            <p class="font-bold text-brand uppercase tracking-wide text-[0.85rem]">Para consultoras</p>
            <h2 id="cons-t" class="mt-2 text-[1.9rem] sm:text-[2.5rem] leading-[1.08] font-extrabold">Menos carga operativa, mejores selecciones para tus clientes</h2>
            <p class="mt-4 text-ink-soft text-[1.1rem] leading-relaxed">Publicá las búsquedas de todos tus clientes, recibí los CVs en un solo lugar, calificalos y llevá cada proceso de punta a punta desde un solo lugar.</p>
            <ul class="mt-7 space-y-4">
              ${[['Publicás en 2 pasos', 'Puesto y lugar; la descripción, los requisitos y las skills se completan solos.'], ['Tu propia base de candidatos', 'Cada postulante queda guardado con notas y etiquetas para tus próximas búsquedas.'], ['Entrevistas en un calendario', 'Agendás día y hora, y avisás al candidato por WhatsApp con un toque.']]
                .map(([t, d]) => `<li class="flex gap-3.5"><span class="w-8 h-8 rounded-full bg-brand-soft text-brand grid place-items-center shrink-0 mt-0.5"><i class="ph-bold ph-check"></i></span><span><span class="block font-bold text-[1.08rem]">${t}</span><span class="block text-ink-soft">${d}</span></span></li>`).join('')}
            </ul>
          </div>
        </div>
      </section>

      ${(() => {
        // Slider para candidatos: problemas comunes al postularse y cómo los resuelve +Humanos
        const P = [
          { label: 'Seguimiento', img: LOCAL_IMG.p1, pos: '60% 50%', tint: '#3B5BFD', tag: ['ph-eye', 'Transparencia'],
            title: 'Mirá cada paso de tu postulación', text: 'Con +Humanos ves cada punto de contacto con la consultora o empresa: cuándo leyeron tu CV, si seguís en proceso y cuándo es tu entrevista.', cta: ['Ver mis postulaciones', 'href="#/postulaciones"'] },
          { label: 'Devolución', img: LOCAL_IMG.p2, pos: '62% 40%', tint: '#7B3FE4', tag: ['ph-chat-circle-text', 'Feedback'],
            title: 'Recibí siempre una devolución', text: 'Avances o no, te enterás: la consultora te avisa el resultado por +Humanos y por WhatsApp.', cta: ['Ver vacantes', 'data-hs-jobs'] },
          { label: 'Chau ghosting', img: LOCAL_IMG.p3, pos: '50% 30%', tint: '#14123A', tag: ['ph-hand-waving', 'Chau ghosting'],
            title: 'Siempre sabés en qué etapa estás', text: 'Enviada, CV leído, en proceso, finalista o resultado: tu postulación nunca queda en silencio.', cta: ['Ver mis postulaciones', 'href="#/postulaciones"'] },
          { label: 'Un solo clic', img: LOCAL_IMG.p4, pos: '60% 35%', tint: '#11946A', tag: ['ph-cursor-click', 'Sin formularios'],
            title: 'Postulate con un solo clic', text: 'Sin formularios interminables: subís tu CV una vez y las próximas veces te postulás con un toque.', cta: ['Ver vacantes', 'data-hs-jobs'] },
          { label: 'Alertas', img: LOCAL_IMG.p5, pos: '55% 50%', tint: '#B7791F', tag: ['ph-bell-ringing', 'Alertas'],
            title: 'Enterate primero', text: 'Te avisamos por WhatsApp cuando aparece una vacante de tu rubro en tu provincia.', cta: ['Crear una alerta', 'data-alert-new'] },
          { label: 'Avisos reales', img: LOCAL_IMG.p6, pos: '50% 45%', dim: true, tint: '#2A44D6', tag: ['ph-seal-check', 'Avisos vigentes'],
            title: 'Solo vacantes activas', text: 'Avisos reales y vigentes: cuando una búsqueda se cierra, desaparece del sitio.', cta: ['Ver vacantes', 'data-hs-jobs'] }
        ];
        return `<section class="pb-16 md:pb-24" aria-labelledby="pain-t">
          <div class="max-w-6xl mx-auto px-4 sm:px-6 mb-8">
            <p class="font-bold text-brand uppercase tracking-wide text-[0.85rem]">Para quienes buscan trabajo</p>
            <h2 id="pain-t" class="mt-2 text-[1.9rem] sm:text-[2.5rem] leading-[1.08] font-extrabold max-w-3xl">Postularte ya no es tirar CVs al vacío</h2>
          </div>
          <div class="relative bg-ink js-pain-wrap" aria-roledescription="carrusel" aria-label="Lo que resuelve +Humanos para candidatos">
            <div class="swiper js-pain h-[520px] sm:h-[540px] lg:h-[600px] !pb-0">
              <div class="swiper-wrapper">
                ${P.map((sl, i) => `<div class="swiper-slide relative overflow-hidden" style="background:${sl.tint}" aria-label="${i + 1} de ${P.length}">
                  <img src="${IMG(sl.img)}" alt="" class="hero-img absolute inset-0 w-full h-full object-cover" style="object-position:${sl.pos}" loading="lazy" onerror="this.remove()">
                  <div class="absolute inset-0 hero-shade" aria-hidden="true"></div>
                  ${sl.dim ? '<div class="absolute inset-0 bg-ink/55" aria-hidden="true"></div>' : ''}
                  <div class="relative h-full max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-28 sm:pb-32 flex items-end">
                    <div class="max-w-[40rem] lg:max-w-[46rem] text-white">
                      <span class="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur px-3.5 py-1.5 font-semibold text-[0.95rem]"><i class="ph-fill ${sl.tag[0]}"></i>${esc(sl.tag[1])}</span>
                      <h3 class="mt-4 text-[2.2rem] sm:text-[3rem] lg:text-[3.5rem] leading-[1] font-extrabold tracking-[-0.03em]">${esc(sl.title)}</h3>
                      <p class="mt-4 text-[1.08rem] sm:text-[1.18rem] text-white/85 max-w-[34rem]">${esc(sl.text)}</p>
                      <div class="mt-6">${sl.cta[1].startsWith('href') ? `<a ${sl.cta[1]} class="btn h-14 px-7 text-[1.05rem] bg-white text-ink hover:bg-sun">${esc(sl.cta[0])}</a>` : `<button type="button" ${sl.cta[1]} class="btn h-14 px-7 text-[1.05rem] bg-white text-ink hover:bg-sun">${esc(sl.cta[0])}</button>`}</div>
                    </div>
                  </div>
                </div>`).join('')}
              </div>
            </div>
            <div class="absolute inset-x-0 bottom-8 sm:bottom-10 z-10 pointer-events-none">
              <div class="max-w-6xl mx-auto px-4 sm:px-6 flex items-center gap-3">
                <div class="flex-1 grid grid-cols-6 gap-2 sm:gap-3 pointer-events-auto" role="tablist" aria-label="Elegí un tema">
                  ${P.map((sl, i) => `<button type="button" role="tab" class="hero-tab text-left" data-ps-go="${i}" aria-label="${esc(sl.label)}">
                    <span class="block h-1 rounded-full bg-white/30 overflow-hidden"><span class="hero-fill block h-full bg-white"></span></span>
                    <span class="hidden lg:block mt-2 text-[0.88rem] font-semibold text-white/70 truncate">${esc(sl.label)}</span></button>`).join('')}
                </div>
                <div class="flex gap-2 pointer-events-auto">
                  <button type="button" data-ps-pause class="w-11 h-11 rounded-full bg-white/15 backdrop-blur text-white grid place-items-center hover:bg-white/25" aria-label="Pausar"><i class="ph-fill ph-pause text-lg"></i></button>
                  <button type="button" data-ps-prev class="hidden md:grid w-11 h-11 rounded-full bg-white/15 backdrop-blur text-white place-items-center hover:bg-white/25" aria-label="Anterior"><i class="ph-bold ph-caret-left text-lg"></i></button>
                  <button type="button" data-ps-next class="hidden md:grid w-11 h-11 rounded-full bg-white/15 backdrop-blur text-white place-items-center hover:bg-white/25" aria-label="Siguiente"><i class="ph-bold ph-caret-right text-lg"></i></button>
                </div>
              </div>
            </div>
          </div>
        </section>`;
      })()}

      ${siteFooter()}`;
    return {
      html, mount() {
        initSwipers();
        const start = preset => { S.chatPreset = preset; location.hash = '#/chat'; };
        $('#hero-form').onsubmit = e => {
          e.preventDefault();
          Object.assign(S, { q: $('#hero-q').value.trim(), fprov: $('#hero-prov').value, fmod: $('#hero-mod').value, farea: $('#hero-area').value, filter: 'todas', jobLimit: PAGE });
          location.hash = '#/vacantes';
        };
        $$('[data-hero-prov]').forEach(btn => btn.onclick = () => { S.filter = 'todas'; S.q = ''; S.fprov = btn.dataset.heroProv; S.farea = ''; S.fmod = ''; S.jobLimit = PAGE; location.hash = '#/vacantes'; });
        const rb = $('[data-hero-remote]'); if (rb) rb.onclick = () => { S.filter = 'todas'; S.fmod = 'Remoto'; S.q = ''; S.fprov = ''; S.farea = ''; S.jobLimit = PAGE; location.hash = '#/vacantes'; };
        const demo = () => { Store.setCompany({ name: 'Talento Norte', type: 'Consultora' }); location.hash = '#/empresa'; };
        $$('#hero-demo, [data-hero-demo]').forEach(x => x.onclick = demo);
        $$('[data-hs-jobs], [data-ads-all]').forEach(x => x.onclick = () => { Object.assign(S, { q: '', fprov: '', fmod: '', farea: '', filter: 'todas', jobLimit: PAGE }); location.hash = '#/vacantes'; });
        $$('[data-hs-company]').forEach(x => x.onclick = () => { location.hash = '#/empresa'; });
        initHero();
        initPhotoSlider($('.js-pain-wrap', view));
        initSteps();
      }
    };
  }


  /* ----- El Hub de Tucumán: texto institucional (portada y Empresas) ----- */
  const HUB_TITLE = 'Somos el Hub de Consultoras de RRHH y Empresas de Tucumán';
  const HUB_TEXT = 'Un espacio de encuentro donde publicamos avisos laborales, potenciamos el networking, compartimos tendencias del mercado e intercambiamos recomendaciones de candidatos entre selectores.';
  const HUB_CLOSE = 'Juntos fortalecemos la búsqueda de empleo en la provincia.';
  const HUB_PILLARS = [['ph-megaphone', 'Avisos laborales'], ['ph-handshake', 'Networking'], ['ph-trend-up', 'Tendencias del mercado'], ['ph-users-three', 'Recomendaciones entre selectores']];
  function openHubJoin() {
    const body = `<span class="w-14 h-14 rounded-2xl bg-brand-soft text-brand grid place-items-center"><i class="ph-fill ph-users-three text-3xl"></i></span>
      <h2 class="mt-4 text-[1.6rem] font-extrabold pr-10 leading-tight">Sumate al Hub</h2>
      <p class="mt-2 text-ink-soft">${HUB_TEXT}</p>
      <div class="mt-5 grid gap-3">
        <a href="#/empresa?crear=1" data-close-sheet class="rounded-[20px] border border-line p-4 flex items-center gap-4 hover:border-brand/40">
          <span class="w-12 h-12 rounded-xl bg-lilac text-brand grid place-items-center shrink-0"><i class="ph-fill ph-buildings text-2xl"></i></span>
          <span class="min-w-0 flex-1"><span class="block font-bold">Crear la cuenta de mi consultora o empresa</span><span class="block text-ink-mute text-[0.92rem]">Publicá búsquedas y gestioná tus candidatos</span></span><i class="ph-bold ph-caret-right text-ink-mute"></i></a>
        <a href="${waLink(SALES_WA, 'Hola, quiero sumarme al Hub de Consultoras de RRHH y Empresas de Tucumán.')}" target="_blank" rel="noopener" class="rounded-[20px] border border-line p-4 flex items-center gap-4 hover:border-brand/40">
          <span class="w-12 h-12 rounded-xl bg-mint text-ok grid place-items-center shrink-0"><i class="ph-fill ph-whatsapp-logo text-2xl"></i></span>
          <span class="min-w-0 flex-1"><span class="block font-bold">Escribinos por WhatsApp</span><span class="block text-ink-mute text-[0.92rem]">Te sumamos a la comunidad de selectores</span></span><i class="ph-bold ph-caret-right text-ink-mute"></i></a>
      </div>`;
    openSheet(sheetScroll(body));
  }

  /* ----- Pie del sitio y páginas institucionales ----- */
  // Redes de ejemplo: cambiar acá por las cuentas reales
  const SOCIAL = [
    ['Instagram', 'ph-instagram-logo', 'https://www.instagram.com/emplea'],
    ['Facebook', 'ph-facebook-logo', 'https://www.facebook.com/emplea'],
    ['WhatsApp', 'ph-whatsapp-logo', 'https://wa.me/5493815550000']
  ];
  const INFO_PATHS = ['/nosotros', '/faqs', '/terminos', '/privacidad', '/cafe', '/cafe/nota'];
  function siteFooter() {
    const col = (t, links) => `<div><p class="font-display font-bold text-ink">${t}</p><ul class="mt-3 space-y-1">${links.map(([h, l, ic]) => `<li><a href="#${h}" class="flex items-center gap-2 min-h-[44px] py-1 text-ink-soft font-semibold hover:text-brand"><i class="ph-fill ${ic} text-brand text-[1.15rem] shrink-0" aria-hidden="true"></i><span class="min-w-0">${l}</span></a></li>`).join('')}</ul></div>`;
    return `<footer class="border-t border-line bg-white">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-8">
          <div class="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <div class="col-span-2 md:col-span-1">
              ${BRAND}
              <p class="mt-3 text-ink-soft max-w-xs">El portal de gestión para consultoras: publicá, calificá y presentá candidatos en un solo lugar.</p>
              <ul class="mt-5 flex gap-2" aria-label="Redes sociales">${SOCIAL.map(([n, ic, u]) => `<li><a href="${u}" target="_blank" rel="noopener" aria-label="${n} de +Humanos" title="${n}" class="w-11 h-11 rounded-full bg-surface text-ink grid place-items-center hover:bg-brand hover:text-white transition"><i class="ph-fill ${ic} text-[1.35rem]"></i></a></li>`).join('')}</ul>
            </div>
            ${col('+Humanos', [['/nosotros', 'Nosotros', 'ph-hand-heart'], ['/empresas', 'Empresas adheridas', 'ph-buildings'], ['/cafe', 'Charla de café', 'ph-coffee'], ['/faqs', 'Preguntas frecuentes', 'ph-question']])}
            ${col('Legal', [['/terminos', 'Términos y condiciones', 'ph-scroll'], ['/privacidad', 'Política de privacidad', 'ph-shield-check']])}
          </div>
          <div class="mt-10 pt-6 border-t border-line flex flex-col sm:flex-row gap-2 sm:items-center justify-between text-ink-mute text-[0.92rem]">
            <p>© ${new Date().getFullYear()} +Humanos · Desarrollado por <b class="font-semibold text-ink-soft">Clutch! Estudio</b></p>
            <a href="#/admin" class="text-[0.72rem] text-ink-mute/70 hover:text-brand hover:underline w-fit">Admin</a>
          </div>
        </div>
      </footer>`;
  }

  const INFO = {
    nosotros: {
      title: 'Nosotros', icon: 'ph-hand-heart', lead: 'Ayudamos a las consultoras a seleccionar mejores candidatos, en menos tiempo.',
      body: () => `
        <p>+Humanos nació en Tucumán como el Hub de Consultoras de RRHH y Empresas de la provincia, y está abierto a búsquedas de todo el país. Es el portal de gestión para consultoras de selección: publicás tus búsquedas, recibís todos los CVs en un solo lugar, los leés y calificás, y le presentás la terna a tu cliente con un link. Sin planillas, carpetas de mails ni cadenas de WhatsApp.</p>
        <p>Cada candidato que pasa por tus búsquedas queda en tu propia base, con tus notas, etiquetas y su historial, para que la próxima búsqueda arranque con gente que ya conocés. Y si necesitás perfiles nuevos, buscás en la base de +Humanos por provincia, profesión y experiencia.</p>
        <p>Para quienes buscan trabajo, +Humanos es gratis: ven las vacantes de todo el país y se postulan con su CV desde el celular.</p>
        <div class="not-prose grid sm:grid-cols-3 gap-3 my-8">
          ${[['ph-tray', 'Todos los CVs en un lugar', 'Cada postulante con su CV, tu calificación y la etapa en la que está.'], ['ph-link', 'Terna con link para tu cliente', 'Tu cliente ve los finalistas, tus comentarios y los CVs, y te responde desde ahí.'], ['ph-address-book', 'Tu base de candidatos', 'Quienes se postularon quedan guardados con notas y etiquetas para la próxima búsqueda.']]
            .map(([ic, t, d]) => `<div class="rounded-[22px] bg-white border border-line p-5"><i class="ph-fill ${ic} text-3xl text-brand"></i><p class="mt-3 font-bold text-lg leading-snug">${t}</p><p class="mt-1 text-ink-soft">${d}</p></div>`).join('')}
        </div>
        <h2>Cómo trabajamos</h2>
        <p>Las decisiones las toma tu equipo: +Humanos ordena la información, pero cada CV lo lee y lo califica una persona. Pedimos solo los datos necesarios, y los candidatos aparecen en la base únicamente si se postularon o aceptaron ser contactados.</p>
        <h2>Hablemos</h2>
        <p>¿Tenés una consultora y querés probarlo con tu equipo? Escribinos por WhatsApp o creá tu cuenta.</p>
        <div class="not-prose mt-5 flex flex-wrap gap-2"><a href="#/empresa?crear=1" class="btn btn-primary"><i class="ph ph-buildings"></i>Crear mi cuenta</a><button type="button" data-hub-join class="btn btn-outline"><i class="ph ph-users-three"></i>Sumate al Hub</button></div>`
    },
    faqs: {
      title: 'Preguntas frecuentes', icon: 'ph-question', lead: 'Lo que más nos preguntan. ¿No está tu duda? Escribinos por WhatsApp.',
      body: () => {
        const qa = (q, a) => `<details class="group rounded-[20px] bg-white border border-line">
          <summary class="flex items-center gap-3 px-5 min-h-[60px] py-3 cursor-pointer list-none font-semibold text-[1.05rem] [&::-webkit-details-marker]:hidden"><span class="flex-1">${q}</span><i class="ph-bold ph-caret-down text-ink-mute transition group-open:rotate-180"></i></summary>
          <div class="px-5 pb-5 -mt-1 text-ink-soft leading-relaxed">${a}</div></details>`;
        const grp = (t, ic, items) => `<h2 class="flex items-center gap-2"><i class="ph-fill ${ic} text-brand"></i>${t}</h2><div class="not-prose space-y-2.5 mt-4">${items.map(x => qa(...x)).join('')}</div>`;
        return grp('Si buscás trabajo', 'ph-user', [
          ['¿Tiene algún costo?', 'No. Buscar, postularte y seguir tus postulaciones es gratis.'],
          ['¿Cómo me postulo?', 'Elegí una vacante y tocá <b>Postularme</b>. La primera vez ingresás con tu celular (te llega un código por WhatsApp) y subís tu CV en PDF. Las siguientes, es un toque.'],
          ['¿Necesito tener un CV armado?', 'Sí, en PDF. Si no tenés uno, armalo en Word o Google Docs con tus datos, estudios y trabajos, y guardalo como PDF. Al subirlo completamos tus datos solos.'],
          ['¿Cómo sé si leyeron mi CV?', 'En <b>Mis postulaciones</b> ves cada etapa: enviado, CV leído, en proceso, finalista y resultado. Si hay novedades, te avisamos.'],
          ['¿Puedo recibir avisos de vacantes nuevas?', 'Sí. Creá una alerta desde <b>Notificaciones</b> con tu rubro y tu provincia. Cuando se publica algo para vos, te avisamos ahí y por WhatsApp.'],
          ['¿Me pueden recomendar a otra consultora?', 'Sí, pero solo con tu permiso. Si una consultora del Hub cree que encajás en una búsqueda de otra, te manda un link por WhatsApp. Ahí ves quién te quiere conocer y para qué puesto, y decidís. Si no aceptás, no le pasamos nada.'],
          ['¿Quién ve mis datos?', 'Solo las empresas y consultoras a las que te postulás. Tu perfil aparece en búsquedas de talento únicamente si aceptaste ser contactado, y lo podés cambiar cuando quieras.']
        ]) + grp('Si sos empresa o consultora', 'ph-buildings', [
          ['¿Tiene costo para consultoras y empresas?', 'Por ahora no: publicar búsquedas y usar todas las herramientas de +Humanos es gratis.'],
          ['¿Hay avisos destacados?', 'Por ahora no: todas las búsquedas se muestran por igual, de la más nueva a la más vieja. Los avisos destacados van a ser parte de un plan premium más adelante.'],
          ['¿Cómo funcionan las recomendaciones entre selectores?', 'En <b>Hub → Busco perfil</b> ves lo que buscan otros selectores. Si alguien de tus candidatos encaja, se lo recomendás con una nota. El candidato recibe un link y da permiso; recién ahí llega a esa búsqueda como postulante. Para tus búsquedas difíciles, tocá <b>Pedir recomendaciones</b>.'],
          ['¿Qué es una terna?', 'Es la selección final, normalmente de 3 personas, que compartís con tu cliente o con quien decide mediante un link. Desde ahí responde a quién quiere entrevistar.'],
          ['¿+Humanos descarta candidatos?', 'No. Cada empresa o consultora lee los CVs, los califica del 10% al 100% y decide a quién avanzar.'],
          ['¿Mi cliente ve a todos los postulantes?', 'No. Solo ve a las personas que pusiste en la terna, con el resumen que vos elegís mostrar.'],
          ['¿Puedo pausar o borrar una búsqueda?', 'Sí, desde la búsqueda. Pausada no ocupa lugar en tu plan y la reactivás cuando quieras.']
        ]);
      }
    },
    terminos: {
      title: 'Términos y condiciones', icon: 'ph-scroll', lead: 'Las reglas para usar +Humanos, escritas lo más claro posible.', legal: true,
      body: () => `
        <h2>1. Qué es +Humanos</h2>
        <p>+Humanos es una plataforma que conecta a personas que buscan trabajo con empresas y consultoras que publican búsquedas. +Humanos no es empleador ni agencia de colocación: no participa de la relación laboral que pueda surgir entre las partes.</p>
        <h2>2. Cuentas</h2>
        <p>Las personas ingresan con su número de celular y un código que se envía por WhatsApp. Las empresas y consultoras, con email y contraseña. Cada usuario es responsable de que sus datos sean verdaderos y de cuidar el acceso a su cuenta.</p>
        <h2>3. Uso permitido</h2>
        <ul><li>Publicar solo búsquedas reales, con información veraz sobre el puesto.</li><li>No pedir pagos a los candidatos para postularse ni para ser contratados.</li><li>No publicar contenido discriminatorio por género, edad, origen, religión, discapacidad u otra condición.</li><li>Usar los datos de los candidatos solo para el proceso de selección para el que se postularon.</li></ul>
        <h2>4. Calificación de candidatos</h2>
        <p>Cada empresa o consultora califica a sus postulantes después de leer el CV. Las decisiones de selección son siempre suyas; +Humanos no descarta candidatos.</p>
        <h2>5. Costos</h2>
        <p>Por ahora, usar +Humanos no tiene costo para candidatos, consultoras ni empresas. Si en el futuro sumamos planes pagos, lo vamos a avisar con anticipación y nada se va a cobrar sin tu aceptación.</p>
        <h2>6. Suspensión</h2>
        <p>Podemos pausar búsquedas o suspender cuentas que incumplan estos términos, avisándote el motivo.</p>
        <h2>7. Cambios y jurisdicción</h2>
        <p>Si cambiamos estos términos, te avisamos antes de que entren en vigencia. Se aplican las leyes de la República Argentina.</p>`
    },
    privacidad: {
      title: 'Política de privacidad', icon: 'ph-shield-check', lead: 'Qué datos usamos, para qué y cómo podés controlarlos.', legal: true,
      body: () => `
        <h2>Qué datos recolectamos</h2>
        <ul><li><b>Si buscás trabajo:</b> nombre, celular, provincia, el CV que subís y los filtros que guardás en tus alertas.</li><li><b>Si sos empresa o consultora:</b> nombre de la organización, email, datos de contacto, sitio web, LinkedIn y la información de tus búsquedas y clientes.</li><li><b>Uso del sitio:</b> datos técnicos básicos para que funcione y sea seguro.</li></ul>
        <h2>Para qué los usamos</h2>
        <p>Para mostrarte vacantes que encajen, enviar tu postulación, avisarte de novedades y alertas, y para que las empresas gestionen sus búsquedas. No vendemos tus datos.</p>
        <h2>Quién los ve</h2>
        <p>Tu CV y tus datos de contacto solo los ven las empresas y consultoras a las que te postulás. Si aceptás ser contactado, tu perfil puede aparecer en las búsquedas de talento de la plataforma. Las ternas que se comparten con un cliente muestran solo a las personas seleccionadas.</p>
        <h2>Tus derechos</h2>
        <p>Podés pedir acceso, corrección o eliminación de tus datos en cualquier momento. Si tenés cuenta, los borrás vos mismo desde <b>Mis postulaciones → Borrar mis datos</b>. Si no, completá el pedido y lo resolvemos dentro de los 5 días hábiles, como fija la Ley 25.326 de Protección de Datos Personales. Las consultoras también pueden borrar a una persona de su base cuando se lo pide.</p>
        <div class="not-prose my-5"><button type="button" data-del-req class="btn btn-primary"><i class="ph-bold ph-trash"></i>Pedir que borren mis datos</button></div>
        <h2>Consentimiento</h2>
        <p>Cada vez que te postulás o enviás tu CV, guardamos la fecha, la hora y el texto que aceptaste. La consultora lo ve en tu ficha.</p>
        <p>La Agencia de Acceso a la Información Pública, como órgano de control de esa ley, atiende denuncias y reclamos relacionados con el incumplimiento de las normas sobre protección de datos personales.</p>
        <h2>Cuánto tiempo los guardamos</h2>
        <p>Mientras tu cuenta esté activa. Si la eliminás, borramos tus datos salvo los que la ley nos obligue a conservar.</p>
        <h2>Seguridad</h2>
        <p>Usamos conexiones cifradas y acceso restringido. Ningún sistema es infalible: si detectamos un incidente que te afecte, te avisamos.</p>`
    }
  };
  /* Nosotros: franja con título y migas, collage de fotos, cifras del sitio y el texto */
  const ABOUT_PHOTOS = [ // Fotos de ejemplo (Unsplash): reemplazar por fotos propias
    ['photo-1517048676732-d65bc937f952', 'Persona presentando ante un equipo'],
    ['photo-1573496359142-b8d87734a5a2', 'Profesional sonriendo en la oficina'],
    ['photo-1556761175-5973dc0f32e7', 'Reunión de trabajo alrededor de una mesa'],
    ['photo-1521737604893-d14cc237f11d', 'Equipo uniendo las manos'],
    ['photo-1551836022-d5d88e9218df', 'Mujer trabajando con su computadora'],
    ['photo-1522071820081-009f0129c71c', 'Equipo trabajando con notebooks']
  ];
  function AboutPage() {
    const jobs = Store.jobs().filter(j => j.status === 'activa');
    const nProv = new Set(jobs.map(j => j.province)).size;
    const nCos = new Set(jobs.map(j => j.client || j.company)).size;
    const ph = (i, cls) => { const [id, alt] = ABOUT_PHOTOS[i]; return `<div class="about-ph rounded-[18px] overflow-hidden bg-brand-soft ${cls}"><img src="https://images.unsplash.com/${id}?auto=format&fit=crop&w=700&q=70" alt="${alt}" loading="lazy" class="w-full h-full object-cover" onerror="this.remove()"></div>`; };
    // Contadores: arrancan en 0 y suben hasta el valor cuando el bloque entra en pantalla
    const stat = (n, l) => `<div class="text-center"><p class="font-display text-[3rem] sm:text-[3.6rem] leading-none font-extrabold text-brand tabular-nums"><span data-count="${n}" aria-hidden="true">0</span><span class="sr-only">${n}</span></p><p class="mt-2 text-ink-soft text-[1.05rem]">${l}</p></div>`;
    return {
      html: `<section class="bg-brand-soft">
          <div class="max-w-6xl mx-auto px-4 sm:px-6 py-12 md:py-16 text-center">
            <h1 class="text-[2.2rem] sm:text-[2.8rem] leading-tight font-extrabold">Nosotros</h1>
            <nav class="mt-2 text-ink-soft font-semibold" aria-label="Migas de pan"><a href="#/" class="hover:text-brand">Inicio</a><span class="mx-2 text-ink-mute">/</span><span class="text-ink" aria-current="page">Nosotros</span></nav>
          </div>
        </section>
        <div class="max-w-6xl mx-auto px-4 sm:px-6 pt-10 md:pt-16">
          <div class="grid grid-cols-2 md:grid-cols-4 grid-rows-8 gap-3 h-[420px] sm:h-[500px]" aria-label="Fotos">
            ${ph(0, 'col-start-1 row-start-1 row-span-8')}
            ${ph(1, 'col-start-2 row-start-1 row-span-3')}
            ${ph(2, 'col-start-2 row-start-4 row-span-5')}
            ${ph(3, 'hidden md:block col-start-3 row-start-1 row-span-5')}
            ${ph(4, 'hidden md:block col-start-3 row-start-6 row-span-3')}
            ${ph(5, 'hidden md:block col-start-4 row-start-1 row-span-8')}
          </div>
          <div id="about-stats" class="mt-14 md:mt-20 grid sm:grid-cols-3 gap-10 max-w-4xl mx-auto">
            ${stat(jobs.length, 'Vacantes activas hoy')}
            ${stat(nProv, `Provincias con vacantes`)}
            ${stat(nCos, 'Empresas que buscan talento')}
          </div>
        </div>
        <div class="max-w-3xl mx-auto px-4 sm:px-6 pt-16 md:pt-24 pb-20">
          <article class="info-prose">
            <h2 class="!text-[2rem] sm:!text-[2.3rem]">Sobre +Humanos</h2>
            ${INFO.nosotros.body()}
          </article>
        </div>
        ${siteFooter()}`,
      mount() {
        const els = $$('[data-count]');
        const run = () => {
          const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, t0 = performance.now(), D = 1500;
          const tick = now => {
            const k = reduce ? 1 : Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - k, 3);
            els.forEach(el => { el.textContent = Math.round(+el.dataset.count * e); });
            if (k < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        };
        const box = $('#about-stats');
        if (!box || !('IntersectionObserver' in window)) { run(); return; }
        const io = new IntersectionObserver(en => { if (en.some(x => x.isIntersecting)) { io.disconnect(); run(); } }, { threshold: 0.4 });
        io.observe(box);
      }
    };
  }

  function InfoPage(kind) {
    const P = INFO[kind];
    const tabs = [['/nosotros', 'Nosotros'], ['/faqs', 'FAQs'], ['/terminos', 'Términos'], ['/privacidad', 'Privacidad']];
    return {
      html: `<div class="max-w-3xl mx-auto px-4 sm:px-6 pt-8 md:pt-12 pb-16">
          <nav class="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0" aria-label="Información">${tabs.map(([h, l]) => `<a href="#${h}" class="chip shrink-0 ${h === '/' + kind ? 'chip-on' : ''}" ${h === '/' + kind ? 'aria-current="page"' : ''}>${l}</a>`).join('')}</nav>
          <div class="mt-8 flex items-start gap-4">
            <span class="w-14 h-14 rounded-2xl bg-brand-soft text-brand grid place-items-center shrink-0"><i class="ph-fill ${P.icon} text-[1.7rem]"></i></span>
            <div><h1 class="text-[2rem] sm:text-[2.4rem] leading-tight font-extrabold">${P.title}</h1><p class="text-ink-soft text-lg mt-1">${P.lead}</p></div>
          </div>
          ${P.legal ? '<p class="mt-6 text-[0.92rem] text-ink-mute">Última actualización: octubre de 2026.</p>' : ''}
          <article class="info-prose mt-6">${P.body()}</article>
        </div>
        ${siteFooter()}`
    };
  }

  /* ----- Empresas adheridas: listado con buscador y filtros ----- */
  function employersData() {
    const by = {};
    Store.jobs().filter(j => !j.external).forEach(j => {
      const e = by[j.company] || (by[j.company] = { name: j.company, type: j.companyType || companyOf(j.company).type, active: 0, provs: {} });
      if (j.status === 'activa') { e.active++; e.provs[j.province] = (e.provs[j.province] || 0) + 1; }
    });
    // También las que se registraron o cargó el admin, aunque todavía no publiquen
    Object.values(Store.coAccounts()).forEach(a => { if (a.name && !by[a.name]) by[a.name] = { name: a.name, type: a.type || 'Empresa', active: 0, provs: {} }; });
    Object.entries(Store.coProfilesAll()).forEach(([n, pr]) => { if (pr.manual && !by[n]) by[n] = { name: n, type: pr.type || 'Empresa', active: 0, provs: {} }; });
    return Object.values(by).filter(e => !Store.coProfile(e.name).hidden).map(e => {
      const p = Store.coProfile(e.name), cmp = companyOf(e.name);
      const provs = Object.entries(e.provs).sort((a, b) => b[1] - a[1]).map(x => x[0]);
      const home = p.province || provs[0] || '';
      return { ...e, type: p.type || e.type, provs, industry: industryOf(p.industry || cmp.industry), city: p.city || '', home, nProv: new Set([home, ...provs].filter(Boolean)).size };
    });
  }
  function Employers() {
    const F = S.emp || (S.emp = { q: '', prov: '', type: '', ind: '', sort: 'activas', limit: 9 });
    if (F.ind === undefined) F.ind = '';
    const all = employersData();
    const indCount = {}; all.forEach(e => { if (e.industry) indCount[e.industry] = (indCount[e.industry] || 0) + 1; });
    const indOpts = INDUSTRIES.filter(x => indCount[x]);
    const provOpts = [...new Set(all.flatMap(e => [e.home, ...e.provs]).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
    const sel = (id, label, ic, opts, val) => `<div class="min-w-0"><label for="${id}" class="label max-lg:sr-only">${label}</label><div class="relative"><i class="ph ${ic} text-xl text-ink-mute absolute left-4 max-lg:left-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
      <select id="${id}" data-dd class="input pl-12 max-lg:pl-10 max-lg:pr-8 bg-white truncate">${opts.map(([v, l]) => `<option value="${esc(v)}" ${v === val ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div></div>`;
    const html = `<section class="bg-brand-soft">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 py-12 md:py-16 text-center">
          <h1 class="text-[2.2rem] sm:text-[2.8rem] leading-tight font-extrabold">Empresas adheridas</h1>
          <nav class="mt-2 text-ink-soft font-semibold" aria-label="Migas de pan"><a href="#/" class="hover:text-brand">Inicio</a><span class="mx-2 text-ink-mute">/</span><span class="text-ink" aria-current="page">Empresas adheridas</span></nav>
          <div class="mt-8 max-w-3xl mx-auto">
            <p class="font-display text-[1.25rem] sm:text-[1.45rem] font-extrabold leading-snug">${HUB_TITLE}</p>
            <p class="mt-3 text-ink-soft text-[1.05rem] leading-relaxed">${HUB_TEXT} ${HUB_CLOSE}</p>
            <button type="button" data-hub-join class="mt-5 btn btn-primary h-12 px-6"><i class="ph-bold ph-users-three"></i>Sumate al Hub</button>
          </div>
        </div>
      </section>
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-12 grid gap-8 lg:grid-cols-[20rem_minmax(0,1fr)] items-start">
        <aside class="rounded-[24px] bg-white border border-line p-4 sm:p-6 space-y-3 lg:space-y-5 lg:sticky lg:top-24" aria-label="Filtros">
          <div><label for="em-q" class="label max-lg:sr-only">Buscar por nombre</label><div class="relative"><i class="ph ph-magnifying-glass text-xl text-ink-mute absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"></i>
            <input id="em-q" type="search" class="input pl-12" placeholder="Empresa, consultora o rubro" value="${esc(F.q)}" autocomplete="off" enterkeyhint="search"></div></div>
          <div class="grid grid-cols-2 lg:grid-cols-1 gap-3 lg:gap-5">
          ${sel('em-prov', 'Provincia', 'ph-map-pin', [['', 'Todo el país'], ...provOpts.map(p => [p, p])], F.prov)}
          ${sel('em-type', 'Tipo', 'ph-buildings', [['', 'Todas'], ['Empresa', 'Empresas'], ['Consultora', 'Consultoras']], F.type)}
          <div class="col-span-2 lg:col-span-1">${sel('em-ind', 'Rubro', 'ph-briefcase', [['', 'Todos los rubros'], ...indOpts.map(x => [x, `${x} (${indCount[x]})`])], F.ind)}</div>
          </div>
          <button type="button" id="em-clear" class="btn btn-outline w-full justify-center"><i class="ph ph-x"></i>Limpiar filtros</button>
        </aside>
        <section aria-labelledby="em-count" class="min-w-0">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <p id="em-count" class="font-semibold text-ink-soft" aria-live="polite"></p>
            <label class="flex items-center gap-2"><span class="sr-only">Ordenar por</span>
              <select id="em-sort" data-dd class="input h-11 py-0 w-auto bg-white font-semibold">
                ${[['activas', 'Más búsquedas abiertas'], ['az', 'Nombre (A a Z)']].map(([v, l]) => `<option value="${v}" ${v === F.sort ? 'selected' : ''}>${l}</option>`).join('')}
              </select></label>
          </div>
          <ul id="em-list" class="mt-5 space-y-4"></ul>
          <div id="em-more" class="mt-6 text-center"></div>
        </section>
      </div>
      ${siteFooter()}`;
    function draw() {
      const q = norm(F.q.trim());
      let list = all.filter(e => (!q || norm(`${e.name} ${e.industry} ${e.type}`).includes(q)) && (!F.prov || e.home === F.prov || e.provs.includes(F.prov)) && (!F.type || e.type === F.type) && (!F.ind || e.industry === F.ind));
      list.sort(F.sort === 'az' ? (a, b) => a.name.localeCompare(b.name, 'es') : (a, b) => b.active - a.active || a.name.localeCompare(b.name, 'es'));
      const shown = list.slice(0, F.limit);
      $('#em-count').textContent = list.length ? `Mostrando ${shown.length} de ${list.length} ${list.length === 1 ? 'empresa' : 'empresas'}` : 'Sin resultados';
      $('#em-list').innerHTML = shown.length ? shown.map(e => {
        const loc = [e.city, e.home].filter(Boolean).join(', ');
        return `<li><a href="#/e?n=${encodeURIComponent(e.name)}" class="group flex items-center gap-4 sm:gap-6 rounded-[22px] bg-white border border-line p-4 sm:p-6 hover:border-brand/40 hover:shadow-lift transition">
          <span class="rounded-full overflow-hidden shrink-0">${logo(e.name, 'w-16 h-16 sm:w-20 sm:h-20 text-xl sm:text-2xl !rounded-full')}</span>
          <span class="min-w-0 flex-1">
            <span class="flex flex-wrap items-center gap-x-2 gap-y-1"><span class="font-display font-bold text-[1.2rem] sm:text-[1.3rem] leading-tight group-hover:text-brand">${esc(e.name)}</span>${e.type === 'Consultora' ? '<span class="rounded-full bg-lilac text-brand px-2.5 py-0.5 text-[0.8rem] font-bold">Consultora</span>' : ''}</span>
            ${e.industry ? `<span class="block text-ink-soft mt-0.5 truncate">${esc(e.industry)}</span>` : ''}
            ${loc ? `<span class="flex items-center gap-1.5 text-ink-mute mt-1"><i class="ph ph-map-pin text-lg"></i><span class="truncate">${esc(loc)}${e.nProv > 1 ? ` · y ${e.nProv - 1} provincia${e.nProv > 2 ? 's' : ''} más` : ''}</span></span>` : ''}
            <span class="sm:hidden mt-2 inline-flex rounded-full bg-brand-soft text-brand px-3 py-1 text-[0.88rem] font-bold">${e.active ? `${e.active} búsqueda${e.active === 1 ? '' : 's'} abierta${e.active === 1 ? '' : 's'}` : 'Sin búsquedas abiertas'}</span>
          </span>
          <span class="hidden sm:inline-flex shrink-0 rounded-full ${e.active ? 'bg-brand-soft text-brand' : 'bg-surface text-ink-mute'} px-4 py-1.5 font-bold text-[0.95rem]">${e.active ? `${e.active} búsqueda${e.active === 1 ? '' : 's'} abierta${e.active === 1 ? '' : 's'}` : 'Sin búsquedas abiertas'}</span>
          <i class="ph-bold ph-caret-right text-ink-mute text-lg shrink-0"></i>
        </a></li>`;
      }).join('') : `<li>${emptyState('ph-buildings', 'No encontramos empresas', 'Probá con otro nombre o sacá algún filtro.')}</li>`;
      $('#em-clear').classList.toggle('max-lg:hidden', !(F.q.trim() || F.prov || F.type || F.ind));
      const rest = list.length - shown.length;
      $('#em-more').innerHTML = rest > 0 ? `<button type="button" id="em-more-btn" class="btn btn-outline">Ver más empresas (${rest})</button>` : '';
      const mb = $('#em-more-btn'); if (mb) mb.onclick = () => { F.limit += 9; draw(); };
    }
    return {
      html, mount() {
        draw();
        $('#em-q').addEventListener('input', e => { F.q = e.target.value; F.limit = 9; draw(); });
        $('#em-prov').onchange = e => { F.prov = e.target.value; F.limit = 9; draw(); };
        $('#em-type').onchange = e => { F.type = e.target.value; F.limit = 9; draw(); };
        $('#em-ind').onchange = e => { F.ind = e.target.value; F.limit = 9; draw(); };
        $('#em-sort').onchange = e => { F.sort = e.target.value; draw(); };
        $('#em-clear').onclick = () => { Object.assign(F, { q: '', prov: '', type: '', ind: '', limit: 9 }); $('#em-q').value = ''; $('#em-prov').value = ''; $('#em-type').value = ''; $('#em-ind').value = ''; ['#em-prov', '#em-type', '#em-ind'].forEach(x => $(x)._ddSync && $(x)._ddSync()); draw(); };
      }
    };
  }

  /* ----- Chat guiado ----- */
  let chatToken = 0;
  function Chat() {
    const html = `
      <div class="flex flex-col h-[100dvh] bg-white">
        <header class="shrink-0 border-b border-line bg-white">
          <div class="max-w-2xl mx-auto h-16 px-3 flex items-center gap-2">
            <a href="#/" class="icon-btn" aria-label="Volver"><i class="ph-bold ph-arrow-left text-xl"></i></a>
            ${fedfu('w-10 h-10')}
            <div class="leading-tight min-w-0"><p class="font-display font-bold text-lg">Armá tu alerta</p><p class="text-[0.85rem] text-ink-mute font-semibold">Unas preguntas rápidas</p></div>
            <a href="#/vacantes" class="ml-auto text-brand font-semibold px-3 py-2 rounded-full hover:bg-brand-soft">Saltar</a>
          </div>
        </header>
        <div id="chat-log" class="flex-1 overflow-y-auto bg-surface">
          <div id="chat-msgs" class="max-w-2xl mx-auto px-4 py-5 space-y-3" aria-live="polite"></div>
        </div>
        <div class="shrink-0 border-t border-line bg-white pb-safe">
          <div class="max-w-2xl mx-auto px-4 pt-3">
            <div id="chat-quick" class="flex flex-wrap gap-2 max-h-44 overflow-y-auto empty:hidden mb-3"></div>
            <form id="chat-form" class="flex gap-2" autocomplete="off">
              <input id="chat-input" class="input rounded-full" placeholder="Escribí tu respuesta…" aria-label="Tu respuesta" enterkeyhint="send">
              <button class="w-12 h-12 shrink-0 rounded-full bg-brand text-white grid place-items-center hover:bg-brand-dark" aria-label="Enviar"><i class="ph-fill ph-paper-plane-right text-xl"></i></button>
            </form>
          </div>
        </div>
      </div>`;
    return { html, mount: runChat };
  }

  async function runChat() {
    const token = ++chatToken;
    const msgs = $('#chat-msgs'), quick = $('#chat-quick'), form = $('#chat-form'), input = $('#chat-input'), log = $('#chat-log');
    const alive = () => token === chatToken && document.body.contains(msgs);
    const STOP = Symbol('stop');
    const scroll = () => { log.scrollTop = log.scrollHeight; };
    const botAvatar = fedfu('w-8 h-8');
    form.onsubmit = e => e.preventDefault();

    async function bot(html, delay = 700) {
      if (!alive()) throw STOP;
      const row = document.createElement('div');
      row.className = 'flex gap-2 items-end msg-in';
      row.innerHTML = `${botAvatar}<div class="bg-white rounded-[20px] rounded-bl-md px-4 py-3 max-w-[85%] border border-line text-[1.05rem]"><span class="typing" aria-label="Escribiendo"><i></i><i></i><i></i></span></div>`;
      msgs.appendChild(row); scroll();
      await wait(delay);
      if (!alive()) throw STOP;
      row.lastElementChild.innerHTML = html; scroll();
    }
    function user(text) {
      msgs.insertAdjacentHTML('beforeend', `<div class="flex justify-end msg-in"><div class="bg-brand text-white rounded-[20px] rounded-br-md px-4 py-3 max-w-[85%] text-[1.05rem]">${esc(text)}</div></div>`);
      scroll();
    }
    function ask({ options, filterable = false, placeholder = 'Escribí tu respuesta…' }) {
      return new Promise((resolve, reject) => {
        if (!alive()) return reject(STOP);
        input.placeholder = placeholder; input.value = '';
        const draw = (f = '') => {
          const list = filterable && f ? options.filter(o => norm(o.label).includes(norm(f))) : options;
          quick.innerHTML = list.map(o => `<button type="button" class="chip" data-v="${esc(o.value)}">${o.icon ? `<i class="ph ${o.icon} text-lg"></i>` : ''}${esc(o.label)}${o.hint ? `<span class="font-normal text-ink-mute">· ${esc(o.hint)}</span>` : ''}</button>`).join('');
        };
        draw();
        const done = ans => {
          quick.innerHTML = ''; quick.onclick = null; input.oninput = null; input.value = '';
          form.onsubmit = e => e.preventDefault();
          user(ans.label || ans.text); resolve(ans);
        };
        quick.onclick = e => {
          const b = e.target.closest('[data-v]'); if (!b) return;
          const o = options.find(x => String(x.value) === b.dataset.v);
          done({ value: o.value, label: o.label });
        };
        input.oninput = filterable ? () => draw(input.value) : null;
        form.onsubmit = e => { e.preventDefault(); const t = input.value.trim(); if (t) done({ text: t }); };
        if (finePointer()) input.focus({ preventScroll: true });
        setTimeout(scroll, 30);
      });
    }

    function askMulti({ options, max = 0, placeholder = 'Escribí y tocá enviar para sumar' }) {
      return new Promise((resolve, reject) => {
        if (!alive()) return reject(STOP);
        const opts = [...options], sel = [];
        input.placeholder = placeholder; input.value = '';
        const draw = () => {
          quick.innerHTML = opts.map(o => { const on = sel.includes(o); return `<button type="button" class="chip ${on ? 'chip-on' : ''}" data-m="${esc(o)}" aria-pressed="${on}">${on ? '<i class="ph-bold ph-check"></i>' : ''}${esc(o)}</button>`; }).join('') +
            // Opcional: sin elegir nada, el botón principal es "No sé / saltar"
            `<div class="w-full flex gap-2 pt-1 sticky bottom-0 bg-white">${sel.length
              ? `<button type="button" class="btn btn-primary btn-sm flex-1 h-12" data-done><i class="ph-bold ph-check"></i>Listo (${sel.length})</button>`
              : `<button type="button" class="btn btn-outline btn-sm flex-1 h-12" data-skip>No sé / saltar<i class="ph-bold ph-arrow-right"></i></button>`}</div>`;
        };
        draw();
        const finish = list => {
          quick.innerHTML = ''; quick.onclick = null; input.value = ''; form.onsubmit = e => e.preventDefault();
          user(list.length ? list.join(', ') : 'Salteo esta'); resolve(list);
        };
        quick.onclick = e => {
          if (e.target.closest('[data-skip]')) return finish([]);
          if (e.target.closest('[data-done]')) return finish(sel);
          const b = e.target.closest('[data-m]'); if (!b) return;
          const v = b.dataset.m, i = sel.indexOf(v);
          if (i >= 0) sel.splice(i, 1);
          else { if (max && sel.length >= max) { toast(`Elegí hasta ${max}`, 'ph-info'); return; } sel.push(v); }
          draw();
        };
        form.onsubmit = e => {
          e.preventDefault();
          input.value.split(/,| y /).map(x => x.trim()).filter(Boolean).forEach(x => {
            const v = x.charAt(0).toUpperCase() + x.slice(1);
            const ex = opts.find(o => norm(o) === norm(v));
            if (!ex) opts.unshift(v);
            const val = ex || v;
            if (!sel.includes(val) && !(max && sel.length >= max)) sel.push(val);
          });
          input.value = ''; draw();
        };
        if (finePointer()) input.focus({ preventScroll: true });
        setTimeout(scroll, 30);
      });
    }

    try {
      const prev = Store.profile();
      const preset = S.chatPreset; S.chatPreset = null;
      const areaOpts = AREAS.map(a => ({ value: a.id, label: a.label, icon: a.icon }));
      let area = null, roleText = '', a;
      if (preset) {
        // Viene de la portada: la primera respuesta ya está dada
        await bot(`¿Qué trabajo estás buscando?`, 250);
        a = preset.area ? { value: preset.area, label: areaOf(preset.area).label } : { text: preset.text };
        user(a.label || a.text);
      } else {
        await bot(`¡Hola! Te hago unas <b>preguntas rápidas</b> (menos de un minuto) y te muestro las vacantes de tu rubro y tu zona.`, 600);
        await bot(`¿Qué trabajo estás buscando? Escribilo como quieras (por ejemplo <i>cajera</i>, <i>chofer</i>, <i>enfermero</i>) o elegí un área.`, 900);
        a = await ask({ options: areaOpts, placeholder: 'Ej: cajera, chofer, enfermero…' });
      }
      while (!area) {
        if (a.value) area = a.value;
        else {
          const d = detectArea(a.text);
          roleText = a.text;
          if (d) area = d;
          else {
            await bot(`No encontré un área exacta para “<b>${esc(a.text)}</b>”. ¿Cuál de estas se parece más?`);
            a = await ask({ options: areaOpts, placeholder: 'Elegí un área o escribí otra palabra' });
          }
        }
      }
      await bot(`Perfecto, busco en <b>${esc(areaOf(area).label)}</b>${roleText ? ` (relacionado a “${esc(roleText)}”)` : ''}.`, 600);

      // 2. Provincia
      await bot(`¿En qué provincia te gustaría trabajar? Podés escribir tu ciudad también.`, 700);
      const provOpts = [{ value: 'any', label: 'Cualquier provincia', icon: 'ph-globe-hemisphere-west' }, ...PROVINCES.map(p => ({ value: p, label: p }))];
      let province = null;
      let b = await ask({ options: provOpts, filterable: true, placeholder: 'Ej: Tucumán, Rosario, CABA…' });
      while (!province) {
        if (b.value) province = b.value;
        else {
          province = detectProvince(b.text);
          if (!province) {
            await bot(`No reconocí “${esc(b.text)}”. Elegí tu provincia de la lista:`);
            b = await ask({ options: provOpts, filterable: true, placeholder: 'Escribí para filtrar…' });
          }
        }
      }

      // 3. Modalidad
      await bot(province === 'any' ? `Buenísimo, busco en todo el país. ¿Qué modalidad preferís?` : `Anotado: <b>${esc(province)}</b>. ¿Qué modalidad preferís?`, 700);
      const modOpts = [
        { value: 'Presencial', label: 'Presencial', icon: 'ph-buildings' },
        { value: 'Híbrido', label: 'Híbrido', icon: 'ph-arrows-left-right' },
        { value: 'Remoto', label: 'Remoto', icon: 'ph-house-line' },
        { value: 'any', label: 'Me da igual', icon: 'ph-check-circle' }
      ];
      let modality = null;
      let c = await ask({ options: modOpts });
      while (!modality) {
        modality = c.value || detectModality(c.text);
        if (!modality) { await bot('¿Presencial, híbrido o remoto?'); c = await ask({ options: modOpts }); }
      }

      // 4. Experiencia
      await bot(`¿Cuánta experiencia tenés en este tipo de puesto?`, 700);
      const senOpts = SENIORITIES.map(s => ({ value: s.id, label: s.label, hint: s.hint }));
      let seniority = null;
      let d = await ask({ options: senOpts, placeholder: 'Ej: 3 años' });
      while (!seniority) {
        seniority = d.value || detectSeniority(d.text);
        if (!seniority) { await bot('¿Me lo decís en años aproximados o elegís una opción?'); d = await ask({ options: senOpts, placeholder: 'Ej: 2 años' }); }
      }

      // 5. Skills: las que más piden las vacantes de esa área, más las típicas del área
      const freq = {};
      Store.activeJobs().filter(j => j.area === area).forEach(j => (j.skills || []).forEach(x => { freq[x.n] = (freq[x.n] || 0) + (x.must ? 2 : 1); }));
      const skillOpts = [...new Set([...Object.keys(freq).sort((x, y) => freq[y] - freq[x]), ...(AREA_SKILLS[area] || [])])].slice(0, 10);
      await bot(`Última y opcional: ¿qué herramientas o conocimientos manejás? Tocá los que tengas o escribilos (por ejemplo: <i>Excel, Tango, licencia de conducir</i>). Si no sabés, salteala: los leo de tu CV cuando te postules.`, 700);
      const skills = await askMulti({ options: skillOpts, placeholder: 'Ej: Excel, AutoCAD, inglés…' });
      // Las competencias ya no se preguntan: se evalúan en la entrevista
      const comps = [];

      const profile = { area, roleText, province, modality, seniority, skills, comps, at: new Date().toISOString() };
      Store.setProfile(profile);
      S.filter = 'para-vos'; S.q = '';
      const n = Store.activeJobs().filter(j => isForYou(j, profile)).length;
      await bot(`Estoy buscando entre ${Store.activeJobs().length} vacantes activas…`, 600);
      await bot(n
        ? `¡Listo! Encontré <b>${n} vacante${n > 1 ? 's' : ''}</b> para vos${province !== 'any' ? ` en <b>${esc(province)}</b> (incluyo las remotas)` : ''}.${n > 1 ? ' Están ordenadas de la más nueva a la más vieja.' : ''}`
        : `Por ahora no hay vacantes exactas para ese perfil, pero te muestro opciones parecidas.`, 1000);
      const hasAl = Store.candidate() && Store.alerts().some(a => sameAlert(a, profile));
      await bot(hasAl ? `Ya tenés una alerta para esta búsqueda: te aviso apenas aparezca algo nuevo. 🔔`
        : `¿Querés que te avise por WhatsApp cuando se publique una vacante de <b>${esc(alertLabel(profile))}</b>? Así no tenés que volver a buscar.`, 900);
      form.classList.add('hidden');
      const alBtn = ok => ok ? `<a href="#/notificaciones" class="btn w-full h-14 text-lg bg-mint text-ok"><i class="ph-fill ph-bell-ringing text-xl"></i>Alerta activada · ver notificaciones</a>`
        : `<button type="button" id="chat-alert" class="btn w-full h-14 text-lg ${n ? 'btn-outline' : 'btn-primary'}"><i class="ph-fill ph-whatsapp-logo text-xl ${n ? 'text-[#25D366]' : ''}"></i>Avisame cuando haya algo así</button>`;
      const drawEnd = () => {
        const ok = Store.candidate() && Store.alerts().some(a => sameAlert(a, profile));
        quick.innerHTML = `<div class="grid gap-2 ${n ? 'sm:grid-cols-2' : ''}">${n ? `<a href="#/vacantes" class="btn btn-primary w-full h-14 text-lg">Ver mis vacantes <i class="ph-bold ph-arrow-right"></i></a>` : ''}${alBtn(ok)}${n ? '' : `<a href="#/vacantes" class="btn btn-outline w-full h-14">Ver opciones parecidas</a>`}</div>`;
        const b = $('#chat-alert', quick); if (b) b.onclick = () => createAlert(profile, async () => { closeSheet(true); drawEnd(); await bot(`¡Listo! Te aviso por WhatsApp y en <b>Notificaciones</b> apenas aparezca una vacante así. 🔔`, 500); scroll(); });
      };
      drawEnd();
      scroll();
      if (prev) { /* el perfil anterior se reemplaza; sin acciones extra */ }
    } catch (e) {
      if (e !== STOP) console.error(e);
    }
  }

  /* ----- Vacantes ----- */
  /* Buscador de vacantes: mismo diseño que el de la portada (puesto · provincia · modalidad · rubro · Buscar) */
  function searchBar(px, v = {}) {
    const act = Store.activeJobs();
    const provs = PROVINCES.filter(pr => act.some(j => j.province === pr));
    const areas = AREAS.filter(a => act.some(j => j.area === a.id));
    const seg = (id, label, ic, ctrl, last) => `<label for="${id}" class="relative flex items-center gap-3 px-4 h-14 rounded-2xl xl:rounded-none max-xl:bg-surface/70 cursor-text ${id === px + '-q' ? 'sm:col-span-2 xl:col-span-1' : ''} ${last ? '' : 'xl:border-r xl:border-line'}">
      <i class="ph ${ic} text-xl text-ink-mute shrink-0"></i><span class="sr-only">${label}</span>${ctrl}</label>`;
    const sel = (id, first, opts, cur) => `<select id="${id}" data-dd class="w-full h-full bg-transparent outline-none font-semibold text-ink appearance-none pr-6 cursor-pointer">${[['', first], ...opts].map(([val, l]) => `<option value="${esc(val)}" ${val && val === cur ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select><i class="ph-bold ph-caret-down text-ink-mute absolute right-4 pointer-events-none"></i>`;
    return `<form id="${px}-form" class="bg-white rounded-[22px] shadow-[0_24px_60px_-28px_rgba(20,18,58,.45)] border border-line p-2 grid gap-1.5 xl:gap-1 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,1fr)_auto] xl:items-center" autocomplete="off" role="search">
      ${seg(px + '-q', 'Puesto', 'ph-magnifying-glass', `<input id="${px}-q" class="w-full h-full bg-transparent outline-none text-[1.02rem] placeholder:text-ink-mute" placeholder="Puesto, empresa o palabra clave" enterkeyhint="search" value="${esc(v.q || '')}">`)}
      ${seg(px + '-prov', 'Provincia', 'ph-map-pin', sel(px + '-prov', 'Todo el país', provs.map(p2 => [p2, p2]), v.prov))}
      ${seg(px + '-mod', 'Modalidad', 'ph-house-line', sel(px + '-mod', 'Modalidad', MODALITIES.map(m => [m, m]), v.mod))}
      ${seg(px + '-area', 'Rubro', 'ph-squares-four', sel(px + '-area', 'Todos los rubros', areas.map(a => [a.id, a.label]), v.area), true)}
      <button class="btn btn-primary h-14 px-8 text-[1.05rem] justify-center xl:ml-1"><i class="ph-bold ph-magnifying-glass text-lg"></i>Buscar</button>
    </form>`;
  }

  function Jobs(params) {
    S.filter = 'todas';
    if (S.q == null) S.q = '';
    if (S.fprov == null) S.fprov = ''; if (S.farea == null) S.farea = ''; if (S.fmod == null) S.fmod = ''; if (!S.jobLimit) S.jobLimit = PAGE;
    const html = `
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-6 md:py-10">
        <h1 class="text-[1.9rem] sm:text-[2.3rem] font-extrabold tracking-tight leading-tight">Vacantes</h1>
        <p class="text-ink-soft mt-1 mb-5">Búsquedas abiertas de consultoras y empresas de todo el país.</p>
        ${searchBar('job', { q: S.q, prov: S.fprov, mod: S.fmod, area: S.farea })}
        <div id="job-list" class="mt-6"></div>
      </div>`;
    return {
      html, mount() {
        drawJobList();
        const apply = () => { S.q = $('#job-q').value.trim(); S.fprov = $('#job-prov').value; S.fmod = $('#job-mod').value; S.farea = $('#job-area').value; S.jobLimit = PAGE; drawJobList(); };
        $('#job-form').onsubmit = e => { e.preventDefault(); apply(); $('#job-q').blur(); };
        ['#job-prov', '#job-mod', '#job-area'].forEach(id => $(id).addEventListener('change', apply));
        let t; $('#job-q').addEventListener('input', () => { clearTimeout(t); t = setTimeout(apply, 250); });
        const open = params.get('job');
        if (open && Store.job(open)) openJob(open);
      }
    };
  }
  const MAX_FEAT_TOP = 3, PAGE = 12;
  function drawJobList() {
    const el = $('#job-list'); if (!el) return;
    const p = Store.profile();
    let list = Store.activeJobs().map(j => ({ j, s: score(j, p) }));
    const q = norm(S.q.trim());
    if (q) list = list.filter(({ j }) => norm(`${j.title} ${j.company} ${clientPublic(j)} ${j.city} ${j.province} ${areaOf(j.area).label}`).includes(q));
    if (S.fprov) list = list.filter(({ j }) => j.province === S.fprov || (S.fprov && j.modality === 'Remoto' && S.filter === 'para-vos'));
    if (S.farea) list = list.filter(({ j }) => j.area === S.farea);
    if (S.fmod) list = list.filter(({ j }) => j.modality === S.fmod);
    if (S.filter === 'para-vos' && p) list = list.filter(({ j }) => isForYou(j, p));
    if (S.filter === 'remoto') list = list.filter(({ j }) => j.modality === 'Remoto');
    if (S.filter === 'recientes') list = list.filter(({ j }) => daysSince(j.postedAt) <= 7);
    if (S.filter === 'salario') list = list.filter(({ j }) => j.salary);
    list.sort((a, b) => new Date(b.j.postedAt) - new Date(a.j.postedAt));
    // Destacadas arriba (hasta 3, las más recientes); el resto, por fecha
    const top = list.filter(x => Store.isFeatured(x.j)).slice(0, MAX_FEAT_TOP);
    list = [...top, ...list.filter(x => !top.includes(x))];
    // Se muestran de a PAGE (12) con "Ver más"
    const shown = list.slice(0, S.jobLimit || PAGE), rest = list.length - shown.length;
    const anyF = S.q.trim() || S.fprov || S.farea || S.fmod || !['todas', 'para-vos'].includes(S.filter);
    el.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
        <p class="text-ink-soft font-semibold">${list.length} vacante${list.length === 1 ? '' : 's'}${S.fprov ? ` en ${esc(S.fprov)}` : ''}${S.farea ? ` de ${esc(areaOf(S.farea).label)}` : ''}${S.fmod ? ` · ${esc(S.fmod.toLowerCase())}` : ''}</p>
        ${anyF ? '<button type="button" id="clear-f" class="inline-flex items-center gap-1.5 h-10 px-3 -mr-3 rounded-full font-semibold text-brand hover:bg-brand-soft"><i class="ph-bold ph-x"></i>Limpiar filtros</button>' : '<a href="#/empresas" class="md:hidden inline-flex items-center gap-1.5 h-10 font-semibold text-brand"><i class="ph ph-buildings text-lg"></i>Empresas adheridas<i class="ph-bold ph-caret-right"></i></a>'}
      </div>
      <div class="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
        ${list.length ? shown.map(({ j, s }) => jobCard(j, s)).join('') : emptyState('ph-magnifying-glass', 'No encontramos vacantes', 'Probá con otra provincia, otra área o mirá todas las vacantes publicadas.', '<button class="btn btn-primary" id="see-all">Ver todas</button>')}
      </div>
      ${rest > 0 ? `<div class="mt-6 text-center">
        <button type="button" id="more-jobs" class="btn btn-outline h-14 px-8 text-[1.05rem]"><i class="ph-bold ph-caret-down"></i>Ver ${Math.min(rest, PAGE)} más</button>
        <p class="mt-2 text-ink-mute text-[0.92rem]">Mostrando ${shown.length} de ${list.length}</p></div>` : ''}`;
    const reset = () => { S.filter = 'todas'; S.q = ''; S.fprov = ''; S.farea = ''; S.fmod = ''; S.jobLimit = PAGE; refresh(); };
    const sa = $('#see-all'); if (sa) sa.onclick = () => { reset(); S.filter = 'todas'; refresh(); };
    const cf = $('#clear-f'); if (cf) cf.onclick = reset;
    const mb = $('#more-jobs'); if (mb) mb.onclick = () => {
      const from = shown.length; S.jobLimit = (S.jobLimit || PAGE) + PAGE; drawJobList();
      const cards = $$('#job-list article'); if (cards[from]) cards[from].focus({ preventScroll: true });
    };
  }

  /* ----- Detalle de vacante ----- */
  function ring(s) {
    const c = 2 * Math.PI * 22, off = c * (1 - s / 100);
    return `<svg width="56" height="56" viewBox="0 0 56 56" class="shrink-0" aria-hidden="true">
      <circle cx="28" cy="28" r="22" fill="none" stroke="#fff" stroke-width="6"/>
      <circle cx="28" cy="28" r="22" fill="none" stroke="#0866FF" stroke-width="6" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${off}" transform="rotate(-90 28 28)"/>
      <text x="28" y="33" text-anchor="middle" font-size="14" font-weight="800" fill="#0866FF" font-family="Figtree, sans-serif">${s}%</text></svg>`;
  }
  /* Tarjeta de anuncio (portada) y página propia de cada aviso */
  const TYPE_TONE = { 'Full time': 'bg-brand text-white', 'Part time': 'bg-[#6D4AE8] text-white', 'Por proyecto': 'bg-[#D93A41] text-white' };
  const adCard = j => `<li><a href="#/vacante?id=${j.id}" class="group h-full flex flex-col rounded-lg bg-[#EEEEF1] border border-[#E2E2E8] px-6 py-5 hover:bg-white hover:border-brand/40 hover:shadow-lift transition">
      <div class="flex items-start gap-3.5">
        ${logo(j.company, 'w-12 h-12 text-sm !rounded-md')}
        <div class="min-w-0 flex-1">
          <h3 class="font-display font-bold text-[1.02rem] leading-snug line-clamp-2 group-hover:text-brand" title="${esc(j.title)}">${esc(j.title)}</h3>
          <p class="mt-0.5 font-semibold text-ink-soft text-[0.95rem] truncate">${esc(j.company)}</p>
        </div>
      </div>
      <div class="mt-auto pt-3"><p class="flex items-center gap-1.5 min-w-0"><i class="ph-fill ph-map-pin text-lg text-ink shrink-0"></i><span class="text-brand font-medium truncate">${esc(j.city)}${j.city !== j.province ? `, ${esc(j.province)}` : ''}</span></p>
      <div class="mt-2 flex items-center justify-between gap-2">
        <span class="text-ink-soft text-[0.92rem] whitespace-nowrap inline-flex items-center gap-1.5"><i class="ph ph-clock"></i>${ago(j.postedAt)}</span>
        <span class="shrink-0 rounded px-2 py-0.5 text-[0.75rem] font-bold uppercase tracking-wide ${TYPE_TONE[j.type] || 'bg-ink text-white'}">${esc(j.type)}</span>
      </div></div></a></li>`;

  function JobPage(params) {
    const j = Store.job(params.get('id'));
    if (!j || j.status !== 'activa') return { html: `<div class="max-w-3xl mx-auto px-4 sm:px-6 py-10 grid">${emptyState('ph-briefcase', 'Este aviso ya no está disponible', 'Puede que la búsqueda se haya cerrado o pausado. Mirá las otras vacantes abiertas.', '<a href="#/vacantes" class="btn btn-primary">Ver vacantes</a>')}</div>` };
    const applied = Store.hasApplied(j.id), n = applicantsOf(j);
    const more = Store.activeJobs().filter(x => x.id !== j.id && (x.company === j.company || x.area === j.area)).sort((a, b) => (b.company === j.company) - (a.company === j.company) || new Date(b.postedAt) - new Date(a.postedAt)).slice(0, 4);
    const applyBtn = cls => applied ? `<div class="btn ${cls} bg-ok/10 text-ok"><i class="ph-bold ph-check"></i>Ya te postulaste</div>`
      : `<button type="button" class="btn btn-primary ${cls}" data-apply-job="${j.id}"><i class="ph-fill ph-paper-plane-tilt text-xl"></i>${j.external ? 'Cómo postularme' : 'Postularme'}</button>`;
    const html = `<section class="bg-brand-soft">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <nav class="text-ink-soft font-semibold text-[0.95rem] flex items-center gap-2 min-w-0" aria-label="Migas de pan"><a href="#/" class="hover:text-brand shrink-0">Inicio</a><span class="text-ink-mute">/</span><a href="#/vacantes" class="hover:text-brand shrink-0">Vacantes</a><span class="text-ink-mute">/</span><span class="text-ink truncate" aria-current="page">${esc(j.title)}</span></nav>
        </div>
      </section>
      <div class="max-w-6xl mx-auto px-4 sm:px-6 pt-6 md:pt-10 pb-28 lg:pb-12 grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem] items-start">
        <article class="card p-5 sm:p-8 min-w-0">${jobInfo(j)}</article>
        <aside class="space-y-4 lg:sticky lg:top-24">
          <div class="card p-5">
            <p class="text-ink-soft">${j.external ? `<i class="ph ${extSrc(j.external.src)[2]}"></i> Encontrado en ${esc(extSrc(j.external.src)[1])} ${ago(j.external.foundAt || j.postedAt).toLowerCase()}` : `<i class="ph ph-clock"></i> Publicado ${ago(j.postedAt).toLowerCase()} · <i class="ph ph-users"></i> ${n} postulante${n === 1 ? '' : 's'}`}</p>
            <div class="mt-4 hidden lg:block">${applyBtn('w-full h-14 text-lg justify-center')}</div>
            <div class="mt-3 grid grid-cols-2 gap-2">
              <button type="button" id="jp-save" class="btn btn-outline btn-sm w-full justify-center" aria-pressed="${Store.isSaved(j.id)}"></button>
              <button type="button" id="jp-share" class="btn btn-outline btn-sm w-full justify-center"><i class="ph ph-share-network text-lg"></i>Compartir</button>
            </div>
          </div>
          ${j.external ? `<div class="card p-5 bg-lilac/50 border-transparent">
            <p class="font-bold leading-tight">¿Sos de ${esc(j.company)}?</p>
            <p class="mt-1 text-ink-soft text-[0.95rem]">Publicá gratis en +Humanos y recibí los CVs ordenados en un solo lugar, en vez de por WhatsApp.</p>
            <a href="#/empresa?crear=1" class="mt-3 btn btn-primary btn-sm"><i class="ph-bold ph-buildings"></i>Sumar mi empresa</a></div>`
          : `<a href="#/e?n=${encodeURIComponent(j.company)}" class="card p-5 flex items-center gap-3.5 hover:border-brand/40 transition group">
            ${logo(j.company, 'w-12 h-12 text-sm')}
            <span class="min-w-0 flex-1"><span class="block font-bold leading-tight truncate group-hover:text-brand">${esc(j.company)}</span><span class="block text-ink-mute text-[0.92rem]">${esc(j.companyType || '')} · Ver todas sus búsquedas</span></span>
            <i class="ph-bold ph-caret-right text-ink-mute"></i></a>`}
        </aside>
        ${more.length ? `<section class="lg:col-span-2" aria-labelledby="more-t"><h2 id="more-t" class="text-[1.5rem] font-extrabold">Otros avisos que te pueden interesar</h2>
          <ul class="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">${more.map(adCard).join('')}</ul></section>` : ''}
      </div>
      <div class="jp-bar lg:hidden fixed inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-line px-4 pt-3 pb-safe">${applyBtn('w-full h-14 text-lg justify-center')}</div>`;
    return {
      title: `${j.title} en ${j.company}`,
      html, mount() {
        const sv = $('#jp-save');
        const drawSave = () => { const on = Store.isSaved(j.id); sv.setAttribute('aria-pressed', on); sv.classList.toggle('text-brand', on); sv.innerHTML = `<i class="${on ? 'ph-fill' : 'ph'} ph-bookmark-simple text-lg"></i>${on ? 'Guardada' : 'Guardar'}`; };
        drawSave(); sv.onclick = () => { const on = Store.toggleSaved(j.id); drawSave(); toast(on ? 'Vacante guardada' : 'Quitada de guardadas', 'ph-bookmark-simple'); };
        $('#jp-share').onclick = async () => {
          const url = `${location.origin}${location.pathname}#/vacante?id=${j.id}`;
          try { if (navigator.share) await navigator.share({ title: j.title, text: `${j.title} en ${j.company}`, url }); else { await navigator.clipboard.writeText(url); toast('Link copiado'); } } catch (e) { /* cancelado */ }
        };
      }
    };
  }

  function jobInfo(j) {
    const p = Store.profile();
    const fact = (ic, l, v, full) => `<div class="rounded-xl bg-surface p-3 ${full ? 'col-span-2' : ''}"><p class="text-[0.9rem] text-ink-mute flex items-center gap-1.5"><i class="ph ${ic}"></i>${l}</p><p class="font-semibold mt-0.5">${esc(v)}</p></div>`;
    const xs = j.external && extSrc(j.external.src);
    return `
      ${j.external ? `<div class="flex items-center gap-3 pr-12">
        ${logo(j.company, 'w-14 h-14 text-lg')}
        <div class="min-w-0"><p class="font-bold text-lg leading-tight truncate">${esc(j.company)}</p>
          <p class="text-ink-mute">Aviso externo · ${ago(j.external.foundAt || j.postedAt)}</p></div>
      </div>` : `<a href="#/e?n=${encodeURIComponent(j.company)}" class="flex items-center gap-3 pr-12 group w-fit max-w-full">
        ${logo(j.company, 'w-14 h-14 text-lg')}
        <div class="min-w-0"><p class="font-bold text-lg leading-tight group-hover:text-brand truncate">${esc(j.company)}</p>
          <p class="text-ink-mute">${esc(j.companyType)} · ${ago(j.postedAt)} · <span class="text-brand font-semibold">Ver perfil</span></p></div>
      </a>`}
      ${Store.isFeatured(j) ? `<div class="mt-4 -mb-2">${featPill()}</div>` : ''}
      <h2 class="mt-4 text-[1.75rem] leading-tight font-extrabold tracking-tight">${esc(j.title)}</h2>
      ${j.external ? `<p class="mt-3 rounded-[16px] bg-surface px-4 py-3 text-ink-soft flex gap-2.5"><i class="ph ${xs[2]} text-xl text-ink shrink-0"></i><span>Lo encontramos en <b class="text-ink">${esc(xs[1])}</b>${j.external.author ? ` (${esc(j.external.author)})` : ''}. La búsqueda la maneja la empresa: te postulás directo con ellos.${j.external.url ? ` <a href="${esc(j.external.url)}" target="_blank" rel="noopener" class="font-semibold text-brand hover:underline">Ver original</a>` : ''}</span></p>
      ${j.external.img ? `<details class="mt-3 rounded-[16px] border border-line px-4 py-3"><summary class="font-semibold cursor-pointer flex items-center gap-2"><i class="ph ph-image text-lg text-brand"></i>Ver la foto del aviso</summary><img src="${j.external.img}" alt="Foto original del aviso de ${esc(j.title)}" class="mt-3 rounded-xl w-full max-w-md" loading="lazy"></details>` : ''}` : ''}
      ${j.client ? `<p class="mt-2 text-ink-soft flex items-start gap-2"><i class="ph ph-buildings text-xl shrink-0"></i>
        <span>Búsqueda de <b class="text-ink">${esc(j.company)}</b> para <b class="text-ink">${esc(clientPublic(j))}</b>${j.showClient && j.clientIndustry ? ` (${esc(j.clientIndustry)})` : ''}.</span></p>` : ''}
      <div class="mt-5 grid grid-cols-2 gap-3">
        ${fact('ph-map-pin', 'Ubicación', `${j.city}, ${j.province}`)}
        ${fact('ph-buildings', 'Modalidad', j.modality)}
        ${fact('ph-clock', 'Jornada', j.type)}
        ${fact('ph-medal', 'Experiencia', senLabel(j.seniority))}
        ${j.salary ? fact('ph-money', 'Salario', j.salary, true) : ''}
      </div>
      <h3 class="mt-7 text-lg font-bold">Sobre el puesto</h3>
      <p class="mt-2 text-ink-soft leading-relaxed">${esc(j.description)}</p>
      ${j.responsibilities?.length ? `<h3 class="mt-6 text-lg font-bold">Responsabilidades</h3>
      <ul class="mt-3 space-y-2.5">${j.responsibilities.map(r => `<li class="flex gap-3"><i class="ph-bold ph-arrow-right text-brand text-lg shrink-0 mt-0.5"></i><span>${esc(r)}</span></li>`).join('')}</ul>` : ''}
      ${j.requirements?.length ? `<h3 class="mt-6 text-lg font-bold">Calificaciones</h3>
      <ul class="mt-3 space-y-2.5">${j.requirements.map(r => `<li class="flex gap-3"><i class="ph-fill ph-check-circle text-brand text-xl shrink-0 mt-0.5"></i><span>${esc(r)}</span></li>`).join('')}</ul>` : ''}
            ${(j.skills || []).length ? `<h3 class="mt-6 text-lg font-bold">Skills clave</h3>
      ${p && (p.skills || []).length ? '' : `<p class="text-ink-mute text-[0.92rem]">Las que marcan “excluyente” son imprescindibles.</p>`}
      <div class="mt-3 flex flex-wrap gap-2">${j.skills.map(x => {
        const has = p && (p.skills || []).length ? hasSkillList(p.skills, x.n) : null;
        const cls = has === true ? 'bg-mint text-ok' : has === false ? (x.must ? 'bg-bad/10 text-bad' : 'bg-surface text-ink-soft') : 'bg-surface text-ink';
        const ic = has === true ? 'ph-bold ph-check' : has === false ? 'ph ph-x' : 'ph ph-wrench';
        return `<span class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold ${cls}"><i class="${ic}"></i>${esc(x.n)}${x.must ? '<span class="text-[0.78rem] font-bold opacity-80">· excluyente</span>' : ''}</span>`;
      }).join('')}</div>` : ''}
      ${(j.comps || []).length ? `<h3 class="mt-6 text-lg font-bold">Competencias que buscan</h3>
      <div class="mt-3 flex flex-wrap gap-2">${j.comps.map(c => { const has = p && (p.comps || []).includes(c); return `<span class="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold ${has ? 'bg-lilac text-brand' : 'bg-surface text-ink'}"><i class="${has ? 'ph-bold ph-check' : 'ph ph-user-circle'}"></i>${esc(c)}</span>`; }).join('')}</div>` : ''}
${j.benefits?.length ? `<h3 class="mt-6 text-lg font-bold">Beneficios</h3>
      <div class="mt-3 flex flex-wrap gap-2">${j.benefits.map(b => `<span class="inline-flex items-center gap-1.5 bg-surface rounded-full px-3 py-1.5 font-medium"><i class="ph ph-gift text-brand"></i>${esc(b)}</span>`).join('')}</div>` : ''}`;
  }
  function openJob(id) {
    const j = Store.job(id); if (!j) return;
    const p = Store.profile(), s = score(j, p), applied = Store.hasApplied(id);
    const body = jobInfo(j);

    const foot = `${saveBtn(j.id, true)}
      <button id="share-job" class="icon-btn w-12 h-12 border border-line hidden min-[420px]:grid" aria-label="Compartir"><i class="ph ph-share-network text-2xl"></i></button>
      ${applied ? `<div class="btn flex-1 min-w-0 px-4 h-14 bg-ok/10 text-ok text-lg"><i class="ph-bold ph-check"></i>Ya te postulaste</div>`
        : `<button id="apply-btn" class="btn btn-primary flex-1 min-w-0 px-4 h-14 text-lg">${j.external ? '<i class="ph-fill ph-paper-plane-tilt text-xl"></i>Cómo postularme' : '<i class="ph-fill ph-file-pdf text-xl"></i>Postularme con mi CV'}</button>`}`;
    openSheet(sheetScroll(body) + sheetFoot(foot), c => {
      const ab = $('#apply-btn', c); if (ab) ab.onclick = () => openApply(id);
      $('#share-job', c).onclick = async () => {
        const url = `${location.origin}${location.pathname}#/vacantes?job=${id}`;
        try {
          if (navigator.share) await navigator.share({ title: j.title, text: `${j.title} en ${j.company}`, url });
          else { await navigator.clipboard.writeText(url); toast('Link copiado'); }
        } catch (e) { /* cancelado */ }
      };
    });
  }

  /* ----- Postulación rápida con CV en PDF ----- */
  async function extractFromPdf(file) {
    const out = { pages: null };
    if (!window.pdfjsLib) return out;
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
      out.pages = pdf.numPages;
      const lines = [];
      for (let i = 1; i <= Math.min(pdf.numPages, 3); i++) {
        const tc = await (await pdf.getPage(i)).getTextContent();
        let cur = '';
        tc.items.forEach(it => { cur += it.str; if (it.hasEOL) { lines.push(cur.trim()); cur = ''; } else cur += ' '; });
        if (cur.trim()) lines.push(cur.trim());
      }
      const text = lines.join('\n');
      out.text = text.slice(0, 12000);
      out.email = (text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/) || [])[0];
      const phones = text.match(/(\+?\s?54[\s-]?)?(9[\s-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/g) || [];
      out.phone = phones.map(s => s.trim()).find(s => digits(s).length >= 8 && digits(s).length <= 13);
      out.name = lines.map(l => l.replace(/\s+/g, ' ').trim())
        .find(l => /^[A-Za-zÁÉÍÓÚÑáéíóúñü' .-]{5,40}$/.test(l) && l.split(' ').length >= 2 && l.split(' ').length <= 4 && !/curr[ií]culum|vitae|\bcv\b|perfil|datos/i.test(l));
      if (out.name && out.name === out.name.toUpperCase()) out.name = out.name.toLowerCase().replace(/\b\p{L}/gu, m => m.toUpperCase());
    } catch (e) { console.warn('No se pudo leer el PDF', e); }
    return out;
  }

  /* ----- Enviar CV (sin postularse a una vacante): solo PDF o Word ----- */
  const CV_TYPES = { pdf: ['application/pdf'], doc: ['application/msword'], docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'] };
  const cvExt = f => ((f.name.match(/\.([a-z0-9]+)$/i) || [])[1] || '').toLowerCase();
  function openSendCv() {
    const contact = Store.contact() || {}, cand = Store.candidate() || {};
    const A = { file: null, text: '' };
    const icon = ext => ext === 'pdf' ? ['ph-file-pdf', 'bg-bad/10 text-bad'] : ['ph-file-doc', 'bg-brand-soft text-brand'];
    const fileCard = (f, sub) => { const [ic, tone] = icon(cvExt(f)); return `<div class="flex items-center gap-3 rounded-2xl border border-line p-3 sm:p-4">
        <span class="w-12 h-12 rounded-xl ${tone} grid place-items-center shrink-0"><i class="ph-fill ${ic} text-2xl"></i></span>
        <div class="min-w-0 flex-1"><p class="font-semibold truncate">${esc(f.name)}</p><p class="text-ink-mute text-[0.92rem]" id="sc-sub">${sub || fmtSize(f.size)}</p></div>
        <label for="sc-input" class="btn btn-outline btn-sm cursor-pointer">Cambiar</label></div>`; };
    const dropzone = `<label for="sc-input" id="sc-drop" class="dropzone flex flex-col items-center justify-center text-center gap-2 rounded-2xl border-2 border-dashed border-line bg-surface/60 px-5 py-8 cursor-pointer hover:border-brand transition">
        <span class="w-14 h-14 rounded-full bg-brand-soft text-brand grid place-items-center"><i class="ph-bold ph-upload-simple text-2xl"></i></span>
        <span class="font-bold text-lg">Tocá para subir tu CV</span>
        <span class="text-ink-mute">PDF o Word (.doc, .docx) · hasta 5 MB</span></label>`;
    const optP = PROVINCES.map(p => `<option ${p === (Store.profile() || {}).province ? 'selected' : ''}>${esc(p)}</option>`).join('');
    const optA = AREAS.map(a => `<option value="${a.id}" ${a.id === (Store.profile() || {}).area ? 'selected' : ''}>${esc(a.label)}</option>`).join('');
    const body = `<h2 class="text-[1.65rem] font-extrabold tracking-tight leading-tight pr-10">Enviá tu CV</h2>
      <p class="text-ink-soft mt-1">Lo recibe el equipo de +Humanos, lo revisa y lo suma a la base de +Humanos. Las empresas y consultoras que buscan tu perfil te contactan por WhatsApp.</p>
      <div class="mt-6">
        <p class="label flex items-center gap-2"><span class="w-6 h-6 rounded-full bg-ink text-white text-[0.8rem] grid place-items-center">1</span>Tu CV</p>
        <div id="sc-zone">${dropzone}</div>
        <input id="sc-input" type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" class="sr-only">
        <p id="sc-err" class="err hidden"></p>
      </div>
      <div class="mt-7">
        <p class="label flex items-center gap-2"><span class="w-6 h-6 rounded-full bg-ink text-white text-[0.8rem] grid place-items-center">2</span>Tus datos</p>
        <p id="sc-auto" class="hidden mb-3 rounded-xl bg-brand-soft text-brand px-3 py-2 font-medium"><i class="ph-fill ph-sparkle"></i> Completamos tus datos desde el CV. Revisalos.</p>
        <div class="space-y-3">
          <div class="relative"><i class="ph ph-user absolute left-4 top-1/2 -translate-y-1/2 text-xl text-ink-mute"></i><input id="sc-name" class="input pl-12" placeholder="Nombre y apellido" autocomplete="name" value="${esc(contact.name || cand.name || '')}" aria-label="Nombre y apellido"></div>
          <div class="relative"><i class="ph ph-whatsapp-logo absolute left-4 top-1/2 -translate-y-1/2 text-xl text-ink-mute"></i><input id="sc-phone" type="tel" inputmode="tel" class="input pl-12" placeholder="Celular / WhatsApp" autocomplete="tel" value="${esc(cand.phone || contact.phone || '')}" aria-label="Celular o WhatsApp"></div>
          <div class="relative"><i class="ph ph-envelope-simple absolute left-4 top-1/2 -translate-y-1/2 text-xl text-ink-mute"></i><input id="sc-email" type="email" inputmode="email" class="input pl-12" placeholder="Email (opcional)" autocomplete="email" value="${esc(contact.email || '')}" aria-label="Email"></div>
          <div class="grid grid-cols-2 gap-3">
            <select id="sc-prov" class="input" aria-label="Provincia"><option value="">Provincia</option>${optP}</select>
            <select id="sc-area" class="input" aria-label="Área"><option value="">Área</option>${optA}</select>
          </div>
        </div>
        <label class="mt-5 flex gap-3 items-start cursor-pointer">
          <input type="checkbox" id="sc-ok" class="w-5 h-5 mt-0.5 accent-[#0866FF] shrink-0">
          <span class="text-ink-soft">Acepto que las empresas y consultoras de +Humanos vean mi CV y me contacten. Puedo pedir que lo borren cuando quiera (<a href="#/privacidad" class="text-brand font-semibold underline underline-offset-2" data-close-sheet>Privacidad</a>).</span>
        </label>
        <p id="sc-err2" class="err hidden"></p>
      </div>`;
    const foot = `<button id="sc-send" class="btn btn-primary w-full h-14 text-lg"><i class="ph-fill ph-paper-plane-tilt text-xl"></i>Enviar CV</button>`;
    openSheet(sheetScroll(body) + sheetFoot(foot), c => {
      const inp = $('#sc-input', c), zone = $('#sc-zone', c), err = $('#sc-err', c), err2 = $('#sc-err2', c);
      const show = (el, m) => { el.textContent = m; el.classList.toggle('hidden', !m); };
      async function handle(f) {
        show(err, '');
        if (!f) return;
        const ext = cvExt(f), okType = !f.type || Object.values(CV_TYPES).flat().includes(f.type);
        if (!CV_TYPES[ext] || !okType) { inp.value = ''; return show(err, 'Solo se aceptan archivos PDF o Word (.doc, .docx).'); }
        if (f.size > 5 * 1048576) { inp.value = ''; return show(err, 'El archivo pesa más de 5 MB. Probá guardarlo de nuevo en menor calidad.'); }
        if (!f.size) { inp.value = ''; return show(err, 'El archivo está vacío. Elegí otro.'); }
        A.file = f; A.text = '';
        if (ext !== 'pdf') { zone.innerHTML = fileCard(f, `${fmtSize(f.size)} · Word`); return; }
        zone.innerHTML = fileCard(f, '<i class="ph ph-circle-notch spin"></i> Leyendo tu CV…');
        const info = await extractFromPdf(f);
        A.text = info.text || '';
        const sub = $('#sc-sub', c); if (sub) sub.textContent = `${fmtSize(f.size)}${info.pages ? ` · ${info.pages} página${info.pages > 1 ? 's' : ''}` : ''}`;
        let filled = false;
        [['sc-name', info.name], ['sc-email', info.email], ['sc-phone', info.phone]].forEach(([id, v]) => { const el = $('#' + id, c); if (v && !el.value.trim()) { el.value = v; filled = true; } });
        if (A.text && !$('#sc-area', c).value) { const d = detectArea(A.text.slice(0, 400)); if (d) { $('#sc-area', c).value = d; filled = true; } }
        $('#sc-auto', c).classList.toggle('hidden', !filled);
      }
      inp.onchange = () => handle(inp.files[0]);
      c.addEventListener('dragover', e => { e.preventDefault(); $('#sc-drop', c)?.classList.add('drag'); });
      c.addEventListener('dragleave', () => $('#sc-drop', c)?.classList.remove('drag'));
      c.addEventListener('drop', e => { e.preventDefault(); $('#sc-drop', c)?.classList.remove('drag'); handle(e.dataTransfer.files[0]); });
      $('#sc-send', c).onclick = async () => {
        show(err, ''); show(err2, '');
        const name = $('#sc-name', c).value.trim(), phone = $('#sc-phone', c).value.trim(), email = $('#sc-email', c).value.trim();
        if (!A.file) { show(err, 'Subí tu CV en PDF o Word.'); zone.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
        if (name.length < 3) return show(err2, 'Escribí tu nombre y apellido.');
        if (digits(phone).length < 8) return show(err2, 'Dejanos un celular válido para que te contacten por WhatsApp.');
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return show(err2, 'Revisá el email, parece incompleto.');
        if (!$('#sc-ok', c).checked) return show(err2, 'Para enviarlo, aceptá que las empresas vean tu CV.');
        const btn = $('#sc-send', c); btn.disabled = true; btn.innerHTML = '<i class="ph-bold ph-circle-notch spin text-xl"></i>Enviando…';
        const id = 'sp' + Date.now(), ext = cvExt(A.file);
        await Store.putCv('sp-' + id, A.file);
        Store.addSpontCv({ id, consent: { at: new Date().toISOString(), text: CONSENT_SPONT }, name, phone, email, province: $('#sc-prov', c).value, area: $('#sc-area', c).value, cvName: A.file.name, cvSize: A.file.size, cvType: ext, cvText: A.text, date: new Date().toISOString() });
        Store.setContact({ ...(Store.contact() || {}), name, phone, email });
        await wait(400);
        setSheet(`<div class="px-5 sm:px-7 pt-8 pb-7 text-center">
          <span class="mx-auto w-16 h-16 rounded-full bg-mint text-ok grid place-items-center"><i class="ph-fill ph-check-circle text-[2rem]"></i></span>
          <h2 class="mt-4 text-[1.5rem] font-extrabold leading-tight">¡Listo, ${esc(name.split(' ')[0])}! Recibimos tu CV</h2>
          <p class="mt-2 text-ink-soft">Lo revisamos y lo sumamos a la base de +Humanos. Si una empresa o consultora busca tu perfil, te escribe al ${esc(phone)}.</p>
          <div class="mt-6 grid gap-2">
            <a href="#/vacantes" class="btn btn-primary justify-center" data-close-sheet><i class="ph-bold ph-magnifying-glass"></i>Ver vacantes abiertas</a>
            <button type="button" class="btn btn-outline justify-center" data-close-sheet>Cerrar</button>
          </div></div>`);
      };
    });
  }

  function openApply(jobId) {
    const j = Store.job(jobId);
    if (j && j.external) { openExternalApply(j); return; }
    if (!Store.candidate()) {
      return openCandLogin(() => openApply(jobId), { title: 'Ingresá para postularte', sub: `Es un paso solo: te mandamos un código por WhatsApp y seguís con tu CV para <b class="text-ink">${esc(j ? j.title : 'esta vacante')}</b>. Después vas a ver si lo leyeron y en qué etapa estás.` });
    }
    const contact = Store.contact() || {};
    const meta = Store.cvMeta();
    const A = { file: null, useSaved: !!meta };
    const fileCard = (name, size, sub) => `
      <div class="flex items-center gap-3 rounded-2xl border border-line p-3 sm:p-4">
        <span class="w-12 h-12 rounded-xl bg-bad/10 text-bad grid place-items-center shrink-0"><i class="ph-fill ph-file-pdf text-2xl"></i></span>
        <div class="min-w-0 flex-1"><p class="font-semibold truncate">${esc(name)}</p><p class="text-ink-mute text-[0.92rem]" id="cv-sub">${sub || fmtSize(size)}</p></div>
        <label for="cv-input" class="btn btn-outline btn-sm cursor-pointer">Cambiar</label>
      </div>`;
    const dropzone = `
      <label for="cv-input" id="dropzone" class="dropzone flex flex-col items-center justify-center text-center gap-2 rounded-2xl border-2 border-dashed border-line bg-surface/60 px-5 py-8 cursor-pointer hover:border-brand transition">
        <span class="w-14 h-14 rounded-full bg-brand-soft text-brand grid place-items-center"><i class="ph-bold ph-upload-simple text-2xl"></i></span>
        <span class="font-bold text-lg">Tocá para subir tu CV</span>
        <span class="text-ink-mute">PDF de hasta 5 MB</span>
      </label>`;
    const body = `
      <button type="button" data-back class="text-brand font-semibold inline-flex items-center gap-1.5 mb-3 -ml-1 px-1 py-1"><i class="ph-bold ph-arrow-left"></i>Volver a la vacante</button>
      <h2 class="text-[1.65rem] font-extrabold tracking-tight leading-tight">Postulate en segundos</h2>
      <p class="text-ink-soft mt-1">${esc(j.title)} · ${esc(j.company)}</p>

      <div class="mt-6">
        <p class="label flex items-center gap-2"><span class="w-6 h-6 rounded-full bg-ink text-white text-[0.8rem] grid place-items-center">1</span>Tu CV en PDF</p>
        <div id="cv-zone">${meta ? fileCard(meta.name, meta.size, `Tu CV guardado · ${fmtSize(meta.size)}`) : dropzone}</div>
        <input id="cv-input" type="file" accept="application/pdf,.pdf" class="sr-only">
        <p id="cv-err" class="err hidden"></p>
      </div>

      <div class="mt-7">
        <p class="label flex items-center gap-2"><span class="w-6 h-6 rounded-full bg-ink text-white text-[0.8rem] grid place-items-center">2</span>¿Cómo te contactan?</p>
        <p id="autofill" class="hidden mb-3 rounded-xl bg-brand-soft text-brand px-3 py-2 font-medium"><i class="ph-fill ph-sparkle"></i> Completamos tus datos desde el CV. Revisalos.</p>
        <div class="space-y-3">
          <div class="relative"><i class="ph ph-user absolute left-4 top-1/2 -translate-y-1/2 text-xl text-ink-mute"></i>
            <input id="ap-name" class="input pl-12" placeholder="Nombre y apellido" autocomplete="name" value="${esc(contact.name)}" aria-label="Nombre y apellido"></div>
          <div class="relative"><i class="ph ph-envelope-simple absolute left-4 top-1/2 -translate-y-1/2 text-xl text-ink-mute"></i>
            <input id="ap-email" type="email" inputmode="email" class="input pl-12" placeholder="Email" autocomplete="email" value="${esc(contact.email)}" aria-label="Email"></div>
          <div class="relative"><i class="ph ph-whatsapp-logo absolute left-4 top-1/2 -translate-y-1/2 text-xl text-ink-mute"></i>
            <input id="ap-phone" type="tel" inputmode="tel" class="input pl-12" placeholder="Celular / WhatsApp" autocomplete="tel" value="${esc(contact.phone)}" aria-label="Celular o WhatsApp"></div>
        </div>
        <p id="ap-err" class="err hidden"></p>
        ${questionsOf(j).length ? `<div class="mt-6" id="ap-qs"><p class="label flex items-center gap-2"><span class="w-6 h-6 rounded-full bg-ink text-white text-[0.8rem] grid place-items-center">3</span>Unas preguntas rápidas</p>
          <div class="space-y-4">${questionsOf(j).map(q => `<fieldset><legend class="font-semibold mb-2">${esc(q.text)}</legend><div class="flex flex-wrap gap-2">${(q.type === 'yn' ? ['Sí', 'No'] : q.options).map(o => `<label class="cursor-pointer"><input type="radio" name="apq-${q.id}" value="${esc(o)}" class="peer sr-only"><span class="inline-flex items-center h-11 px-4 rounded-full border border-line font-semibold peer-checked:bg-brand peer-checked:text-white peer-checked:border-brand peer-focus-visible:ring-2 peer-focus-visible:ring-brand/40">${esc(o)}</span></label>`).join('')}</div></fieldset>`).join('')}</div></div>` : ''}
        ${(() => { let s0 = ''; try { s0 = sessionStorage.getItem('emplea.src.' + jobId) || ''; } catch (e) { /* nada */ } return s0 ? '' : `<div class="mt-4"><label class="label" for="ap-src">¿Dónde viste este aviso? <span class="font-normal text-ink-mute">(opcional)</span></label>
          <select id="ap-src" class="input"><option value="">Elegí una opción</option>${CHANNELS.filter(c => !['banco', 'importado'].includes(c[0])).map(([id, l]) => `<option value="${id}">${esc(l)}</option>`).join('')}</select></div>`; })()}
        <details class="mt-4 group">
          <summary class="cursor-pointer list-none font-semibold text-brand inline-flex items-center gap-1.5"><i class="ph-bold ph-plus group-open:rotate-45 transition"></i>Agregar un mensaje (opcional)</summary>
          <textarea id="ap-msg" rows="3" maxlength="400" class="input h-auto py-3 mt-3" placeholder="Ej: Tengo disponibilidad inmediata."></textarea>
        </details>
        <label class="mt-5 flex gap-3 items-start cursor-pointer">
          <input type="checkbox" id="ap-consent" class="w-5 h-5 mt-0.5 accent-[#0866FF] shrink-0">
          <span class="text-ink-soft">${esc(CONSENT_APPLY(j.company)).replace('Política de privacidad', '<a href="#/privacidad" class="text-brand font-semibold underline underline-offset-2" target="_blank">Política de privacidad</a>')}</span>
        </label>
        <label class="mt-3 flex gap-3 items-start cursor-pointer">
          <input type="checkbox" id="ap-remember" checked class="w-5 h-5 mt-0.5 accent-[#0866FF] shrink-0">
          <span class="text-ink-soft">Guardar mis datos y CV en este dispositivo para postularme con un toque la próxima vez.</span>
        </label>
      </div>`;
    const foot = `<button id="ap-send" class="btn btn-primary w-full h-14 text-lg"><i class="ph-fill ph-paper-plane-tilt text-xl"></i>Enviar postulación</button>`;

    openSheet(sheetScroll(body) + sheetFoot(foot), c => {
      $('[data-back]', c).onclick = () => parseHash().path === '/vacante' ? closeSheet() : openJob(jobId);
      const inputEl = $('#cv-input', c), zone = $('#cv-zone', c), errEl = $('#cv-err', c);
      const showErr = (el, m) => { el.textContent = m; el.classList.toggle('hidden', !m); };

      async function handleFile(f) {
        showErr(errEl, '');
        if (!f) return;
        if (!(f.type === 'application/pdf' || /\.pdf$/i.test(f.name))) return showErr(errEl, 'El CV tiene que ser un archivo PDF.');
        if (f.size > 5 * 1048576) return showErr(errEl, 'El archivo pesa más de 5 MB. Probá exportarlo de nuevo en menor calidad.');
        A.file = f; A.useSaved = false; A.text = '';
        zone.innerHTML = fileCard(f.name, f.size, '<i class="ph ph-circle-notch spin"></i> Leyendo tu CV…');
        const info = await extractFromPdf(f);
        A.text = info.text || '';
        const sub = $('#cv-sub', c);
        if (sub) sub.textContent = `${fmtSize(f.size)}${info.pages ? ` · ${info.pages} página${info.pages > 1 ? 's' : ''}` : ''}`;
        let filled = false;
        [['ap-name', info.name], ['ap-email', info.email], ['ap-phone', info.phone]].forEach(([id, v]) => {
          const el = $('#' + id, c); if (v && !el.value.trim()) { el.value = v; filled = true; }
        });
        $('#autofill', c).classList.toggle('hidden', !filled);
      }
      inputEl.onchange = () => handleFile(inputEl.files[0]);
      // Arrastrar y soltar (desktop)
      c.addEventListener('dragover', e => { e.preventDefault(); $('#dropzone', c)?.classList.add('drag'); });
      c.addEventListener('dragleave', () => $('#dropzone', c)?.classList.remove('drag'));
      c.addEventListener('drop', e => { e.preventDefault(); $('#dropzone', c)?.classList.remove('drag'); handleFile(e.dataTransfer.files[0]); });

      $('#ap-send', c).onclick = async () => {
        const name = $('#ap-name', c).value.trim(), email = $('#ap-email', c).value.trim(), phone = $('#ap-phone', c).value.trim();
        const apErr = $('#ap-err', c);
        showErr(apErr, ''); showErr(errEl, '');
        if (!A.file && !A.useSaved) { showErr(errEl, 'Subí tu CV en PDF para postularte.'); zone.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
        if (name.length < 3) return showErr(apErr, 'Escribí tu nombre y apellido.');
        const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email), phoneOk = digits(phone).length >= 8;
        if (!emailOk && !phoneOk) return showErr(apErr, 'Dejanos al menos un email o un celular válido para que te contacten.');
        if (email && !emailOk) return showErr(apErr, 'Revisá el email, parece incompleto.');
        const qAns = {}; questionsOf(j).forEach(q => { const r = $(`input[name="apq-${q.id}"]:checked`, c); if (r) qAns[q.id] = r.value; });
        if (questionsOf(j).some(q => !qAns[q.id])) { showErr(apErr, 'Respondé las preguntas rápidas.'); $('#ap-qs', c).scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
        if (!$('#ap-consent', c).checked) return showErr(apErr, 'Para postularte, aceptá el uso de tus datos para este proceso.');

        const btn = $('#ap-send', c);
        btn.disabled = true; btn.innerHTML = '<i class="ph-bold ph-circle-notch spin text-xl"></i>Enviando…';
        const id = 'a' + Date.now();
        let blob = A.file, cvName, cvSize;
        if (A.file) { cvName = A.file.name; cvSize = A.file.size; }
        else { blob = await Store.getCv('last'); cvName = meta.name; cvSize = meta.size; }
        if (blob) await Store.putCv(id, blob);
        const remember = $('#ap-remember', c).checked;
        if (remember) {
          Store.setContact({ name, email, phone });
          if (A.file) { await Store.putCv('last', A.file); Store.setCvMeta({ name: cvName, size: cvSize, text: A.text || '' }); }
        }
        const cvText = A.file ? (A.text || '') : ((meta && meta.text) || '');
        const prof = Store.profile() || {};
        let source = ''; try { source = sessionStorage.getItem('emplea.src.' + jobId) || ''; } catch (e) { /* nada */ }
        source = source || ($('#ap-src', c) && $('#ap-src', c).value) || 'emplea';
        Store.addApp({ id, jobId, answers: questionsOf(j).length ? qAns : undefined, owner: digits((Store.candidate() || {}).phone).slice(-10) || undefined, source, consent: { at: new Date().toISOString(), text: CONSENT_APPLY(j.company) }, name, email, phone, message: $('#ap-msg', c).value.trim(), cvName, cvSize, cvText, declSkills: prof.skills || [], declComps: prof.comps || [], date: new Date().toISOString(), status: 'Nuevo', mine: true });
        await wait(500);
        S.dirty = true;
        showApplySuccess(j);
      };
    });
  }

  function showApplySuccess(j) {
    S.dirty = true; // al cerrar, las cards muestran "Ya te postulaste"
    const p = Store.profile();
    const similar = Store.activeJobs().filter(x => x.id !== j.id && x.area === j.area && !Store.hasApplied(x.id))
      .sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt)).slice(0, 2).map(x => ({ x, s: 0 }));
    const body = `
      <div class="text-center pt-6">
        <div class="success-pop mx-auto w-20 h-20 rounded-full bg-ok grid place-items-center text-white"><i class="ph-bold ph-check text-4xl"></i></div>
        <h2 class="mt-5 text-[1.75rem] font-extrabold tracking-tight">¡Postulación enviada!</h2>
        <p class="mt-2 text-ink-soft text-lg max-w-md mx-auto">Tu CV ya está en manos de <b class="text-ink">${esc(j.company)}</b>. Si avanzás, te contactan por email o WhatsApp.</p>
      </div>
      ${similar.length ? `<h3 class="mt-8 mb-3 text-lg font-bold">Vacantes parecidas</h3>
        <div class="space-y-2">${similar.map(({ x, s }) => `
          <button data-open-job="${x.id}" class="w-full text-left flex items-center gap-3 rounded-2xl border border-line p-3 hover:bg-surface transition">
            ${logo(x.company, 'w-11 h-11 text-sm')}
            <span class="min-w-0 flex-1"><span class="block font-bold truncate">${esc(x.title)}</span><span class="block text-ink-mute truncate">${esc(x.company)} · ${esc(x.city)}</span></span>
            ${s ? `<span class="text-brand font-bold">${s}%</span>` : ''}<i class="ph-bold ph-caret-right text-ink-mute"></i>
          </button>`).join('')}</div>` : ''}`;
    const foot = `<a href="#/postulaciones" class="btn btn-outline flex-1 min-w-0 px-3 h-14">Mis postulaciones</a><button data-close-sheet class="btn btn-primary flex-1 min-w-0 px-3 h-14">Seguir viendo</button>`;
    setSheet(sheetScroll(body) + sheetFoot(foot));
  }

  function Saved() {
    const p = Store.profile();
    const list = Store.saved().map(id => Store.job(id)).filter(Boolean);
    return {
      html: `<div class="max-w-6xl mx-auto px-4 sm:px-6 py-6 md:py-8">
        <h1 class="text-3xl font-extrabold tracking-tight">Guardadas</h1>
        <p class="text-ink-soft mt-1">Las vacantes que marcaste para ver después.</p>
        <div class="mt-5 grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
          ${list.length ? list.map(j => jobCard(j, score(j, p))).join('') : emptyState('ph-bookmark-simple', 'Todavía no guardaste vacantes', 'Tocá el marcador de una vacante para tenerla a mano.', '<a href="#/vacantes" class="btn btn-primary">Ver vacantes</a>')}
        </div></div>`
    };
  }

  /* ================= MIS POSTULACIONES: informe de avance =================
     El candidato ingresa con un código por WhatsApp y ve, por cada postulación, una línea de tiempo:
     Enviada → CV leído → En proceso → Finalista → Resultado, con la fecha de cada paso. */
  const PROC = ['En revisión', 'Entrevista', 'Terna', 'Contratado'];
  const lastChange = a => [a.readAt, a.interview && a.interview.setAt, ...(a.history || []).slice(1).map(h => h.at)].filter(Boolean).sort().pop() || null;
  function candUnread() {
    if (!Store.candidate()) return 0;
    const seen = Store.candSeen();
    return Store.myApps().filter(a => { const lc = lastChange(a); return lc && lc > (seen[a.id] || a.date); }).length;
  }
  function candTimeline(a) {
    const H = a.history || [{ st: a.status, at: a.date }];
    const firstAt = sts => (H.find(h => sts.includes(h.st)) || {}).at || null;
    const was = sts => sts.includes(a.status) || H.some(h => sts.includes(h.st));
    const out = a.status === 'Descartado', won = a.status === 'Contratado';
    const isCons = (Store.job(a.jobId) || {}).companyType === 'Consultora';
    const steps = [
      { l: 'Enviada', at: a.date, done: true },
      { l: 'CV leído', at: a.readAt || firstAt([...PROC, 'Descartado']), done: !!a.readAt || a.status !== 'Nuevo' || H.length > 1 },
      { l: 'En proceso', at: firstAt(PROC), done: was(PROC) },
      { l: 'Finalista', at: firstAt(['Entrevista', 'Terna', 'Contratado']), done: was(['Entrevista', 'Terna', 'Contratado']) },
      { l: won ? '¡Te eligieron!' : out ? 'No seleccionado' : 'Resultado', at: won || out ? H[H.length - 1].at : null, done: won || out, bad: out, good: won }
    ];
    const cur = steps.reduce((i, s2, k) => s2.done ? k : i, 0);
    let msg = {
      'Nuevo': a.readAt ? ['ph-eye', 'Leyeron tu CV.', 'Todavía están revisando las postulaciones.'] : ['ph-paper-plane-tilt', 'Tu CV llegó.', 'Todavía no lo abrieron. Te avisamos cuando lo lean.'],
      'En revisión': ['ph-hourglass-medium', 'Leyeron tu CV y seguís en proceso.', 'Están revisando los perfiles para elegir a quién entrevistar.'],
      'Entrevista': ['ph-chats-circle', '¡Te quieren entrevistar!', 'Estate atento a WhatsApp y al email: te van a contactar para coordinar.'],
      'Terna': ['ph-star', 'Sos finalista.', isCons ? 'La consultora te presentó a la empresa entre los mejores candidatos.' : 'Quedaste entre los mejores candidatos de la búsqueda.'],
      'Contratado': ['ph-confetti', '¡Te eligieron!', 'Felicitaciones. La empresa se va a comunicar con vos para los próximos pasos.'],
      'Descartado': ['ph-hand-heart', 'Esta vez no seguís en el proceso.', 'No es por falta de valor: buscaban un perfil puntual. Mirá estas vacantes parecidas.']
    }[a.status] || ['ph-paper-plane-tilt', 'Postulación enviada.', ''];
    const iv = a.interview;
    if (iv && iv.at && !out && !won && ivDate(iv.at) > new Date(Date.now() - 2 * 36e5)) {
      msg = ['ph-calendar-check', `Tenés entrevista el ${ivLong(iv.at).toLowerCase()} a las ${ivTime(iv.at)} h.`,
        `${iv.mode === 'Presencial' ? `Presencial${iv.place ? ` en ${esc(iv.place)}` : ''}` : iv.mode === 'Videollamada' ? `Por videollamada${iv.place ? `: ${esc(iv.place)}` : ''}` : 'Te llaman por teléfono a tu celular'}. Dura unos ${iv.dur} minutos.`];
    }
    return { steps, cur, msg, out, won };
  }
  const fmtDay = iso => iso ? new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }).replace('.', '') : '';

  // Postulaciones de ejemplo para ver el informe de avance en la demo
  function seedCandApps() {
    const c = Store.candidate() || {}, ct = Store.contact() || {};
    const iso = (d, h = 0) => new Date(Date.now() - d * 864e5 - h * 36e5).toISOString();
    const base = { name: ct.name || c.name || 'Vos', email: ct.email || '', phone: c.phone || ct.phone || '', cvName: 'Mi CV.pdf', cvSize: 52000, mine: true, owner: digits(c.phone || ct.phone).slice(-10), message: '' };
    const mk = (jobId, sent, hist, extra = {}) => {
      if (!Store.job(jobId) || Store.myApps().some(a => a.jobId === jobId)) return;
      const H = [{ st: 'Nuevo', at: iso(sent) }, ...hist.map(([st, d, h]) => ({ st, at: iso(d, h) }))];
      Store.addApp({ ...base, id: 'm' + Date.now().toString(36) + jobId, jobId, date: iso(sent), status: H[H.length - 1].st, history: H, changedAt: H[H.length - 1].at, ...extra });
    };
    mk('j5', 0, []);
    mk('j8', 3, [], { readAt: iso(1, 5) });
    mk('j14', 6, [['En revisión', 4], ['Entrevista', 0, 3]], { readAt: iso(4, 1) });
    mk('j24', 9, [['En revisión', 8], ['Entrevista', 5], ['Terna', 2]], { readAt: iso(8, 2) });
    mk('j13', 12, [['En revisión', 10], ['Descartado', 1]], { readAt: iso(10, 3), notifiedAt: iso(1), rejectMsg: 'Hola, gracias por postularte. En esta oportunidad avanzamos con otros perfiles que se ajustaban más a lo que buscaba el cliente. Te vamos a tener en cuenta para próximas búsquedas. ¡Éxitos!' });
  }

  function CandLoginCard(opts = {}) {
    const ct = Store.contact() || {};
    return `<div class="${opts.bare ? '' : 'max-w-md mx-auto card p-6 sm:p-8'}" id="cl-box">
      <div class="w-14 h-14 rounded-2xl bg-[#25D366]/15 text-[#128C4B] grid place-items-center"><i class="ph-fill ph-whatsapp-logo text-3xl"></i></div>
      <h2 class="mt-4 text-[1.6rem] leading-tight font-extrabold ${opts.bare ? 'pr-10' : ''}">${opts.title || 'Ingresá con tu celular'}</h2>
      <p class="mt-1 text-ink-soft">${opts.sub || 'Te mandamos un código por WhatsApp. Sin contraseñas. Así ves en qué etapa está cada postulación, desde cualquier dispositivo.'}</p>
      <form id="cl-f1" class="mt-5" novalidate>
        <label class="label" for="cl-phone">Celular</label>
        <div class="relative"><span class="absolute left-4 top-1/2 -translate-y-1/2 text-ink-mute font-semibold">+54</span>
          <input id="cl-phone" type="tel" inputmode="tel" autocomplete="tel" class="input pl-14" placeholder="381 555-1234" value="${esc(ct.phone || '')}"></div>
        <p id="cl-err1" class="err hidden"></p>
        <button class="btn btn-primary w-full h-14 text-lg mt-4"><i class="ph-fill ph-whatsapp-logo text-xl"></i>Enviarme el código</button>
      </form>
      <form id="cl-f2" class="mt-5 hidden" novalidate>
        <p class="text-ink-soft">Escribí el código que te mandamos al <b class="text-ink" id="cl-to"></b>. <button type="button" id="cl-back" class="text-brand font-semibold">Cambiar</button></p>
        <input id="cl-code" inputmode="numeric" autocomplete="one-time-code" maxlength="4" class="input mt-3 h-16 text-center text-[1.8rem] font-bold tracking-[0.6em]" placeholder="••••" aria-label="Código de 4 dígitos">
        <label class="label mt-4" for="cl-name">Tu nombre y apellido</label>
        <input id="cl-name" class="input" placeholder="Ej: Lucía Fernández" autocomplete="name" maxlength="60" value="${esc(ct.name || '')}">
        <p class="mt-3 rounded-xl bg-sun-soft px-3 py-2 text-[0.92rem]"><i class="ph-fill ph-info text-warn"></i> Prototipo: no se envía un WhatsApp real. Tu código es <b id="cl-demo"></b> <button type="button" id="cl-fill" class="text-brand font-semibold ml-1">Completar</button></p>
        <p id="cl-err2" class="err hidden"></p>
        <button class="btn btn-primary w-full h-14 text-lg mt-4">Ingresar</button>
      </form>
    </div>`;
  }
  function bindCandLogin(onDone) {
    let code = '', phone = '';
    const err = (id, t) => { const e = $(id); e.textContent = t; e.classList.toggle('hidden', !t); };
    $('#cl-f1').onsubmit = e => {
      e.preventDefault();
      phone = $('#cl-phone').value.trim();
      if (phone.replace(/\D/g, '').length < 8) { err('#cl-err1', 'Escribí tu celular con característica, por ejemplo 381 555-1234.'); return; }
      err('#cl-err1', '');
      code = String(1000 + Math.floor(Math.random() * 9000));
      $('#cl-to').textContent = phone; $('#cl-demo').textContent = code;
      $('#cl-f1').classList.add('hidden'); $('#cl-f2').classList.remove('hidden'); $('#cl-code').focus();
    };
    $('#cl-back').onclick = () => { $('#cl-f2').classList.add('hidden'); $('#cl-f1').classList.remove('hidden'); };
    $('#cl-fill').onclick = () => { $('#cl-code').value = code; };
    $('#cl-f2').onsubmit = e => {
      e.preventDefault();
      if ($('#cl-code').value.trim() !== code) { err('#cl-err2', 'El código no coincide. Revisalo e intentá de nuevo.'); return; }
      const nm = $('#cl-name').value.trim().replace(/\s+/g, ' ');
      if (nm.length < 3) { err('#cl-err2', 'Escribí tu nombre y apellido.'); $('#cl-name').focus(); return; }
      Store.setCandidate({ phone, name: nm, since: new Date().toISOString() });
      const ct = Store.contact() || {};
      Store.setContact({ ...ct, name: nm, phone });
      toast('¡Listo! Ya ingresaste', 'ph-check-circle');
      onDone();
    };
  }

  // Para postularse hay que ingresar: el ingreso se abre en el mismo panel y después sigue a la postulación
  function openCandLogin(onDone, opts = {}) {
    openSheet(sheetScroll(CandLoginCard({ bare: true, ...opts })), () => bindCandLogin(() => { S.dirty = true; onDone(); }));
  }

  function MyApps() {
    const cand = Store.candidate();
    if (!cand) return {
      html: `<div class="max-w-md mx-auto px-4 sm:px-6 py-8 md:py-12">
        <a href="#/" class="inline-flex items-center gap-1.5 font-semibold text-ink-soft hover:text-ink"><i class="ph-bold ph-arrow-left"></i>Volver a inicio</a>
        <div class="mt-6">${CandLoginCard()}</div>
        <p class="mt-5 text-center text-ink-mute text-[0.95rem]">Con tu cuenta ves si leyeron tu CV, si seguís en proceso o si sos finalista.</p></div>`,
      mount() { bindCandLogin(() => render()); }
    };
    const seen = Store.candSeen();
    const apps = [...Store.myApps()].sort((x, y) => (lastChange(y) || y.date).localeCompare(lastChange(x) || x.date));
    const p = Store.profile();
    // Vacantes parecidas: misma área primero, después misma provincia (sin las que ya se postuló)
    const similar = j => Store.activeJobs().filter(x => x.id !== j.id && !Store.myApps().some(m => m.jobId === x.id))
      .map(x => ({ x, s: (x.area === j.area ? 100 : 0) + (x.province === j.province ? 40 : 0) + (score(x, p) || 0) / 10 }))
      .filter(o => o.s >= 40).sort((a2, b2) => b2.s - a2.s).slice(0, 3).map(o => o.x);
    const cards = apps.map(a => {
      const j = Store.job(a.jobId) || { title: 'Vacante finalizada', company: '—', city: '', province: '' };
      const T = candTimeline(a), lc = lastChange(a), isNew = lc && lc > (seen[a.id] || a.date);
      const tone = T.out ? 'bg-surface' : T.won ? 'bg-mint' : a.status === 'Terna' || a.status === 'Entrevista' ? 'bg-lilac/60' : 'bg-brand-soft/50';
      const sim = T.out && j.id ? similar(j) : [];
      return `<article class="card p-4 sm:p-5 ${isNew ? 'ring-2 ring-brand' : ''}">
        <div class="flex items-start gap-3">
          ${logo(j.company)}
          <div class="min-w-0 flex-1">
            <div class="flex items-start gap-2"><h3 class="font-bold text-[1.1rem] leading-snug flex-1 min-w-0">${esc(j.title)}</h3>${isNew ? '<span class="shrink-0 rounded-full bg-brand text-white px-2.5 py-0.5 text-[0.78rem] font-bold">Novedad</span>' : ''}</div>
            <p class="text-ink-soft truncate">${esc(j.company)}${j.province ? ` · ${esc(j.province)}` : ''}</p>
          </div>
        </div>
        <div class="mt-4 rounded-[16px] ${tone} p-3.5 flex gap-3">
          <i class="ph-fill ${T.msg[0]} text-2xl ${T.out ? 'text-ink-mute' : T.won ? 'text-ok' : 'text-brand'} shrink-0"></i>
          <div class="min-w-0"><p class="font-bold leading-snug">${T.msg[1]}</p>${T.msg[2] ? `<p class="text-ink-soft text-[0.95rem] leading-snug mt-0.5">${T.msg[2]}</p>` : ''}</div>
        </div>
        <ol class="mt-4 grid grid-cols-5" aria-label="Avance de la postulación">
          ${T.steps.map((s2, k) => {
            const done = s2.done, skip = T.out && !done;
            const dot = s2.bad ? 'bg-ink-mute text-white' : s2.good ? 'bg-ok text-white' : done ? 'bg-brand text-white' : 'bg-white border-2 border-line text-transparent';
            const line = k < 4 ? `<span class="absolute top-[11px] left-1/2 w-full h-[3px] ${T.steps[k + 1].done ? (T.steps[k + 1].bad ? 'bg-line' : 'bg-brand') : 'bg-line'}" aria-hidden="true"></span>` : '';
            return `<li class="relative flex flex-col items-center text-center px-0.5 ${k === T.cur ? 'font-bold' : ''}" ${k === T.cur ? 'aria-current="step"' : ''}>
              ${line}<span class="relative z-[1] w-6 h-6 rounded-full grid place-items-center ${dot}"><i class="ph-bold ${s2.bad ? 'ph-x' : 'ph-check'} text-[0.8rem]"></i></span>
              <span class="mt-1.5 text-[0.74rem] min-[380px]:text-[0.8rem] leading-tight ${skip ? 'text-ink-mute/60' : done ? 'text-ink' : 'text-ink-mute'}">${s2.l}</span>
              <span class="text-[0.72rem] text-ink-mute leading-tight mt-0.5">${done && s2.at ? fmtDay(s2.at) : '&nbsp;'}</span></li>`;
          }).join('')}
        </ol>
        ${T.out && a.rejectMsg ? `<div class="mt-4 rounded-[14px] bg-surface p-3"><p class="text-[0.82rem] font-semibold text-ink-mute">Mensaje de ${esc(j.company)}</p><p class="mt-0.5 whitespace-pre-line">${esc(a.rejectMsg)}</p></div>` : ''}
        ${sim.length ? `<div class="mt-4"><p class="font-semibold text-[0.95rem]">Vacantes parecidas</p><ul class="mt-2 space-y-1.5">${sim.map(x => `<li><button type="button" data-open-job="${x.id}" class="w-full text-left flex items-center gap-2.5 rounded-xl border border-line px-3 py-2 hover:border-brand/40 hover:bg-surface">${logo(x.company, 'w-8 h-8 text-[0.65rem]')}<span class="min-w-0 flex-1"><span class="block font-semibold truncate leading-tight">${esc(x.title)}</span><span class="block text-[0.85rem] text-ink-mute truncate">${esc(x.company)} · ${esc(x.province)}</span></span><i class="ph-bold ph-caret-right text-ink-mute"></i></button></li>`).join('')}</ul></div>` : ''}
        <div class="mt-4 pt-3 border-t border-line flex items-center justify-between gap-2 text-[0.92rem] text-ink-mute">
          <span class="flex items-center gap-1.5 min-w-0"><i class="ph ph-file-pdf shrink-0"></i><span class="truncate">${esc(a.cvName)}</span></span>
          <span class="flex items-center gap-4 shrink-0">
            ${(T.out || T.won || !Store.job(a.jobId) || Store.job(a.jobId).status !== 'activa') ? `<button type="button" data-app-del="${a.id}" class="font-semibold text-ink-mute hover:text-bad inline-flex items-center gap-1" title="Borrar esta postulación de tu historial"><i class="ph ph-trash"></i>Borrar</button>` : ''}
            ${Store.job(a.jobId) && Store.job(a.jobId).status === 'activa' ? `<button type="button" data-open-job="${a.jobId}" class="font-semibold text-brand">Ver aviso</button>` : ''}
          </span>
        </div>
      </article>`;
    });
    const nNew = apps.filter(a => { const lc = lastChange(a); return lc && lc > (seen[a.id] || a.date); }).length;
    const count = st => apps.filter(a => st.includes(a.status)).length;
    const html = `<div class="max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-12">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div><h1 class="text-[2rem] sm:text-[2.4rem] leading-tight font-extrabold">Mis postulaciones</h1>
          <p class="text-ink-soft mt-1">${nNew ? `<b class="text-brand">${nNew} novedad${nNew === 1 ? '' : 'es'}</b> desde tu última visita.` : 'Seguí en qué etapa está cada una.'}</p></div>
        <div class="flex items-center gap-3 rounded-2xl bg-white border border-line px-3.5 py-2.5">
          <i class="ph-fill ph-whatsapp-logo text-2xl text-[#25D366]"></i>
          <div class="leading-tight"><p class="font-semibold">${esc(cand.name || 'Tu cuenta')}</p><p class="text-[0.88rem] text-ink-mute">Avisos al ${esc(cand.phone)}</p></div>
          <button type="button" id="cl-out" class="ml-2 text-[0.9rem] font-semibold text-ink-soft hover:text-ink">Salir</button>
        </div>
      </div>
      ${apps.length ? `<div class="mt-8 flex flex-wrap gap-2">
        ${[['En proceso', ['Nuevo', 'En revisión'], 'bg-brand-soft text-brand'], ['Finalista', ['Entrevista', 'Terna'], 'bg-lilac text-brand'], ['Elegido', ['Contratado'], 'bg-mint text-ok'], ['No seleccionado', ['Descartado'], 'bg-surface text-ink-soft']]
          .filter(([, st]) => count(st)).map(([l, st, cls]) => `<span class="rounded-full px-3 py-1 font-semibold ${cls}">${count(st)} ${l.toLowerCase()}</span>`).join('')}
      </div>` : ''}
      <div class="mt-5 grid gap-4 md:grid-cols-2 items-start" id="ma-cards">
        ${cards.length ? cards.join('') : `<div class="md:col-span-2 grid">${emptyState('ph-paper-plane-tilt', 'Todavía no tenés postulaciones', 'Cuando envíes tu CV a una vacante, acá vas a ver si lo leyeron, si seguís en proceso o si sos finalista.', '<div class="flex flex-wrap justify-center gap-2"><a href="#/vacantes" class="btn btn-primary">Buscar vacantes</a><button type="button" id="cl-demo-apps" class="btn btn-outline">Ver un ejemplo</button></div>')}</div>`}
      </div>
      <section class="mt-12 pt-6 border-t border-line flex flex-col sm:flex-row sm:items-center gap-3 justify-between" aria-label="Tus datos">
        <div><p class="font-semibold flex items-center gap-2"><i class="ph ph-shield-check text-lg text-ink-soft"></i>Tus datos</p>
          <p class="text-ink-mute text-[0.92rem]">Podés borrar tu CV, tus postulaciones y tus datos de contacto cuando quieras.</p></div>
        <button type="button" id="ma-erase" class="btn btn-outline btn-sm text-bad border-bad/30 hover:bg-bad/5 shrink-0"><i class="ph-bold ph-trash"></i>Borrar mis datos</button>
      </section>
    </div>`;
    return {
      html, mount() {
        $('#cl-out').onclick = async () => { if (await askConfirm({ title: '¿Salir de tu cuenta?', text: 'Para volver a ver tus postulaciones vas a ingresar con un código por WhatsApp.', ok: 'Salir', icon: 'ph-sign-out' })) { Store.logoutCandidate(); render(); } };
        $('#ma-erase').onclick = eraseMyData;
        // Borrar del historial una postulación ya cerrada (resultado final o búsqueda cerrada)
        $('#ma-cards').addEventListener('click', async e => {
          const b = e.target.closest('[data-app-del]'); if (!b) return;
          const a = Store.myApps().find(x => x.id === b.dataset.appDel); if (!a) return;
          const j = Store.job(a.jobId) || {};
          const ok = await askConfirm({ title: '¿Borrar esta postulación?', text: `Se borra de tu historial ${j.title ? `la postulación a ${j.title}` : 'esta postulación'}, junto con tu CV y tus datos en ${j.company || 'la empresa'}. No se puede deshacer.`, ok: 'Borrar', danger: true, icon: 'ph-trash' });
          if (!ok) return;
          await Store.removeApps([a.id]);
          const cand = Store.candidate() || {}, at = new Date().toISOString();
          Store.addDelReq({ id: 'dr' + Date.now().toString(36), name: cand.name || a.name, phone: cand.phone || a.phone || '', email: a.email || '', at, due: at, status: 'completado', doneAt: at, origin: 'cuenta', company: j.company || '', result: `1 postulación${j.title ? ` (${j.title})` : ''}` });
          toast('Borraste la postulación', 'ph-trash'); render();
        });
        const d = $('#cl-demo-apps'); if (d) d.onclick = () => { seedCandApps(); render(); };
        // Las novedades quedan vistas (se siguen resaltando hasta salir de la página)
        Store.markCandSeen(apps.map(a => a.id));
        renderTop('candidate', '/postulaciones'); renderBottom('candidate', '/postulaciones');
      }
    };
  }

  /* ================= ALERTAS Y NOTIFICACIONES (Fedfu) =================
     El candidato activa una alerta con su búsqueda; cuando se publica una vacante que encaja, Fedfu le avisa
     en "Notificaciones" (y en producción por WhatsApp). Ahí también aparecen las novedades de sus postulaciones. */
  const alertLabel = p => `${areaOf(p.area).label}${p.province && p.province !== 'any' ? ` en ${p.province}` : ' en todo el país'}${p.modality && p.modality !== 'any' ? ` · ${p.modality}` : ''}`;
  const sameAlert = (a, p) => a.profile.area === p.area && a.profile.province === p.province && (a.profile.modality || 'any') === (p.modality || 'any');
  // Revisa las alertas activas y crea los avisos de vacantes nuevas que encajan
  function checkAlerts(opts = {}) {
    if (!Store.candidate()) return 0;
    const al = Store.alerts().filter(a => a.active !== false); if (!al.length) return 0;
    const have = new Set(Store.notifs().filter(n => n.type === 'job').map(n => n.alertId + '|' + n.jobId));
    const now = new Date().toISOString(), out = [];
    al.forEach(a => Store.activeJobs().forEach(j => {
      if (j.postedAt <= a.since || have.has(a.id + '|' + j.id) || !isForYou(j, a.profile)) return;
      out.push({ id: 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), type: 'job', alertId: a.id, jobId: j.id, at: j.postedAt > a.createdAt ? now : a.createdAt, first: j.postedAt < a.createdAt });
      have.add(a.id + '|' + j.id);
    }));
    Store.addNotifs(out);
    const fresh = out.filter(n => !n.first).length;
    if (fresh && !opts.silent) setTimeout(() => toast(`${fresh === 1 ? 'Hay 1 vacante nueva' : `Hay ${fresh} vacantes nuevas`} para tu alerta`, 'ph-bell-ringing'), 600);
    return out.length;
  }
  // Formulario para crear una alerta: rubro, provincia, modalidad y palabra clave (reemplaza al chat)
  function openAlertForm(onDone) {
    const p0 = Store.profile() || {};
    const opt = (list, cur) => list.map(([v, l]) => `<option value="${esc(v)}" ${v === cur ? 'selected' : ''}>${esc(l)}</option>`).join('');
    const body = `<h2 class="text-[1.6rem] font-extrabold pr-10 leading-tight">Crear una alerta</h2>
      <p class="text-ink-soft mt-1">Te avisamos acá y por WhatsApp cuando se publique una vacante que encaje.</p>
      <div class="mt-5 space-y-4">
        <div><label class="label" for="af-area">Rubro</label><select id="af-area" class="input"><option value="">Elegí un rubro</option>${opt(AREAS.map(a => [a.id, a.label]), p0.area)}</select></div>
        <div><label class="label" for="af-prov">Provincia</label><select id="af-prov" class="input">${opt([['any', 'Todo el país'], ...PROVINCES.map(x => [x, x])], p0.province || 'any')}</select></div>
        <div><label class="label" for="af-mod">Modalidad</label><select id="af-mod" class="input">${opt([['any', 'Cualquiera'], ...MODALITIES.map(m => [m, m])], p0.modality || 'any')}</select></div>
        <div><label class="label" for="af-q">Puesto o palabra clave <span class="font-normal text-ink-mute">(opcional)</span></label><input id="af-q" class="input" placeholder="Ej: recepcionista, chofer, contable" value="${esc(p0.roleText || '')}"></div>
      </div>
      <p id="af-err" class="err hidden"></p>`;
    openSheet(sheetScroll(body) + sheetFoot('<button id="af-save" class="btn btn-primary w-full h-14"><i class="ph-bold ph-bell-ringing text-xl"></i>Crear alerta</button>'), c => {
      $('#af-save', c).onclick = () => {
        const area = $('#af-area', c).value;
        if (!area) { const e = $('#af-err', c); e.textContent = 'Elegí un rubro.'; e.classList.remove('hidden'); return; }
        const prof = { area, province: $('#af-prov', c).value, modality: $('#af-mod', c).value, roleText: $('#af-q', c).value.trim(), seniority: p0.seniority || '', skills: p0.skills || [], comps: p0.comps || [] };
        Store.setProfile({ ...p0, ...prof });
        closeSheet(true);
        createAlert(prof, () => { if (onDone) onDone(); else if (parseHash().path === '/notificaciones') refresh(); else location.hash = '#/notificaciones'; });
      };
    });
  }
  function createAlert(profile, onDone) {
    if (!profile) { openAlertForm(onDone); return; }
    if (!Store.candidate()) return openCandLogin(() => { closeSheet(true); createAlert(profile, onDone); }, { title: 'Ingresá para activar la alerta', sub: `Te avisamos por WhatsApp cuando aparezca una vacante de <b class="text-ink">${esc(alertLabel(profile))}</b>. Es un paso solo, sin contraseñas.` });
    if (Store.alerts().some(a => sameAlert(a, profile))) { toast('Ya tenés una alerta para esta búsqueda', 'ph-bell'); onDone && onDone(); return; }
    const now = new Date();
    const id = 'al' + now.getTime().toString(36);
    // Incluye lo publicado en los últimos 3 días para que el primer aviso no llegue vacío
    Store.addAlert({ id, profile: { area: profile.area, province: profile.province, modality: profile.modality, seniority: profile.seniority, roleText: profile.roleText, skills: profile.skills || [], comps: profile.comps || [] },
      label: alertLabel(profile), createdAt: now.toISOString(), since: new Date(now - 3 * 864e5).toISOString(), active: true });
    Store.addNotifs([{ id: 'n' + id, type: 'info', alertId: id, at: new Date(now - 1000).toISOString(), text: `Listo, activamos tu alerta de <b>${esc(alertLabel(profile))}</b>. Te avisamos por WhatsApp al ${esc(Store.candidate().phone)} apenas se publique una vacante que encaje.` }]);
    checkAlerts({ silent: true });
    toast('Alerta activada. Te avisamos por WhatsApp', 'ph-bell-ringing');
    // Actualiza el menú (el contador de notificaciones); en el chat no hay menú
    const pth = parseHash().path;
    if (pth !== '/chat') { renderTop(pth === '/' ? 'home' : 'candidate', pth); if (pth !== '/') renderBottom('candidate', pth); }
    onDone && onDone();
  }
  // Todas las novedades: avisos de alertas + cambios en las postulaciones
  function notifFeed() {
    if (!Store.candidate()) return [];
    const items = Store.notifs().map(n => ({ ...n }));
    const stTxt = { 'En revisión': 'seguís en proceso', 'Entrevista': '¡te quieren entrevistar!', 'Terna': 'sos finalista', 'Contratado': '¡te eligieron!', 'Descartado': 'esta vez no seguís en el proceso' };
    Store.myApps().forEach(a => {
      const j = Store.job(a.jobId); if (!j) return;
      if (a.readAt) items.push({ id: a.id + 'r', type: 'app', appId: a.id, jobId: j.id, at: a.readAt, text: `Leyeron tu CV para <b>${esc(j.title)}</b> en ${esc(j.company)}.` });
      if (a.interview && a.interview.setAt) items.push({ id: a.id + 'iv' + a.interview.setAt, type: 'app', appId: a.id, jobId: j.id, at: a.interview.setAt, text: `Tenés entrevista para <b>${esc(j.title)}</b> el ${esc(ivLong(a.interview.at).toLowerCase())} a las ${ivTime(a.interview.at)} h.` });
      (a.history || []).slice(1).forEach(h => { if (stTxt[h.st]) items.push({ id: a.id + h.at, type: 'app', appId: a.id, jobId: j.id, at: h.at, st: h.st, text: `Novedad en <b>${esc(j.title)}</b>: ${stTxt[h.st]}.` }); });
    });
    { const me = String(Store.candidate().phone || '').replace(/\D/g, '').slice(-10);
      if (me) Store.referrals().filter(r => r.status === 'pendiente' && String(r.person.phone || '').replace(/\D/g, '').slice(-10) === me).forEach(r => {
        const j = Store.job(r.jobId); if (j && j.status === 'activa') items.push({ id: 'ref' + r.id, type: 'ref', refId: r.id, at: r.createdAt, text: `<b>${esc(r.from)}</b> quiere recomendarte a ${esc(r.to)} para <b>${esc(j.title)}</b>. ¿Les das permiso?` });
      }); }
    const cl = Store.notifClearedAt();
    return items.filter(n => !cl || n.at > cl).sort((x, y) => y.at.localeCompare(x.at));
  }
  const notifUnread = () => { const seen = Store.notifSeenAt(); return notifFeed().filter(n => n.at > seen).length; };

  function Notifs() {
    const cand = Store.candidate();
    if (!cand) return {
      html: `<div class="max-w-md mx-auto px-4 sm:px-6 py-8 md:py-12">
        <a href="#/" class="inline-flex items-center gap-1.5 font-semibold text-ink-soft hover:text-ink"><i class="ph-bold ph-arrow-left"></i>Volver a inicio</a>
        <div class="mt-6">${CandLoginCard({ title: 'Ingresá para ver tus avisos', sub: 'Te avisamos cuando aparece una vacante para vos y cuando hay novedades en tus postulaciones.' })}</div></div>`,
      mount() { bindCandLogin(() => render()); }
    };
    checkAlerts({ silent: true });
    const seen = Store.notifSeenAt(), feed = notifFeed(), alerts = Store.alerts(), p = Store.profile();
    const nNew = feed.filter(n => n.at > seen).length;
    const item = n => {
      const unread = n.at > seen, j = n.jobId ? Store.job(n.jobId) : null;
      const al = n.alertId ? alerts.find(a => a.id === n.alertId) : null;
      let body = '';
      if (n.type === 'job' && j) {
        body = `<p>${n.first ? 'Esta se publicó hace poco y encaja con' : 'Encontré una vacante nueva para'} tu alerta <b>${esc(al ? al.label : '')}</b>:</p>
          <div class="mt-2.5 rounded-[14px] border border-line bg-white p-3 flex flex-wrap sm:flex-nowrap items-center gap-3">
            ${logo(j.company, 'w-10 h-10 text-[0.75rem]')}
            <button type="button" data-open-job="${j.id}" class="min-w-0 flex-1 text-left"><span class="block font-semibold leading-tight truncate hover:text-brand">${esc(j.title)}</span><span class="block text-[0.88rem] text-ink-mute truncate">${esc(j.company)} · ${esc(j.province)}${j.salary ? ` · ${esc(j.salary)}` : ''}</span></button>
            ${Store.hasApplied(j.id) ? '<span class="text-ok text-[0.88rem] font-bold shrink-0"><i class="ph-bold ph-check"></i> Postulado</span>' : `<button type="button" data-apply-job="${j.id}" class="btn btn-primary btn-sm shrink-0 px-3 w-full sm:w-auto justify-center">Postularme</button>`}
          </div>`;
      } else if (n.type === 'app') {
        body = `<p>${n.text}</p><a href="#/postulaciones" class="mt-1.5 inline-flex items-center gap-1 font-semibold text-brand text-[0.95rem]">Ver el avance<i class="ph-bold ph-arrow-right"></i></a>`;
      } else if (n.type === 'ref') {
        body = `<p>${n.text}</p><a href="#/recomendacion?id=${n.refId}" class="mt-1.5 inline-flex items-center gap-1 font-semibold text-brand text-[0.95rem]">Responder<i class="ph-bold ph-arrow-right"></i></a>`;
      } else body = `<p>${n.text || ''}</p>`;
      return `<li class="flex gap-3">
        <span class="hidden sm:block">${fedfu('w-10 h-10 mt-0.5')}</span>
        <div class="min-w-0 flex-1 rounded-[20px] rounded-tl-md p-3.5 sm:p-4 ${unread ? 'bg-brand-soft/60 ring-1 ring-brand/25' : 'bg-white border border-line'}">
          <div class="flex items-center gap-1.5 text-[0.85rem] text-ink-mute mb-1 whitespace-nowrap"><span class="sm:hidden">${fedfu('w-6 h-6')}</span><span class="font-semibold text-ink">+Humanos</span><span>· ${ago(n.at)}</span>${n.type !== 'info' ? '<span class="inline-flex items-center gap-1" title="También te avisamos por WhatsApp"><i class="ph-fill ph-whatsapp-logo text-[#25D366]"></i><span class="hidden sm:inline">también por WhatsApp</span></span>' : ''}${unread ? '<span class="ml-auto w-2 h-2 rounded-full bg-brand" aria-label="Sin leer"></span>' : ''}</div>
          ${body}
        </div></li>`;
    };
    const html = `<div class="max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-12">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div class="flex items-center gap-3">${fedfu('w-14 h-14')}<div><h1 class="text-[2rem] sm:text-[2.4rem] leading-tight font-extrabold">Notificaciones</h1>
          <p class="text-ink-soft">${nNew ? `<b class="text-brand">${nNew} nueva${nNew === 1 ? '' : 's'}</b> · ` : ''}Te avisamos acá y por WhatsApp.</p></div></div>
        ${feed.length ? `<button type="button" id="nt-clear" class="btn btn-outline btn-sm"><i class="ph ph-trash text-lg"></i>Borrar todas</button>` : ''}
      </div>
      <div class="mt-8 grid lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-8 items-start">
        <section aria-label="Avisos">
          ${feed.length ? `<ul class="space-y-4">${feed.map(item).join('')}</ul>`
            : `<div class="card p-6 text-center">${fedfu('w-16 h-16 mx-auto')}<p class="mt-3 font-bold text-lg">${Store.notifClearedAt() ? 'No tenés notificaciones' : 'Todavía no tenés avisos'}</p><p class="text-ink-soft mt-1">${alerts.some(a => a.active !== false) ? 'Te aviso acá y por WhatsApp apenas aparezca algo nuevo.' : 'Creá una alerta y te avisamos cuando aparezca una vacante para vos.'}</p></div>`}
        </section>
        <aside class="lg:sticky lg:top-24">
          <div class="card p-5">
            <h2 class="text-xl font-extrabold flex items-center gap-2"><i class="ph-fill ph-bell-ringing text-brand"></i>Tus alertas</h2>
            ${alerts.length ? `<ul class="mt-3 divide-y divide-line">${alerts.map(a => `<li class="py-3 flex items-center gap-3">
                <span class="w-10 h-10 rounded-xl ${a.active !== false ? 'bg-brand-soft text-brand' : 'bg-surface text-ink-mute'} grid place-items-center shrink-0"><i class="ph-fill ${a.active !== false ? 'ph-bell' : 'ph-bell-slash'} text-lg"></i></span>
                <div class="min-w-0 flex-1"><p class="font-semibold leading-tight">${esc(a.label)}</p><p class="text-[0.88rem] text-ink-mute">${a.active !== false ? `WhatsApp al ${esc(cand.phone)}` : 'Pausada'}</p></div>
                <button type="button" class="btn btn-sm btn-outline px-3" data-al-toggle="${a.id}">${a.active !== false ? 'Pausar' : 'Activar'}</button>
                <button type="button" class="icon-btn w-9 h-9 text-ink-mute hover:text-bad" data-al-del="${a.id}" aria-label="Borrar alerta ${esc(a.label)}"><i class="ph ph-trash"></i></button></li>`).join('')}</ul>`
              : '<p class="mt-2 text-ink-soft">No tenés alertas activas.</p>'}
            <div class="mt-4 flex flex-wrap gap-2">
              ${p && !alerts.some(a => sameAlert(a, p)) ? `<button type="button" id="al-mine" class="btn btn-primary btn-sm"><i class="ph-bold ph-bell-ringing"></i>Alerta para ${esc(alertLabel(p))}</button>` : ''}
              <button type="button" data-alert-new class="btn btn-soft btn-sm"><i class="ph ph-plus"></i>${alerts.length ? 'Otra alerta' : 'Crear una alerta'}</button>
            </div>
          </div>
        </aside>
      </div>
    </div>`;
    return {
      html, mount() {
        const v = $('#view');
        v.onclick = (e => {
          const t = e.target.closest('[data-al-toggle]'); if (t) { const a = Store.alerts().find(x => x.id === t.dataset.alToggle); Store.updateAlert(a.id, { active: a.active === false, since: a.active === false ? new Date().toISOString() : a.since }); toast(a.active === false ? 'Alerta activada' : 'Alerta pausada', 'ph-bell'); render({ keep: true }); return; }
          const d = e.target.closest('[data-al-del]'); if (d) { askConfirm({ title: '¿Borrar esta alerta?', text: 'Dejás de recibir avisos de esa búsqueda. Si solo querés frenarlos un tiempo, pausala.', ok: 'Borrar alerta', danger: true }).then(ok => { if (ok) { Store.removeAlert(d.dataset.alDel); render({ keep: true }); } }); return; }
        });
        const m = $('#al-mine'); if (m) m.onclick = () => createAlert(Store.profile(), () => render({ keep: true }));
        const cl = $('#nt-clear'); if (cl) cl.onclick = async () => {
          if (!(await askConfirm({ title: '¿Borrar todas las notificaciones?', text: 'Tus alertas siguen activas y los avisos nuevos van a seguir llegando.', ok: 'Borrar todas', danger: true }))) return;
          Store.clearNotifs(); toast('Notificaciones borradas', 'ph-trash'); render({ keep: true });
        };
        // Quedan leídas (se siguen resaltando hasta salir de la página)
        Store.markNotifsSeen();
        renderTop('candidate', '/notificaciones'); renderBottom('candidate', '/notificaciones');
      }
    };
  }

  /* ================= VISTAS: EMPRESA ================= */

  function CoLogin(params) {
    if (params && params.get('crear')) S.coAuth = 'signup';
    const tab = S.coAuth === 'signup' ? 'signup' : 'login';
    const pw = (id, ph, ac) => `<div class="relative"><input id="${id}" type="password" class="input pr-14" placeholder="${ph}" autocomplete="${ac}">
      <button type="button" class="absolute right-2 top-1/2 -translate-y-1/2 icon-btn w-10 h-10 text-ink-mute" data-pw="${id}" aria-label="Mostrar contraseña"><i class="ph ph-eye text-xl"></i></button></div>`;
    const tabs = `<div class="grid grid-cols-2 rounded-full bg-surface p-1" role="tablist">
      ${[['login', 'Ingresar'], ['signup', 'Crear cuenta']].map(([k, l]) => `<button type="button" role="tab" data-auth="${k}" aria-selected="${tab === k}" class="h-11 rounded-full font-semibold ${tab === k ? 'bg-white shadow-card text-ink' : 'text-ink-soft hover:text-ink'}">${l}</button>`).join('')}</div>`;
    const login = `<form id="co-login" class="mt-6" novalidate>
        <h2 class="text-2xl font-extrabold tracking-tight">Ingresá a tu panel</h2>
        <label class="label mt-5" for="co-email">Email</label>
        <input id="co-email" type="email" inputmode="email" class="input" placeholder="busquedas@tuempresa.com" autocomplete="username">
        <div class="mt-5 flex items-baseline justify-between"><label class="label !mb-0" for="co-pass">Contraseña</label><button type="button" id="co-forgot" class="text-[0.92rem] font-semibold text-brand">¿La olvidaste?</button></div>
        <div class="mt-1.5">${pw('co-pass', 'Tu contraseña', 'current-password')}</div>
        <p id="co-err" class="err hidden"></p>
        <button class="btn btn-primary w-full h-14 text-lg mt-6">Ingresar</button>
      </form>`;
    const signup = `<form id="co-signup" class="mt-6" novalidate>
        <h2 class="text-2xl font-extrabold tracking-tight">Creá tu cuenta</h2>
        <p class="text-ink-soft mt-1">Empezás con 1 búsqueda activa sin costo.</p>
        <label class="label mt-5" for="cs-name">Nombre de la empresa o consultora</label>
        <input id="cs-name" class="input" placeholder="Ej: Talento Norte" autocomplete="organization" maxlength="60">
        <p class="label mt-5">Tipo de cuenta</p>
        <div class="grid grid-cols-2 gap-2">
          ${['Consultora', 'Empresa'].map((t, i) => `<label class="cursor-pointer"><input type="radio" name="cs-type" value="${t}" class="peer sr-only" ${i ? '' : 'checked'}>
            <span class="flex items-center justify-center gap-2 h-12 rounded-xl border border-line font-semibold peer-checked:border-brand peer-checked:bg-brand-soft peer-checked:text-brand"><i class="ph ${i ? 'ph-buildings' : 'ph-users-three'} text-xl"></i>${t}</span></label>`).join('')}
        </div>
        <p class="text-ink-mute text-[0.88rem] mt-1.5">Consultora: hacés búsquedas para empresas cliente. Empresa: buscás para tu propio equipo.</p>
        <label class="label mt-5" for="cs-email">Email de trabajo</label>
        <input id="cs-email" type="email" inputmode="email" class="input" placeholder="busquedas@tuempresa.com" autocomplete="email">
        <label class="label mt-5" for="cs-pass">Contraseña</label>
        ${pw('cs-pass', 'Mínimo 8 caracteres', 'new-password')}
        <label class="mt-5 flex gap-3 items-start cursor-pointer"><input type="checkbox" id="cs-terms" class="w-5 h-5 mt-0.5 accent-[#3B5BFD] shrink-0">
          <span class="text-ink-soft text-[0.95rem]">Acepto los términos y la política de datos personales (Ley 25.326).</span></label>
        <p id="cs-err" class="err hidden"></p>
        <button class="btn btn-primary w-full h-14 text-lg mt-6">Crear cuenta</button>
      </form>`;
    return {
      html: `<div class="max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-14 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <span class="inline-flex items-center gap-2 text-brand font-semibold bg-brand-soft rounded-full px-3 py-1 text-[0.95rem]"><i class="ph-fill ph-buildings"></i>Para consultoras y empresas</span>
          <h1 class="mt-4 text-[2.1rem] sm:text-5xl leading-[1.08] font-extrabold tracking-tight">Encontrá a tu próximo talento sin vueltas.</h1>
          <ul class="mt-6 space-y-3 text-lg">
            ${[['ph-lightning', 'Publicá una búsqueda en 2 minutos'], ['ph-file-pdf', 'Recibí CVs en PDF y calificalos'], ['ph-list-checks', 'Compartí la terna con tu cliente con un link'], ['ph-whatsapp-logo', 'Contactá por WhatsApp o email en un toque']]
              .map(([ic, t]) => `<li class="flex items-center gap-3"><span class="w-10 h-10 rounded-full bg-white border border-line grid place-items-center text-brand shrink-0"><i class="ph-fill ${ic} text-xl"></i></span>${t}</li>`).join('')}
          </ul>
          ${BILLING ? '<a href="#/empresa/planes" class="mt-6 inline-flex items-center gap-1.5 font-semibold text-brand hover:underline underline-offset-4"><i class="ph ph-tag"></i>Ver planes y precios</a>' : ''}
        </div>
        <div class="card p-5 sm:p-7 order-first md:order-none">
          ${tabs}
          ${tab === 'login' ? login : signup}
          <div class="flex items-center gap-3 my-5 text-ink-mute"><span class="h-px bg-line flex-1"></span>o<span class="h-px bg-line flex-1"></span></div>
          <button type="button" id="co-demo" class="btn btn-outline w-full h-14"><i class="ph ph-play-circle text-xl"></i>Probar cuenta demo</button>
          <p class="mt-3 text-ink-mute text-[0.88rem]">Demo: talento@demo.com.ar · demo1234. Prototipo: las cuentas se guardan solo en este navegador.</p>
        </div>
      </div>`,
      mount() {
        const err = (id, t) => { const e = $(id); e.textContent = t; e.classList.toggle('hidden', !t); };
        $$('[data-auth]').forEach(b => b.onclick = () => { S.coAuth = b.dataset.auth; render({ keep: true }); });
        $$('[data-pw]').forEach(b => b.onclick = () => { const i = $('#' + b.dataset.pw), show = i.type === 'password'; i.type = show ? 'text' : 'password'; b.innerHTML = `<i class="ph ${show ? 'ph-eye-slash' : 'ph-eye'} text-xl"></i>`; b.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña'); });
        const enter = acc => { Store.setCompany({ name: acc.name, type: acc.type, email: acc.email }); S.coAuth = 'login'; toast(`Hola, ${acc.name}`, 'ph-hand-waving'); render(); };
        $('#co-demo').onclick = () => enter({ name: 'Talento Norte', type: 'Consultora', email: 'talento@demo.com.ar' });
        const fl = $('#co-login');
        if (fl) {
          $('#co-forgot').onclick = () => { const em = $('#co-email').value.trim(); toast(em ? `Te mandamos un link a ${em} para crear una contraseña nueva` : 'Escribí tu email y te mandamos un link', 'ph-envelope-simple'); };
          fl.onsubmit = e => {
            e.preventDefault();
            const em = $('#co-email').value.trim().toLowerCase(), pass = $('#co-pass').value;
            if (!/^\S+@\S+\.\S+$/.test(em)) { err('#co-err', 'Escribí un email válido.'); return; }
            const acc = Store.coAccount(em);
            if (!acc) { err('#co-err', 'No encontramos una cuenta con ese email.'); $('#co-err').insertAdjacentHTML('beforeend', ' <button type="button" class="font-semibold text-brand underline" data-auth-go>Crear una cuenta</button>'); $('[data-auth-go]').onclick = () => { S.coAuth = 'signup'; render({ keep: true }); }; return; }
            if (acc.pass !== Store.passHash(pass)) { err('#co-err', 'La contraseña no es correcta.'); return; }
            enter({ ...acc, email: em });
          };
        }
        const fs = $('#co-signup');
        if (fs) fs.onsubmit = e => {
          e.preventDefault();
          const name = $('#cs-name').value.trim(), em = $('#cs-email').value.trim().toLowerCase(), pass = $('#cs-pass').value, type = $('input[name="cs-type"]:checked').value;
          if (name.length < 2) { err('#cs-err', 'Escribí el nombre de tu empresa o consultora.'); return; }
          if (!/^\S+@\S+\.\S+$/.test(em)) { err('#cs-err', 'Escribí un email válido.'); return; }
          if (Store.coAccount(em)) { err('#cs-err', 'Ya hay una cuenta con ese email. Ingresá desde "Ingresar".'); return; }
          if (pass.length < 8) { err('#cs-err', 'La contraseña tiene que tener al menos 8 caracteres.'); return; }
          if (!$('#cs-terms').checked) { err('#cs-err', 'Para crear la cuenta tenés que aceptar los términos.'); return; }
          Store.addCoAccount(em, { name, type, pass: Store.passHash(pass), createdAt: new Date().toISOString() });
          if (!Store.coProfile(name).contactEmail) Store.saveCoProfile(name, { contactEmail: em });
          enter({ name, type, email: em });
        };
      }
    };
  }


  const myJobs = co => Store.jobs().filter(j => j.company === co.name);
  const statusPill = st => {
    const m = { 'Nuevo': 'bg-brand-soft text-brand', 'En revisión': 'bg-warn/10 text-warn', 'Entrevista': 'bg-ok/10 text-ok', 'Terna': 'bg-lilac text-brand', 'Contratado': 'bg-ok text-white', 'Descartado': 'bg-surface text-ink-mute' };
    return `<span class="inline-flex items-center rounded-full px-2.5 py-0.5 font-bold text-[0.85rem] ${m[st] || m.Nuevo}">${st}</span>`;
  };

  /* ================= PLANES Y VACANTES DESTACADAS =================
     Dos planes en dólares: Básico (hasta 5 búsquedas activas) y Pro (ilimitadas, 5 destacadas y base de datos de +Humanos).
     Las cuentas nuevas arrancan con TRIAL_DAYS días de prueba de Pro. Sitio web opcional: pago único.
     El pago es simulado (en producción: checkout de Mercado Pago o Stripe). */
  const ars = n => '$' + (n || 0).toLocaleString('es-AR');
  const usd = n => 'US$' + (n || 0).toLocaleString('es-AR');
  const money = x => x.cur === 'USD' ? usd(x.amount) : ars(x.amount);
  const fmtDate = iso => new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
  const daysLeft = iso => Math.max(0, Math.ceil((new Date(iso) - Date.now()) / 864e5));
  const plural = (n, a, b) => n === 1 ? a : b;
  const LEGACY_PLAN = { empresa: 'pro', gratis: 'vencido' };
  const planById = id => { id = LEGACY_PLAN[id] || id; return PLANS.find(p => p.id === id) || (id === 'vencido' ? EXPIRED_PLAN : PLANS[0]); };
  const planOf = co => BILLING ? planById(Store.planInfo(co.name).id) : FREE_PLAN;
  const nextPlan = pl => pl.id === 'vencido' ? PLANS[0] : PLANS.find(x => x.active > pl.active);
  const unlimited = n => n === Infinity;
  const activeLabel = pl => unlimited(pl.active) ? 'Búsquedas ilimitadas' : `Hasta ${pl.active} ${plural(pl.active, 'búsqueda activa', 'búsquedas activas')}`;
  const SALES_WA = '5493815550000';
  const PAY_METHODS = [['mp', 'Mercado Pago', 'ph-wallet', 'Pagás en pesos al tipo de cambio del día'], ['card', 'Tarjeta de crédito o débito', 'ph-credit-card', 'Visa, Mastercard, Amex'], ['transfer', 'Transferencia bancaria', 'ph-bank', 'En pesos o dólares · se acredita en 1 día hábil']];
  function usageOf(co) {
    const act = myJobs(co).filter(j => j.status === 'activa');
    return { active: act.length, featPlan: act.filter(j => j.featured && j.featured.source === 'plan').length, featAll: act.filter(j => Store.isFeatured(j)).length };
  }
  // Si el plan incluye menos destacadas que las usadas (cambio de plan, prueba vencida), se quitan las más nuevas
  function trimPlanFeatured(co) {
    const pl = planOf(co);
    myJobs(co).filter(j => j.featured && j.featured.source === 'plan' && j.status === 'activa')
      .sort((a, b) => (a.featured.since || '').localeCompare(b.featured.since || '')).slice(pl.feat)
      .forEach(j => Store.setFeatured(j.id, null));
  }
  // ¿Puede tener una búsqueda activa más? Si no, ofrece pausar o mejorar el plan
  function canActivate(co, what = 'publicar') {
    if (usageOf(co).active < planOf(co).active) return true;
    openLimitSheet(co, what);
    return false;
  }
  function openLimitSheet(co, what) {
    const pl = planOf(co), u = usageOf(co), expired = pl.id === 'vencido';
    const opt = p => `<button type="button" data-lim-plan="${p.id}" class="w-full text-left rounded-[22px] ${p.color} p-5 hover:brightness-[.98]">
        <span class="flex items-baseline justify-between gap-3"><span class="font-display text-[1.35rem] font-extrabold">Plan ${p.name}</span><span class="font-display text-[1.35rem] font-extrabold whitespace-nowrap">${usd(p.price)}<span class="text-[0.9rem] font-semibold text-ink-soft"> /mes</span></span></span>
        <span class="block mt-1 text-ink-soft">${activeLabel(p)}${p.feat ? ` · ${p.feat} destacadas · base de datos de +Humanos` : ''}</span></button>`;
    const body = expired ? `
      <div class="w-14 h-14 rounded-full bg-sun-soft text-warn grid place-items-center"><i class="ph-fill ph-hourglass-low text-3xl"></i></div>
      <h2 class="mt-4 text-[1.6rem] leading-tight font-extrabold pr-10">Tu prueba gratis terminó</h2>
      <p class="mt-2 text-ink-soft">Para ${what === 'reactivar' ? 'reactivar búsquedas' : 'publicar'}, elegí un plan. Tus búsquedas, postulantes y notas siguen guardados.</p>
      <div class="mt-5 grid gap-3">${PLANS.map(opt).join('')}</div>` : `
      <div class="w-14 h-14 rounded-full bg-sun-soft text-warn grid place-items-center"><i class="ph-fill ph-gauge text-3xl"></i></div>
      <h2 class="mt-4 text-[1.6rem] leading-tight font-extrabold pr-10">Llegaste al límite de tu plan ${pl.name}</h2>
      <p class="mt-2 text-ink-soft">Tenés ${u.active} ${plural(u.active, 'búsqueda activa', 'búsquedas activas')} y tu plan permite ${pl.active}. Para ${what === 'reactivar' ? 'reactivar esta' : 'publicar otra'}, pausá una o pasá a Pro, con búsquedas ilimitadas. No se borra nada.</p>
      <div class="mt-5">${opt(PLANS.find(p => p.id === 'pro'))}</div>`;
    const foot = expired ? `<a href="#/empresa/planes" class="btn btn-outline h-14 w-full" data-close-sheet>Ver los planes</a>`
      : `<button id="lim-pause" class="btn btn-outline h-14 px-4 flex-1 min-w-0">Pausar una</button><button data-lim-plan="pro" class="btn btn-primary h-14 px-4 flex-[1.4] min-w-0">Pasar a Pro</button>`;
    openSheet(sheetScroll(body) + sheetFoot(foot), c => {
      const lp = $('#lim-pause', c); if (lp) lp.onclick = () => { closeSheet(true); if (parseHash().path !== '/empresa/busquedas') location.hash = '#/empresa/busquedas'; toast('Tocá “Pausar” en la búsqueda que quieras liberar', 'ph-pause-circle'); };
      $$('[data-lim-plan]', c).forEach(b => b.onclick = () => choosePlan(b.dataset.limPlan));
    });
  }

  // Checkout simulado. onPaid() aplica la compra y devuelve { title, text } para la pantalla de éxito
  function openCheckout({ title, sub, amount, period = '', onPaid }) {
    const co = Store.company();
    const body = `
      <h2 class="text-[1.6rem] font-extrabold pr-10">Confirmar pago</h2>
      <div class="mt-4 rounded-[22px] bg-surface p-4 sm:p-5">
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0"><p class="font-display text-lg font-bold leading-tight">${esc(title)}</p><p class="text-ink-soft mt-0.5">${esc(sub)}</p></div>
          <p class="shrink-0 text-right"><span class="block font-display text-[1.6rem] font-extrabold leading-none">${usd(amount)}</span><span class="text-ink-mute text-[0.9rem]">${period || 'pago único'}</span></p>
        </div>
        <p class="mt-3 pt-3 border-t border-line text-ink-mute text-[0.92rem]">Precio en dólares. Factura a nombre de ${esc(co.name)}.${period ? ' Cancelás cuando quieras.' : ''}</p>
      </div>
      <p class="label mt-6">Medio de pago</p>
      <div class="space-y-2">${PAY_METHODS.map(([id, l, ic, d], i) => `<label class="cursor-pointer block"><input type="radio" name="pay" value="${id}" class="peer sr-only" ${i ? '' : 'checked'}>
        <span class="flex items-center gap-3 rounded-2xl border border-line p-3.5 peer-checked:border-brand peer-checked:bg-brand-soft/60 peer-focus-visible:ring-2 peer-focus-visible:ring-brand/40">
          <span class="w-11 h-11 rounded-xl bg-white border border-line grid place-items-center text-brand shrink-0"><i class="ph-fill ${ic} text-2xl"></i></span>
          <span class="min-w-0"><span class="block font-semibold">${l}</span><span class="block text-ink-mute text-[0.92rem]">${d}</span></span></span></label>`).join('')}</div>
      <p class="mt-4 flex gap-2 text-ink-mute text-[0.92rem]"><i class="ph ph-info text-lg shrink-0 mt-0.5"></i>Prototipo: es un pago de prueba y no se cobra nada.</p>`;
    const foot = `<button id="pay-btn" class="btn btn-primary w-full h-14 text-lg"><i class="ph-fill ph-lock-simple text-xl"></i>Pagar ${usd(amount)}</button>`;
    openSheet(sheetScroll(body) + sheetFoot(foot), c => {
      const b = $('#pay-btn', c);
      b.onclick = () => {
        b.disabled = true; b.innerHTML = '<i class="ph ph-circle-notch spin text-xl"></i>Procesando pago…';
        const m = PAY_METHODS.find(x => x[0] === $('input[name="pay"]:checked', c).value);
        setTimeout(() => {
          Store.addPayment(co.name, { concept: title + (sub ? ` · ${sub}` : ''), amount, cur: 'USD', method: m[1] });
          const msg = onPaid() || {};
          S.dirty = true;
          setSheet(sheetScroll(`<div class="text-center py-8">
              <div class="success-pop w-20 h-20 mx-auto rounded-full bg-ok text-white grid place-items-center"><i class="ph-bold ph-check text-4xl"></i></div>
              <h2 class="mt-5 text-[1.6rem] leading-tight font-extrabold">${esc(msg.title || '¡Pago aprobado!')}</h2>
              <p class="mt-2 text-ink-soft max-w-sm mx-auto">${esc(msg.text || '')}</p>
              <p class="mt-4 text-ink-mute text-[0.92rem]">${usd(amount)} con ${m[1]} · comprobante en Planes y pagos</p></div>`)
            + sheetFoot('<button data-close-sheet class="btn btn-primary w-full h-14 text-lg">Listo</button>'));
        }, 1100);
      };
    });
  }

  function choosePlan(id) {
    const co = Store.company(); if (!co) { location.hash = '#/empresa?crear=1'; return; }
    const cur = planOf(co), pl = planById(id), u = usageOf(co), trial = !!Store.planInfo(co.name).trialUntil;
    if (pl.id === cur.id && !trial) return;
    if (u.active > pl.active) { toast(`Pausá ${u.active - pl.active} ${plural(u.active - pl.active, 'búsqueda', 'búsquedas')} para pasar a ${pl.name}`, 'ph-info'); return; }
    const apply = () => { Store.setPlan(co.name, pl.id); trimPlanFeatured(co); };
    openCheckout({
      title: `Plan ${pl.name}`, sub: `${activeLabel(pl)}${pl.feat ? ` · ${pl.feat} destacadas · base de datos de +Humanos` : ''}`, amount: pl.price, period: 'por mes',
      onPaid: () => { apply(); return { title: `¡Ya tenés el plan ${pl.name}!`, text: pl.base ? 'Publicá sin límite, destacá hasta 5 búsquedas y buscá candidatos en la base de datos de +Humanos.' : `Podés tener hasta ${pl.active} búsquedas activas a la vez.` }; }
    });
  }
  function openWebsite(co) {
    const text = `Hola, quiero el sitio web para mi consultora${co ? ` (${co.name})` : ''}.`;
    window.open(waLink(SALES_WA, text), '_blank', 'noopener');
  }
  // La base de datos de +Humanos ("Buscar en +Humanos") viene con Pro y con la prueba
  const hasBase = co => !!planOf(co).base;
  function openBaseUpsell(co) {
    const pro = PLANS.find(p => p.id === 'pro');
    const body = `
      <div class="w-14 h-14 rounded-full bg-brand-soft text-brand grid place-items-center"><i class="ph-fill ph-database text-3xl"></i></div>
      <h2 class="mt-4 text-[1.6rem] leading-tight font-extrabold pr-10">La base de datos de +Humanos está en el plan Pro</h2>
      <p class="mt-2 text-ink-soft">Con Pro ves a toda la gente registrada en +Humanos, aunque no se haya postulado a tus búsquedas, con su CV completo, celular y email. Además tenés búsquedas ilimitadas y 5 anuncios destacados.</p>
      <div class="mt-5"><button type="button" data-lim-plan="pro" class="w-full text-left rounded-[22px] ${pro.color} p-5 hover:brightness-[.98]">
        <span class="flex items-baseline justify-between gap-3"><span class="font-display text-[1.35rem] font-extrabold">Plan Pro</span><span class="font-display text-[1.35rem] font-extrabold whitespace-nowrap">${usd(pro.price)}<span class="text-[0.9rem] font-semibold text-ink-soft"> /mes</span></span></span>
        <span class="block mt-1 text-ink-soft">Búsquedas ilimitadas · 5 destacadas · base de datos de +Humanos</span></button></div>`;
    openSheet(sheetScroll(body) + sheetFoot('<button data-lim-plan="pro" class="btn btn-primary h-14 w-full">Pasar a Pro</button>'), c => {
      $$('[data-lim-plan]', c).forEach(b => b.onclick = () => choosePlan('pro'));
    });
  }

  function openFeature(jobId) {
    const co = Store.company(), j = Store.job(jobId); if (!co || !j) return;
    const pl = planOf(co), u = usageOf(co), on = Store.isFeatured(j), f = j.featured || {};
    const free = Math.max(0, pl.feat - u.featPlan);
    const where = `<div class="grid grid-cols-2 gap-2.5 mt-5">${[['ph-list-numbers', 'Primera en la lista', 'Arriba de todo en Vacantes para quienes buscan algo así.'], ['ph-house-line', 'En la portada', 'En “Anuncios destacados” de la página principal.']]
      .map(([ic, t, d]) => `<div class="rounded-2xl bg-surface p-3.5"><i class="ph-fill ${ic} text-2xl text-brand"></i><p class="font-semibold mt-1.5 leading-tight">${t}</p><p class="text-ink-mute text-[0.9rem] mt-1 leading-snug">${d}</p></div>`).join('')}</div>`;
    const preview = `<p class="label mt-6">Así la ven los candidatos</p><div class="max-w-sm">${jobCard(j, 0, { preview: true, feat: true })}</div>`;
    let body, foot;
    if (on) {
      const isPlan = f.source === 'plan';
      body = `<h2 class="text-[1.6rem] leading-tight font-extrabold pr-10">Búsqueda destacada</h2><p class="text-ink-soft mt-1">${esc(j.title)}</p>
        <div class="mt-4 rounded-2xl bg-sun-soft p-4 flex gap-3 items-start"><i class="ph-fill ph-star text-2xl text-warn shrink-0"></i>
          <div><p class="font-semibold">${isPlan ? (BILLING ? `Incluida en tu plan ${pl.name}` : 'Búsqueda destacada') : `Destacada hasta el ${fmtDate(f.until)}`}</p>
          <p class="text-ink-soft text-[0.95rem]">${isPlan ? 'Sigue destacada mientras esté activa. Si la quitás, podés usar el lugar en otra búsqueda.' : `${plural(daysLeft(f.until), 'Queda 1 día', `Quedan ${daysLeft(f.until)} días`)}.`}</p></div></div>
        ${where}${preview}`;
      foot = `<button id="ft-off" class="btn btn-outline w-full h-14"><i class="ph ph-star-half text-xl"></i>Quitar destacada</button>`;
    } else if (!pl.feat) {
      body = `<h2 class="text-[1.6rem] leading-tight font-extrabold pr-10">Destacá esta búsqueda</h2><p class="text-ink-soft mt-1">${esc(j.title)}${j.client ? ` · ${esc(j.client)}` : ''}</p>
        ${where}
        <div class="mt-5 rounded-2xl border border-brand bg-brand-soft/50 p-4 flex gap-3"><i class="ph-fill ph-crown-simple text-2xl text-brand shrink-0"></i><p class="text-ink-soft">Los anuncios destacados están en el <b class="text-ink">plan Pro</b> (${usd(PLANS.find(p => p.id === 'pro').price)} por mes): hasta 5 a la vez, búsquedas ilimitadas y la base de datos de +Humanos.</p></div>
        ${preview}`;
      foot = `<button data-lim-plan="pro" class="btn btn-primary w-full h-14"><i class="ph-fill ph-crown-simple text-xl"></i>Pasar a Pro</button>`;
    } else {
      body = `<h2 class="text-[1.6rem] leading-tight font-extrabold pr-10">Destacá esta búsqueda</h2><p class="text-ink-soft mt-1">${esc(j.title)}${j.client ? ` · ${esc(j.client)}` : ''}</p>
        ${where}
        <div class="mt-5 rounded-2xl border ${free ? 'border-brand bg-brand-soft/50' : 'border-line'} p-4 flex gap-3"><i class="ph-fill ph-star text-2xl ${free ? 'text-warn' : 'text-ink-mute'} shrink-0"></i>
          <p class="text-ink-soft">${free ? `Destacadas disponibles: <b class="text-ink">${free} de ${pl.feat}</b>.` : `Ya usás las ${pl.feat} destacadas. Quitá una para destacar esta.`}</p></div>
        ${preview}`;
      foot = free ? `<button id="ft-plan" class="btn btn-primary w-full h-14"><i class="ph-fill ph-star text-xl"></i>Destacar esta búsqueda</button>`
        : `<a href="#/empresa/perfil?tab=plan" data-close-sheet class="btn btn-outline w-full h-14">Ver mis destacadas</a>`;
    }
    const done = msg => { closeSheet(true); toast(msg, 'ph-star'); refresh(); };
    openSheet(sheetScroll(body) + sheetFoot(foot), c => {
      const bp = $('#ft-plan', c); if (bp) bp.onclick = () => { Store.setFeatured(j.id, { source: 'plan', since: new Date().toISOString() }); done('Búsqueda destacada. Ya aparece primera.'); };
      const bo = $('#ft-off', c); if (bo) bo.onclick = async () => {
        if (f.source === 'compra' && !(await askConfirm({ title: '¿Quitar la destacada?', text: `${plural(daysLeft(f.until), 'Queda 1 día pago', `Quedan ${daysLeft(f.until)} días pagos`)}. Si la quitás, no se recuperan.`, ok: 'Quitar igual', danger: true, icon: 'ph-star-half' }))) return;
        Store.setFeatured(j.id, null); done('Se quitó la destacada');
      };
      $$('[data-lim-plan]', c).forEach(b => b.onclick = () => choosePlan(b.dataset.limPlan));
    });
  }

  // Medidor del plan (panel y página de planes)
  function planMeter(co, withLink) {
    const pl = planOf(co), u = usageOf(co), info = Store.planInfo(co.name), expired = pl.id === 'vencido', inf = unlimited(pl.active);
    const pct = inf ? 100 : expired ? 100 : Math.min(100, Math.round(u.active / pl.active * 100)), full = !inf && u.active >= pl.active, over = !inf && u.active > pl.active;
    const sub = info.trialUntil ? `Prueba gratis de Pro hasta el ${fmtDate(info.trialUntil)} · ${plural(daysLeft(info.trialUntil), 'queda 1 día', `quedan ${daysLeft(info.trialUntil)} días`)}`
      : expired ? 'Tu prueba gratis terminó' : `${usd(pl.price)} por mes`;
    return `<div class="flex flex-wrap items-center gap-x-5 gap-y-3">
      <div class="flex items-center gap-3 min-w-0">
        <span class="w-11 h-11 rounded-xl ${pl.color} grid place-items-center shrink-0"><i class="ph-fill ${expired ? 'ph-hourglass-low' : 'ph-crown-simple'} text-xl text-ink/70"></i></span>
        <div class="min-w-0"><p class="font-display font-bold text-lg leading-tight">${expired ? 'Sin plan' : `Plan ${pl.name}`}</p>
          <p class="text-ink-mute text-[0.92rem]">${sub}</p></div>
      </div>
      <div class="flex-1 min-w-[13rem]">
        <div class="flex justify-between gap-3 text-[0.95rem]"><span class="font-semibold">${expired ? `${u.active} ${plural(u.active, 'búsqueda activa', 'búsquedas activas')} · elegí un plan para publicar` : inf ? `${u.active} ${plural(u.active, 'búsqueda activa', 'búsquedas activas')} · ilimitadas` : `${u.active} de ${pl.active} búsquedas activas`}</span>
          ${pl.feat ? `<span class="text-ink-soft whitespace-nowrap" title="Destacadas del plan en uso"><i class="ph-fill ph-star text-warn"></i> ${u.featPlan} de ${pl.feat}</span>` : ''}</div>
        <div class="mt-1.5 h-2 rounded-full bg-line overflow-hidden"><div class="h-full rounded-full ${expired || over ? 'bg-bad' : full ? 'bg-warn' : inf ? 'bg-ok/60' : 'bg-brand'}" style="width:${pct}%"></div></div>
        ${over ? `<p class="text-bad text-[0.92rem] font-semibold mt-1.5">Pausá ${u.active - pl.active} o pasá a Pro para publicar otra.</p>` : ''}
      </div>
      ${withLink ? `<a href="#/empresa/planes" class="btn ${full || expired || info.trialUntil ? 'btn-primary' : 'btn-soft'} btn-sm shrink-0">${expired ? 'Elegir plan' : info.trialUntil ? 'Elegir plan' : full ? 'Pasar a Pro' : 'Ver planes'}</a>` : ''}
    </div>`;
  }

  function Plans() {
    const co = Store.company();
    const cur = co ? planOf(co) : null, u = co ? usageOf(co) : null, info = co ? Store.planInfo(co.name) : null;
    const card = pl => {
      const isCur = !!cur && cur.id === pl.id, over = !!co && u.active > pl.active;
      let btn;
      if (!co) btn = `<a href="#/empresa?crear=1" class="btn ${pl.popular ? 'btn-primary' : 'btn-outline bg-white'} w-full h-12">Probar gratis ${TRIAL_DAYS} días</a>`;
      else if (isCur && !info.trialUntil) btn = `<span class="btn w-full h-12 bg-white/70 text-ink-soft cursor-default"><i class="ph-bold ph-check"></i>Tu plan actual</span>`;
      else if (over) btn = `<span class="btn w-full h-12 bg-white/70 text-ink-mute cursor-default text-[0.95rem]">Pausá ${u.active - pl.active} para elegirlo</span>`;
      else btn = `<button type="button" data-plan="${pl.id}" class="btn ${pl.popular || isCur ? 'btn-primary' : 'btn-outline bg-white'} w-full h-12">${isCur || cur.id === 'vencido' || info.trialUntil ? `Contratar ${pl.name}` : pl.price > cur.price ? `Pasar a ${pl.name}` : `Cambiar a ${pl.name}`}</button>`;
      return `<article class="relative rounded-[26px] ${pl.color} p-5 sm:p-7 flex flex-col ${isCur ? 'ring-2 ring-brand' : ''}">
        ${pl.popular ? '<span class="absolute -top-3 left-6 rounded-full bg-ink text-white px-3 py-1 text-[0.8rem] font-bold">Más completo</span>' : ''}
        <div class="flex items-center justify-between gap-2"><h3 class="text-[1.6rem] font-extrabold">${pl.name}</h3>
          ${isCur ? `<span class="rounded-full bg-brand text-white px-2.5 py-0.5 text-[0.8rem] font-bold">${info.trialUntil ? 'En prueba' : 'Tu plan'}</span>` : ''}</div>
        <p class="text-ink-soft leading-snug md:min-h-[2.7em]">${pl.tag}</p>
        <p class="mt-4"><span class="font-display text-[2.8rem] font-extrabold leading-none">${usd(pl.price)}</span><span class="text-ink-soft font-semibold"> /mes</span></p>
        <ul class="mt-5 mb-6 space-y-2.5">${pl.highlights.map(t => `<li class="flex gap-2.5"><i class="ph-bold ph-check text-ok mt-1 shrink-0"></i><span>${t}</span></li>`).join('')}</ul>
        <div class="mt-auto">${btn}</div>
      </article>`;
    };
    const faq = [
      ['¿Cómo funciona la prueba gratis?', `Al crear tu cuenta usás el plan Pro completo durante ${TRIAL_DAYS} días, sin cargar tarjeta. Después elegís Básico o Pro. Si no elegís ninguno, no se borra nada, pero no podés publicar ni reactivar búsquedas.`],
      ['¿Qué cuenta como búsqueda activa?', 'Las búsquedas publicadas y visibles para los candidatos. Las pausadas o eliminadas no cuentan, y sus postulantes siguen disponibles.'],
      ['¿Qué son los anuncios destacados?', 'Aparecen primeros en la lista de vacantes y en “Anuncios destacados” de la portada, con la etiqueta “Destacada”. Con Pro tenés hasta 5 a la vez y los movés de una búsqueda a otra cuando quieras.'],
      ['¿Qué es la base de datos de +Humanos?', 'Es toda la gente registrada en +Humanos, aunque no se haya postulado a tus búsquedas. Con Pro la buscás por provincia, profesión y experiencia, y ves su CV, celular y email. Con Básico tenés Mis candidatos: las personas que se postularon a tus búsquedas.'],
      ['¿Qué incluye el sitio web?', `El diseño y desarrollo de un sitio para tu consultora, con tus búsquedas de +Humanos publicadas y un formulario para recibir CVs. Cuesta ${usd(WEBSITE_PRICE)} una sola vez y el plan mensual no cambia. El dominio (por ejemplo, tuconsultora.com.ar) y el hosting se contratan aparte y corren por tu cuenta.`],
      ['¿Cómo pago?', 'Los precios están en dólares. Pagás con Mercado Pago (en pesos al tipo de cambio del día), tarjeta o transferencia. El plan se renueva cada mes y lo cancelás cuando quieras. En este prototipo los pagos son de prueba.']
    ];
    const pays = info ? (info.payments || []) : [];
    const html = `<div class="max-w-5xl mx-auto px-4 sm:px-6 py-6 md:py-10 space-y-10">
      <div class="max-w-2xl">
        <p class="text-brand font-semibold">Planes para consultoras</p>
        <h1 class="text-[2.1rem] sm:text-[2.8rem] leading-[1.03] font-extrabold mt-1">Un precio simple, todos los meses</h1>
        <p class="mt-3 text-ink-soft text-[1.1rem]">Probá todo gratis ${TRIAL_DAYS} días. Después elegís Básico o Pro y cancelás cuando quieras. Postulantes sin límite en los dos.</p>
      </div>
      ${co ? `<section class="card p-4 sm:p-5">${planMeter(co)}</section>` : ''}
      <div class="grid gap-5 md:grid-cols-2 pt-2">${PLANS.map(card).join('')}</div>

      <section class="rounded-[26px] bg-ink text-white p-6 sm:p-8 grid md:grid-cols-[minmax(0,1fr)_auto] gap-6 md:gap-10 items-center" aria-labelledby="pl-web">
        <div>
          <span class="inline-flex items-center gap-1.5 font-bold text-sun"><i class="ph-fill ph-browser"></i>Servicio opcional</span>
          <h2 id="pl-web" class="text-[1.8rem] sm:text-[2.2rem] leading-[1.05] font-extrabold mt-2">¿Tu consultora no tiene sitio web?</h2>
          <p class="mt-3 text-white/80 text-[1.05rem] max-w-xl">Te lo diseñamos y desarrollamos, con tus búsquedas de +Humanos publicadas y un formulario para recibir CVs. Se suma a cualquier plan y el precio mensual sigue igual.</p>
          <p class="mt-3 text-white/60 text-[0.95rem]">No incluye dominio ni hosting: corren por cuenta de la consultora.</p>
        </div>
        <div class="md:text-right">
          <p><span class="font-display text-[2.6rem] font-extrabold leading-none">+${usd(WEBSITE_PRICE)}</span></p>
          <p class="text-white/70">pago único</p>
          <button type="button" id="pl-web-btn" class="mt-4 btn bg-white text-ink hover:bg-sun h-12 px-6"><i class="ph-fill ph-whatsapp-logo text-xl text-ok"></i>Quiero mi sitio web</button>
        </div>
      </section>

      <section class="grid md:grid-cols-2 gap-x-8 gap-y-2">
        <h2 class="md:col-span-2 text-[1.6rem] font-extrabold mb-2">Preguntas frecuentes</h2>
        ${faq.map(([q, a]) => `<details class="group border-b border-line py-3"><summary class="flex items-center justify-between gap-3 cursor-pointer list-none font-semibold text-[1.05rem]">${q}<i class="ph-bold ph-caret-down text-ink-mute group-open:rotate-180 transition"></i></summary><p class="mt-2 text-ink-soft">${a}</p></details>`).join('')}
      </section>

      ${co ? `<section class="card p-5 sm:p-6">
        <h2 class="text-xl font-extrabold flex items-center gap-2"><i class="ph-fill ph-receipt text-brand"></i>Pagos</h2>
        ${pays.length ? `<ul class="mt-3 divide-y divide-line">${pays.map(x => `<li class="py-3 flex items-center gap-3"><div class="min-w-0 flex-1"><p class="font-semibold leading-tight">${esc(x.concept)}</p><p class="text-ink-mute text-[0.92rem]">${fmtDate(x.at)} · ${esc(x.method)}</p></div><p class="font-display font-bold whitespace-nowrap">${money(x)}</p></li>`).join('')}</ul>`
          : '<p class="mt-2 text-ink-soft">Todavía no hiciste pagos.</p>'}
      </section>` : `<div class="text-center"><a href="#/empresa?crear=1" class="btn btn-primary h-14 px-8 text-lg">Probar gratis ${TRIAL_DAYS} días</a></div>`}
    </div>`;
    return { html, mount() {
      $$('[data-plan]').forEach(b => b.onclick = () => choosePlan(b.dataset.plan));
      $('#pl-web-btn').onclick = () => openWebsite(co);
    } };
  }

  /* Selector de cliente: botón desplegable con buscador (reemplaza a las pills).
     items: [{ k, name, sub, n, nNew }] · k = 'all' para "Todos los clientes" */
  function clientPicker(id, items, current) {
    const cur = items.find(x => x.k === current) || items[0];
    const icon = it => it.k === 'all' ? '<span class="w-9 h-9 rounded-xl bg-brand-soft text-brand grid place-items-center shrink-0"><i class="ph-fill ph-squares-four text-lg"></i></span>'
      : it.k === NO_CLIENT ? '<span class="w-9 h-9 rounded-xl bg-line text-ink-soft grid place-items-center shrink-0"><i class="ph-fill ph-briefcase text-lg"></i></span>' : logo(it.name, 'w-9 h-9 text-[0.72rem]');
    return `<div class="relative" id="${id}">
      <button type="button" class="cp-btn w-full sm:w-auto sm:min-w-[22rem] flex items-center gap-3 rounded-2xl border border-line bg-white px-3 py-2.5 text-left hover:border-brand/40 transition" aria-haspopup="listbox" aria-expanded="false">
        ${icon(cur)}
        <span class="min-w-0 flex-1"><span class="block text-[0.8rem] font-semibold text-ink-mute leading-tight">Cliente</span><span class="block font-semibold truncate leading-tight">${esc(cur.name)}</span></span>
        <span class="text-ink-mute text-[0.92rem] whitespace-nowrap">${cur.n} búsq.</span><i class="ph-bold ph-caret-down text-ink-mute"></i>
      </button>
      <div class="cp-pop hidden absolute z-30 left-0 right-0 sm:right-auto sm:w-[26rem] mt-2 rounded-2xl border border-line bg-white shadow-lift overflow-hidden">
        <div class="p-2 border-b border-line"><div class="relative"><i class="ph ph-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-lg text-ink-mute"></i>
          <input class="cp-q input h-11 pl-10 rounded-xl" placeholder="Buscar cliente" aria-label="Buscar cliente" autocomplete="off"></div></div>
        <ul class="cp-list max-h-[22rem] overflow-y-auto p-1.5" role="listbox">
          ${items.map(it => `<li><button type="button" role="option" aria-selected="${it.k === cur.k}" data-cp-k="${esc(it.k)}" data-cp-s="${esc(norm(it.name + ' ' + (it.sub || '')))}"
            class="w-full flex items-center gap-3 rounded-xl px-2.5 py-2 text-left hover:bg-surface focus:bg-surface outline-none ${it.k === cur.k ? 'bg-brand-soft/60' : ''}">
            ${icon(it)}<span class="min-w-0 flex-1"><span class="block font-semibold truncate leading-tight">${esc(it.name)}</span>${it.sub ? `<span class="block text-[0.85rem] text-ink-mute truncate">${esc(it.sub)}</span>` : ''}</span>
            <span class="text-right text-[0.85rem] leading-tight whitespace-nowrap"><span class="block text-ink-soft">${it.n} ${it.n === 1 ? 'búsqueda' : 'búsquedas'}</span>${it.nNew ? `<span class="block font-bold text-bad">${it.nNew} nuevo${it.nNew > 1 ? 's' : ''}</span>` : ''}</span>
            ${it.k === cur.k ? '<i class="ph-bold ph-check text-brand"></i>' : ''}</button></li>`).join('')}
          <li class="cp-none hidden px-3 py-4 text-center text-ink-mute">No hay clientes con ese nombre</li>
        </ul>
      </div>
    </div>`;
  }
  function bindClientPicker(id, onPick) {
    const root = $('#' + id); if (!root) return;
    const btn = $('.cp-btn', root), pop = $('.cp-pop', root), q = $('.cp-q', root);
    const opts = () => $$('[data-cp-k]', root).filter(b => !b.parentElement.classList.contains('hidden'));
    const close = () => { pop.classList.add('hidden'); btn.setAttribute('aria-expanded', 'false'); document.removeEventListener('click', outside, true); };
    const outside = e => { if (!root.contains(e.target)) close(); };
    btn.onclick = () => {
      if (!pop.classList.contains('hidden')) return close();
      pop.classList.remove('hidden'); btn.setAttribute('aria-expanded', 'true'); q.value = ''; filter();
      setTimeout(() => q.focus(), 0); document.addEventListener('click', outside, true);
    };
    const filter = () => {
      const t = norm(q.value.trim()); let n = 0;
      $$('[data-cp-k]', root).forEach(b => { const on = !t || b.dataset.cpK === 'all' || b.dataset.cpS.includes(t); b.parentElement.classList.toggle('hidden', !on); if (on) n++; });
      $('.cp-none', root).classList.toggle('hidden', n > 1 || !t);
    };
    q.addEventListener('input', filter);
    root.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.stopPropagation(); close(); btn.focus(); return; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault(); const o = opts(), i = o.indexOf(document.activeElement);
        const nx = e.key === 'ArrowDown' ? (i + 1) % o.length : i <= 0 ? o.length - 1 : i - 1; if (o[nx]) o[nx].focus();
      }
      if (e.key === 'Enter' && e.target === q) { e.preventDefault(); const o = opts(); const f = o.find(b => b.dataset.cpK !== 'all') || o[0]; if (f) f.click(); }
    });
    $$('[data-cp-k]', root).forEach(b => b.onclick = () => { close(); onPick(b.dataset.cpK); });
  }

  /* ================= INICIO DE LA EMPRESA: "Para hacer hoy" =================
     En vez de números sueltos, una lista de acciones pendientes ordenadas por prioridad. */
  function todosOf(co) {
    const jobs = myJobs(co), apps = Store.apps();
    const out = [], newBy = [];
    const lbl = j => `${j.title}${j.client ? ` · ${j.client}` : ''}`;
    jobs.forEach(j => {
      const ja = apps.filter(a => a.jobId === j.id);
      const nNew = ja.filter(a => a.status === 'Nuevo').length;
      const t = Store.ternaOfJob(j.id);
      if (t && t.response && !t.responseSeen) out.push({ p: 300, ic: 'ph-chat-circle-text', tone: 'bg-mint text-ok', title: `${t.response.by || 'El cliente'} respondió la terna`, sub: lbl(j), href: `#/empresa/b?id=${j.id}&tab=terna`, cta: 'Ver respuesta' });
      if (nNew) newBy.push([j, nNew]);
      if (t && t.items.length && !t.sharedAt) out.push({ p: 150, ic: 'ph-list-checks', tone: 'bg-lilac text-brand', title: `Terna lista para enviar (${t.items.length})`, sub: lbl(j), href: `#/empresa/b?id=${j.id}&tab=terna`, cta: 'Compartir' });
      else if (t && t.sharedAt && !t.response && daysSince(t.sharedAt) >= 3) out.push({ p: 90, ic: 'ph-hourglass-medium', tone: 'bg-sun-soft text-warn', title: `El cliente no respondió la terna hace ${daysSince(t.sharedAt)} días`, sub: lbl(j), href: `#/empresa/b?id=${j.id}&tab=terna`, cta: 'Recordar' });
      const pend = ja.filter(a => a.status === 'Descartado' && !a.notifiedAt).length;
      if (pend) out.push({ p: 120, ic: 'ph-hand-heart', tone: 'bg-surface text-ink-soft', title: `Avisá a ${pend} persona${pend === 1 ? '' : 's'} que no ${pend === 1 ? 'quedó' : 'quedaron'}`, sub: lbl(j), notify: j.id, cta: 'Avisar' });
      if (j.status === 'activa') {
        const last = Math.max(new Date(j.postedAt).getTime(), ...ja.map(a => new Date(a.date).getTime()));
        const idle = Math.floor((Date.now() - last) / 864e5);
        const nB = ja.length < 5 ? bankSuggestions(co, j.id).length : 0;
        if (nB) out.push({ p: 80, ic: 'ph-archive-box', tone: 'bg-lilac text-brand', title: `${nB} persona${nB === 1 ? '' : 's'} de Mis candidatos encaja${nB === 1 ? '' : 'n'}`, sub: lbl(j), href: `#/empresa/b?id=${j.id}&tab=banco`, cta: 'Ver' });
        if (idle >= 6 && !Store.isFeatured(j)) out.push({ p: 60, ic: 'ph-trend-down', tone: 'bg-sun-soft text-warn', title: `Sin postulantes nuevos hace ${idle} días`, sub: lbl(j), feature: j.id, cta: 'Destacar' });
      }
    });
    // Los CVs sin revisar se agrupan en una sola tarea (el detalle por búsqueda está al costado)
    if (newBy.length) {
      newBy.sort((a, b) => b[1] - a[1]);
      const tot = newBy.reduce((s2, x) => s2 + x[1], 0), [j0] = newBy[0];
      out.push({ p: 200, ic: 'ph-tray', tone: 'bg-brand-soft text-brand', title: `${tot} CV${tot === 1 ? '' : 's'} sin revisar${newBy.length > 1 ? ` en ${newBy.length} búsquedas` : ''}`,
        sub: newBy.length > 1 ? `Empezá por ${j0.title} (${newBy[0][1]})` : lbl(j0), href: `#/empresa/b?id=${j0.id}`, cta: 'Revisar' });
    }
    const todayK = ymd(new Date()), ivToday = interviewsOf(co).filter(a => ivDay(a.interview.at) === todayK && ivDate(a.interview.at) > new Date(Date.now() - 60 * 6e4));
    if (ivToday.length) {
      const a0 = ivToday[0], j0 = Store.job(a0.jobId) || {};
      out.push({ p: 260, ic: 'ph-calendar-check', tone: 'bg-mint text-ok', title: ivToday.length === 1 ? `Entrevista hoy a las ${ivTime(a0.interview.at)} con ${a0.name.split(' ')[0]}` : `${ivToday.length} entrevistas hoy`,
        sub: ivToday.length === 1 ? `${j0.title || ''}${j0.client ? ` · ${j0.client}` : ''} · ${a0.interview.mode}` : `La primera a las ${ivTime(a0.interview.at)} con ${a0.name}`, href: `#/empresa/entrevistas?d=${todayK}`, cta: 'Ver' });
    }
    const pl = planOf(co), u = usageOf(co);
    const pinfo = Store.planInfo(co.name);
    if (!BILLING) { /* sin cobros: no hay avisos de plan */ }
    else if (pl.id === 'vencido') out.push({ p: 300, ic: 'ph-hourglass-low', tone: 'bg-sun-soft text-warn', title: 'Tu prueba gratis terminó', sub: 'Elegí Básico o Pro para seguir publicando', href: '#/empresa/planes', cta: 'Elegir plan' });
    else if (pinfo.trialUntil && daysLeft(pinfo.trialUntil) <= 3) out.push({ p: 120, ic: 'ph-hourglass-medium', tone: 'bg-sun-soft text-warn', title: `Tu prueba gratis termina en ${plural(daysLeft(pinfo.trialUntil), '1 día', `${daysLeft(pinfo.trialUntil)} días`)}`, sub: 'Elegí un plan para no cortar tus búsquedas', href: '#/empresa/planes', cta: 'Ver planes' });
    else if (u.active >= pl.active) out.push({ p: 50, ic: 'ph-gauge', tone: 'bg-sun-soft text-warn', title: `Usás ${u.active} de ${pl.active} búsquedas activas de tu plan`, sub: 'Para publicar otra, pausá una o pasá a Pro', href: '#/empresa/planes', cta: 'Ver planes' });
    return out.sort((a, b) => b.p - a.p);
  }

  /* ================= ENTREVISTAS =================
     Cada postulación puede tener una entrevista: a.interview = { at: 'AAAA-MM-DDTHH:MM' (hora local), dur, mode, place, notes, setAt }.
     Al agendar, la postulación pasa a "Entrevista" (si estaba antes) y el candidato lo ve en Mis postulaciones. */
  const IV_MODES = [['Presencial', 'ph-map-pin', 'Dirección', 'Ej: San Martín 450, piso 2'], ['Videollamada', 'ph-video-camera', 'Link de la videollamada', 'Ej: meet.google.com/abc-defg-hij'], ['Teléfono', 'ph-phone', '', '']];
  const pad2 = n => String(n).padStart(2, '0');
  const ymd = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const ivDate = at => { const [d, t] = at.split('T'); const [y, m, dd] = d.split('-').map(Number); const [h, mi] = (t || '00:00').split(':').map(Number); return new Date(y, m - 1, dd, h, mi); };
  const ivDay = at => at.split('T')[0];
  const ivTime = at => (at.split('T')[1] || '').slice(0, 5);
  const ivLong = at => { const s = ivDate(at).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }); return s.charAt(0).toUpperCase() + s.slice(1); };
  const ivShort = at => ivDate(at).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '');
  const ivMode = m => IV_MODES.find(x => x[0] === m) || IV_MODES[0];
  function companyApps(co) { const ids = new Set(Store.jobs().filter(j => j.company === co.name).map(j => j.id)); return Store.apps().filter(a => ids.has(a.jobId)); }
  const interviewsOf = co => companyApps(co).filter(a => a.interview && a.interview.at).sort((x, y) => x.interview.at.localeCompare(y.interview.at));
  const ivMsg = (a, j, iv, co) => {
    const m = iv.mode === 'Presencial' ? `en ${iv.place || 'nuestras oficinas'}` : iv.mode === 'Videollamada' ? `por videollamada${iv.place ? ` (${iv.place})` : ''}` : 'por teléfono: te llamamos a este número';
    return `Hola ${a.name.split(' ')[0]}, te escribimos de ${co.name} por tu postulación a ${j.title}. Queremos entrevistarte el ${ivLong(iv.at).toLowerCase()} a las ${ivTime(iv.at)} h, ${m}. ¿Nos confirmás si podés? ¡Gracias!`;
  };
  // Demo: la cuenta de ejemplo arranca con algunas entrevistas en los próximos días
  function seedInterviews(co) {
    if (co.name !== 'Talento Norte') return;
    let done = []; try { done = JSON.parse(localStorage.getItem('emplea.ivseed') || '[]'); } catch (e) { done = []; }
    if (done.includes(co.name)) return;
    const apps = companyApps(co).filter(a => !a.interview);
    const pick = [...apps.filter(a => a.status === 'Entrevista'), ...apps.filter(a => a.status === 'Terna'), ...apps.filter(a => a.status === 'En revisión')].slice(0, 6);
    const plan = [[0, '11:00', 'Presencial', 'Av. Mate de Luna 1820, piso 3'], [1, '10:00', 'Videollamada', 'meet.google.com/tln-entr-001'], [1, '15:30', 'Presencial', 'Av. Mate de Luna 1820, piso 3'], [3, '09:30', 'Teléfono', ''], [6, '12:00', 'Videollamada', 'meet.google.com/tln-entr-002'], [9, '16:00', 'Presencial', 'Av. Mate de Luna 1820, piso 3']];
    const now = new Date().toISOString();
    pick.forEach((a, i) => {
      const [d, t, mode, place] = plan[i]; const day = new Date(); day.setDate(day.getDate() + d);
      Store.updateApp(a.id, { ...(STAGE_RANK[a.status] < 3 ? { status: 'Entrevista' } : {}), interview: { at: `${ymd(day)}T${t}`, dur: 45, mode, place, notes: '', setAt: now } });
    });
    done.push(co.name); localStorage.setItem('emplea.ivseed', JSON.stringify(done));
  }

  // Hoja para agendar o reprogramar
  function openInterviewSheet(opts = {}) {
    const co = Store.company();
    let appId = opts.appId || '';
    const cur = appId ? (Store.apps().find(x => x.id === appId) || {}).interview : null;
    const day0 = cur ? ivDay(cur.at) : opts.date || (() => { const d = new Date(); d.setDate(d.getDate() + 1); return ymd(d); })();
    const time0 = cur ? ivTime(cur.at) : '10:00', dur0 = cur ? cur.dur : 45, mode0 = cur ? cur.mode : 'Presencial';
    const slots = []; for (let h = 8; h <= 20; h++) for (const mi of [0, 30]) if (!(h === 20 && mi)) slots.push(`${pad2(h)}:${pad2(mi)}`);
    const seg = (name, arr, sel) => `<div class="grid grid-cols-${arr.length} gap-2">${arr.map(v => `<label class="cursor-pointer"><input type="radio" name="${name}" value="${v[0]}" class="peer sr-only" ${String(v[0]) === String(sel) ? 'checked' : ''}>
      <span class="flex items-center justify-center gap-1.5 h-12 rounded-xl border border-line font-semibold text-[0.95rem] peer-checked:border-brand peer-checked:bg-brand-soft peer-checked:text-brand">${v[1] ? `<i class="ph ${v[1]} text-lg"></i>` : ''}${v[2] || v[0]}</span></label>`).join('')}</div>`;
    const pickable = companyApps(co).filter(a => !['Descartado', 'Contratado'].includes(a.status));
    const jobOf = a => Store.job(a.jobId) || {};
    const who = a => `<div class="flex items-center gap-3 rounded-2xl bg-surface p-3">${avatar(a.name, 'w-11 h-11 text-sm')}<div class="min-w-0 flex-1"><p class="font-semibold leading-tight truncate">${esc(a.name)}</p><p class="text-ink-mute text-[0.92rem] truncate">${esc(jobOf(a).title || '')}${jobOf(a).client ? ` · ${esc(jobOf(a).client)}` : ''}</p></div>${opts.appId ? '' : '<button type="button" id="iv-change" class="btn btn-sm btn-soft shrink-0">Cambiar</button>'}</div>${a.interview && !opts.appId ? `<p class="mt-2 text-warn font-semibold text-[0.95rem]"><i class="ph-fill ph-info"></i> Ya tiene entrevista el ${ivShort(a.interview.at)} a las ${ivTime(a.interview.at)} h: si guardás, se reprograma.</p>` : ''}`;
    const body = `<h2 class="text-[1.65rem] font-extrabold tracking-tight pr-10">${cur ? 'Reprogramar entrevista' : 'Agendar entrevista'}</h2>
      <form id="iv-form" class="mt-5 space-y-5" novalidate>
        <div><p class="label">Candidato/a *</p><div id="iv-who"></div></div>
        <div class="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-3">
          <div><label class="label" for="iv-date">Día *</label><input id="iv-date" type="date" class="input" value="${day0}" min="${ymd(new Date())}"></div>
          <div><label class="label" for="iv-time">Hora *</label><select id="iv-time" class="input">${slots.map(s2 => `<option ${s2 === time0 ? 'selected' : ''}>${s2}</option>`).join('')}</select></div>
        </div>
        <p id="iv-day-l" class="-mt-3 text-ink-soft font-semibold"></p>
        <p id="iv-clash" class="hidden -mt-2 rounded-xl bg-sun-soft text-warn font-semibold px-3 py-2 text-[0.95rem]"></p>
        <div><p class="label">Duración</p>${seg('iv-dur', [[30, '', '30 min'], [45, '', '45 min'], [60, '', '1 hora']], dur0)}</div>
        <div><p class="label">Modalidad</p>${seg('iv-mode', IV_MODES.map(m => [m[0], m[1]]), mode0)}</div>
        <div id="iv-place-w"><label class="label" for="iv-place"></label><input id="iv-place" class="input" value="${esc(cur ? cur.place || '' : '')}"></div>
        <div><label class="label" for="iv-notes">Notas <span class="font-normal text-ink-mute">(solo las ve tu equipo)</span></label><textarea id="iv-notes" rows="2" class="input h-auto py-3" placeholder="Ej: preguntar disponibilidad horaria">${esc(cur ? cur.notes || '' : '')}</textarea></div>
        <p id="iv-err" class="err hidden"></p>
      </form>`;
    const foot = `<button form="iv-form" class="btn btn-primary w-full h-14 text-lg"><i class="ph-bold ph-calendar-check text-xl"></i>${cur ? 'Guardar cambios' : 'Agendar entrevista'}</button>`;
    openSheet(sheetScroll(body) + sheetFoot(foot), c => {
      const drawWho = () => {
        const a = appId && Store.apps().find(x => x.id === appId);
        if (a) { $('#iv-who', c).innerHTML = who(a); const ch = $('#iv-change', c); if (ch) ch.onclick = () => { appId = ''; drawWho(); }; return; }
        $('#iv-who', c).innerHTML = `<div class="relative"><i class="ph ph-magnifying-glass text-xl text-ink-mute absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"></i><input id="iv-q" class="input pl-12" placeholder="Nombre, búsqueda o cliente" autocomplete="off"></div>
          <ul id="iv-res" class="mt-2 max-h-64 overflow-y-auto rounded-2xl border border-line divide-y divide-line"></ul>`;
        const res = () => {
          const q = norm($('#iv-q', c).value.trim());
          const list = pickable.filter(a => !q || norm(`${a.name} ${jobOf(a).title} ${jobOf(a).client || ''}`).includes(q))
            .sort((x, y) => (STAGE_RANK[y.status] || 0) - (STAGE_RANK[x.status] || 0)).slice(0, 30);
          $('#iv-res', c).innerHTML = list.length ? list.map(a => `<li><button type="button" data-iv-pick="${a.id}" class="w-full text-left flex items-center gap-3 px-3 py-2.5 hover:bg-surface">${avatar(a.name, 'w-9 h-9 text-xs')}
            <span class="min-w-0 flex-1"><span class="block font-semibold truncate">${esc(a.name)}</span>
              <span class="block text-ink-soft text-[0.92rem] truncate">${esc(jobOf(a).title || '')}</span>
              <span class="flex items-center gap-1.5 text-ink-mute text-[0.88rem] min-w-0"><i class="ph ph-buildings shrink-0"></i><span class="truncate">${esc(jobOf(a).client || 'Búsqueda propia')}</span></span>
              <span class="mt-1 flex flex-wrap items-center gap-1.5"><span class="rounded-full bg-surface border border-line px-2 py-0.5 text-[0.78rem] font-bold text-ink-soft">${esc(a.status)}</span>${a.interview ? `<span class="rounded-full bg-mint px-2 py-0.5 text-[0.78rem] font-bold text-ok"><i class="ph-fill ph-calendar-check"></i> ${ivShort(a.interview.at)} · ${ivTime(a.interview.at)}</span>` : ''}</span></span></button></li>`).join('')
            : '<li class="px-3 py-3 text-ink-mute">No hay postulantes con ese nombre.</li>';
        };
        $('#iv-q', c).addEventListener('input', res); res();
        $('#iv-res', c).onclick = e => { const b = e.target.closest('[data-iv-pick]'); if (b) { appId = b.dataset.ivPick; drawWho(); check(); } };
      };
      const mode = () => $('input[name="iv-mode"]:checked', c).value;
      const drawPlace = () => {
        const m = ivMode(mode()); const w = $('#iv-place-w', c);
        w.classList.toggle('hidden', !m[2]);
        $('label[for="iv-place"]', c).textContent = m[2]; $('#iv-place', c).placeholder = m[3];
      };
      const check = () => {
        const d = $('#iv-date', c).value, t = $('#iv-time', c).value;
        $('#iv-day-l', c).textContent = d ? `${ivLong(`${d}T${t}`)} · ${t} h` : '';
        const dur = +$('input[name="iv-dur"]:checked', c).value, st = ivDate(`${d}T${t}`).getTime(), en = st + dur * 6e4;
        const clash = d && interviewsOf(co).find(a => a.id !== appId && (() => { const s0 = ivDate(a.interview.at).getTime(); return s0 < en && st < s0 + (a.interview.dur || 45) * 6e4; })());
        const cl = $('#iv-clash', c);
        cl.classList.toggle('hidden', !clash);
        if (clash) cl.innerHTML = `<i class="ph-fill ph-warning"></i> Ese horario se cruza con la entrevista de ${esc(clash.name)} (${ivTime(clash.interview.at)} h).`;
      };
      drawWho(); drawPlace(); check();
      c.addEventListener('change', e => { if (e.target.name === 'iv-mode') drawPlace(); check(); });
      $('#iv-date', c).addEventListener('input', check);
      $('#iv-form', c).onsubmit = e => {
        e.preventDefault();
        const err = $('#iv-err', c), d = $('#iv-date', c).value, t = $('#iv-time', c).value;
        const miss = [!appId && 'el candidato', !d && 'el día'].filter(Boolean);
        if (miss.length) { err.textContent = `Falta elegir ${miss.join(' y ')}.`; err.classList.remove('hidden'); return; }
        if (ivDate(`${d}T${t}`) < new Date(Date.now() - 6e4)) { err.textContent = 'Elegí un día y una hora que no hayan pasado.'; err.classList.remove('hidden'); return; }
        const a = Store.apps().find(x => x.id === appId), j = Store.job(a.jobId);
        const iv = { at: `${d}T${t}`, dur: +$('input[name="iv-dur"]:checked', c).value, mode: mode(), place: ivMode(mode())[2] ? $('#iv-place', c).value.trim() : '', notes: $('#iv-notes', c).value.trim(), setAt: new Date().toISOString() };
        const moved = STAGE_RANK[a.status] < 3, re = !!a.interview;
        Store.markRead(a.id);
        Store.updateApp(a.id, { ...(moved ? { status: 'Entrevista' } : {}), interview: iv });
        S.dirty = true; S.ivDay = d; S.ivMonth = d.slice(0, 7);
        const wa = waLink(a.phone, ivMsg(a, j, iv, co));
        setSheet(`<div class="px-5 sm:px-7 pt-6 pb-7 text-center">
          <span class="mx-auto w-16 h-16 rounded-full bg-mint text-ok grid place-items-center"><i class="ph-fill ph-calendar-check text-[2rem]"></i></span>
          <h2 class="mt-4 text-[1.5rem] font-extrabold leading-tight">Entrevista ${re ? 'reprogramada' : 'agendada'}</h2>
          <p class="mt-1 text-ink-soft">${esc(a.name)} · ${ivLong(iv.at)} a las ${ivTime(iv.at)} h</p>
          ${moved ? '<p class="mt-1 text-ink-mute text-[0.95rem]">Pasó a la etapa Entrevista.</p>' : ''}
          <p class="mt-3 text-ink-soft text-[0.95rem]">Ya lo ve en sus postulaciones. Avisale también por WhatsApp para que confirme.</p>
          <div class="mt-6 grid gap-2">
            ${wa ? `<a href="${wa}" target="_blank" rel="noopener" class="btn h-14 bg-[#25D366] text-white hover:brightness-95 justify-center"><i class="ph-fill ph-whatsapp-logo text-xl"></i>Avisar por WhatsApp</a>` : ''}
            <button type="button" id="iv-ok" class="btn btn-outline justify-center">Listo</button>
          </div></div>`, c2 => { $('#iv-ok', c2).onclick = () => { if (opts.back) opts.back(); else closeSheet(); }; });
        toast(re ? 'Entrevista reprogramada' : 'Entrevista agendada', 'ph-calendar-check');
      };
    }, { side: true });
  }

  function Interviews(params) {
    const co = Store.company();
    seedInterviews(co);
    const today = ymd(new Date());
    if (params.get('d')) { S.ivDay = params.get('d'); S.ivMonth = S.ivDay.slice(0, 7); }
    S.ivDay = S.ivDay || today; S.ivMonth = S.ivMonth || S.ivDay.slice(0, 7);
    const html = `<div id="iv-root" class="max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-12">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div class="min-w-0"><h1 class="text-[2rem] sm:text-[2.4rem] leading-tight font-extrabold">Entrevistas</h1><p id="iv-sub" class="text-ink-soft mt-1"></p></div>
        <button type="button" class="btn btn-primary shrink-0 max-md:h-11 max-md:px-4" data-iv-new><i class="ph-bold ph-plus"></i><span class="max-[380px]:hidden">Agendar</span><span class="hidden md:inline">&nbsp;entrevista</span></button>
      </div>
      <div class="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] items-start">
        <section class="card p-4 sm:p-6" aria-label="Calendario" id="iv-cal"></section>
        <div class="space-y-6"><section id="iv-dayp" aria-live="polite"></section><section id="iv-next"></section></div>
      </div>
    </div>`;
    function draw() {
      const all = interviewsOf(co), now = new Date();
      const upcoming = all.filter(a => ivDate(a.interview.at) >= new Date(now.getTime() - 60 * 6e4));
      $('#iv-sub').textContent = upcoming.length ? `${upcoming.length} entrevista${upcoming.length === 1 ? '' : 's'} próxima${upcoming.length === 1 ? '' : 's'}` : 'No tenés entrevistas próximas.';
      const byDay = {}; all.forEach(a => { (byDay[ivDay(a.interview.at)] = byDay[ivDay(a.interview.at)] || []).push(a); });
      // Mes
      const [Y, M] = S.ivMonth.split('-').map(Number), first = new Date(Y, M - 1, 1), nDays = new Date(Y, M, 0).getDate(), lead = (first.getDay() + 6) % 7;
      const mName = `${first.toLocaleDateString('es-AR', { month: 'long' })} ${Y}`;
      let cells = ''; for (let i = 0; i < lead; i++) cells += '<span></span>';
      for (let d = 1; d <= nDays; d++) {
        const k = `${Y}-${pad2(M)}-${pad2(d)}`, n = (byDay[k] || []).length, sel = k === S.ivDay, isT = k === today, past = k < today;
        cells += `<button type="button" data-iv-day="${k}" aria-pressed="${sel}" aria-label="${ivLong(k + 'T00:00')}${n ? `, ${n} entrevista${n === 1 ? '' : 's'}` : ''}"
          class="relative aspect-square sm:aspect-auto sm:h-16 rounded-2xl flex flex-col items-center justify-center gap-1 font-semibold text-[1.02rem] transition ${sel ? 'bg-brand text-white' : isT ? 'ring-2 ring-brand text-brand' : past ? 'text-ink-mute hover:bg-surface' : 'hover:bg-surface'}">
          <span>${d}</span>${n ? `<span class="flex gap-0.5 h-1.5">${Array.from({ length: Math.min(n, 3) }, () => `<i class="w-1.5 h-1.5 rounded-full ${sel ? 'bg-white' : 'bg-brand'}"></i>`).join('')}</span>` : '<span class="h-1.5"></span>'}</button>`;
      }
      $('#iv-cal').innerHTML = `<div class="flex items-center gap-2">
          <h2 class="flex-1 text-[1.25rem] sm:text-[1.35rem] font-extrabold capitalize">${mName}</h2>
          <button type="button" class="btn btn-sm btn-soft" data-iv-today>Hoy</button>
          <button type="button" class="icon-btn border border-line" data-iv-m="-1" aria-label="Mes anterior"><i class="ph-bold ph-caret-left"></i></button>
          <button type="button" class="icon-btn border border-line" data-iv-m="1" aria-label="Mes siguiente"><i class="ph-bold ph-caret-right"></i></button></div>
        <div class="mt-4 grid grid-cols-7 gap-1 text-center text-[0.85rem] font-bold text-ink-mute" aria-hidden="true">${['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(x => `<span>${x}</span>`).join('')}</div>
        <div class="mt-1 grid grid-cols-7 gap-1">${cells}</div>`;
      // Día elegido
      const list = byDay[S.ivDay] || [];
      const item = a => {
        const iv = a.interview, j = Store.job(a.jobId) || {}, m = ivMode(iv.mode), wa = waLink(a.phone, ivMsg(a, j, iv, co)), past = ivDate(iv.at) < now;
        return `<li class="card p-4 ${past ? 'opacity-70' : ''}">
          <div class="flex items-start gap-3.5">
            <div class="w-16 shrink-0 text-center rounded-xl bg-brand-soft text-brand py-2"><p class="font-display font-extrabold text-[1.15rem] leading-none">${ivTime(iv.at)}</p><p class="text-[0.78rem] font-semibold mt-1">${iv.dur} min</p></div>
            <div class="min-w-0 flex-1">
              <p class="font-bold text-[1.08rem] leading-tight">${esc(a.name)}</p>
              <p class="text-ink-soft text-[0.95rem] truncate">${esc(j.title || '')}${j.client ? ` · ${esc(j.client)}` : ''}</p>
              <p class="mt-1 flex items-center gap-1.5 text-ink-mute text-[0.92rem] min-w-0"><i class="ph ${m[1]} text-lg shrink-0"></i><span class="truncate">${esc(iv.mode)}${iv.place ? ` · ${esc(iv.place)}` : iv.mode === 'Teléfono' && a.phone ? ` · ${esc(a.phone)}` : ''}</span></p>
              ${iv.notes ? `<p class="mt-1.5 text-[0.92rem] text-ink-soft italic">“${esc(iv.notes)}”</p>` : ''}
            </div>
          </div>
          <div class="mt-3 grid grid-cols-4 gap-1.5">
            <a href="#/empresa/b?id=${j.id}&app=${a.id}" class="btn btn-sm btn-soft justify-center px-2" title="Ver ficha"><i class="ph ph-user text-lg"></i><span class="max-sm:hidden">Ficha</span></a>
            ${wa ? `<a href="${wa}" target="_blank" rel="noopener" class="btn btn-sm btn-outline justify-center px-2" title="Avisar por WhatsApp"><i class="ph-fill ph-whatsapp-logo text-lg text-[#25D366]"></i><span class="max-sm:hidden">Avisar</span></a>` : '<span></span>'}
            <button type="button" class="btn btn-sm btn-outline justify-center px-2" data-iv-edit="${a.id}" title="Reprogramar"><i class="ph ph-clock-clockwise text-lg"></i><span class="max-sm:hidden">Mover</span></button>
            <button type="button" class="btn btn-sm text-bad hover:bg-bad/10 justify-center px-2" data-iv-del="${a.id}" title="Cancelar entrevista"><i class="ph ph-x-circle text-lg"></i><span class="max-sm:hidden">Cancelar</span></button>
          </div></li>`;
      };
      $('#iv-dayp').innerHTML = `<div class="flex items-end justify-between gap-3"><h2 class="text-[1.35rem] font-extrabold leading-tight">${S.ivDay === today ? 'Hoy · ' : ''}${ivLong(S.ivDay + 'T00:00')}</h2>${list.length ? `<span class="text-ink-mute font-semibold shrink-0">${list.length} entrevista${list.length === 1 ? '' : 's'}</span>` : ''}</div>
        ${list.length ? `<ul class="mt-4 space-y-3">${list.map(item).join('')}</ul>` : `<div class="mt-4 card p-6 text-center"><i class="ph ph-calendar-blank text-4xl text-ink-mute"></i><p class="mt-2 font-semibold">Sin entrevistas este día</p>
          ${S.ivDay >= today ? `<button type="button" class="mt-4 btn btn-soft" data-iv-new data-iv-date="${S.ivDay}"><i class="ph-bold ph-plus"></i>Agendar para este día</button>` : ''}</div>`}`;
      // Próximas (fuera del día elegido)
      const nx = upcoming.filter(a => ivDay(a.interview.at) !== S.ivDay).slice(0, 5);
      $('#iv-next').innerHTML = nx.length ? `<h2 class="text-[1.2rem] font-extrabold">Próximas</h2><ul class="mt-3 card divide-y divide-line overflow-hidden">${nx.map(a => `<li><button type="button" data-iv-day="${ivDay(a.interview.at)}" class="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-surface">
          <span class="w-24 shrink-0 font-semibold text-brand capitalize">${ivShort(a.interview.at)}</span><span class="w-12 shrink-0 font-display font-bold">${ivTime(a.interview.at)}</span>
          <span class="min-w-0 flex-1"><span class="block truncate font-semibold">${esc(a.name)}</span><span class="block truncate text-ink-mute text-[0.9rem]">${esc((Store.job(a.jobId) || {}).title || '')}${(Store.job(a.jobId) || {}).client ? ` · ${esc(Store.job(a.jobId).client)}` : ''}</span></span><i class="ph-bold ph-caret-right text-ink-mute"></i></button></li>`).join('')}</ul>` : '';
    }
    return {
      html, mount() {
        draw();
        $('#iv-root').addEventListener('click', e => {
          const nw = e.target.closest('[data-iv-new]'); if (nw) { openInterviewSheet({ date: nw.dataset.ivDate }); return; }
          const dd = e.target.closest('[data-iv-day]'); if (dd) { S.ivDay = dd.dataset.ivDay; S.ivMonth = S.ivDay.slice(0, 7); draw(); if (window.innerWidth < 1024 && dd.closest('#iv-cal')) $('#iv-dayp').scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
          const mb = e.target.closest('[data-iv-m]'); if (mb) { const [y, m] = S.ivMonth.split('-').map(Number); const d = new Date(y, m - 1 + +mb.dataset.ivM, 1); S.ivMonth = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`; draw(); return; }
          if (e.target.closest('[data-iv-today]')) { S.ivDay = today; S.ivMonth = today.slice(0, 7); draw(); return; }
          const ed = e.target.closest('[data-iv-edit]'); if (ed) { openInterviewSheet({ appId: ed.dataset.ivEdit }); return; }
          const dl = e.target.closest('[data-iv-del]');
          if (dl) {
            const a = Store.apps().find(x => x.id === dl.dataset.ivDel);
            askConfirm({ title: `¿Cancelar la entrevista con ${esc(a.name)}?`, text: 'Sigue en la búsqueda, en la misma etapa. Avisale por WhatsApp si ya lo habías citado.', ok: 'Cancelar entrevista', cancel: 'Volver', danger: true, icon: 'ph-calendar-x' })
              .then(ok => { if (ok) { Store.updateApp(a.id, { interview: null }); toast('Entrevista cancelada', 'ph-calendar-x'); draw(); } });
          }
        });
      }
    };
  }

  /* Guía de la primera vez: 3 pasos que se tildan solos según lo que hizo la cuenta */
  const guideHidden = co => { try { return (JSON.parse(localStorage.getItem('emplea.guide.hidden') || '[]')).includes(co.name); } catch (e) { return false; } };
  const hideGuide = co => { try { const l = JSON.parse(localStorage.getItem('emplea.guide.hidden') || '[]'); l.push(co.name); localStorage.setItem('emplea.guide.hidden', JSON.stringify(l)); } catch (e) { /* noop */ } };
  function guideSteps(co, jobs, apps) {
    const isCons = co.type === 'Consultora';
    const withApps = jobs.map(j => [j, apps.filter(a => a.jobId === j.id)]).filter(x => x[1].length).sort((a, b) => b[1].length - a[1].length);
    const reviewed = apps.filter(a => a.readAt || a.status !== 'Nuevo');
    const ternaJob = (withApps.find(([j, ja]) => ja.some(a => a.status !== 'Nuevo' && a.status !== 'Descartado')) || withApps[0] || [])[0];
    const shared = jobs.some(j => { const t = Store.ternaOfJob(j.id); return t && t.sharedAt; });
    return [
      { done: jobs.length > 0, title: 'Publicá tu primera búsqueda', sub: 'Puesto y lugar: el resto te lo dejamos en borrador. Tarda 1 minuto.', cta: 'Publicar', publish: true },
      { done: reviewed.length > 0, title: 'Revisá los CVs que llegan',
        sub: withApps.length ? 'Abrí cada CV, calificalo y movelo de etapa.' : jobs.length ? 'Te avisamos acá cuando llegue el primero. Mientras, mirá tu base de datos.' : 'Cuando publiques, los CVs llegan acá para que los revises y califiques.',
        cta: withApps.length ? 'Revisar' : jobs.length ? 'Ver base de datos' : '', href: withApps.length ? `#/empresa/b?id=${withApps[0][0].id}` : '#/empresa/candidatos' },
      { done: shared, title: isCons ? 'Armá la terna y mandala a tu cliente' : 'Armá la terna de finalistas',
        sub: isCons ? 'Elegí a los mejores y compartilos con un link: tu cliente responde desde ahí.' : 'Elegí a los mejores y compartilos con quien decide, con un link.',
        cta: ternaJob ? 'Armar terna' : '', href: ternaJob ? `#/empresa/b?id=${ternaJob.id}&tab=terna` : '' }
    ];
  }
  function guideCard(steps) {
    const nDone = steps.filter(s => s.done).length, cur = steps.findIndex(s => !s.done);
    return `<section class="card p-5 sm:p-6" aria-labelledby="guide-t">
      <div class="flex items-start gap-3">
        ${fedfu('w-11 h-11 shrink-0')}
        <div class="min-w-0 flex-1"><h2 id="guide-t" class="text-[1.35rem] font-extrabold leading-tight">Empezá en 3 pasos</h2>
          <p class="text-ink-soft mt-0.5">${nDone} de 3 listos. Se van tildando solos a medida que avanzás.</p></div>
        <button type="button" id="guide-hide" class="shrink-0 font-semibold text-ink-mute hover:text-ink h-11 px-2 -mr-2" aria-label="Ocultar la guía"><i class="ph-bold ph-x text-lg sm:hidden"></i><span class="max-sm:hidden">Ocultar</span></button>
      </div>
      <div class="mt-4 flex gap-1.5" aria-hidden="true">${steps.map(s => `<span class="h-1.5 flex-1 rounded-full ${s.done ? 'bg-brand' : 'bg-line'}"></span>`).join('')}</div>
      <ol class="mt-4 space-y-2">${steps.map((s, i) => {
        const now = i === cur;
        const btn = !s.done && s.cta ? (s.publish ? `<button type="button" class="btn btn-sm ${now ? 'btn-primary' : 'btn-soft'} shrink-0 max-sm:grow max-sm:justify-center max-sm:ml-[3.125rem]" data-publish>${s.cta}</button>` : `<a href="${s.href}" class="btn btn-sm ${now ? 'btn-primary' : 'btn-soft'} shrink-0 max-sm:grow max-sm:justify-center max-sm:ml-[3.125rem]">${s.cta}</a>`) : '';
        return `<li class="flex flex-wrap items-center gap-x-3.5 gap-y-2.5 rounded-2xl px-3 py-3 ${now ? 'bg-brand-soft/60' : ''}">
          <span class="w-9 h-9 rounded-full grid place-items-center shrink-0 font-bold ${s.done ? 'bg-ok text-white' : now ? 'bg-brand text-white' : 'bg-surface text-ink-soft border border-line'}">${s.done ? '<i class="ph-bold ph-check"></i>' : i + 1}</span>
          <span class="min-w-0 flex-1 basis-[9.5rem]"><span class="block font-semibold leading-tight ${s.done ? 'text-ink-mute line-through decoration-1' : ''}">${s.title}</span>${s.done ? '' : `<span class="block text-ink-soft text-[0.92rem] leading-snug mt-0.5">${s.sub}</span>`}</span>
          ${btn}</li>`;
      }).join('')}</ol>
    </section>`;
  }

  function CoHome() {
    const co = Store.company();
    seedInterviews(co);
    trimPlanFeatured(co);
    const isCons = co.type === 'Consultora';
    const jobs = myJobs(co), ids = new Set(jobs.map(j => j.id));
    const apps = Store.apps().filter(a => ids.has(a.jobId));
    const todos = todosOf(co);
    const gSteps = guideSteps(co, jobs, apps), showGuide = !guideHidden(co) && gSteps.some(s => !s.done);
    const nNew = apps.filter(a => a.status === 'Nuevo').length;
    const firstNew = jobs.map(j => [j, apps.filter(a => a.jobId === j.id && a.status === 'Nuevo').length]).sort((a, b) => b[1] - a[1])[0];
    const stat = (n, l, ic, href) => `<a href="${href}" class="group rounded-[22px] p-4 bg-white border border-line hover:border-brand/40 hover:shadow-lift transition">
      <div class="flex items-center justify-between"><i class="ph-fill ${ic} text-2xl text-ink/70"></i><i class="ph-bold ph-arrow-up-right text-ink-mute group-hover:text-brand"></i></div>
      <p class="font-display text-[2.2rem] leading-none font-extrabold mt-2 text-brand">${n}</p><p class="text-ink-soft leading-tight mt-1">${l}</p></a>`;
    const hour = new Date().getHours();
    const hello = hour < 13 ? 'Buen día' : hour < 20 ? 'Buenas tardes' : 'Buenas noches';
    const SHOW = 6;
    const todoRow = (t, i) => `<li class="${i >= SHOW ? 'todo-more hidden' : ''}"><div class="flex items-center gap-3.5 px-4 py-3.5">
      <span class="w-11 h-11 rounded-xl ${t.tone} grid place-items-center shrink-0"><i class="ph-fill ${t.ic} text-xl"></i></span>
      <span class="min-w-0 flex-1"><span class="block font-semibold leading-tight">${esc(t.title)}</span><span class="block text-ink-mute text-[0.92rem] truncate mt-0.5">${esc(t.sub)}</span></span>
      ${t.href ? `<a href="${t.href}" class="btn btn-sm btn-soft shrink-0">${t.cta}</a>` : `<button type="button" class="btn btn-sm btn-soft shrink-0" ${t.notify ? `data-todo-notify="${t.notify}"` : `data-todo-feature="${t.feature}"`}>${t.cta}</button>`}
    </div></li>`;
    const html = `<div class="max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-12">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div class="min-w-0"><p class="text-ink-soft font-semibold">${hello}</p><h1 class="text-[2rem] sm:text-[2.4rem] leading-tight font-extrabold">${esc(co.name)}</h1></div>
        <button class="btn btn-primary shrink-0 max-md:h-11 max-md:px-4" data-publish aria-label="Publicar búsqueda"><i class="ph-bold ph-plus"></i><span class="max-[380px]:hidden">Publicar</span><span class="hidden md:inline">&nbsp;búsqueda</span></button>
      </div>
      ${showGuide ? `<div class="mt-8">${guideCard(gSteps)}</div>` : ''}
      ${jobs.length ? `<div class="mt-8 grid grid-cols-2 ${isCons ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-3">
        ${stat(nNew, 'CVs sin revisar', 'ph-tray', firstNew && firstNew[1] ? `#/empresa/b?id=${firstNew[0].id}` : '#/empresa/busquedas')}
        ${stat(jobs.filter(j => j.status === 'activa').length, 'Búsquedas activas', 'ph-briefcase', '#/empresa/busquedas')}
        ${stat(apps.length, 'Postulantes en total', 'ph-users', '#/empresa/candidatos')}
        ${isCons ? stat(clientsOf(jobs).length, 'Empresas cliente', 'ph-buildings', '#/empresa/perfil?tab=clientes') : ''}
      </div>` : ''}
      <div class="mt-10 grid lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] gap-8 items-start">
        <section aria-labelledby="todo-t">
          <div class="flex items-end justify-between gap-3"><h2 id="todo-t" class="text-[1.5rem] font-extrabold">Para hacer hoy</h2>${todos.length ? `<span class="text-ink-mute font-semibold">${todos.length} pendiente${todos.length === 1 ? '' : 's'}</span>` : ''}</div>
          ${todos.length ? `<ul class="mt-4 card divide-y divide-line overflow-hidden">${todos.map(todoRow).join('')}</ul>
            ${todos.length > SHOW ? `<button type="button" id="todo-more" class="mt-3 font-semibold text-brand hover:underline underline-offset-4">Ver ${todos.length - SHOW} más</button>` : ''}`
          : `<div class="mt-4 card p-6 flex items-center gap-4">${fedfu('w-12 h-12')}<div><p class="font-bold text-lg">¡Todo al día!</p><p class="text-ink-soft">${jobs.length ? 'No hay nada pendiente. Te aviso acá cuando lleguen CVs o responda un cliente.' : 'Publicá tu primera búsqueda o cargá ejemplos para ver cómo funciona.'}</p></div></div>
            ${jobs.length ? '' : `<div class="mt-4 flex flex-wrap gap-2">${showGuide ? '' : '<button class="btn btn-primary" data-publish><i class="ph-bold ph-plus"></i>Publicar búsqueda</button>'}<button type="button" data-load-demo class="btn btn-outline"><i class="ph ph-users-three"></i>Cargar ejemplos</button></div>`}`}
        </section>
        <aside class="space-y-3">
          ${BILLING ? `<h2 class="text-[1.5rem] font-extrabold">Tu plan</h2>
          <section class="card p-4" aria-label="Tu plan">${planMeter(co, true)}</section>` : `<h2 class="text-[1.5rem] font-extrabold">Accesos rápidos</h2>
          <ul class="card divide-y divide-line overflow-hidden">${[['#/empresa/busquedas', 'ph-briefcase', 'Búsquedas'], ['#/empresa/candidatos', 'ph-database', 'Base de datos'], ['#/empresa/entrevistas', 'ph-calendar-blank', 'Entrevistas'], ['#/empresa/reportes', 'ph-chart-bar', 'Reportes']].map(([h, ic, l]) => `<li><a href="${h}" class="flex items-center gap-3 px-4 py-3.5 font-semibold hover:bg-surface"><i class="ph ${ic} text-xl text-brand"></i>${l}<i class="ph-bold ph-caret-right ml-auto text-ink-mute"></i></a></li>`).join('')}</ul>`}
          ${(() => { const nb = Store.hubReqs().filter(r => r.status === 'abierto' && r.company !== co.name && (Store.job(r.jobId) || {}).status === 'activa').length;
            return `<a href="#/empresa/hub" class="mt-5 block rounded-[22px] bg-lilac p-5 hover:shadow-lift transition">
            <p class="flex items-center gap-2 font-display font-extrabold text-[1.2rem]"><i class="ph-fill ph-users-three text-brand text-2xl"></i>Hub de selectores</p>
            <p class="mt-1.5 text-ink-soft leading-snug">${nb ? `<b class="text-ink">${nb} pedido${nb === 1 ? '' : 's'}</b> de otros selectores buscando perfiles. ¿Tenés a alguien que no te sirvió?` : 'Pedí recomendaciones para tus búsquedas difíciles o pasale un buen candidato a otro selector.'}</p>
            <span class="mt-3 inline-flex items-center gap-1 font-semibold text-brand">Ir al Hub<i class="ph-bold ph-arrow-right"></i></span></a>`; })()}
        </aside>
      </div>
    </div>`;
    return {
      html, mount() {
        $$('[data-publish]').forEach(b => b.onclick = () => { if (canActivate(co)) openPublish(); });
        $$('[data-load-demo]').forEach(b => b.onclick = loadDemo);
        const gh = $('#guide-hide'); if (gh) gh.onclick = () => { hideGuide(co); render(); toast('Guía oculta. Los pendientes siguen en “Para hacer hoy”.', 'ph-eye-slash'); };
        $$('[data-todo-notify]').forEach(b => b.onclick = () => openRejectSheet(b.dataset.todoNotify, { onDone: () => { S.dirty = true; } }));
        $$('[data-todo-feature]').forEach(b => b.onclick = () => openFeature(b.dataset.todoFeature));
        const m = $('#todo-more'); if (m) m.onclick = () => { $$('.todo-more').forEach(x => x.classList.remove('hidden')); m.remove(); };
      }
    };
  }

  const ROWBTN = 'btn btn-sm w-full justify-center min-w-0 px-2.5 gap-1.5 max-[359px]:px-1.5 max-[359px]:gap-1 max-[359px]:text-[0.9rem] max-[359px]:[&>i]:hidden';
  /* ================= BÚSQUEDAS: una tarjeta por cliente → página del cliente ================= */
  const OWN = '__propias';
  function clientGroups(co) {
    const jobs = myJobs(co), ids = new Set(jobs.map(j => j.id));
    const apps = Store.apps().filter(a => ids.has(a.jobId));
    const isCons = co.type === 'Consultora';
    const by = {};
    jobs.forEach(j => { const k = isCons && j.client ? j.client : OWN; (by[k] = by[k] || []).push(j); });
    return Object.entries(by).map(([k, js]) => {
      const cl = k === OWN ? null : Store.client(co.name, k);
      const prof = k === OWN ? Store.coProfile(co.name) : {};
      const ja = apps.filter(a => js.some(j => j.id === a.jobId));
      const provs = {}; js.forEach(j => { provs[j.province] = (provs[j.province] || 0) + 1; });
      const topProv = Object.entries(provs).sort((a, b) => b[1] - a[1])[0];
      return {
        key: k, name: k === OWN ? (isCons ? 'Búsquedas propias' : co.name) : k, logoName: k === OWN ? co.name : k,
        industry: k === OWN ? (prof.industry || '') : ((cl && cl.industry) || js[0].clientIndustry || ''),
        city: (cl && cl.city) || (k === OWN && prof.city) || '', province: (cl && cl.province) || (k === OWN && prof.province) || (topProv ? topProv[0] : ''),
        jobs: js, active: js.filter(j => j.status === 'activa').length, apps: ja.length, nNew: ja.filter(a => a.status === 'Nuevo').length,
        feat: js.some(j => Store.isFeatured(j)), last: js.map(j => j.postedAt).sort().pop(), cl
      };
    });
  }
  const chipSt = on => `<span class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.88rem] font-bold ${on ? 'bg-ok/10 text-ok' : 'bg-surface text-ink-mute border border-line'}"><span class="w-2 h-2 rounded-full ${on ? 'bg-ok' : 'bg-ink-mute/60'}"></span>${on ? 'Activo' : 'Inactivo'}</span>`;

  function CoDash() {
    const co = Store.company();
    trimPlanFeatured(co);
    const F = S.dash || (S.dash = { q: '', st: 'all' });
    const all = clientGroups(co);
    const nJobs = all.reduce((s2, g) => s2 + g.jobs.length, 0);
    const html = `<section class="bg-brand-soft">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 py-10 md:py-14 text-center">
          <h1 class="text-[2.1rem] sm:text-[2.6rem] leading-tight font-extrabold">Búsquedas</h1>
          <nav class="mt-2 text-ink-soft font-semibold" aria-label="Migas de pan"><a href="#/empresa" class="hover:text-brand">Inicio</a><span class="mx-2 text-ink-mute">/</span><span class="text-ink" aria-current="page">Búsquedas</span></nav>
        </div>
      </section>
      <div class="max-w-5xl mx-auto px-4 sm:px-6 py-8 md:py-12">
        ${nJobs ? `<div class="flex flex-col md:flex-row gap-3 md:items-center">
          <div class="relative flex-1"><i class="ph ph-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-xl text-ink-mute pointer-events-none"></i>
            <input id="ds-q" type="search" class="input pl-12" placeholder="Buscar cliente o puesto" value="${esc(F.q)}" aria-label="Buscar cliente o puesto"></div>
          <div class="max-w-full overflow-x-auto self-start md:self-auto"><div class="inline-flex rounded-full bg-white border border-line p-1 whitespace-nowrap" role="tablist" aria-label="Estado">
            ${[['all', 'Todos'], ['on', 'Activos'], ['off', 'Inactivos']].map(([v, l]) => `<button type="button" role="tab" data-dst="${v}" aria-selected="${F.st === v}" class="h-10 px-4 rounded-full font-semibold ${F.st === v ? 'bg-ink text-white' : 'text-ink-soft hover:text-ink'}">${l}</button>`).join('')}
          </div></div>
          <button class="btn btn-primary h-12 shrink-0" data-publish><i class="ph-bold ph-plus"></i>Publicar búsqueda</button>
        </div>
        <p id="ds-count" class="mt-6 font-semibold text-ink" aria-live="polite"></p>
        <ul id="ds-list" class="mt-4 space-y-5"></ul>`
        : `<div class="grid">${emptyState('ph-briefcase', 'Publicá tu primera búsqueda', 'En 2 minutos queda visible para candidatos de todo el país. ¿Querés ver cómo funciona antes? Cargá búsquedas y postulantes de ejemplo.', '<div class="flex flex-wrap justify-center gap-2"><button class="btn btn-primary" data-publish><i class="ph-bold ph-plus"></i>Publicar búsqueda</button><button type="button" data-load-demo class="btn btn-outline"><i class="ph ph-users-three"></i>Cargar ejemplos</button></div>')}</div>`}
      </div>`;
    function draw() {
      const q = norm(F.q.trim());
      const list = all.filter(g => (F.st === 'all' || (F.st === 'on' ? g.active : !g.active)) && (!q || norm(`${g.name} ${g.industry} ${g.jobs.map(j => j.title).join(' ')}`).includes(q)))
        .sort((a, b) => (b.active > 0) - (a.active > 0) || b.nNew - a.nNew || (b.last || '').localeCompare(a.last || ''));
      $('#ds-count').textContent = list.length ? `${list.length} ${co.type === 'Consultora' ? `cliente${list.length === 1 ? '' : 's'}` : `grupo${list.length === 1 ? '' : 's'}`} · ${(n => `${n} búsqueda${n === 1 ? '' : 's'}`)(list.reduce((s2, g) => s2 + g.jobs.length, 0))}` : 'Sin resultados';
      $('#ds-list').innerHTML = list.length ? list.map(g => {
        const loc = [g.city, g.province].filter(Boolean).join(', ');
        return `<li><a href="#/empresa/cliente?n=${encodeURIComponent(g.key)}" class="group flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 rounded-[18px] bg-white border border-line px-5 py-5 sm:px-7 sm:py-6 hover:border-brand/40 hover:shadow-lift transition">
          <div class="flex items-start sm:items-center gap-4 sm:gap-6 min-w-0 flex-1">
            <span class="rounded-full overflow-hidden shrink-0">${logo(g.logoName, 'w-14 h-14 sm:w-16 sm:h-16 text-base !rounded-full')}</span>
            <span class="min-w-0">
              <span class="flex flex-wrap items-center gap-x-3 gap-y-0.5"><span class="font-display font-bold text-[1.25rem] leading-tight group-hover:text-brand">${esc(g.name)}</span>${g.feat ? '<span class="text-ok font-semibold text-[0.92rem]">Destacada</span>' : ''}</span>
              <span class="mt-1.5 flex flex-wrap items-center gap-x-6 gap-y-1 text-ink-soft">
                ${loc ? `<span class="inline-flex items-center gap-1.5"><i class="ph ph-map-pin text-lg"></i>${esc(loc)}</span>` : ''}
                ${g.industry ? `<span class="inline-flex items-center gap-1.5"><i class="ph ph-briefcase text-lg"></i>${esc(g.industry)}</span>` : ''}
                <span class="inline-flex items-center gap-1.5"><i class="ph ph-users text-lg"></i>${g.apps} postulante${g.apps === 1 ? '' : 's'}</span>
              </span>
            </span>
          </div>
          <span class="flex flex-wrap items-center gap-2 sm:justify-end shrink-0 sm:max-w-[16rem]">
            ${g.nNew ? `<span class="rounded-full bg-bad text-white px-3 py-1 text-[0.88rem] font-bold">${g.nNew} nuevo${g.nNew === 1 ? '' : 's'}</span>` : ''}
            ${chipSt(g.active)}
            <span class="rounded-full bg-brand-soft text-brand px-3.5 py-1 text-[0.92rem] font-semibold">${g.jobs.length === 1 ? '1 búsqueda' : `${g.jobs.length} búsquedas`}</span>
          </span></a></li>`;
      }).join('') : `<li>${emptyState('ph-magnifying-glass', 'No encontramos clientes', 'Probá con otro nombre o cambiá el filtro de estado.')}</li>`;
    }
    return {
      html, mount() {
        $$('[data-publish]').forEach(b => b.onclick = () => { if (canActivate(co)) openPublish(''); });
        $$('[data-load-demo]').forEach(b => b.onclick = loadDemo);
        if (!nJobs) return;
        draw();
        let t; $('#ds-q').addEventListener('input', e => { clearTimeout(t); t = setTimeout(() => { F.q = e.target.value; draw(); }, 150); });
        $$('[data-dst]').forEach(b => b.onclick = () => { F.st = b.dataset.dst; $$('[data-dst]').forEach(x => { const on = x === b; x.setAttribute('aria-selected', on); x.className = `h-10 px-4 rounded-full font-semibold ${on ? 'bg-ink text-white' : 'text-ink-soft hover:text-ink'}`; }); draw(); });
      }
    };
  }

  function ClientPage(params) {
    const co = Store.company(), key = params.get('n') || '';
    const g = clientGroups(co).find(x => x.key === key);
    if (!g) return { html: `<div class="max-w-3xl mx-auto px-4 sm:px-6 py-10 grid">${emptyState('ph-buildings', 'No encontramos este cliente', 'Puede que ya no tenga búsquedas.', '<a href="#/empresa/busquedas" class="btn btn-primary">Volver a Búsquedas</a>')}</div>` };
    const own = key === OWN, cl = g.cl || {}, prof = own ? Store.coProfile(co.name) : {};
    const d = own ? { contactName: prof.contactName || '', contactPhone: prof.contactPhone || '', contactEmail: prof.contactEmail || prof.email || '', website: prof.website || '', notes: prof.description || '' }
      : { contactName: cl.contactName || '', contactPhone: cl.contactPhone || '', contactEmail: cl.contactEmail || '', website: cl.website || '', notes: cl.notes || '' };
    const loc = [g.city, g.province].filter(Boolean).join(', ');
    const wa = d.contactPhone ? waLink(d.contactPhone, `Hola${d.contactName ? ' ' + d.contactName.split(/[ ,]/)[0] : ''}, te escribo de ${co.name} por las búsquedas de ${g.name}.`) : null;
    const ternas = g.jobs.filter(j => { const t = Store.ternaOfJob(j.id); return t && t.sharedAt; }).length;
    const since = g.jobs.map(j => j.postedAt).sort()[0];
    const appsAll = Store.apps();
    const jobsSorted = [...g.jobs].sort((a, b) => (b.status === 'activa') - (a.status === 'activa') || new Date(b.postedAt) - new Date(a.postedAt));
    const row = (l, v) => `<li class="flex items-start justify-between gap-4 py-3.5 border-b border-line/80 last:border-0"><span class="font-semibold text-ink shrink-0">${l}</span><span class="text-right text-ink-soft min-w-0 break-words">${v || '<span class="text-ink-mute italic">Sin dato</span>'}</span></li>`;
    const html = `<section class="bg-gradient-to-br from-brand-soft via-[#EEF1FF] to-[#E4E9FF]">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-10 md:pb-14">
          <a href="#/empresa/busquedas" class="inline-flex items-center gap-1.5 font-semibold text-ink-soft hover:text-brand"><i class="ph-bold ph-arrow-left"></i>Búsquedas</a>
          <div class="mt-6 flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-10">
            <div class="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-7 min-w-0 flex-1">
              <span class="rounded-2xl overflow-hidden shrink-0 ring-4 ring-white w-fit">${logo(g.logoName, 'w-24 h-24 sm:w-28 sm:h-28 text-3xl !rounded-2xl')}</span>
              <div class="min-w-0">
                <h1 class="text-[2rem] sm:text-[2.4rem] leading-tight font-extrabold flex flex-wrap items-center gap-x-3">${esc(g.name)}${g.feat ? '<span class="text-ok font-semibold text-[1rem]">Destacada</span>' : ''}</h1>
                <div class="mt-2 flex flex-wrap items-center gap-x-6 gap-y-1.5 text-ink-soft">
                  ${g.industry ? `<span class="inline-flex items-center gap-1.5"><i class="ph ph-briefcase text-lg"></i>${esc(g.industry)}</span>` : ''}
                  ${loc ? `<span class="inline-flex items-center gap-1.5"><i class="ph ph-map-pin text-lg"></i>${esc(loc)}</span>` : ''}
                  ${d.contactPhone ? `<span class="inline-flex items-center gap-1.5"><i class="ph ph-phone text-lg"></i>${esc(d.contactPhone)}</span>` : ''}
                  ${d.contactEmail ? `<a href="mailto:${esc(d.contactEmail)}" class="inline-flex items-center gap-1.5 hover:text-brand"><i class="ph ph-envelope-simple text-lg"></i>${esc(d.contactEmail)}</a>` : ''}
                </div>
                <div class="mt-3 flex flex-wrap gap-2"><span class="rounded-full bg-[#DCE3FF] text-brand px-4 py-1.5 font-semibold">${g.active} búsqueda${g.active === 1 ? '' : 's'} activa${g.active === 1 ? '' : 's'}</span>${g.nNew ? `<span class="rounded-full bg-bad text-white px-4 py-1.5 font-bold">${g.nNew} nuevo${g.nNew === 1 ? '' : 's'}</span>` : ''}</div>
              </div>
            </div>
            <div class="flex flex-wrap items-center gap-3 shrink-0">
              <button type="button" class="btn btn-primary h-14 px-7 text-[1.05rem]" data-cl-publish><i class="ph-bold ph-plus text-xl"></i>Publicar búsqueda</button>
              ${wa ? `<a href="${wa}" target="_blank" rel="noopener" class="btn h-14 px-6 text-[1.05rem] bg-[#25D366] text-white hover:brightness-95"><i class="ph-fill ph-whatsapp-logo text-xl"></i>WhatsApp</a>` : ''}
            </div>
          </div>
        </div>
      </section>
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-10 md:py-14 grid gap-10 lg:grid-cols-[minmax(0,1fr)_23rem] items-start">
        <div class="min-w-0 space-y-10">
          <section aria-labelledby="cl-about">
            <h2 id="cl-about" class="text-[1.4rem] font-extrabold">${own ? 'Sobre la empresa' : 'Sobre el cliente'}</h2>
            ${d.notes ? `<p class="mt-3 text-ink-soft text-[1.05rem] leading-relaxed whitespace-pre-line">${esc(d.notes)}</p>` : `<p class="mt-3 text-ink-mute">Todavía no hay notas. ${own ? 'Completá la descripción en Perfil.' : 'Agregá lo que tu equipo tiene que saber de este cliente: cómo trabaja, qué valora, plazos.'}</p>`}
          </section>
          <section aria-labelledby="cl-jobs">
            <h2 id="cl-jobs" class="text-[1.4rem] font-extrabold">${own ? 'Búsquedas' : 'Búsquedas de este cliente'} <span class="text-ink-mute font-bold">(${g.jobs.length})</span></h2>
            <ul class="mt-4 space-y-3">${jobsSorted.map(j => {
              const ja = appsAll.filter(a => a.jobId === j.id), nn = ja.filter(a => a.status === 'Nuevo').length, t = Store.ternaOfJob(j.id);
              const tern = t && t.items.length ? (t.response ? 'Terna respondida' : t.sharedAt ? 'Terna enviada' : 'Terna en borrador') : '';
              return `<li><a href="#/empresa/b?id=${j.id}" class="group flex flex-col sm:flex-row sm:items-center gap-3 rounded-[16px] bg-white border border-line px-5 py-4 hover:border-brand/40 hover:shadow-lift transition ${j.status === 'activa' ? '' : 'opacity-75'}">
                <span class="min-w-0 flex-1">
                  <span class="flex flex-wrap items-center gap-x-2"><span class="font-bold text-[1.1rem] group-hover:text-brand">${esc(j.title)}</span>${Store.isFeatured(j) ? '<i class="ph-fill ph-star text-warn" title="Destacada"></i>' : ''}</span>
                  <span class="mt-1 flex flex-wrap gap-x-5 gap-y-0.5 text-ink-soft text-[0.95rem]"><span class="inline-flex items-center gap-1.5"><i class="ph ph-map-pin"></i>${esc(j.city)}</span><span class="inline-flex items-center gap-1.5"><i class="ph ph-clock"></i>${ago(j.postedAt)}</span><span class="inline-flex items-center gap-1.5"><i class="ph ph-users"></i>${ja.length} postulante${ja.length === 1 ? '' : 's'}</span>${tern ? `<span class="inline-flex items-center gap-1.5 ${t.response ? 'text-ok' : t.sharedAt ? '' : 'text-warn'} font-semibold"><i class="ph ph-list-checks"></i>${tern}</span>` : ''}</span>
                </span>
                <span class="flex items-center gap-2 shrink-0">${nn ? `<span class="rounded-full bg-bad text-white px-2.5 py-0.5 text-[0.82rem] font-bold">${nn} nuevo${nn === 1 ? '' : 's'}</span>` : ''}${chipSt(j.status === 'activa')}<i class="ph-bold ph-caret-right text-ink-mute hidden sm:block"></i></span>
              </a></li>`;
            }).join('')}</ul>
          </section>
        </div>
        <aside class="rounded-[20px] bg-[#EEF0F7] p-6 sm:p-8 lg:sticky lg:top-24">
          <h2 class="font-display font-bold text-[1.15rem]">Datos ${own ? 'de la empresa' : 'del cliente'}</h2>
          <ul class="mt-2">
            ${row('Rubro', esc(g.industry))}
            ${row('Ubicación', esc(loc))}
            ${row('Contacto', esc(d.contactName))}
            ${row('Teléfono', d.contactPhone ? `${esc(d.contactPhone)}${wa ? ` <a href="${wa}" target="_blank" rel="noopener" class="ml-1 inline-flex align-middle text-[#1A9E4F]" aria-label="WhatsApp"><i class="ph-fill ph-whatsapp-logo text-lg"></i></a>` : ''}` : '')}
            ${row('Email', d.contactEmail ? `<a href="mailto:${esc(d.contactEmail)}" class="text-brand hover:underline underline-offset-2">${esc(d.contactEmail)}</a>` : '')}
            ${row('Sitio web', d.website ? `<a href="${esc(toUrl(d.website))}" target="_blank" rel="noopener" class="text-brand hover:underline underline-offset-2">${esc(d.website.replace(/^https?:\/\//, '').replace(/\/$/, ''))}</a>` : '')}
            ${own ? '' : row('Nombre visible', cl.showName ? 'Sí, se muestra a candidatos' : 'No, “Empresa confidencial”')}
          </ul>
          <h2 class="mt-6 font-display font-bold text-[1.15rem]">Actividad</h2>
          <ul class="mt-2">
            ${row('Búsquedas activas', `${g.active} de ${g.jobs.length}`)}
            ${row('Postulantes', String(g.apps))}
            ${row('Sin revisar', String(g.nNew))}
            ${row('Ternas enviadas', String(ternas))}
            ${row(own ? 'Primera búsqueda' : 'Cliente desde', since ? new Date(since).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }) : '')}
          </ul>
          ${own ? '<a href="#/empresa/perfil" class="mt-6 btn btn-outline w-full justify-center bg-white"><i class="ph ph-pencil-simple"></i>Editar datos en Perfil</a>' : '<button type="button" class="mt-6 btn btn-outline w-full justify-center bg-white" data-cl-edit><i class="ph ph-pencil-simple"></i>Editar datos del cliente</button>'}
        </aside>
      </div>`;
    return {
      title: g.name,
      html, mount() {
        $('[data-cl-publish]').onclick = () => { if (canActivate(co)) openPublish(own ? '' : g.key); };
        const ed = $('[data-cl-edit]'); if (ed) ed.onclick = () => openClientSheet(g.key);
      }
    };
  }

  /* Borrador de Fedfu para publicar: con el puesto busca la búsqueda más parecida (misma área y palabras del título)
     y copia descripción, requisitos, skills y experiencia. Si no hay ninguna, usa una plantilla por área.
     En producción: reemplazar por una llamada a la IA con el mismo formato de salida. */
  const AREA_TASKS = {
    administracion: 'gestionar la agenda, la facturación y la documentación del área, y atender consultas de clientes y proveedores',
    finanzas: 'llevar registros contables, conciliaciones e impuestos, y preparar reportes para la gerencia',
    ventas: 'atender y ampliar la cartera de clientes, preparar presupuestos y cumplir objetivos comerciales',
    tecnologia: 'desarrollar y mantener sistemas, resolver incidencias y trabajar junto al resto del equipo',
    atencion: 'atender consultas y reclamos de clientes por teléfono, chat o en persona, y darles seguimiento',
    logistica: 'preparar pedidos, controlar stock y coordinar entregas',
    salud: 'brindar atención a pacientes siguiendo los protocolos de la institución',
    gastronomia: 'preparar y servir con calidad, y mantener el orden y la higiene del sector',
    oficios: 'realizar trabajos de instalación, reparación y mantenimiento',
    produccion: 'operar líneas de producción y cumplir los estándares de calidad y seguridad',
    marketing: 'planificar y crear contenido, gestionar redes y medir resultados de campañas',
    rrhh: 'llevar adelante búsquedas, entrevistas e incorporaciones, y acompañar al equipo',
    educacion: 'planificar y dar clases, y acompañar el aprendizaje de cada estudiante',
    comex: 'gestionar operaciones de importación y exportación, documentación y despachos',
    arquitectura: 'desarrollar proyectos, planos y cómputos, y hacer seguimiento de obra',
    ingenieria: 'liderar proyectos técnicos, controlar la calidad y proponer mejoras de procesos'
  };
  const AREA_RESP = {
    administracion: ['Gestionar la agenda y la documentación del área', 'Emitir y controlar facturas', 'Atender consultas de clientes y proveedores', 'Cargar y mantener al día la información en el sistema'],
    finanzas: ['Registrar operaciones contables', 'Hacer conciliaciones bancarias', 'Liquidar impuestos y presentar declaraciones', 'Preparar reportes para la gerencia'],
    ventas: ['Atender y ampliar la cartera de clientes', 'Preparar presupuestos y hacer seguimiento', 'Cumplir los objetivos comerciales del mes', 'Registrar cada oportunidad en el CRM'],
    tecnologia: ['Desarrollar y mantener sistemas', 'Resolver incidencias y pedidos de soporte', 'Documentar cambios y procesos', 'Trabajar junto al resto del equipo'],
    atencion: ['Atender consultas y reclamos por teléfono, chat o en persona', 'Dar seguimiento a cada caso hasta resolverlo', 'Registrar las interacciones en el sistema'],
    logistica: ['Preparar y despachar pedidos', 'Controlar el stock', 'Coordinar entregas y recorridos', 'Mantener el orden del depósito'],
    salud: ['Brindar atención a pacientes', 'Seguir los protocolos de la institución', 'Registrar cada intervención en la historia clínica'],
    gastronomia: ['Preparar y servir con calidad', 'Mantener el orden y la higiene del sector', 'Controlar insumos y mercadería'],
    oficios: ['Hacer trabajos de instalación y reparación', 'Realizar mantenimiento preventivo', 'Cumplir las normas de seguridad'],
    produccion: ['Operar las líneas de producción', 'Controlar la calidad del producto', 'Cumplir las normas de seguridad e higiene'],
    marketing: ['Planificar y crear contenido para redes', 'Gestionar campañas y publicaciones', 'Medir resultados y proponer mejoras'],
    rrhh: ['Llevar adelante búsquedas y entrevistas', 'Acompañar la incorporación de personas nuevas', 'Gestionar la documentación del personal'],
    educacion: ['Planificar y dar clases', 'Acompañar el aprendizaje de cada estudiante', 'Comunicarse con las familias y el equipo'],
    comex: ['Gestionar operaciones de importación y exportación', 'Preparar la documentación de cada operación', 'Coordinar con despachantes y transportes'],
    arquitectura: ['Desarrollar proyectos, planos y cómputos', 'Hacer seguimiento de obra', 'Coordinar con clientes y proveedores'],
    ingenieria: ['Liderar proyectos técnicos', 'Controlar la calidad de los procesos', 'Proponer mejoras y medir resultados']
  };
  const respOf = area => [...(AREA_RESP[area] || ['Encargarse de las tareas del día a día del puesto', 'Trabajar junto al resto del equipo'])];
  const PRO_AREAS = ['finanzas', 'salud', 'ingenieria', 'arquitectura'];
  function fedfuDraft(title, place) {
    const words = t => norm(t).split(/[^a-z0-9]+/).filter(w => w.length > 3 && !STOP.has(w)).map(w => w.slice(0, 5));
    const tw = words(title);
    const area = detectArea(title);
    let best = null, bestScore = 0;
    Store.jobs().forEach(j => {
      if (area && j.area !== area) return;
      const jw = words(j.title);
      const sc = tw.filter(w => jw.includes(w)).length;
      if (sc > bestScore || (sc === bestScore && sc && best && (j.skills || []).length > (best.skills || []).length)) { best = j; bestScore = sc; }
    });
    if (best && bestScore) {
      return { area: best.area, seniority: best.seniority, from: best.title, description: best.description,
        responsibilities: (best.responsibilities || []).length ? [...best.responsibilities] : respOf(best.area),
        requirements: [...(best.requirements || [])], skills: (best.skills || []).slice(0, 5) };
    }
    const sks = (AREA_SKILLS[area] || []).slice(0, 3);
    const t = title.trim(), lc = t.charAt(0).toLowerCase() + t.slice(1);
    return {
      area, seniority: null, from: '',
      description: `Buscamos ${lc} para sumarse al equipo${place ? ` en ${place}` : ''}. Vas a ${AREA_TASKS[area] || 'encargarte de las tareas del día a día del puesto junto al equipo'}.`,
      responsibilities: respOf(area),
      requirements: [PRO_AREAS.includes(area) ? 'Título habilitante' : 'Secundario completo', 'Experiencia previa en puestos similares',
        ...(sks.length ? [`Manejo de ${sks.slice(0, 2).join(' y ')}`] : []), 'Buena comunicación y trabajo en equipo'],
      skills: sks.map(n => ({ n, must: false }))
    };
  }

  function openPublish(presetClient = '') {
    const co = Store.company();
    const isCons = co.type === 'Consultora';
    const known = Store.clientsOf(co.name).map(x => x.name);
    const opt = (arr, sel) => arr.map(v => Array.isArray(v) ? `<option value="${v[0]}" ${v[0] === sel ? 'selected' : ''}>${esc(v[1])}</option>` : `<option ${v === sel ? 'selected' : ''}>${esc(v)}</option>`).join('');
    const seg = (name, arr, sel) => `<div class="grid grid-cols-${arr.length} gap-2">${arr.map(v => `<label class="cursor-pointer"><input type="radio" name="${name}" value="${v}" class="peer sr-only" ${v === sel ? 'checked' : ''}>
      <span class="flex items-center justify-center h-12 rounded-xl border border-line font-semibold text-[0.95rem] peer-checked:border-brand peer-checked:bg-brand-soft peer-checked:text-brand">${v}</span></label>`).join('')}</div>`;
    // Sección desplegable del paso 2: título, cuánto tiene cargado y el contenido
    const pfSec = (id, ic, title, inner) => `<details class="group rounded-2xl border border-line bg-white open:border-brand/40" data-sec="${id}">
      <summary class="flex items-center gap-3 px-4 min-h-[3.75rem] py-2.5 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <span class="w-10 h-10 rounded-xl bg-surface grid place-items-center shrink-0"><i class="ph ${ic} text-xl text-ink"></i></span>
        <span class="flex-1 min-w-0"><span class="block font-semibold leading-tight">${title}</span><span class="block text-[0.88rem] text-ink-mute leading-tight mt-0.5" data-sec-n="${id}">Opcional</span></span>
        <i class="ph-bold ph-caret-down text-ink-mute transition group-open:rotate-180 shrink-0"></i></summary>
      <div class="px-4 pb-4">${inner}</div></details>`;
    const body = `
      <div class="flex items-center gap-2 pr-10" aria-hidden="true"><span id="pf-bar1" class="h-1.5 flex-1 rounded-full bg-brand"></span><span id="pf-bar2" class="h-1.5 flex-1 rounded-full bg-line"></span></div>
      <p id="pf-stepl" class="mt-3 text-[0.92rem] font-bold text-brand">Paso 1 de 2 · Lo básico</p>
      <h2 class="text-[1.65rem] font-extrabold tracking-tight pr-10 mt-0.5">Publicar búsqueda</h2>
      <p id="pf-sub" class="text-ink-soft mt-1">Contanos el puesto y dónde es. Te armamos un borrador y vos lo revisás.</p>
      <form id="pub-form" class="mt-5" novalidate>
        <div data-pf-step="1" class="space-y-5">
          ${isCons ? `<div><label class="label" for="pf-client">Empresa cliente *</label>
            <input id="pf-client" class="input" list="pf-clients" placeholder="Ej: Estudio Contable Ruiz & Asoc." value="${esc(presetClient)}" autocomplete="off">
            <datalist id="pf-clients">${known.map(k => `<option value="${esc(k)}">`).join('')}</datalist>
            <p class="text-ink-mute text-[0.9rem] mt-1.5">Para quién es esta búsqueda. Elegí uno existente o escribí uno nuevo.</p></div>` : ''}
          <div><label class="label" for="pf-title">Puesto *</label><input id="pf-title" class="input" placeholder="Ej: Asistente administrativo/a" maxlength="80" enterkeyhint="next"></div>
          <div class="grid sm:grid-cols-2 gap-4">
            <div><label class="label" for="pf-prov">Provincia *</label><select id="pf-prov" class="input"><option value="">Elegí una provincia</option>${opt(PROVINCES)}</select></div>
            <div><label class="label" for="pf-city">Ciudad <span class="font-normal text-ink-mute">(opcional)</span></label><input id="pf-city" class="input" placeholder="Ej: San Miguel de Tucumán" enterkeyhint="next"></div>
          </div>
          <div class="rounded-2xl bg-peach border border-peach-line p-4 flex gap-3 items-start">${fedfu('w-10 h-10 shrink-0')}<p class="text-ink-soft leading-snug">Con el puesto, <b class="text-ink">completamos el área, la descripción, las responsabilidades, las calificaciones y las skills</b> a partir de búsquedas parecidas. En el paso 2 lo revisás y publicás.</p></div>
        </div>
        <div data-pf-step="2" class="space-y-5 hidden">
          <div id="pf-draft" class="rounded-2xl bg-peach border border-peach-line p-4 flex gap-3 items-start"></div>
          ${isCons ? `<div class="rounded-2xl bg-surface p-4 space-y-4">
            <div><label class="label" for="pf-ind">Rubro del cliente</label><input id="pf-ind" class="input" placeholder="Ej: Industria, Salud, Retail"></div>
            <label class="flex gap-3 items-start cursor-pointer">
              <input type="checkbox" id="pf-show" class="w-5 h-5 mt-0.5 accent-[#0866FF] shrink-0">
              <span><span class="font-semibold">Mostrar el nombre del cliente a los candidatos</span><span class="block text-ink-mute text-[0.92rem]">Si no lo tildás, la búsqueda aparece como “Empresa confidencial” con el rubro.</span></span>
            </label>
          </div>` : ''}
          <div class="grid sm:grid-cols-2 gap-4">
            <div><label class="label" for="pf-area">Área *</label><select id="pf-area" class="input"><option value="">Elegí un área</option>${opt(AREAS.map(a => [a.id, a.label]))}</select></div>
            <div><label class="label" for="pf-sen">Experiencia</label><select id="pf-sen" class="input">${opt(SENIORITIES.map(s => [s.id, s.label]), 'junior')}</select></div>
          </div>
          <div><p class="label">Modalidad</p>${seg('pf-mod', MODALITIES, 'Presencial')}</div>
          <div><p class="label">Jornada</p>${seg('pf-type', JOB_TYPES, 'Full time')}</div>
          <div><label class="label" for="pf-sal">Salario <span class="font-normal text-ink-mute">(opcional, recibe más postulantes)</span></label><input id="pf-sal" class="input" placeholder="Ej: $900.000 a $1.100.000"></div>
          <div><label class="label" for="pf-desc">Descripción del puesto *</label><textarea id="pf-desc" rows="4" class="input h-auto py-3" placeholder="De qué se trata el puesto y para qué equipo es."></textarea></div>
          <div class="space-y-2.5">
            ${pfSec('resp', 'ph-list-bullets', 'Responsabilidades', `<p class="text-ink-mute text-[0.9rem] mb-2">Qué va a hacer la persona. Una por línea.</p>
              <textarea id="pf-resp" rows="5" class="input h-auto py-3" placeholder="Atender a clientes&#10;Emitir facturas"></textarea>`)}
            ${pfSec('req', 'ph-graduation-cap', 'Calificaciones', `<p class="text-ink-mute text-[0.9rem] mb-2">Estudios, experiencia y lo que tiene que saber. Una por línea.</p>
              <textarea id="pf-req" rows="5" class="input h-auto py-3" placeholder="Secundario completo&#10;2 años de experiencia en el puesto"></textarea>`)}
            ${pfSec('qs', 'ph-funnel', 'Preguntas filtro', `<p class="text-ink-mute text-[0.9rem] mb-2">El candidato las responde al postularse. Si no cumple una excluyente, queda marcado.</p><div id="pf-qs"></div>`)}
            ${pfSec('sk', 'ph-wrench', 'Skills clave', `<p class="text-ink-mute text-[0.9rem] mb-2">Conocimientos técnicos. Tocá la <i class="ph-fill ph-star text-warn"></i> para marcar una como excluyente.</p>
              <div id="pf-sk-sel" class="flex flex-wrap gap-2"></div>
              <div id="pf-sk-sug" class="mt-3 flex flex-wrap gap-2"></div>
              <div class="mt-3 flex gap-2">
                <input id="pf-sk-new" class="input" placeholder="Agregar otra skill (ej: SAP)" maxlength="40" enterkeyhint="done" aria-label="Agregar otra skill">
                <button type="button" id="pf-sk-add" class="btn btn-outline shrink-0 px-4" aria-label="Agregar skill"><i class="ph-bold ph-plus text-lg"></i></button>
              </div>`)}
            ${pfSec('cp', 'ph-user-circle-check', 'Competencias', `<p class="text-ink-mute text-[0.9rem] mb-2">Elegí hasta 4, las que más importan para el puesto.</p>
              <div id="pf-cp" class="rounded-xl border border-line divide-y divide-line overflow-hidden"></div>
              <div class="mt-3 flex gap-2">
                <input id="pf-cp-new" class="input" placeholder="Agregar otra competencia" maxlength="40" enterkeyhint="done" aria-label="Agregar otra competencia">
                <button type="button" id="pf-cp-add" class="btn btn-outline shrink-0 px-4" aria-label="Agregar competencia"><i class="ph-bold ph-plus text-lg"></i></button>
              </div>`)}
            ${pfSec('ben', 'ph-gift', 'Beneficios', `<p class="text-ink-mute text-[0.9rem] mb-2">Tocá los que ofrece la empresa.</p>
              <div id="pf-ben" class="flex flex-wrap gap-2"></div>
              <div class="mt-3 flex gap-2">
                <input id="pf-ben-new" class="input" placeholder="Agregar otro beneficio" maxlength="40" enterkeyhint="done" aria-label="Agregar otro beneficio">
                <button type="button" id="pf-ben-add" class="btn btn-outline shrink-0 px-4" aria-label="Agregar beneficio"><i class="ph-bold ph-plus text-lg"></i><span class="hidden sm:inline">Agregar</span></button>
              </div>`)}
          </div>
        </div>
        <p id="pf-err" class="err hidden mt-4"></p>
      </form>`;
    const foot = `<button type="button" id="pf-next" class="btn btn-primary w-full h-14 text-lg">Continuar<i class="ph-bold ph-arrow-right text-xl"></i></button>
      <button type="button" id="pf-back" class="btn btn-outline h-14 px-5 shrink-0 hidden" aria-label="Volver al paso 1"><i class="ph-bold ph-arrow-left text-xl"></i><span class="max-sm:hidden">Volver</span></button>
      <button form="pub-form" id="pf-pub" class="btn btn-primary flex-1 h-14 text-lg hidden"><i class="ph-bold ph-rocket-launch text-xl"></i>Publicar búsqueda</button>`;
    openSheet(sheetScroll(body) + sheetFoot(foot), c => {
      const cl = $('#pf-client', c);
      // Beneficios: chips seleccionables + propios
      const lastOf = pred => Store.jobs().find(pred);
      const initialBen = isCons ? ((presetClient && (lastOf(j => j.client === presetClient) || {}).benefits) || [])
        : ((lastOf(j => j.company === co.name) || {}).benefits || companyOf(co.name).benefits || []);
      const ben = { opts: [...new Set([...COMMON_BENEFITS, ...initialBen])], sel: new Set(initialBen) };
      const benBox = $('#pf-ben', c), benNew = $('#pf-ben-new', c);
      const drawBen = () => {
        benBox.innerHTML = ben.opts.map(b => {
          const on = ben.sel.has(b);
          return `<button type="button" class="chip ${on ? 'chip-on' : ''}" data-ben="${esc(b)}" aria-pressed="${on}"><i class="${on ? 'ph-bold ph-check' : 'ph ph-plus'}"></i>${esc(b)}</button>`;
        }).join('');
      };
      const setBen = list => { list.forEach(b => { if (!ben.opts.includes(b)) ben.opts.push(b); }); ben.sel = new Set(list); drawBen(); };
      benBox.onclick = e => {
        const b = e.target.closest('[data-ben]'); if (!b) return;
        const k = b.dataset.ben; ben.sel.has(k) ? ben.sel.delete(k) : ben.sel.add(k); drawBen();
      };
      const addBen = () => {
        const t = benNew.value.trim().replace(/\s+/g, ' ');
        if (!t) return;
        const t2 = t.charAt(0).toUpperCase() + t.slice(1);
        const exists = ben.opts.find(o => norm(o) === norm(t2));
        const k = exists || t2;
        if (!exists) ben.opts.push(k);
        ben.sel.add(k); benNew.value = ''; drawBen(); benNew.focus();
      };
      $('#pf-ben-add', c).onclick = addBen;
      benNew.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addBen(); } });
      drawBen();

      // Skills clave (con excluyente) y competencias
      const sk = [], cp = [], cpOpts = [...COMPETENCIAS];
      const pfQs = [], syncQs = renderQEditor($('#pf-qs', c), pfQs);
      const lines = id => $('#' + id, c).value.split('\n').map(x => x.trim()).filter(Boolean);
      const plural = (n, a, b) => `${n} ${n === 1 ? a : b}`;
      function updSecs() {
        const set = (id, t) => { const el = $(`[data-sec-n="${id}"]`, c); if (el) { el.textContent = t || 'Opcional'; el.classList.toggle('text-brand', !!t); el.classList.toggle('text-ink-mute', !t); el.classList.toggle('font-semibold', !!t); } };
        const r = lines('pf-resp').length, q = lines('pf-req').length;
        set('resp', r ? plural(r, 'cargada', 'cargadas') : '');
        set('req', q ? plural(q, 'cargada', 'cargadas') : '');
        syncQs(); const nq = cleanQs(pfQs).length; set('qs', nq ? plural(nq, 'pregunta', 'preguntas') : '');
        const nm = sk.filter(x => x.must).length; set('sk', sk.length ? `${plural(sk.length, 'skill', 'skills')}${nm ? `, ${nm} excluyente${nm === 1 ? '' : 's'}` : ''}` : '');
        set('cp', cp.length ? `${cp.length} de 4 elegidas` : '');
        set('ben', ben.sel.size ? plural(ben.sel.size, 'elegido', 'elegidos') : '');
      }
      c.addEventListener('input', () => updSecs());
      c.addEventListener('click', () => setTimeout(updSecs, 0));
      const cap = t => { t = t.trim().replace(/\s+/g, ' '); return t.charAt(0).toUpperCase() + t.slice(1); };
      const drawSk = () => {
        $('#pf-sk-sel', c).innerHTML = sk.length ? sk.map((x, i) => `<span class="inline-flex items-center gap-0.5 h-10 pl-1 pr-1 rounded-full font-semibold ${x.must ? 'bg-sun-soft text-ink border border-sun' : 'bg-brand-soft text-brand'}">
          <button type="button" class="w-8 h-8 grid place-items-center rounded-full hover:bg-black/5" data-sk-must="${i}" aria-pressed="${x.must}" title="${x.must ? 'Quitar excluyente' : 'Marcar como excluyente'}" aria-label="${x.must ? 'Quitar excluyente a' : 'Marcar como excluyente'} ${esc(x.n)}"><i class="${x.must ? 'ph-fill text-warn' : 'ph'} ph-star text-lg"></i></button>
          <span class="px-0.5">${esc(x.n)}</span>${x.must ? '<span class="text-[0.78rem] font-bold text-warn pr-1">excluyente</span>' : ''}
          <button type="button" class="w-8 h-8 grid place-items-center rounded-full hover:bg-black/5" data-sk-del="${i}" aria-label="Quitar ${esc(x.n)}"><i class="ph-bold ph-x text-sm"></i></button></span>`).join('')
          : '<span class="text-ink-mute">Elegí de las sugeridas o escribí las tuyas.</span>';
        const area = $('#pf-area', c).value;
        const sug = (AREA_SKILLS[area] || []).filter(n => !sk.some(x => norm(x.n) === norm(n)));
        $('#pf-sk-sug', c).innerHTML = sug.length ? sug.map(n => `<button type="button" class="chip h-9 px-3 text-[0.9rem]" data-sk-add="${esc(n)}"><i class="ph ph-plus"></i>${esc(n)}</button>`).join('')
          : (area ? '' : '<span class="text-ink-mute text-[0.92rem]">Elegí el área para ver sugerencias.</span>');
      };
      const drawCp = () => {
        const full = cp.length >= 4;
        $('#pf-cp', c).innerHTML = cpOpts.map(n => { const on = cp.includes(n), off = full && !on; return `<label class="flex items-center gap-3 px-4 min-h-[3rem] py-2 ${off ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-surface'} ${on ? 'bg-brand-soft/50' : ''}">
          <input type="checkbox" class="w-5 h-5 accent-[#3B5BFD] shrink-0" data-cp="${esc(n)}" ${on ? 'checked' : ''} ${off ? 'disabled' : ''}><span class="font-medium">${esc(n)}</span></label>`; }).join('');
        updSecs();
      };
      const addSk = n => { n = cap(n); if (n && !sk.some(x => norm(x.n) === norm(n))) sk.push({ n, must: false }); drawSk(); };
      const addCp = n => { n = cap(n); if (!n) return; const ex = cpOpts.find(o => norm(o) === norm(n)); if (!ex) cpOpts.push(n); const v = ex || n; if (!cp.includes(v)) { if (cp.length >= 4) { toast('Elegí hasta 4 competencias', 'ph-info'); } else cp.push(v); } drawCp(); };
      c.addEventListener('click', e => {
        const m = e.target.closest('[data-sk-must]'); if (m) { const x = sk[+m.dataset.skMust]; x.must = !x.must; drawSk(); return; }
        const d = e.target.closest('[data-sk-del]'); if (d) { sk.splice(+d.dataset.skDel, 1); drawSk(); return; }
        const a = e.target.closest('[data-sk-add]'); if (a) { addSk(a.dataset.skAdd); return; }
      });
      c.addEventListener('change', e => { const q = e.target.closest('[data-cp]'); if (q) { const v = q.dataset.cp, i = cp.indexOf(v); if (i >= 0) cp.splice(i, 1); else addCp(v); drawCp(); } });
      $('#pf-area', c).addEventListener('change', drawSk);
      $('#pf-sk-add', c).onclick = () => { addSk($('#pf-sk-new', c).value); $('#pf-sk-new', c).value = ''; };
      $('#pf-sk-new', c).addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('#pf-sk-add', c).click(); } });
      $('#pf-cp-add', c).onclick = () => { addCp($('#pf-cp-new', c).value); $('#pf-cp-new', c).value = ''; };
      $('#pf-cp-new', c).addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('#pf-cp-add', c).click(); } });
      drawSk(); drawCp();

      // Al elegir un cliente existente se copian su rubro y su visibilidad; al escribir uno nuevo se limpian.
      let auto = null;
      const syncClient = () => {
        const name = cl.value.trim();
        const fic = name ? Store.client(co.name, name) : null;
        const prev = name ? Store.jobs().find(j => j.company === co.name && j.client === name) : null;
        const ind = $('#pf-ind', c), show = $('#pf-show', c);
        if (fic || prev) {
          if (!ind.value || (auto && ind.value === auto.ind)) ind.value = (fic ? fic.industry : prev.clientIndustry) || '';
          show.checked = fic ? !!fic.showName : !!prev.showClient;
          if (!ben.sel.size || auto) setBen((prev && prev.benefits) || []);
          auto = { ind: ind.value };
        } else if (auto) {
          if (ind.value === auto.ind) ind.value = '';
          show.checked = false;
          setBen([]);
          auto = null;
        }
      };
      if (cl) { cl.addEventListener('input', syncClient); cl.addEventListener('change', syncClient); if (presetClient) syncClient(); }
      // Dos pasos: 1) cliente, puesto y lugar · 2) Fedfu propone el resto y se revisa
      const v = id => $('#' + id, c).value.trim();
      const err = $('#pf-err', c);
      const check = list => {
        const missing = list.filter(([id]) => !v(id));
        $$('.input', c).forEach(i => i.classList.remove('!border-bad'));
        err.classList.add('hidden');
        if (!missing.length) return true;
        missing.forEach(([id]) => $('#' + id, c).classList.add('!border-bad'));
        err.textContent = `Falta completar ${missing.map(m => m[1]).join(', ')}.`;
        err.classList.remove('hidden');
        $('#' + missing[0][0], c).focus();
        return false;
      };
      const STEP1 = [...(isCons ? [['pf-client', 'la empresa cliente']] : []), ['pf-title', 'el puesto'], ['pf-prov', 'la provincia']];
      let step = 1, draftKey = '', edited = false;
      ['pf-desc', 'pf-req', 'pf-resp'].forEach(id => $('#' + id, c).addEventListener('input', () => { edited = true; }));
      $('#pf-sk-sel', c).addEventListener('click', () => { edited = true; });
      $('#pf-sk-sug', c).addEventListener('click', () => { edited = true; });
      const setStep = n => {
        step = n;
        $$('[data-pf-step]', c).forEach(el => el.classList.toggle('hidden', el.dataset.pfStep !== String(n)));
        $('#pf-next', c).classList.toggle('hidden', n !== 1);
        $('#pf-back', c).classList.toggle('hidden', n !== 2);
        $('#pf-pub', c).classList.toggle('hidden', n !== 2);
        $('#pf-bar2', c).className = `h-1.5 flex-1 rounded-full ${n === 2 ? 'bg-brand' : 'bg-line'}`;
        $('#pf-stepl', c).textContent = n === 1 ? 'Paso 1 de 2 · Lo básico' : 'Paso 2 de 2 · Revisá y publicá';
        $('#pf-sub', c).textContent = n === 1 ? 'Contanos el puesto y dónde es. Te armamos un borrador y vos lo revisás.' : `${v('pf-title')} · ${v('pf-city') ? v('pf-city') + ', ' : ''}${v('pf-prov')}${isCons ? ` · ${v('pf-client')}` : ''}`;
        err.classList.add('hidden');
        const sc = c.querySelector('.sheet-scroll'); if (sc) sc.scrollTop = 0;
      };
      const goNext = () => {
        if (!check(STEP1)) return;
        const key = norm(v('pf-title'));
        if (key !== draftKey && !edited) {
          const d = fedfuDraft(v('pf-title'), v('pf-city') || v('pf-prov'));
          draftKey = key;
          $('#pf-area', c).value = d.area || '';
          if (d.seniority) $('#pf-sen', c).value = d.seniority;
          $('#pf-desc', c).value = d.description;
          $('#pf-req', c).value = d.requirements.join('\n');
          $('#pf-resp', c).value = (d.responsibilities || []).join('\n');
          updSecs();
          sk.splice(0, sk.length, ...d.skills.map(x => ({ ...x })));
          drawSk();
          $('#pf-draft', c).innerHTML = `${fedfu('w-10 h-10 shrink-0')}<div class="min-w-0"><p class="font-bold leading-snug">Te armamos un borrador</p>
            <p class="text-ink-soft leading-snug mt-0.5">${d.from ? `Basado en búsquedas parecidas a “${esc(d.from)}”.` : 'Con lo típico para este puesto.'} Revisá la descripción, las responsabilidades y las calificaciones: podés cambiar todo o publicar así.</p>
            ${d.area ? '' : '<p class="text-warn font-semibold mt-1">No reconocí el área: elegila abajo.</p>'}</div>`;
        }
        setStep(2);
      };
      $('#pf-next', c).onclick = goNext;
      $('#pf-back', c).onclick = () => setStep(1);
      $('#pub-form', c).onsubmit = e => {
        e.preventDefault();
        if (step === 1) { goNext(); return; }
        if (!check(STEP1)) { setStep(1); check(STEP1); return; }
        if (!check([['pf-area', 'el área'], ['pf-desc', 'la descripción']])) return;
        const newId = 'u' + Date.now();
        Store.addJob({
          id: newId, title: v('pf-title'), company: co.name, companyType: co.type, area: v('pf-area'), seniority: v('pf-sen'),
          province: v('pf-prov'), city: v('pf-city') || v('pf-prov'), modality: $('input[name="pf-mod"]:checked', c).value,
          type: $('input[name="pf-type"]:checked', c).value, salary: v('pf-sal') || null, description: v('pf-desc'),
          responsibilities: lines('pf-resp'), requirements: lines('pf-req'), benefits: [...ben.sel],
          skills: sk.map(x => ({ ...x })), comps: [...cp], questions: (syncQs(), cleanQs(pfQs)),
          postedAt: new Date().toISOString(), status: 'activa',
          ...(isCons ? { client: v('pf-client'), clientIndustry: v('pf-ind'), showClient: $('#pf-show', c).checked } : {})
        });
        // La ficha del cliente queda creada/actualizada con lo cargado acá
        if (isCons) Store.saveClient(co.name, null, { name: v('pf-client'), industry: v('pf-ind'), showName: $('#pf-show', c).checked });
        closeSheet(true);
        // Fedfu revisa el banco de talento: si hay personas que encajan, la búsqueda abre en "Del banco"
        const nSug = bankSuggestions(co, newId).length;
        toast(nSug ? `Búsqueda publicada. Hay ${nSug} en Mis candidatos que encaja${nSug === 1 ? '' : 'n'}.` : 'Búsqueda publicada. Ya la ven los candidatos.', 'ph-rocket-launch');
        S.jobTab = { id: newId, t: nSug ? 'banco' : 'postulantes' };
        location.hash = `#/empresa/b?id=${newId}`;
      };
    });
  }

  /* ================= ANÁLISIS DE CV (Fedfu) =================
     Corre en el navegador, sin IA: lee el texto del PDF, compara cada requisito de la vacante,
     calcula la afinidad y arma un resumen de 3 líneas. Es una guía para ordenar, no para descartar.
     Para pasar a IA real, reemplazar analyzeCv() por una llamada al backend con el mismo formato de salida. */

  const STOP = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'y', 'o', 'u', 'en', 'con', 'para', 'por', 'a', 'al', 'un', 'una', 'manejo', 'conocimiento', 'conocimientos',
    'experiencia', 'buen', 'buena', 'buenos', 'buenas', 'se', 'valora', 'valorara', 'nivel', 'minimo', 'menos', 'mas', 'anos', 'ano', 'similar', 'completo', 'completa',
    'deseable', 'excluyente', 'intermedio', 'avanzado', 'basico', 'vigente', 'propio', 'propia', 'tener', 'contar', 'otros', 'afines', 'etc', 'sus', 'su', 'que']);
  const SOFT = ['comuni', 'predis', 'presen', 'trato', 'organi', 'respon', 'proact', 'actitu', 'equipo', 'dispon', 'horari', 'orient', 'result', 'detall', 'redacc', 'atenci'];
  const SYN = { registro: ['registro', 'licencia'], licencia: ['licencia', 'registro'], ingles: ['ingles', 'english'], secundario: ['secundario', 'bachiller', 'polimodal', 'perito'],
    estudiante: ['estudiante', 'cursando', 'en curso', 'ano)'], titulo: ['titulo', 'tecnic', 'licenci', 'ingenier', 'contador', 'arquitect', 'profesional'], matricula: ['matricula'] };
  const SKILLS = [['Excel', /\bexcel\b/], ['Word', /\bword\b/], ['Tango', /\btango\b/], ['Bejerman', /bejerman/], ['SAP', /\bsap\b/], ['AFIP', /\bafip\b/], ['SICOSS', /sicoss/],
    ['HubSpot', /hubspot/], ['Salesforce', /salesforce/], ['CRM', /\bcrm\b/], ['Canva', /\bcanva\b/], ['CapCut', /capcut/], ['Meta Ads', /meta ads/], ['Instagram', /instagram/], ['TikTok', /tiktok/],
    ['Photoshop', /photoshop/], ['Figma', /figma/], ['React', /\breact\b/], ['TypeScript', /typescript/], ['JavaScript', /javascript/], ['Node.js', /node/], ['Python', /python/], ['SQL', /\bsql\b/],
    ['Git', /\bgit\b/], ['Jira', /\bjira\b/], ['Windows', /windows/], ['Linux', /linux/], ['redes', /\bredes\b/], ['hardware', /hardware/], ['Active Directory', /active directory/],
    ['AutoCAD', /autocad/], ['Revit', /\brevit\b/], ['SketchUp', /sketchup/], ['licencia profesional', /licencia profesional/], ['licencia de conducir', /licencia de conducir|registro de conducir/],
    ['autoelevador', /autoelevador/], ['soldadura', /soldadura/], ['electricidad', /electricidad/], ['facturación', /facturacion/], ['convenios colectivos', /convenios/],
    ['manipulación de alimentos', /manipulacion de alimentos/], ['inglés', /\bingles\b/], ['portugués', /portugues/], ['Incoterms', /incoterms/], ['SIM/Malvina', /malvina|\bsim\b/]];
  const EDU_RX = /(estudiante|cursando|en curso|licenciad|licenciatura|tecnic[oa] (superior )?en|tecnicatura|tecnic[oa] electro|tecnic[oa] superior|ingenieria|contador|arquitect|profesorado|enfermer[oa] profesional|secundario completo|bachiller)/;
  const isEdu = l => EDU_RX.test(norm(l));

  const stemOf = t => t.length > 6 ? t.slice(0, 6) : t;
  const hasStem = (cv, st) => st.length <= 3 ? new RegExp(`(^|[^a-z0-9])${st}([^a-z0-9]|$)`).test(cv) : cv.includes(st);
  const cvTextOf = a => (a && a.cvText) || (a && a.cand && typeof SEED_CV !== 'undefined' && SEED_CV[a.cand]) || '';

  function sectionOf(lines, rx) {
    const i = lines.findIndex(l => rx.test(l) && l.length < 40);
    if (i < 0) return null;
    const out = [];
    for (let k = i + 1; k < lines.length; k++) {
      if (/^[A-ZÁÉÍÓÚÑ ]{5,}$/.test(lines[k].trim())) break;
      out.push(lines[k]);
    }
    return out;
  }
  function yearsOf(raw) {
    const t = norm(raw), now = new Date().getFullYear();
    let explicit = 0;
    const m1 = t.match(/(?:mas de |\+\s*)?(\d{1,2})\s*\+?\s*anos de experiencia/); if (m1) explicit = +m1[1];
    const lines = raw.split('\n');
    const exp = sectionOf(lines, /experiencia|trayectoria|laboral/i);
    const src = (exp || lines.filter(l => !isEdu(l) && !/universidad|facultad|escuela|instituto|colegio/i.test(l))).join('\n');
    const iv = [];
    norm(src).replace(/((?:19|20)\d{2})\s*(?:-|–|a|hasta)\s*((?:19|20)\d{2}|actualidad|presente|hoy|la fecha)/g, (m, a, b) => {
      const s = +a, e = /^\d/.test(b) ? +b : now; if (e >= s && e <= now) iv.push([s, e]); return m;
    });
    iv.sort((x, y) => x[0] - y[0]);
    let total = 0, cs = null, ce = null;
    iv.forEach(([s, e]) => { if (cs === null) { cs = s; ce = e; } else if (s <= ce) ce = Math.max(ce, e); else { total += ce - cs; cs = s; ce = e; } });
    if (cs !== null) total += Math.max(ce - cs, iv.length ? 0 : 0);
    if (cs !== null && total === 0) total = 1; // menos de un año
    const first = /primer empleo|sin experiencia/.test(t);
    return { years: Math.max(explicit, total), known: !!(explicit || iv.length || (first && !iv.length)), first };
  }
  function locationOf(raw) {
    // Primero el encabezado (donde suele estar la línea de contacto); después, el resto del CV
    const head = raw.split('\n').slice(0, 5).join('\n');
    return findLocation(head) || findLocation(raw);
  }
  function findLocation(raw) {
    for (const p of [...PROVINCES].sort((a, b) => b.length - a.length)) {
      const loose = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/[aá]/gi, '[aá]').replace(/[eé]/gi, '[eé]').replace(/[ií]/gi, '[ií]').replace(/[oó]/gi, '[oó]').replace(/[uú]/gi, '[uúü]').replace(/[nñ]/gi, '[nñ]');
      const m = raw.match(new RegExp(`([\\p{L}][\\p{L} .]{2,32}),\\s*${loose}(?![\\p{L}])`, 'iu'));
      if (m) return { city: m[1].trim(), province: p };
    }
    const p = detectProvince(raw.split('\n').slice(0, 6).join(' '));
    return p && p !== 'any' ? { city: '', province: p } : null;
  }
  function headlineOf(raw, name) {
    const ls = raw.split('\n').map(l => l.trim()).filter(Boolean);
    const cand = ls.slice(0, 4).find(l => l !== name && norm(l) !== norm(name) && l.length < 48 && !/@|\d{3}|curr[ií]culum|vitae/i.test(l));
    return cand || '';
  }
  function currentJobOf(raw) {
    const l = raw.split('\n').find(x => /(actualidad|presente|hoy)/i.test(x) && /(19|20)\d{2}/.test(x));
    if (!l) return '';
    const parts = l.split(/·|\||—| - (?=[A-ZÁÉÍÓÚ])/).map(s => s.trim()).filter(s => s && !/(19|20)\d{2}|actualidad|presente/i.test(s));
    return parts.length > 1 ? parts[parts.length - 1] : '';
  }
  function educationOf(raw) {
    const lines = raw.split('\n');
    const sec = sectionOf(lines, /estudios|educaci|formaci/i) || lines;
    const l = sec.find(isEdu);
    if (!l) return '';
    return l.split(/·|\|/)[0].trim().replace(/\s+/g, ' ').slice(0, 70);
  }
  const listEs = arr => arr.length < 2 ? arr.join('') : arr.slice(0, -1).join(', ') + ' y ' + arr[arr.length - 1];

  function checkRequirement(req, cvAll, yrs, expCv) {
    const n = norm(req);
    // "Experiencia en X" se busca solo en la experiencia laboral, no en el perfil ni en los estudios
    const cv = /experiencia/.test(n) && !/\d\s*anos?/.test(n) ? expCv : cvAll;
    const toks = n.split(/[^a-z0-9]+/).filter(w => w && !STOP.has(w) && !/^\d+$/.test(w));
    const optional = /se valora|deseable/.test(n);
    const yReq = (n.match(/(\d{1,2})\s*anos?/) || [])[1];
    const found = toks.filter(t => (SYN[t] || [stemOf(t)]).some(s => hasStem(cv, norm(s))));
    const pct = toks.length ? found.length / toks.length : 0;
    let st, note = '';
    if (yReq) {
      const need = +yReq;
      if (!yrs.known) { st = 'unk'; note = 'El CV no indica los años'; }
      else if (yrs.years >= need) { st = pct >= 0.5 || !toks.length ? 'ok' : 'unk'; note = `${yrs.years} año${yrs.years === 1 ? '' : 's'} según el CV`; }
      else { st = 'no'; note = `${yrs.years || 'menos de 1'} año${yrs.years === 1 ? '' : 's'} según el CV`; }
    } else if (toks.length && toks.every(t => SOFT.some(s => t.startsWith(s)))) {
      st = found.length ? 'ok' : 'unk'; if (!found.length) note = 'No se puede saber por el CV';
    } else if (/disponib/.test(n)) {
      st = found.length && hasStem(cv, 'dispon') ? 'ok' : 'unk'; if (st === 'unk') note = 'Consultar en la entrevista';
    } else {
      st = pct >= 0.5 ? 'ok' : pct > 0 ? 'unk' : 'no';
      if (st === 'unk') note = 'Lo menciona en parte';
      if (st === 'no' && toks.some(t => SOFT.some(s => t.startsWith(s)))) { st = 'unk'; note = 'No se puede saber por el CV'; }
      if (st !== 'ok' && cv === expCv && !expCv.trim()) note = 'El CV no indica experiencia laboral';
    }
    if (st === 'no' && optional) { st = 'unk'; note = 'Deseable, no lo menciona'; }
    return { text: req, st, note, optional };
  }

  const _cvCache = new Map();
  // Skills y competencias que el candidato declaró en el chat (o, en los ejemplos, las de su perfil)
  function declOf(app) {
    const sc = (app.cand && SEED_CANDIDATES.find(c => c.id === app.cand)) || {};
    return { skills: app.declSkills || sc.skills || [], comps: app.declComps || sc.comps || [] };
  }
  // st de cada skill: 'cv' (figura en el CV), 'decl' (la dijo en el chat), 'no' (no aparece)
  function skillsOf(app, job, raw) {
    const d = declOf(app);
    const skills = (job.skills || []).map(x => ({ n: x.n, must: !!x.must, st: raw && hasSkillIn(raw, x.n) ? 'cv' : hasSkillList(d.skills, x.n) ? 'decl' : 'no' }));
    const comps = (job.comps || []).map(n => ({ n, st: d.comps.includes(n) ? 'decl' : 'unk' }));
    let tot = 0, got = 0; skills.forEach(x => { const w = x.must ? 2 : 1; tot += w; got += w * (x.st === 'cv' ? 1 : x.st === 'decl' ? 0.8 : 0); });
    return { skills, comps, skillScore: tot ? got / tot : null, compScore: comps.length ? comps.filter(x => x.st === 'decl').length / comps.length : null,
      missMust: skills.filter(x => x.must && x.st === 'no').map(x => x.n), skillOk: skills.filter(x => x.st !== 'no').length };
  }

  function analyzeCv(app, job) {
    const raw = cvTextOf(app);
    const dd = declOf(app);
    const key = `${app.id}|${job.id}|${raw.length}|${(job.requirements || []).join('|')}|${JSON.stringify(job.skills || [])}|${(job.comps || []).join(',')}|${dd.skills.join(',')}|${dd.comps.join(',')}`;
    if (_cvCache.has(key)) return _cvCache.get(key);
    const reqs = job.requirements || [];
    if (!raw.trim()) {
      const sk0 = skillsOf(app, job, '');
      const r = { score: null, reqs: reqs.map(t => ({ text: t, st: 'unk', note: '' })), ok: 0, ...sk0,
        summary: ['No pudimos leer el texto de este CV (puede ser una imagen escaneada).', 'Abrilo para revisarlo.'], empty: true };
      _cvCache.set(key, r); return r;
    }
    const cv = norm(raw);
    const yrs = yearsOf(raw);
    const rawLines = raw.split('\n');
    const expSec = sectionOf(rawLines, /experiencia|trayectoria|laboral/i);
    const expCv = norm((expSec || rawLines.filter(l => /(19|20)\d{2}/.test(l) && !isEdu(l))).join('\n'));
    const checks = reqs.map(r => checkRequirement(r, cv, yrs, expCv));
    const pts = checks.map(c => c.st === 'ok' ? 1 : c.st === 'unk' ? (c.optional ? 0.75 : 0.45) : (c.optional ? 0.5 : 0));
    const reqScore = pts.length ? pts.reduce((a, b) => a + b, 0) / pts.length : 0.6;
    const titleToks = norm(job.title).split(/[^a-z]+/).filter(w => w.length > 3 && !STOP.has(w));
    const area = AREAS.find(a => a.id === job.area);
    const titleHit = titleToks.length ? titleToks.filter(t => hasStem(cv, stemOf(t))).length / titleToks.length : 0;
    const areaHit = area && area.kw.some(k => cv.includes(norm(k))) ? 0.7 : 0.25;
    const rel = Math.max(titleHit, titleHit > 0 ? Math.min(areaHit, titleHit + 0.2) : areaHit);
    const loc = locationOf(raw);
    const locScore = job.modality === 'Remoto' ? 1 : !loc ? 0.6 : loc.province === job.province ? 1 : 0.25;
    const BANDS = { 'sin-exp': [0, 1], junior: [1, 3], semi: [3, 6], senior: [5, 99] };
    const band = BANDS[job.seniority] || [0, 99];
    const senScore = !yrs.known ? 0.6 : yrs.years < band[0] ? Math.max(0.15, 1 - (band[0] - yrs.years) * 0.35) : yrs.years > band[1] ? Math.max(0.55, 1 - (yrs.years - band[1]) * 0.12) : 1;
    const SK = skillsOf(app, job, raw);
    let mix;
    if (SK.skillScore != null) mix = 0.35 * reqScore + 0.25 * SK.skillScore + 0.05 * (SK.compScore ?? 0.5) + 0.15 * rel + 0.1 * locScore + 0.1 * senScore;
    else mix = 0.5 * reqScore + 0.2 * rel + 0.15 * locScore + 0.15 * senScore;
    let score = Math.max(5, Math.min(96, Math.round(100 * mix)));
    if (SK.missMust.length) score = Math.min(score, 65); // le falta una skill excluyente

    // Resumen en 3 líneas
    const role = headlineOf(raw, app.name) || (area ? area.label : 'Postulante');
    const cur = currentJobOf(raw);
    let l1;
    if (yrs.known && yrs.years > 0) l1 = `${role} con ${yrs.years} año${yrs.years === 1 ? '' : 's'} de experiencia${cur ? `, hoy en ${cur}` : ''}.`;
    else if (yrs.first) l1 = `${role}, busca su primer empleo formal.`;
    else l1 = `${role}. El CV no indica años de experiencia.`;
    const reqText = norm(reqs.join(' '));
    const sk = SKILLS.filter(([, rx]) => rx.test(cv)).map(([label, rx]) => {
      if (label === 'inglés') { const lv = (cv.match(/ingles\s*(avanzado|intermedio|basico|fluido|nativo)/) || [])[1]; return [lv ? `inglés ${lv === 'basico' ? 'básico' : lv}` : 'inglés', rx]; }
      return [label, rx];
    }).sort((a, b) => (b[1].test(reqText) ? 1 : 0) - (a[1].test(reqText) ? 1 : 0)).map(x => x[0]);
    const lic = [...new Set(sk)].filter(x => /^licencia/.test(x));
    const tools = [...new Set(sk)].filter(x => !/^licencia/.test(x)).filter((s, i, arr) => !(s === 'CRM' && arr.some(x => /hubspot|salesforce/i.test(x)))).slice(0, 4);
    const l2 = (tools.length ? `Maneja ${listEs(tools)}.` : 'No menciona herramientas específicas.') + (lic.length ? ` Tiene ${listEs(lic)}.` : '');
    const edu = educationOf(raw);
    let l3 = '';
    if (loc) {
      const place = loc.city && norm(loc.city) !== norm(loc.province) ? `${loc.city}, ${loc.province}` : loc.province;
      l3 = `Vive en ${place}${job.modality !== 'Remoto' && loc.province !== job.province ? ` (la búsqueda es en ${job.province})` : ''}.`;
    }
    if (edu) l3 += `${l3 ? ' ' : ''}${edu.replace(/\.$/, '')}.`;
    const res = { score, reqs: checks, ok: checks.filter(c => c.st === 'ok').length, summary: [l1, l2, l3].filter(Boolean), years: yrs, loc, ...SK };
    _cvCache.set(key, res);
    return res;
  }

  /* Tabla "Pide la búsqueda" | "Según su CV": requisitos, skills clave y competencias.
     reqs: [[texto, 'ok'|'no'|'unk', nota]] · skills: [[nombre, 'cv'|'decl'|'no', excluyente]] · comps: [[nombre, 'decl'|'']] */
  function matchTable(reqs, skills, comps, opts = {}) {
    reqs = reqs || []; skills = skills || []; comps = comps || [];
    if (!reqs.length && !skills.length && !comps.length) return '';
    const R = {
      ok: ['ph-fill ph-check-circle', 'text-ok', 'Cumple'], no: ['ph-fill ph-x-circle', 'text-bad', 'No cumple'], unk: ['ph-fill ph-question', 'text-ink-mute', 'A confirmar'],
      cv: ['ph-fill ph-check-circle', 'text-ok', 'En el CV'], decl: ['ph-fill ph-chat-circle-dots', 'text-brand', 'Lo dijo en el chat'],
      miss: ['ph-fill ph-x-circle', 'text-bad', 'No figura'], missOpt: ['ph ph-minus-circle', 'text-ink-mute', 'No figura'], eval: ['ph ph-chats-circle', 'text-ink-mute', 'A evaluar en entrevista']
    };
    const res = (k, note) => { const [ic, col, l] = R[k]; return `<span class="flex items-start gap-1.5 ${col}"><i class="${ic} text-lg shrink-0 leading-none mt-px"></i><span class="min-w-0"><span class="font-semibold">${l}</span>${note ? `<span class="block text-ink-mute text-[0.85rem] leading-snug">${esc(note)}</span>` : ''}</span></span>`; };
    const row = (ask, result) => `<div class="grid grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-3 px-3 py-2.5 border-t border-line first:border-t-0">${ask}<div class="min-w-0 text-[0.93rem]">${result}</div></div>`;
    const group = (title, count, rows) => rows.length ? `<div class="bg-surface/70 px-3 py-1.5 border-t border-line flex justify-between gap-2 text-[0.82rem] font-bold uppercase tracking-wide text-ink-mute"><span>${title}</span>${count ? `<span class="normal-case tracking-normal font-semibold">${count}</span>` : ''}</div>${rows.join('')}` : '';
    const nReq = reqs.filter(r => r[1] === 'ok').length, nSk = skills.filter(x => x[1] !== 'no').length;
    const cleanNote = n => (n || '').replace(/\s*según el CV$/i, '').replace(/^./, c => c.toUpperCase());
    return `<div class="${opts.cls || 'mt-4'} rounded-[16px] border border-line overflow-hidden bg-white">
      <div class="grid grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-3 px-3 py-2 bg-surface text-[0.85rem] font-bold text-ink-soft">
        <span class="flex items-center gap-1.5"><i class="ph-fill ph-briefcase"></i>Pide la búsqueda</span>
        <span class="flex items-center gap-1.5"><i class="ph-fill ph-file-text"></i>${opts.empty ? 'Sin datos del CV' : 'Según su CV'}</span>
      </div>
      ${group('Requisitos', reqs.length ? `${nReq} de ${reqs.length}` : '', reqs.map(([t, st, note]) => row(`<span class="min-w-0 leading-snug">${esc(t)}</span>`, res(st, cleanNote(note)))))}
      ${group('Skills clave', skills.length ? `${nSk} de ${skills.length}` : '', skills.map(([n, st, must]) => row(`<span class="min-w-0 leading-snug">${esc(n)}${must ? ' <span class="inline-block align-middle rounded-full bg-sun-soft px-1.5 py-px text-[0.75rem] font-bold text-warn">Excluyente</span>' : ''}</span>`, res(st === 'cv' ? 'cv' : st === 'decl' ? 'decl' : must ? 'miss' : 'missOpt'))))}
      ${group('Competencias', '', comps.map(([n, st]) => row(`<span class="min-w-0 leading-snug">${esc(n)}</span>`, res(st === 'decl' ? 'decl' : 'eval'))))}
    </div>`;
  }

  // Chips de skills clave y competencias: verde = figura en el CV, lila = la declaró en el chat, rojo = falta
  function skillsBlock(skills, comps, opts = {}) {
    if (!(skills || []).length && !(comps || []).length) return '';
    const ok = (skills || []).filter(x => x[1] !== 'no').length;
    const chip = ([n, st, must]) => {
      const cls = st === 'cv' ? 'bg-mint text-ok' : st === 'decl' ? 'bg-lilac text-brand' : must ? 'bg-bad/10 text-bad' : 'bg-surface text-ink-mute';
      const ic = st === 'no' ? 'ph-bold ph-x' : 'ph-bold ph-check';
      const tip = st === 'cv' ? 'Figura en el CV' : st === 'decl' ? 'La declaró en el chat (no figura en el CV)' : 'No la menciona';
      return `<span class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.86rem] font-semibold ${cls}" title="${tip}"><i class="${ic}"></i>${esc(n)}${st === 'decl' ? '<span class="font-normal opacity-80">· dice</span>' : ''}${must && st === 'no' ? '<span class="font-bold">· excluyente</span>' : ''}</span>`;
    };
    return `<div class="${opts.cls || 'mt-4'}">
      ${(skills || []).length ? `<p class="flex items-baseline justify-between gap-2 font-semibold">Skills clave<span class="text-[0.9rem] font-normal text-ink-mute">${ok} de ${skills.length}</span></p>
        <div class="mt-2 flex flex-wrap gap-1.5">${skills.map(chip).join('')}</div>` : ''}
      ${(comps || []).length ? `<p class="mt-3 font-semibold">Competencias</p>
        <div class="mt-2 flex flex-wrap gap-1.5">${comps.map(([n, st]) => `<span class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.86rem] font-semibold ${st === 'decl' ? 'bg-lilac text-brand' : 'bg-surface text-ink-mute'}" title="${st === 'decl' ? 'La declaró en el chat' : 'Confirmar en la entrevista'}"><i class="${st === 'decl' ? 'ph-bold ph-check' : 'ph ph-chats-circle'}"></i>${esc(n)}${st === 'decl' ? '' : '<span class="font-normal">· a evaluar</span>'}</span>`).join('')}</div>` : ''}
      ${opts.legend === false ? '' : `<p class="mt-2 text-[0.82rem] text-ink-mute"><span class="text-ok font-semibold">verde</span>: figura en el CV · <span class="text-brand font-semibold">dice</span>: lo declaró en el chat · las competencias se confirman en la entrevista</p>`}
    </div>`;
  }

  function matchRing(s, size = 56) {
    if (s == null) return `<div class="shrink-0 rounded-full bg-surface text-ink-mute grid place-items-center font-bold" style="width:${size}px;height:${size}px" title="Sin datos del CV">–</div>`;
    const col = s >= 75 ? '#0B7A55' : s >= 50 ? '#8F5B0F' : '#64627C', track = s >= 75 ? '#D8F3E6' : s >= 50 ? '#FFF3CF' : '#ECEBF3';
    const sw = size > 50 ? 6 : 4, r = size / 2 - sw / 2 - 1, c = 2 * Math.PI * r;
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="shrink-0" role="img" aria-label="Afinidad ${s}%">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${track}" stroke-width="${sw}"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${col}" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - s / 100)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
      <text x="50%" y="50%" dy=".35em" text-anchor="middle" font-size="${size > 50 ? 15 : 11}" font-weight="800" letter-spacing="-0.3" fill="${col}" font-family="Bricolage Grotesque, Figtree, sans-serif">${s}%</text></svg>`;
  }

  // Calificación manual de la consultora (10% a 100%) después de leer el CV
  const ratingOf = a => (a && a.rating && a.rating.pct != null ? a.rating.pct : null);
  function rateRing(pct, size = 56) {
    if (pct == null) return `<div class="shrink-0 rounded-full border-2 border-dashed border-line text-ink-mute grid place-items-center font-bold" style="width:${size}px;height:${size}px" title="Sin calificar" aria-label="Sin calificar">–</div>`;
    return matchRing(pct, size).replace(/aria-label="Afinidad /, 'aria-label="Calificación ');
  }

  async function viewCv(app, cand) {
    if (cand && cand.sp) {
      const blob = (await Store.getCv('sp-' + cand.sp.id)) || (cand.sp.demo ? demoPdf(cand.sp) : null); if (!blob) { toast('No encontramos el archivo del CV', 'ph-warning'); return; }
      const url = URL.createObjectURL(blob);
      if (cand.sp.cvType === 'pdf') window.open(url, '_blank');
      else { const a = document.createElement('a'); a.href = url; a.download = cand.sp.cvName || 'CV.docx'; a.click(); toast('Descargando el CV en Word', 'ph-download-simple'); }
      setTimeout(() => URL.revokeObjectURL(url), 60000); return;
    }
    const w = window.open('', '_blank');
    let blob = app ? await Store.getCv(app.id) : null;
    if (!blob) blob = demoPdf(cand || app);
    const url = URL.createObjectURL(blob);
    if (w) w.location.href = url;
    else { const a = document.createElement('a'); a.href = url; a.download = (app && app.cvName) || 'CV.pdf'; a.click(); }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  /* ================= TERNA PARA EL CLIENTE =================
     El link es autocontenido: los datos de la terna viajan comprimidos dentro del link
     (#/terna?d=…), sin servidor. La respuesta del cliente vuelve con otro link (#/terna-respuesta?d=…)
     que la consultora abre para cargarla. Con backend, esto se reemplaza por un id corto en la base. */

  const b64u = bytes => { let s = ''; bytes.forEach(b => { s += String.fromCharCode(b); }); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
  const unb64u = str => { const s = atob(str.replace(/-/g, '+').replace(/_/g, '/')); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; };
  async function packData(obj) {
    const raw = new TextEncoder().encode(JSON.stringify(obj));
    if (window.CompressionStream) {
      try {
        const st = new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate-raw'));
        return 'z' + b64u(new Uint8Array(await new Response(st).arrayBuffer()));
      } catch (e) { /* sigue sin comprimir */ }
    }
    return 'j' + b64u(raw);
  }
  async function unpackData(str) {
    const kind = str[0], bytes = unb64u(str.slice(1));
    let out = bytes;
    if (kind === 'z') out = new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
    return JSON.parse(new TextDecoder().decode(out));
  }
  const baseUrl = () => location.href.split('#')[0];
  // Quita teléfonos y emails del texto del CV antes de mostrarlo al cliente
  const sanitizeCv = t => String(t || '')
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[email oculto]')
    .replace(/(\+?\s?54[\s-]?)?(9[\s-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/g, m => m.replace(/\D/g, '').length >= 8 ? '[teléfono oculto]' : m);

  async function buildTernaLink(t) {
    const co = Store.company(), j = Store.job(t.jobId), prof = Store.coProfile(co.name);
    const cl = j.client ? Store.client(co.name, j.client) : null;
    const items = t.items.map(it => {
      const a = Store.apps().find(x => x.id === it.appId); if (!a) return null;
      const an = analyzeCv(a, j);
      const seed = a.cand && typeof SEED_CV !== 'undefined' && SEED_CV[a.cand] ? a.cand : null;
      return { k: a.id, n: a.name, s: ratingOf(a), sum: an.summary, r: an.reqs.map(r => [r.text, r.st, r.note || '']), note: it.note || '',
        sk: an.skills.map(x => [x.n, x.st, x.must ? 1 : 0]), cp: an.comps.map(x => [x.n, x.st]),
        cv: seed ? { seed } : (a.cvText ? { t: sanitizeCv(a.cvText).slice(0, 2400) } : null), scan: !!(SEED_CANDIDATES.find(c => c.id === a.cand) || {}).scanned };
    }).filter(Boolean);
    const payload = { v: 1, id: t.id, co: co.name, coType: co.type, client: j.client || '', to: t.toName || '', jobId: j.id,
      job: { t: j.title, c: j.city, p: j.province, m: j.modality, ty: j.type, sal: j.salary || '' },
      reply: { name: prof.contactName || co.name, phone: prof.contactPhone || '', email: prof.contactEmail || '' },
      msg: t.message || '', at: new Date().toISOString(), items };
    return `${baseUrl()}#/terna?d=${await packData(payload)}`;
  }

  function ternaShareText(t, link) {
    const co = Store.company(), j = Store.job(t.jobId);
    const hi = t.toName ? `Hola ${t.toName.split(' ')[0]}` : 'Hola';
    return `${hi}, te comparto la terna para ${j.title}${j.client ? ` (${j.client})` : ''}: ${t.items.length} candidato${t.items.length === 1 ? '' : 's'} preseleccionado${t.items.length === 1 ? '' : 's'}.\n\nEn este link podés ver sus perfiles y CVs, y marcar 👍 o 👎 en cada uno. No necesitás crear una cuenta.\n\n${link}\n\nSaludos,\n${Store.coProfile(co.name).contactName || co.name}`;
  }

  function markTernaShared(id) {
    const t = Store.terna(id); if (!t) return;
    Store.updateTerna(id, { sharedAt: new Date().toISOString() });
    t.items.forEach(it => { const a = Store.apps().find(x => x.id === it.appId); if (a && OPEN_STAGES.includes(a.status)) Store.updateApp(a.id, { status: 'Terna' }); });
    S.dirty = true;
  }
  function openTernaShare(ternaId) {
    const co = Store.company(), t = Store.terna(ternaId); if (!t) return;
    const j = Store.job(t.jobId);
    const cl = j.client ? Store.client(co.name, j.client) : null;
    const isCons = co.type === 'Consultora';
    if (t.toName == null && cl) Store.updateTerna(t.id, { toName: cl.contactName ? cl.contactName.split(',')[0].trim() : '', toPhone: cl.contactPhone || '', toEmail: cl.contactEmail || '' });
    const T = () => Store.terna(ternaId);
    const draw = (link) => {
      const tt = T();
      const rows = tt.items.map(it => {
        const a = Store.apps().find(x => x.id === it.appId); if (!a) return '';
        const an = analyzeCv(a, j);
        return `<li class="rounded-[18px] border border-line p-3.5">
          <div class="flex items-center gap-3">${rateRing(ratingOf(a), 44)}
            <div class="min-w-0 flex-1"><p class="font-bold truncate">${esc(a.name)}</p><p class="text-ink-mute text-[0.9rem] truncate">${esc(an.summary[0] || '')}</p></div>
            <button type="button" class="icon-btn" data-terna-remove="${a.id}" aria-label="Quitar a ${esc(a.name)} de la terna"><i class="ph-bold ph-x text-lg"></i></button></div>
          <textarea rows="2" maxlength="300" class="input h-auto py-2.5 mt-3 text-[0.98rem]" data-terna-note="${a.id}" placeholder="Tu comentario para el cliente (opcional). Ej: muy buena entrevista, disponibilidad inmediata.">${esc(it.note || '')}</textarea>
        </li>`;
      }).join('');
      const fileWarn = location.protocol === 'file:' ? `<p class="mt-3 rounded-[14px] bg-sun-soft px-3.5 py-2.5 text-[0.95rem] flex gap-2"><i class="ph-fill ph-warning text-warn text-xl shrink-0"></i><span>Estás abriendo el sitio desde un archivo de tu computadora, así que este link solo funciona acá. Cuando el sitio esté publicado en internet, tu cliente lo va a poder abrir desde cualquier lugar.</span></p>` : '';
      const wa = link && tt.toPhone ? waLink(tt.toPhone, ternaShareText(tt, link)) : (link ? `https://wa.me/?text=${encodeURIComponent(ternaShareText(tt, link))}` : '');
      const body = `
        <h2 class="text-[1.6rem] font-extrabold tracking-tight pr-10 leading-tight">Terna para ${esc(j.title)}</h2>
        <p class="text-ink-soft mt-1">${j.client ? `${isCons ? 'Para' : ''} ${esc(j.client)} · ` : ''}${tt.items.length} postulante${tt.items.length === 1 ? '' : 's'}${tt.sharedAt ? ` · Compartida ${ago(tt.sharedAt).toLowerCase()}` : ''}</p>
        ${tt.items.length ? `<ul class="mt-5 space-y-3">${rows}</ul>` : `<p class="mt-5 rounded-[16px] bg-surface p-4 text-ink-soft">La terna está vacía. Tocá "Sumar a terna" en los postulantes que quieras proponer.</p>`}
        <div class="mt-6 rounded-[18px] bg-surface p-4 space-y-3">
          <p class="font-semibold">¿Quién la recibe?</p>
          <input class="input" id="tr-name" value="${esc(tt.toName || '')}" placeholder="Nombre (ej: Juan Pérez)" aria-label="Nombre de quien recibe la terna">
          <div class="grid sm:grid-cols-2 gap-3">
            <input class="input" id="tr-phone" type="tel" inputmode="tel" value="${esc(tt.toPhone || '')}" placeholder="WhatsApp" aria-label="WhatsApp">
            <input class="input" id="tr-email" type="email" inputmode="email" value="${esc(tt.toEmail || '')}" placeholder="Email" aria-label="Email">
          </div>
          <p class="text-ink-mute text-[0.9rem]">El cliente ve nombre, tu calificación, tus comentarios, el resumen del CV y el CV, sin teléfono ni email de los candidatos.</p>
        </div>
        ${link ? `<div class="mt-6">
          <p class="font-semibold flex items-center gap-2"><i class="ph-fill ph-link text-brand text-xl"></i>Link privado listo</p>
          <div class="mt-2 flex gap-2"><input class="input font-mono text-[0.85rem]" id="tr-link" value="${esc(link)}" readonly aria-label="Link de la terna">
            <button type="button" id="tr-copy" class="btn btn-outline shrink-0 px-4"><i class="ph ph-copy text-lg"></i><span class="hidden sm:inline">Copiar</span></button></div>
          ${fileWarn}
          <div class="mt-4 grid sm:grid-cols-3 gap-2">
            <a class="btn btn-primary" href="${esc(wa)}" target="_blank" rel="noopener" data-mark-shared><i class="ph-fill ph-whatsapp-logo text-xl"></i>WhatsApp</a>
            <a class="btn btn-outline" href="mailto:${esc(tt.toEmail || '')}?subject=${encodeURIComponent(`Terna para ${j.title}`)}&body=${encodeURIComponent(ternaShareText(tt, link))}" data-mark-shared><i class="ph ph-envelope-simple text-xl"></i>Email</a>
            <a class="btn btn-outline" href="${esc(link)}" target="_blank" rel="noopener"><i class="ph ph-eye text-xl"></i>Ver como el cliente</a>
          </div>
        </div>` : ''}`;
      const foot = link ? `<button data-close-sheet class="btn btn-outline flex-1 h-14">Listo</button>`
        : `<button type="button" id="tr-gen" class="btn btn-primary flex-1 h-14 text-lg" ${tt.items.length ? '' : 'disabled'}><i class="ph-bold ph-link text-xl"></i>Generar link para el cliente</button>`;
      return sheetScroll(body) + sheetFoot(foot);
    };
    const mount = (c, link) => {
      const save = () => Store.updateTerna(ternaId, { toName: $('#tr-name', c).value.trim(), toPhone: $('#tr-phone', c).value.trim(), toEmail: $('#tr-email', c).value.trim() });
      $$('[data-terna-note]', c).forEach(tx => tx.addEventListener('input', () => {
        const tt = T(); const it = tt.items.find(x => x.appId === tx.dataset.ternaNote); if (it) { it.note = tx.value; Store.updateTerna(ternaId, { items: tt.items }); }
      }));
      ['tr-name', 'tr-phone', 'tr-email'].forEach(id => $('#' + id, c).addEventListener('change', () => { save(); if (link) regen(); }));
      $$('[data-terna-remove]', c).forEach(b => b.onclick = () => { Store.toggleTerna(co.name, t.jobId, b.dataset.ternaRemove); S.dirty = true; setSheet(draw(), cc => mount(cc)); });
      const gen = $('#tr-gen', c); if (gen) gen.onclick = () => { save(); regen(); };
      const cp = $('#tr-copy', c); if (cp) cp.onclick = async () => {
        try { await navigator.clipboard.writeText(link); } catch (e) { $('#tr-link', c).select(); document.execCommand('copy'); }
        markTernaShared(ternaId); toast('Link copiado');
      };
      $$('[data-mark-shared]', c).forEach(a => a.addEventListener('click', () => markTernaShared(ternaId)));
    };
    const regen = async () => { const link = await buildTernaLink(T()); setSheet(draw(link), c => mount(c, link)); };
    openSheet(draw(), c => mount(c));
  }

  function openTernaList() {
    const co = Store.company();
    const list = Store.ternas(co.name).filter(t => !t.orphan && Store.job(t.jobId));
    const body = `<h2 class="text-[1.6rem] font-extrabold tracking-tight pr-10">Ternas</h2>
      <p class="text-ink-soft mt-1">Una por búsqueda. Tocá una para revisarla y compartirla.</p>
      <ul class="mt-5 space-y-2.5">${list.length ? list.map(t => {
        const j = Store.job(t.jobId), r = t.response;
        const up = r ? r.r.filter(x => x[1] === 'up').length : 0, down = r ? r.r.filter(x => x[1] === 'down').length : 0;
        const st = r ? `<span class="rounded-full bg-mint text-ok px-2.5 py-0.5 text-[0.85rem] font-bold">Respondida · ${up} 👍 ${down} 👎</span>`
          : t.sharedAt ? `<span class="rounded-full bg-lilac text-brand px-2.5 py-0.5 text-[0.85rem] font-bold">Enviada ${ago(t.sharedAt).toLowerCase()}</span>`
          : `<span class="rounded-full bg-sun-soft text-warn px-2.5 py-0.5 text-[0.85rem] font-bold">En preparación</span>`;
        return `<li><button type="button" data-open-terna="${t.id}" class="w-full text-left rounded-[18px] border border-line p-4 hover:border-brand transition flex items-center gap-3">
          ${j.client ? logo(j.client, 'w-11 h-11 text-sm') : logo(co.name, 'w-11 h-11 text-sm')}
          <span class="min-w-0 flex-1"><span class="block font-bold truncate">${esc(j.title)}</span>
          <span class="block text-ink-mute text-[0.92rem] truncate">${j.client ? esc(j.client) + ' · ' : ''}${t.items.length} postulante${t.items.length === 1 ? '' : 's'}</span>
          <span class="block mt-1.5">${st}</span></span><i class="ph-bold ph-caret-right text-ink-mute"></i></button></li>`;
      }).join('') : `<li class="rounded-[16px] bg-surface p-4 text-ink-soft">Todavía no armaste ninguna terna. En cada postulante tocá "Sumar a terna".</li>`}</ul>`;
    openSheet(sheetScroll(body), c => $$('[data-open-terna]', c).forEach(b => b.onclick = () => openTernaShare(b.dataset.openTerna)));
  }

  /* ----- Vista del cliente: #/terna?d=… ----- */
  function ClientTerna(params) {
    const d = params.get('d') || '';
    return {
      html: `<div id="ct" class="max-w-3xl mx-auto px-4 sm:px-6 py-8"><p class="text-ink-mute flex items-center gap-2"><i class="ph ph-circle-notch spin text-xl"></i>Abriendo la terna…</p></div>`,
      async mount() {
        const box = $('#ct');
        let T;
        try { T = await unpackData(d); if (!T || !T.items) throw new Error('vacío'); }
        catch (e) { box.innerHTML = emptyState('ph-link-break', 'No pudimos abrir esta terna', 'El link parece incompleto. Pedile a la consultora que te lo vuelva a enviar.'); return; }
        const KEY = 'emplea.ternavotes.' + T.id;
        let st = {}; try { st = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { st = {}; }
        st.votes = st.votes || {};
        const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* noop */ } };
        const ICON = { ok: ['ph-check-circle', 'text-ok'], no: ['ph-x-circle', 'text-bad'], unk: ['ph-question', 'text-ink-mute'] };
        document.title = `Terna · ${T.job.t}`;
        const card = it => {
          const v = st.votes[it.k] || {};
          return `<article class="card p-4 sm:p-6" id="c-${it.k}">
            <div class="flex items-center gap-3.5">${rateRing(it.s)}
              <div class="min-w-0"><h3 class="font-bold text-[1.25rem] leading-tight">${esc(it.n)}</h3><p class="text-ink-soft text-[0.95rem]">${it.s != null ? `Calificación de ${esc(T.co)}` : 'Sin calificar'}</p></div></div>
            ${it.note ? `<div class="mt-4 rounded-[16px] bg-surface p-3.5"><p class="text-[0.82rem] font-semibold text-ink-mute">Comentario de ${esc(T.co)}</p><p class="mt-0.5">“${esc(it.note)}”</p></div>` : ''}
            <div class="mt-3 rounded-[18px] bg-lilac/50 p-3.5 flex gap-3">${fedfu('w-8 h-8')}<div class="min-w-0"><p class="text-[0.82rem] font-semibold text-brand">Resumen del CV</p>${it.sum.map(l => `<p class="leading-snug mt-0.5">${esc(l)}</p>`).join('')}</div></div>
            ${matchTable(it.r, it.sk || [], it.cp || [])}
            ${it.cv || it.scan ? `<button type="button" class="btn btn-soft btn-sm mt-4" data-ct-cv="${it.k}"><i class="ph-fill ph-file-pdf text-lg"></i>Ver CV</button>` : ''}
            <div class="mt-5 pt-4 border-t border-line">
              <p class="font-semibold">¿Querés avanzar con ${esc(it.n.split(' ')[0])}?</p>
              <div class="mt-2.5 grid grid-cols-2 gap-2" role="group" aria-label="Tu respuesta sobre ${esc(it.n)}">
                <button type="button" data-vote="up" data-k="${it.k}" aria-pressed="${v.v === 'up'}" class="vote-btn h-14 rounded-[16px] border-2 font-semibold flex items-center justify-center gap-2 transition ${v.v === 'up' ? 'border-ok bg-mint text-ok' : 'border-line hover:border-ok'}"><span class="text-2xl">👍</span>Sí, avanzar</button>
                <button type="button" data-vote="down" data-k="${it.k}" aria-pressed="${v.v === 'down'}" class="vote-btn h-14 rounded-[16px] border-2 font-semibold flex items-center justify-center gap-2 transition ${v.v === 'down' ? 'border-bad bg-bad/10 text-bad' : 'border-line hover:border-bad'}"><span class="text-2xl">👎</span>No por ahora</button>
              </div>
              <textarea rows="2" maxlength="400" class="input h-auto py-2.5 mt-3" data-comment="${it.k}" placeholder="Comentario para la consultora (opcional)">${esc(v.c || '')}</textarea>
            </div>
          </article>`;
        };
        const count = () => T.items.filter(it => (st.votes[it.k] || {}).v).length;
        box.innerHTML = `
          <div class="flex items-center gap-3">${logoBox(T.co, null, 'w-12 h-12 text-sm')}<p class="leading-tight"><span class="block text-ink-mute">Terna preparada por</span><span class="block font-display font-bold text-lg">${esc(T.co)}</span></p></div>
          <h1 class="mt-5 text-[2rem] sm:text-[2.6rem] leading-[1.02] font-extrabold">${esc(T.job.t)}</h1>
          <p class="mt-2 text-ink-soft text-[1.05rem]">${[T.client, [T.job.c, T.job.p].filter(Boolean).join(', '), T.job.m, T.job.ty].filter(Boolean).map(esc).join(' · ')}</p>
          <p class="mt-5 rounded-[18px] bg-white border border-line p-4 flex gap-3">${fedfu('w-9 h-9')}<span>${T.to ? `Hola ${esc(T.to.split(' ')[0])}. ` : ''}Revisá ${T.items.length === 1 ? 'el candidato preseleccionado' : `los ${T.items.length} candidatos preseleccionados`} y marcá 👍 o 👎 en cada uno. Cuando termines, tocá <b>Enviar respuesta</b>. No necesitás crear una cuenta.</span></p>
          <div class="mt-5 space-y-4">${T.items.map(card).join('')}</div>
          <p class="mt-6 text-center text-ink-mute text-[0.9rem]">Por privacidad, los datos de contacto de los candidatos no se muestran. Coordiná con ${esc(T.co)}.</p>
          <div class="h-24"></div>
          <div class="fixed inset-x-0 bottom-0 z-30 bg-white/95 backdrop-blur border-t border-line pb-safe">
            <div class="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
              <p class="flex-1 font-semibold" id="ct-count"></p>
              <button type="button" id="ct-send" class="btn btn-primary h-12 px-6">Enviar respuesta</button>
            </div>
          </div>`;
        const upd = () => { $('#ct-count').textContent = `${count()} de ${T.items.length} respondidos`; };
        upd();
        box.addEventListener('click', e => {
          const b = e.target.closest('[data-vote]');
          if (b) {
            const k = b.dataset.k, cur = st.votes[k] || {};
            cur.v = cur.v === b.dataset.vote ? null : b.dataset.vote; st.votes[k] = cur; persist();
            $$(`[data-k="${k}"]`).forEach(x => {
              const on = x.dataset.vote === cur.v, up = x.dataset.vote === 'up';
              x.setAttribute('aria-pressed', on);
              x.className = `vote-btn h-14 rounded-[16px] border-2 font-semibold flex items-center justify-center gap-2 transition ${on ? (up ? 'border-ok bg-mint text-ok' : 'border-bad bg-bad/10 text-bad') : (up ? 'border-line hover:border-ok' : 'border-line hover:border-bad')}`;
            });
            upd(); return;
          }
          const cvb = e.target.closest('[data-ct-cv]');
          if (cvb) {
            const it = T.items.find(x => x.k === cvb.dataset.ctCv);
            const blob = demoPdf({ name: it.n, id: it.cv && it.cv.seed, cvText: it.cv && it.cv.t, scanned: it.scan, hideContact: true });
            const url = URL.createObjectURL(blob); window.open(url, '_blank'); setTimeout(() => URL.revokeObjectURL(url), 60000);
          }
        });
        box.addEventListener('input', e => { const tx = e.target.closest('[data-comment]'); if (!tx) return; const cur = st.votes[tx.dataset.comment] || {}; cur.c = tx.value; st.votes[tx.dataset.comment] = cur; persist(); });
        $('#ct-send').onclick = () => openClientReply(T, st, persist);
      }
    };
  }

  async function openClientReply(T, st, persist) {
    const pending = T.items.filter(it => !(st.votes[it.k] || {}).v);
    const draw = () => `
      <h2 class="text-[1.6rem] font-extrabold tracking-tight pr-10">Enviar respuesta</h2>
      ${pending.length ? `<p class="mt-2 rounded-[14px] bg-sun-soft px-3.5 py-2.5">Te falta${pending.length === 1 ? '' : 'n'} marcar ${pending.map(x => esc(x.n.split(' ')[0])).join(', ')}. Podés enviar igual y quedan como "sin respuesta".</p>` : ''}
      <ul class="mt-4 space-y-2">${T.items.map(it => { const v = st.votes[it.k] || {}; return `<li class="flex items-start gap-3 rounded-[14px] bg-surface p-3"><span class="text-xl">${v.v === 'up' ? '👍' : v.v === 'down' ? '👎' : '·'}</span><span class="min-w-0"><span class="font-semibold">${esc(it.n)}</span>${v.c ? `<span class="block text-ink-soft">“${esc(v.c)}”</span>` : ''}</span></li>`; }).join('')}</ul>
      <label class="label mt-5" for="cr-name">Tu nombre</label>
      <input id="cr-name" class="input" value="${esc(st.name || T.to || '')}" placeholder="Para que ${esc(T.co)} sepa quién respondió" autocomplete="name">
      <p class="mt-5 font-semibold">¿Cómo se la enviamos a ${esc(T.reply.name)}?</p>
      <div class="mt-2 grid gap-2" id="cr-actions"><p class="text-ink-mute">Preparando…</p></div>`;
    openSheet(sheetScroll(draw()), async c => {
      const build = async () => {
        st.name = $('#cr-name', c).value.trim(); persist();
        const resp = { v: 1, id: T.id, co: T.co, jobId: T.jobId, job: T.job.t, by: st.name, at: new Date().toISOString(), r: T.items.map(it => { const v = st.votes[it.k] || {}; return [it.k, v.v || null, (v.c || '').trim(), it.n]; }) };
        const link = `${baseUrl()}#/terna-respuesta?d=${await packData(resp)}`;
        const lines = T.items.map(it => { const v = st.votes[it.k] || {}; return `${v.v === 'up' ? '👍' : v.v === 'down' ? '👎' : '—'} ${it.n}${v.c ? `: ${v.c.trim()}` : ''}`; }).join('\n');
        const text = `Hola ${T.reply.name.split(' ')[0]}, te paso mi respuesta sobre la terna de ${T.job.t}:\n\n${lines}\n\n${st.name ? st.name + '\n\n' : ''}Para cargarla en +Humanos: ${link}`;
        const wa = T.reply.phone ? waLink(T.reply.phone, text) : `https://wa.me/?text=${encodeURIComponent(text)}`;
        $('#cr-actions', c).innerHTML = `
          <a class="btn btn-primary h-14 text-[1.05rem]" href="${esc(wa)}" target="_blank" rel="noopener"><i class="ph-fill ph-whatsapp-logo text-xl"></i>Enviar por WhatsApp</a>
          ${T.reply.email ? `<a class="btn btn-outline h-14" href="mailto:${esc(T.reply.email)}?subject=${encodeURIComponent('Respuesta terna: ' + T.job.t)}&body=${encodeURIComponent(text)}"><i class="ph ph-envelope-simple text-xl"></i>Enviar por email</a>` : ''}
          <button type="button" class="btn btn-outline h-14" id="cr-copy"><i class="ph ph-copy text-xl"></i>Copiar respuesta</button>`;
        $('#cr-copy', c).onclick = async () => { try { await navigator.clipboard.writeText(text); toast('Respuesta copiada'); } catch (e) { toast('No se pudo copiar', 'ph-warning'); } };
        $('#cr-actions', c).dataset.link = link;
      };
      await build();
      $('#cr-name', c).addEventListener('change', build);
    });
  }

  /* ----- La consultora abre la respuesta: #/terna-respuesta?d=… ----- */
  function TernaReply(params) {
    return {
      html: `<div id="tr" class="max-w-2xl mx-auto px-4 sm:px-6 py-8"><p class="text-ink-mute flex items-center gap-2"><i class="ph ph-circle-notch spin text-xl"></i>Cargando la respuesta…</p></div>`,
      async mount() {
        const box = $('#tr');
        let R;
        try { R = await unpackData(params.get('d') || ''); if (!R || !R.r) throw new Error('vacío'); }
        catch (e) { box.innerHTML = emptyState('ph-link-break', 'No pudimos leer esta respuesta', 'El link parece incompleto. Pedile al cliente que te lo reenvíe.'); return; }
        const known = Store.saveTernaResponse(R);
        S.dirty = true;
        const up = R.r.filter(x => x[1] === 'up').length, down = R.r.filter(x => x[1] === 'down').length;
        const co = Store.company();
        box.innerHTML = `
          <div class="card p-6 sm:p-8">
            <div class="success-pop w-16 h-16 rounded-full bg-ok text-white grid place-items-center"><i class="ph-bold ph-check text-3xl"></i></div>
            <h1 class="mt-4 text-[1.9rem] leading-tight font-extrabold">${R.by ? esc(R.by) + ' respondió' : 'El cliente respondió'} la terna</h1>
            <p class="mt-1 text-ink-soft text-[1.05rem]">${esc(R.job)} · ${up} 👍 · ${down} 👎</p>
            <ul class="mt-5 space-y-2">${R.r.map(([k, v, cmt, n]) => `<li class="flex items-start gap-3 rounded-[14px] bg-surface p-3"><span class="text-xl">${v === 'up' ? '👍' : v === 'down' ? '👎' : '·'}</span><span class="min-w-0"><span class="font-semibold">${esc(n || '')}</span>${cmt ? `<span class="block text-ink-soft">“${esc(cmt)}”</span>` : ''}${!v ? '<span class="block text-ink-mute text-[0.9rem]">Sin respuesta</span>' : ''}</span></li>`).join('')}</ul>
            <p class="mt-5 text-ink-soft">${known ? 'Ya quedó cargada: la vas a ver en cada postulante.' : co ? 'La guardamos, pero esta terna no se armó desde este dispositivo, así que no la podemos asociar a tus postulantes.' : 'Para verla junto a tus postulantes, ingresá a tu panel de empresa en este dispositivo.'}</p>
            <div class="mt-6 flex flex-wrap gap-2">
              ${known && co ? `<a href="#/empresa/b?id=${esc(R.jobId)}&tab=terna" class="btn btn-primary h-12">Ver la terna de esta búsqueda</a>` : `<a href="#/empresa" class="btn btn-primary h-12">Ir al panel</a>`}
            </div>
          </div>`;
      }
    };
  }

  /* ================= AVISAR A LOS NO SELECCIONADOS =================
     Un toque: avisa dentro de +Humanos (el candidato lo ve en "Mis postulaciones") y abre un único email
     con todos en copia oculta. WhatsApp no permite envíos masivos sin la API paga: queda un botón por persona. */
  const OPEN_STAGES = ['Nuevo', 'En revisión', 'Entrevista', 'Terna'];
  function openRejectSheet(jobId, opts = {}) {
    const co = Store.company(), j = Store.job(jobId); if (!co || !j) return;
    const prof = Store.coProfile(co.name);
    const apps = () => Store.apps().filter(a => a.jobId === jobId);
    const st = { closeAll: !!opts.closeAll, msg: prof.msgReject || DEF_MSG.reject, sel: new Set(), done: null };
    const base = () => apps().filter(a => a.status === 'Descartado' && !a.notifiedAt);
    const inProc = () => apps().filter(a => OPEN_STAGES.includes(a.status));
    base().forEach(a => st.sel.add(a.id));
    if (st.closeAll) inProc().forEach(a => st.sel.add(a.id));
    const personal = a => fillTpl(st.msg, tplVars(co.name, a.name, j, prof));
    const generic = () => fillTpl(st.msg, { ...tplVars(co.name, '', j, prof), nombre: '' }).replace(/Hola\s+,/g, 'Hola,').replace(/ {2,}/g, ' ');
    const row = a => `<label class="flex items-center gap-3 rounded-[14px] p-2.5 hover:bg-surface cursor-pointer">
        <input type="checkbox" class="w-5 h-5 accent-[#3B5BFD] shrink-0" data-rsel="${a.id}" ${st.sel.has(a.id) ? 'checked' : ''}>
        ${avatar(a.name, 'w-9 h-9 text-xs')}
        <span class="min-w-0 flex-1"><span class="block font-semibold truncate">${esc(a.name)}</span><span class="block text-[0.85rem] text-ink-mute">${esc(a.status)}${a.email ? ' · email' : ''}${a.phone ? ' · WhatsApp' : ''}</span></span></label>`;
    const draw = () => {
      if (st.done) return drawDone();
      const b = base(), p = inProc(), notified = apps().filter(a => a.notifiedAt);
      const sel = apps().filter(a => st.sel.has(a.id));
      const sample = sel[0] || b[0] || p[0];
      const body = `
        <h2 class="text-[1.6rem] font-extrabold tracking-tight pr-10 leading-tight">Avisar a los no seleccionados</h2>
        <p class="text-ink-soft mt-1">${esc(j.title)}${j.client ? ` · ${esc(j.client)}` : ''}</p>
        <div class="mt-5">
          <p class="font-semibold">Descartados sin avisar <span class="text-ink-mute font-normal">(${b.length})</span></p>
          <div class="mt-1.5">${b.length ? b.map(row).join('') : '<p class="text-ink-mute py-2">No hay descartados pendientes de aviso.</p>'}</div>
        </div>
        ${p.length ? `<div class="mt-4 rounded-[18px] border border-line p-3.5">
          <label class="flex gap-3 items-start cursor-pointer"><input type="checkbox" id="rj-close" class="w-5 h-5 mt-0.5 accent-[#3B5BFD] shrink-0" ${st.closeAll ? 'checked' : ''}>
            <span><span class="font-semibold">Cerrar la búsqueda</span><span class="block text-ink-soft text-[0.95rem]">Avisar también a quienes siguen en proceso (${p.length}) y pasarlos a Descartados.</span></span></label>
          ${st.closeAll ? `<div class="mt-2">${p.map(row).join('')}</div>` : ''}
        </div>` : ''}
        ${notified.length ? `<p class="mt-3 text-ink-mute text-[0.92rem] flex items-center gap-1.5"><i class="ph-bold ph-check"></i>Ya avisados: ${notified.map(a => esc(a.name.split(' ')[0])).join(', ')}</p>` : ''}
        <div class="mt-5">
          <label class="label" for="rj-msg">Mensaje</label>
          <textarea id="rj-msg" rows="6" class="input h-auto py-3">${esc(st.msg)}</textarea>
          <p class="text-ink-mute text-[0.9rem] mt-1.5">Se personaliza con el nombre de cada persona. El predeterminado se edita en Mi perfil.</p>
          ${sample ? `<div class="mt-3 rounded-[16px] bg-surface p-3.5"><p class="text-[0.82rem] font-semibold text-ink-mute">Así le llega a ${esc(sample.name.split(' ')[0])}</p><p class="mt-1 whitespace-pre-line" id="rj-prev">${esc(personal(sample))}</p></div>` : ''}
        </div>`;
      const n = sel.length;
      const foot = `<button type="button" id="rj-send" class="btn btn-primary flex-1 h-14 text-lg" ${n ? '' : 'disabled'}><i class="ph-fill ph-paper-plane-tilt text-xl"></i>${n ? `Avisar a ${n} persona${n === 1 ? '' : 's'}` : 'Elegí a quién avisar'}</button>`;
      return sheetScroll(body) + sheetFoot(foot);
    };
    const drawDone = () => {
      const list = st.done.map(id => Store.apps().find(a => a.id === id)).filter(Boolean);
      const withMail = list.filter(a => a.email), withWa = list.filter(a => a.phone);
      const body = `
        <div class="success-pop w-16 h-16 rounded-full bg-ok text-white grid place-items-center"><i class="ph-bold ph-check text-3xl"></i></div>
        <h2 class="mt-4 text-[1.6rem] font-extrabold tracking-tight leading-tight">Listo: avisaste a ${list.length} persona${list.length === 1 ? '' : 's'}</h2>
        <ul class="mt-3 space-y-1.5 text-ink-soft">
          <li class="flex gap-2"><i class="ph-fill ph-check-circle text-ok text-xl shrink-0"></i>Lo ven en +Humanos, en "Mis postulaciones".</li>
          ${withMail.length ? `<li class="flex gap-2"><i class="ph-fill ph-check-circle text-ok text-xl shrink-0"></i>Se abrió tu email con ${withMail.length} destinatario${withMail.length === 1 ? '' : 's'} en copia oculta. Revisalo y envialo.</li>` : ''}
        </ul>
        ${withMail.length ? `<a class="btn btn-outline btn-sm mt-3" href="${esc(st.mailto)}"><i class="ph ph-envelope-simple"></i>Abrir el email de nuevo</a>` : ''}
        ${withWa.length ? `<div class="mt-6"><p class="font-semibold">¿Preferís WhatsApp? Mandalo uno por uno</p>
          <p class="text-ink-mute text-[0.92rem]">WhatsApp no permite envíos masivos sin su API paga. Cada botón abre el chat con el mensaje ya escrito.</p>
          <ul class="mt-3 space-y-2">${withWa.map(a => `<li class="flex items-center gap-3 rounded-[14px] bg-surface p-2.5">${avatar(a.name, 'w-9 h-9 text-xs')}
            <span class="flex-1 min-w-0 font-semibold truncate">${esc(a.name)}</span>
            <a class="btn btn-sm ${a.waNotifiedAt ? 'bg-mint text-ok' : 'bg-[#25D366] text-white hover:brightness-95'}" href="${esc(waLink(a.phone, a.rejectMsg || personal(a)))}" target="_blank" rel="noopener" data-wa-sent="${a.id}">
              <i class="${a.waNotifiedAt ? 'ph-bold ph-check' : 'ph-fill ph-whatsapp-logo'}"></i>${a.waNotifiedAt ? 'Enviado' : 'Enviar'}</a></li>`).join('')}</ul></div>` : ''}`;
      return sheetScroll(body) + sheetFoot(`<button data-close-sheet class="btn btn-primary flex-1 h-14">Listo</button>`);
    };
    const mount = c => {
      const ta = $('#rj-msg', c);
      if (ta) ta.addEventListener('input', () => { st.msg = ta.value; const pv = $('#rj-prev', c); const s0 = apps().find(a => st.sel.has(a.id)) || base()[0] || inProc()[0]; if (pv && s0) pv.textContent = personal(s0); });
      c.addEventListener('change', e => {
        const cb = e.target.closest('[data-rsel]');
        if (cb) { cb.checked ? st.sel.add(cb.dataset.rsel) : st.sel.delete(cb.dataset.rsel); setSheet(draw(), mount); return; }
        if (e.target.id === 'rj-close') { st.closeAll = e.target.checked; inProc().forEach(a => st.closeAll ? st.sel.add(a.id) : st.sel.delete(a.id)); setSheet(draw(), mount); }
      });
      const send = $('#rj-send', c);
      if (send) send.onclick = () => {
        const now = new Date().toISOString();
        const sel = apps().filter(a => st.sel.has(a.id));
        sel.forEach(a => Store.updateApp(a.id, { status: 'Descartado', notifiedAt: now, rejectMsg: personal(a) }));
        const emails = sel.map(a => a.email).filter(Boolean);
        st.mailto = `mailto:?bcc=${encodeURIComponent(emails.join(','))}&subject=${encodeURIComponent('Tu postulación a ' + j.title)}&body=${encodeURIComponent(generic())}`;
        if (emails.length) { const l = document.createElement('a'); l.href = st.mailto; l.rel = 'noopener'; document.body.appendChild(l); l.click(); l.remove(); }
        st.done = sel.map(a => a.id);
        S.dirty = true;
        toast(`Avisaste a ${sel.length} persona${sel.length === 1 ? '' : 's'}`, 'ph-hand-heart');
        setSheet(draw(), mount);
        if (opts.onDone) opts.onDone();
      };
      c.addEventListener('click', e => {
        const w = e.target.closest('[data-wa-sent]'); if (!w) return;
        Store.updateApp(w.dataset.waSent, { waNotifiedAt: new Date().toISOString() });
        setTimeout(() => setSheet(draw(), mount), 150);
      });
    };
    openSheet(draw(), mount);
  }

  function loadDemo() {
    const co = Store.company(); if (!co) return;
    const n = Store.seedDemoFor(co);
    seedHubFor(co);
    // Los ejemplos suman 6 búsquedas: si el plan no alcanza, se activa la prueba del plan Pro
    let trial = false;
    if (usageOf(co).active > planOf(co).active) { Store.setPlan(co.name, 'pro', { trialUntil: new Date(Date.now() + TRIAL_DAYS * 864e5).toISOString() }); trial = true; }
    if (trial) setTimeout(() => toast(`Activamos ${TRIAL_DAYS} días de prueba del plan Pro`, 'ph-crown-simple'), 1800);
    S.appClient = 'all'; S.appJob = 'all'; S.appStatus = 'all';
    toast(n ? `Cargamos ${n} postulantes de ejemplo` : 'Los ejemplos ya estaban cargados', 'ph-users-three');
    if (parseHash().path === '/empresa/busquedas') refresh(); else location.hash = '#/empresa/busquedas';
  }


  /* Recomendación de la IA al pie de cada búsqueda: lee los CVs recibidos y propone hasta 3 candidatos con su porqué.
     En el prototipo el análisis corre en el navegador (analyzeCv: requisitos, skills, experiencia y ubicación).
     En producción: reemplazar aiRecommend() por una llamada a un modelo de IA con el mismo formato de salida. */
  function aiRecommend(j, apps) {
    const pool = apps.filter(a => !['Descartado', 'Contratado'].includes(a.status) && !qFails(a, j).length);
    const rows = pool.map(a => {
      const an = analyzeCv(a, j);
      const manual = ratingOf(a);
      const s0 = an.score == null ? 40 : an.score;
      return { a, an, rank: manual != null ? 0.6 * s0 + 0.4 * manual : s0 };
    }).filter(r => !r.an.empty).sort((x, y) => y.rank - x.rank).slice(0, 3);
    return rows.map(({ a, an }) => {
      const why = [];
      const okReqs = (an.reqs || []).filter(r => r.st === 'ok'), totReqs = (an.reqs || []).length;
      if (totReqs) why.push(okReqs.length ? `Cumple ${okReqs.length} de ${totReqs} requisitos${okReqs.length ? `, como ${okReqs.slice(0, 2).map(r => `“${r.text.replace(/\.$/, '').toLowerCase()}”`).join(' y ')}` : ''}.` : 'No encontramos en su CV los requisitos principales, pero destaca en otros puntos.');
      const hasSk = (an.skills || []).filter(x => x.st !== 'no').map(x => x.n);
      if (hasSk.length) why.push(`Tiene ${hasSk.length === 1 ? 'la skill' : 'skills'} que pedís: ${hasSk.slice(0, 3).join(', ')}.`);
      if (an.years && an.years.known && an.years.years > 0) why.push(`Suma ${an.years.years} año${an.years.years === 1 ? '' : 's'} de experiencia en tareas parecidas.`);
      if (an.loc) why.push(j.modality === 'Remoto' ? `Puede trabajar a distancia desde ${an.loc.province}.` : an.loc.province === j.province ? `Vive en ${an.loc.city && norm(an.loc.city) !== norm(an.loc.province) ? an.loc.city : an.loc.province}, cerca del puesto.` : `Vive en ${an.loc.province}: confirmá si puede trasladarse a ${j.province}.`);
      if (ratingOf(a) != null) why.push(`Vos ya lo calificaste con ${ratingOf(a)}%.`);
      if (questionsOf(j).some(q => q.must) && answersOf(a, j)) why.unshift('Cumple las preguntas excluyentes.');
      const miss = (an.reqs || []).find(r => r.st === 'no');
      const watch = (an.missMust || []).length ? `Ojo: no encontramos ${an.missMust.length === 1 ? 'la skill excluyente' : 'las skills excluyentes'} ${an.missMust.join(', ')} en su CV.` : miss ? `Revisá en la entrevista: ${miss.text.replace(/\.$/, '').toLowerCase()}.` : '';
      return { a, why: why.slice(0, 4), watch };
    });
  }


  /* ================= PREGUNTAS FILTRO =================
     Hasta 3 por búsqueda (Sí/No u opciones). Quien no cumple una excluyente se marca y va al final; la IA no lo recomienda. */
  const questionsOf = j => (j && (j.questions || SEED_JOB_QUESTIONS[j.demoOf || j.id])) || [];
  // Respuestas: las del candidato; en los postulantes de ejemplo, unas fijas para la demo
  function answersOf(a, j) {
    if (a.answers) return a.answers;
    const qs = questionsOf(j); if (!qs.length || a.mine) return null;
    const h = [...String(a.id)].reduce((x, c) => x + c.charCodeAt(0), 0);
    const out = {}; qs.forEach((q, i) => { const opts = q.type === 'yn' ? ['Sí', 'Sí', 'Sí', 'No'] : q.options; out[q.id] = opts[(h + i * 7) % opts.length]; });
    return out;
  }
  const qFails = (a, j) => { const ans = answersOf(a, j); if (!ans) return []; return questionsOf(j).filter(q => q.must && ans[q.id] && ans[q.id] !== q.ok); };
  const qShort = q => q.text.replace(/^¿\s*(tenés|podés|sos|vivís|contás con)?\s*/i, '').replace(/\?$/, '').trim();
  const cleanQs = qs => qs.map((q, i) => ({ id: q.id || 'q' + (i + 1) + Date.now().toString(36).slice(-3), text: q.text.trim(), type: q.type, options: q.type === 'opt' ? (q.options || []).map(o => o.trim()).filter(Boolean) : undefined, must: !!q.must, ok: q.ok }))
    .filter(q => q.text.length > 3 && (q.type === 'yn' || (q.options && q.options.length >= 2)))
    .map(q => ({ ...q, ok: q.type === 'yn' ? (q.ok === 'No' ? 'No' : 'Sí') : (q.options.includes(q.ok) ? q.ok : q.options[0]) }));
  // Editor (publicar y "Preguntas filtro" de cada búsqueda). qs se modifica en el lugar.
  function renderQEditor(el, qs) {
    const draw = () => {
      el.innerHTML = `<div class="space-y-3">${qs.map((q, i) => {
          const opts = q.type === 'opt' ? (q.options || []) : ['Sí', 'No'];
          return `<div class="rounded-[16px] border border-line p-3 space-y-2" data-qi="${i}">
            <div class="flex gap-2"><input class="input h-11" data-qf="text" value="${esc(q.text)}" placeholder="Ej: ¿Tenés carnet de conducir?" maxlength="90" aria-label="Pregunta ${i + 1}">
              <button type="button" data-q-del="${i}" class="icon-btn w-11 h-11 border border-line shrink-0" aria-label="Quitar pregunta"><i class="ph-bold ph-x"></i></button></div>
            <div class="flex flex-wrap items-center gap-2">
              <select class="input h-10 py-0 w-auto" data-qf="type" aria-label="Tipo de respuesta"><option value="yn" ${q.type === 'yn' ? 'selected' : ''}>Sí / No</option><option value="opt" ${q.type === 'opt' ? 'selected' : ''}>Opciones</option></select>
              ${q.type === 'opt' ? `<input class="input h-10 flex-1 min-w-[12rem]" data-qf="options" value="${esc((q.options || []).join(', '))}" placeholder="Opciones separadas por coma" aria-label="Opciones">` : ''}
            </div>
            <label class="flex flex-wrap items-center gap-2 cursor-pointer text-[0.95rem]"><input type="checkbox" data-qf="must" class="w-5 h-5 accent-[#3B5BFD]" ${q.must ? 'checked' : ''}><span class="font-semibold">Excluyente</span>
              ${q.must ? `<span class="text-ink-mute">· hace falta responder</span><select class="input h-9 py-0 w-auto text-[0.92rem]" data-qf="ok" aria-label="Respuesta necesaria">${opts.map(o => `<option ${o === q.ok ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>` : ''}</label>
          </div>`; }).join('')}</div>
        ${qs.length < 3 ? `<div class="mt-3 flex flex-wrap gap-1.5">${QUESTION_SUGGESTIONS.filter(x => !qs.some(q => q.text === x.text)).slice(0, 4).map(x => `<button type="button" class="chip h-9 px-3 text-[0.88rem]" data-q-sug="${esc(x.text)}"><i class="ph ph-plus"></i>${esc(x.text)}</button>`).join('')}
          <button type="button" class="chip h-9 px-3 text-[0.88rem]" data-q-new><i class="ph ph-pencil-simple"></i>Escribir otra</button></div>` : '<p class="mt-2 text-[0.88rem] text-ink-mute">Máximo 3 preguntas.</p>'}`;
    };
    const sync = () => { $$('[data-qi]', el).forEach(row => { const q = qs[+row.dataset.qi]; const g = k => $(`[data-qf="${k}"]`, row);
      q.text = g('text').value; q.type = g('type').value; if (g('options')) q.options = g('options').value.split(',').map(x => x.trim()).filter(Boolean); q.must = g('must').checked; if (g('ok')) q.ok = g('ok').value; }); };
    el.oninput = e => { if (e.target.matches('[data-qf="text"],[data-qf="options"]')) sync(); };
    el.onchange = e => { if (e.target.matches('[data-qf]')) { sync(); const q = qs[+e.target.closest('[data-qi]').dataset.qi]; if (q.type === 'opt' && !q.options) q.options = ['Opción 1', 'Opción 2']; if (q.type === 'yn' && !['Sí', 'No'].includes(q.ok)) q.ok = 'Sí'; if (e.target.matches('[data-qf="type"],[data-qf="must"]')) draw(); } };
    el.onclick = e => {
      const sg = e.target.closest('[data-q-sug]'); if (sg) { sync(); const x = QUESTION_SUGGESTIONS.find(y => y.text === sg.dataset.qSug); qs.push(JSON.parse(JSON.stringify(x))); draw(); return; }
      if (e.target.closest('[data-q-new]')) { sync(); qs.push({ text: '', type: 'yn', must: false, ok: 'Sí' }); draw(); const ins = $$('[data-qf="text"]', el); ins[ins.length - 1].focus(); return; }
      const dl = e.target.closest('[data-q-del]'); if (dl) { sync(); qs.splice(+dl.dataset.qDel, 1); draw(); }
    };
    draw();
    return sync;
  }
  function openQuestionsSheet(jobId, onSaved) {
    const j = Store.job(jobId); if (!j) return;
    const qs = JSON.parse(JSON.stringify(questionsOf(j)));
    const body = `<h2 class="text-[1.6rem] font-extrabold pr-10 leading-tight">Preguntas filtro</h2>
      <p class="text-ink-soft mt-1">${esc(j.title)}${j.client ? ` · ${esc(j.client)}` : ''}</p>
      <p class="mt-3 text-ink-soft">Hasta 3 preguntas que el candidato responde al postularse. Si no cumple una <b class="text-ink">excluyente</b>, lo marcamos y lo ponemos al final de la lista.</p>
      <div id="qs-ed" class="mt-4"></div>`;
    openSheet(sheetScroll(body) + sheetFoot('<button id="qs-save" class="btn btn-primary w-full h-14">Guardar preguntas</button>'), c => {
      const sync = renderQEditor($('#qs-ed', c), qs);
      $('#qs-save', c).onclick = () => { sync(); Store.updateJob(j.id, { questions: cleanQs(qs) }); closeSheet(true); toast('Preguntas guardadas', 'ph-list-checks'); if (onSaved) onSaved(); };
    });
  }

  /* ================= PÁGINA DE UNA BÚSQUEDA =================
     Todo lo de una vacante en un lugar, con pestañas: Postulantes (lista compacta + detalle al costado),
     Tablero (etapas), Terna (lo que se comparte con el cliente) y Del banco (personas que ya conocés). */
  function JobSpace(params) {
    const co = Store.company();
    const isCons = co.type === 'Consultora';
    const jobs = myJobs(co);
    const id = params.get('id') || params.get('job');
    const j = jobs.find(x => x.id === id);
    if (!j) return { html: `<div class="max-w-3xl mx-auto px-4 sm:px-6 py-10 grid">${emptyState('ph-briefcase', 'No encontramos esta búsqueda', 'Puede que se haya eliminado.', '<a href="#/empresa/busquedas" class="btn btn-primary">Ver mis búsquedas</a>')}</div>` };
    S.appJob = j.id;
    // Una sola página: lista (o tablero) de postulantes + terna y banco al costado
    const focus = params.get('tab'); // 'terna' | 'banco' | 'tablero' (links viejos)
    let tab = focus === 'tablero' ? 'tablero' : (S.jobView && S.jobView.id === j.id ? S.jobView.v : 'postulantes');
    const GROUPS = [['all', 'Todos', null], ['rev', 'Por revisar', ['Nuevo']], ['proc', 'En proceso', ['En revisión', 'Entrevista']], ['fin', 'Finalistas', ['Terna', 'Contratado']], ['out', 'Descartados', ['Descartado']]];
    const appsOf = () => Store.apps().filter(a => a.jobId === j.id);
    const ICON = { ok: ['ph-check-circle', 'text-ok'], no: ['ph-x-circle', 'text-bad'], unk: ['ph-question', 'text-ink-mute'] };
    const STAGES = [['Nuevo', 'Nuevos', '#3B5BFD'], ['En revisión', 'En revisión', '#B7791F'], ['Entrevista', 'Entrevista', '#11946A'],
      ['Terna', isCons ? 'Terna enviada al cliente' : 'Terna', '#7B3FE4'], ['Contratado', 'Contratado', '#0B7A55'], ['Descartado', 'Descartados', '#77758F']];
    const scoreOf = a => { const r = ratingOf(a); return r == null ? -1 : r; };
    const plural2 = (n, a, b) => `${n} ${n === 1 ? a : b}`;

    const head = () => {
      const active = j.status === 'activa', feat = Store.isFeatured(j), t = Store.ternaOfJob(j.id), nT = t && t.items.length ? t.items.length : 0;
      const back = j.client && isCons ? [`#/empresa/cliente?n=${encodeURIComponent(j.client)}`, j.client] : ['#/empresa/busquedas', 'Búsquedas'];
      const mi = (attr, ic, l, cls = '') => `<button type="button" ${attr} class="w-full flex items-center gap-3 px-3 min-h-[2.75rem] py-2 leading-tight rounded-xl font-semibold hover:bg-surface text-left ${cls}"><i class="${ic} text-xl shrink-0"></i>${l}</button>`;
      return `<a href="${back[0]}" class="inline-flex items-center gap-1.5 font-semibold text-ink-soft hover:text-ink max-w-full"><i class="ph-bold ph-arrow-left shrink-0"></i><span class="truncate">${esc(back[1])}</span></a>
      <div class="mt-5 flex flex-wrap items-start gap-x-6 gap-y-4">
        <div class="flex items-start gap-4 min-w-0 flex-1 basis-[20rem]">
          ${j.client ? logo(j.client, 'w-14 h-14 text-base') : logo(co.name, 'w-14 h-14 text-base')}
          <div class="min-w-0">
            <p class="text-ink-soft font-semibold truncate">${j.client ? esc(j.client) : isCons ? 'Búsqueda propia' : esc(co.name)}</p>
            <h1 class="text-[1.6rem] min-[360px]:text-[1.8rem] sm:text-[2.3rem] leading-[1.08] font-extrabold [overflow-wrap:anywhere]">${esc(j.title)}</h1>
            <div class="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-ink-soft">
              <span class="rounded-full px-2.5 py-0.5 text-[0.85rem] font-bold ${active ? 'bg-ok/10 text-ok' : 'bg-surface text-ink-mute'}">${active ? 'Activa' : 'Pausada'}</span>
              ${feat ? '<span class="rounded-full px-2.5 py-0.5 text-[0.85rem] font-bold bg-sun-soft text-warn"><i class="ph-fill ph-star"></i> Destacada</span>' : ''}
              <span>${esc(j.city)}, ${esc(j.province)} · ${esc(j.modality)} · ${ago(j.postedAt)}</span>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-2 w-full sm:w-auto">
          ${nT ? `<button type="button" data-share-terna="${t.id}" class="btn btn-primary flex-1 sm:flex-none justify-center"><i class="ph-fill ph-paper-plane-tilt text-lg"></i>${t.sharedAt ? 'Volver a compartir terna' : `Compartir terna (${nT})`}</button>`
            : `<a href="#/vacante?id=${j.id}" class="btn btn-outline flex-1 sm:flex-none justify-center"><i class="ph ph-eye text-lg"></i>Ver aviso</a>`}
          <button type="button" data-js-share class="btn btn-outline px-4" title="Compartir con un link por canal"><i class="ph-bold ph-share-network text-lg"></i><span class="max-sm:hidden">Compartir</span></button>
          ${active && BILLING ? `<button type="button" data-js-feature class="btn btn-outline px-4 ${feat ? '!border-sun bg-sun-soft' : ''}" title="${feat ? 'Destacada · ver detalle' : 'Destacar búsqueda'}"><i class="${feat ? 'ph-fill text-warn' : 'ph-bold'} ph-star text-lg"></i><span class="max-lg:hidden">${feat ? 'Destacada' : 'Destacar'}</span></button>` : ''}
          <div class="relative" data-menu-wrap>
            <button type="button" data-menu="js-more" class="btn btn-outline px-4" aria-haspopup="true" aria-expanded="false"><i class="ph-bold ph-dots-three text-xl"></i><span class="max-sm:hidden">Más</span></button>
            <div data-menu-panel="js-more" class="hidden dd-pop absolute right-0 top-full mt-2 z-50 w-64 bg-white rounded-2xl border border-line shadow-[0_24px_48px_-20px_rgba(20,18,58,.35)] p-1.5">
              ${mi('data-js-qs', 'ph ph-list-checks text-ink-soft', `Preguntas filtro${questionsOf(j).length ? ` (${questionsOf(j).length})` : ''}`)}
              ${active ? (reqOfJob(j.id) ? `<a href="#/empresa/hub?tab=mine" class="w-full flex items-center gap-3 px-3 min-h-[2.75rem] py-2 leading-tight rounded-xl font-semibold hover:bg-surface"><i class="ph ph-users-three text-xl text-ink-soft shrink-0"></i>Ver pedido en el Hub</a>` : mi('data-js-hub', 'ph ph-users-three text-ink-soft', 'Pedir recomendaciones al Hub')) : ''}
              ${mi('data-js-toggle', `ph ${active ? 'ph-pause' : 'ph-play'} text-ink-soft`, active ? 'Pausar búsqueda' : 'Reactivar búsqueda')}
              ${nT ? `<a href="#/vacante?id=${j.id}" class="w-full flex items-center gap-3 px-3 min-h-[2.75rem] py-2 leading-tight rounded-xl font-semibold hover:bg-surface"><i class="ph ph-eye text-xl text-ink-soft shrink-0"></i>Ver aviso</a>` : ''}
              ${mi(`data-view="${tab === 'tablero' ? 'postulantes' : 'tablero'}"`, `ph ${tab === 'tablero' ? 'ph-list-bullets' : 'ph-kanban'} text-ink-soft`, tab === 'tablero' ? 'Ver como lista' : 'Ver como tablero')}
              ${mi(`data-notify="${j.id}"`, 'ph ph-hand-heart text-ink-soft', 'Avisar a no seleccionados')}
              <div class="my-1 border-t border-line"></div>
              ${mi('data-js-del', 'ph ph-trash', 'Eliminar búsqueda', 'text-bad hover:bg-bad/10')}
            </div>
          </div>
        </div>
      </div>`;
    };
    const html = `<div id="ap-root" class="max-w-6xl mx-auto px-4 sm:px-6 py-6 md:py-10 pb-28">
      <div id="js-head">${head()}</div>
      <div id="js-body" class="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] items-start">
        <div id="app-list" class="min-w-0"></div>
        <aside id="js-side" class="space-y-5 lg:sticky lg:top-24"></aside>
      </div>
    </div>`;

    // ----- Notas internas (las ve solo el equipo; quedan también en el banco de talento) -----
    const NOTE_QUICK = ['Buena entrevista', 'Pide más plata', 'No se presentó', 'Volver a contactar', 'Disponible ya'];
    const notesOf = a => (Store.bankMeta(co.name, personKey(a)).notes || []);
    const notesBlock = a => {
      const notes = notesOf(a);
      return `<section class="mt-5 rounded-[18px] border border-line p-4" aria-labelledby="nt-${a.id}">
        <p id="nt-${a.id}" class="font-semibold flex flex-wrap items-center gap-x-2"><i class="ph-fill ph-note-pencil text-brand text-lg"></i>Notas internas<span class="text-ink-mute font-normal text-[0.9rem]">· solo las ve tu equipo</span></p>
        <form data-note-form="${a.id}" class="mt-3">
          <textarea name="t" rows="2" maxlength="500" class="input h-auto py-2.5" placeholder="Ej: Buena entrevista, pide más plata. Puede empezar en marzo." aria-label="Nueva nota sobre ${esc(a.name)}"></textarea>
          <div class="mt-2 flex flex-wrap items-center gap-1.5">
            ${NOTE_QUICK.map(q => `<button type="button" class="chip h-8 px-2.5 text-[0.85rem]" data-note-quick="${esc(q)}">${esc(q)}</button>`).join('')}
            <button class="btn btn-primary btn-sm ml-auto"><i class="ph-bold ph-plus"></i>Guardar nota</button>
          </div>
        </form>
        ${notes.length ? `<ul class="mt-4 space-y-2">${notes.map(n => {
          const nj = n.jobId && n.jobId !== j.id ? Store.job(n.jobId) : null;
          return `<li class="rounded-[14px] bg-surface p-3 flex gap-2">
            <div class="min-w-0 flex-1"><p class="whitespace-pre-line">${esc(n.t)}</p>
              <p class="text-[0.82rem] text-ink-mute mt-1">${ago(n.at)}${n.jobId === j.id ? ' · en esta búsqueda' : nj ? ` · en ${esc(nj.title)}` : ' · desde Mis candidatos'}</p></div>
            <button type="button" class="icon-btn w-8 h-8 shrink-0 text-ink-mute hover:text-bad" data-note-del="${esc(n.at)}" data-note-app="${a.id}" aria-label="Borrar nota"><i class="ph ph-trash"></i></button></li>`;
        }).join('')}</ul>` : ''}
      </section>`;
    };

    // ----- Card completa del postulante (se abre en el panel lateral) -----
    const card = a => {
      const tx = contactTexts(co.name, a.name, j);
      const wa = waLink(a.phone, tx.wa);
      const an = analyzeCv(a, j);
      const inT = Store.inTerna(j.id, a.id), cv = Store.clientVote(a.id);
      const B = 'btn btn-sm w-full justify-center min-w-0 px-2.5 gap-1.5';
      const voteBox = cv && cv.vote ? `<div class="mb-4 rounded-[14px] px-3.5 py-2.5 ${cv.vote === 'up' ? 'bg-mint' : 'bg-bad/10'}">
          <p class="font-semibold ${cv.vote === 'up' ? 'text-ok' : 'text-bad'}">${cv.vote === 'up' ? '👍 El cliente quiere avanzar' : '👎 El cliente no quiere avanzar'}${cv.by ? ` <span class="font-normal text-ink-soft">· ${esc(cv.by)}</span>` : ''}</p>
          ${cv.comment ? `<p class="text-ink mt-0.5">“${esc(cv.comment)}”</p>` : ''}</div>` : '';
      return `<article class="flex flex-col">${voteBox}
          <div class="flex items-center gap-3.5">
            ${rateRing(ratingOf(a))}
            <div class="min-w-0 flex-1">
              <h2 class="font-extrabold text-[1.45rem] leading-tight">${esc(a.name)}</h2>
              <p class="text-ink-soft mt-0.5">${a.source === 'banco' ? '<span class="text-brand font-semibold"><i class="ph-fill ph-archive-box"></i> De Mis candidatos</span> · ' : ''}Se postuló ${ago(a.date).toLowerCase()}</p>
            </div>
          </div>
          <div class="mt-4 grid grid-cols-2 gap-2">
            <button type="button" class="${B} ${inT ? 'bg-brand text-white hover:bg-brand-dark' : 'btn-outline'}" data-terna-toggle="${a.id}" aria-pressed="${inT}"><i class="${inT ? 'ph-fill ph-check-square' : 'ph ph-plus-square'} text-lg shrink-0"></i><span class="truncate">${inT ? 'En la terna' : 'Sumar a terna'}</span></button>
            <button type="button" class="${B} btn-soft" data-cv="${a.id}"><i class="ph-fill ph-file-pdf text-lg shrink-0"></i><span class="truncate">Ver CV</span></button>
            ${wa ? `<a class="${B} btn-outline" href="${wa}" target="_blank" rel="noopener"><i class="ph-fill ph-whatsapp-logo text-lg text-[#25D366] shrink-0"></i><span class="truncate">WhatsApp</span></a>` : `<span class="${B} btn-outline opacity-40" aria-disabled="true"><i class="ph-fill ph-whatsapp-logo text-lg shrink-0"></i>WhatsApp</span>`}
            ${a.email ? `<a class="${B} btn-outline" href="${esc(mailto(a.email, tx))}"><i class="ph ph-envelope-simple text-lg shrink-0"></i><span class="truncate">Email</span></a>` : `<span class="${B} btn-outline opacity-40" aria-disabled="true"><i class="ph ph-envelope-simple text-lg shrink-0"></i>Email</span>`}
          </div>
          <p class="mt-2 text-[0.92rem] text-ink-mute truncate">${[a.phone, a.email].filter(Boolean).map(esc).join(' · ') || '&nbsp;'}</p>
          ${a.interview ? `<div class="mt-4 rounded-[18px] bg-mint/70 p-3.5 flex items-center gap-3"><i class="ph-fill ph-calendar-check text-2xl text-ok shrink-0"></i>
              <div class="min-w-0 flex-1"><p class="font-bold leading-tight">Entrevista: ${ivShort(a.interview.at)} · ${ivTime(a.interview.at)} h</p><p class="text-ink-soft text-[0.92rem] truncate">${esc(a.interview.mode)}${a.interview.place ? ` · ${esc(a.interview.place)}` : ''}</p></div>
              <button type="button" class="btn btn-sm btn-outline bg-white shrink-0" data-iv-sched="${a.id}">Cambiar</button></div>`
            : ['Descartado', 'Contratado'].includes(a.status) ? '' : `<button type="button" class="mt-3 btn btn-soft w-full justify-center" data-iv-sched="${a.id}"><i class="ph-bold ph-calendar-plus text-lg"></i>Agendar entrevista</button>`}
          ${notesBlock(a)}
          <div class="mt-4 rounded-[18px] ${an.empty ? 'bg-sun-soft' : 'bg-lilac/50'} p-3.5 flex gap-3">
            ${fedfu('w-8 h-8')}
            <div class="min-w-0"><p class="text-[0.82rem] font-semibold text-brand">Resumen del CV</p>${an.summary.map(l => `<p class="leading-snug mt-0.5">${esc(l)}</p>`).join('')}</div>
          </div>
          ${matchTable(an.reqs.map(r => [r.text, r.st, r.note]), an.skills.map(x => [x.n, x.st, x.must]), an.comps.map(x => [x.n, x.st]), { empty: an.empty })}
          ${a.message ? `<p class="mt-3 rounded-xl bg-surface px-3 py-2 italic text-ink-soft">“${esc(a.message)}”</p>` : ''}
        </article>`;
    };

    // ----- Pestaña Postulantes: lista compacta -----
    const row = a => {
      const an = analyzeCv(a, j), cv = Store.clientVote(a.id), inT = Store.inTerna(j.id, a.id);
      return `<li><button type="button" data-row="${a.id}" class="w-full text-left grid grid-cols-[auto_minmax(0,1fr)_auto] md:grid-cols-[auto_minmax(0,1fr)_8.5rem_6.5rem_auto] items-center gap-3 md:gap-4 px-3 sm:px-4 py-3.5 hover:bg-surface focus:bg-surface outline-none transition ${a.status === 'Nuevo' ? 'bg-brand-soft/25' : ''}">
        ${rateRing(ratingOf(a), 46)}
        <span class="min-w-0">
          <span class="flex items-center gap-1.5 font-semibold leading-tight"><span class="truncate">${esc(a.name)}</span>${a.status === 'Nuevo' ? '<span class="w-2 h-2 rounded-full bg-brand shrink-0" title="Sin revisar"></span>' : ''}${inT && a.status !== 'Terna' ? '<i class="ph-fill ph-list-checks text-brand shrink-0" title="En la terna"></i>' : ''}${cv && cv.vote ? `<span class="shrink-0" title="Respuesta del cliente">${cv.vote === 'up' ? '👍' : '👎'}</span>` : ''}${a.source === 'hub' && a.referral ? `<span class="shrink-0 rounded-full bg-lilac text-brand px-2 text-[0.75rem] font-bold" title="Recomendado por ${esc(a.referral.from)} desde el Hub"><i class="ph-bold ph-users-three"></i> Recomendado</span>` : ''}${(() => { const fl = qFails(a, j); return fl.length ? `<span class="shrink-0 rounded-full bg-bad/10 text-bad px-2 text-[0.75rem] font-bold" title="No cumple: ${esc(fl.map(q => q.text).join(' · '))}"><i class="ph-bold ph-x"></i> No cumple: ${esc(qShort(fl[0]))}</span>` : ''; })()}${a.status === 'Descartado' ? (a.notifiedAt ? '<span class="shrink-0 rounded-full bg-surface text-ink-mute px-2 text-[0.75rem] font-bold" title="Ya le avisaste"><i class="ph-bold ph-check"></i> Avisado</span>' : '<span class="shrink-0 rounded-full bg-sun-soft text-warn px-2 text-[0.75rem] font-bold" title="Todavía no le avisaste">Sin avisar</span>') : ''}</span>
          <span class="block text-[0.88rem] text-ink-mute mt-0.5 truncate">${a.rating && a.rating.note ? `<i class="ph ph-note-pencil"></i> ${esc(a.rating.note)}` : ratingOf(a) == null ? 'Sin calificar' : ''}<span class="md:hidden">${a.rating && a.rating.note ? ' · ' : ratingOf(a) == null ? ' · ' : ''}${ago(a.date)}</span></span>
        </span>
        <span class="hidden md:block">${statusPill(a.status)}</span>
        <span class="hidden md:block text-ink-mute text-[0.92rem]">${ago(a.date)}</span>
        <span class="flex items-center gap-2"><span class="md:hidden">${statusPill(a.status)}</span><i class="ph-bold ph-caret-right text-ink-mute"></i></span>
      </button></li>`;
    };
    let order = [];
    function drawList() {
      const all = appsOf();
      if (!GROUPS.some(g => g[0] === S.appGroup)) S.appGroup = 'all';
      const G = GROUPS.find(g => g[0] === S.appGroup);
      let list = G[2] ? all.filter(a => G[2].includes(a.status)) : all;
      list = [...list].sort(S.appSort === 'recent' ? (x, y) => new Date(y.date) - new Date(x.date) : (x, y) => scoreOf(y) - scoreOf(x) || new Date(y.date) - new Date(x.date));
      // Quien no cumple una pregunta excluyente va al final
      list = [...list.filter(a => !qFails(a, j).length), ...list.filter(a => qFails(a, j).length)];
      order = list.map(a => a.id);
      const demoBtn = '<button type="button" data-load-demo class="btn btn-primary"><i class="ph-bold ph-users-three"></i>Cargar postulantes de ejemplo</button>';
      $('#app-list').innerHTML = !all.length
        ? `<div class="grid">${emptyState('ph-users', 'Todavía no hay postulantes', 'Cuando alguien se postule lo vas a ver acá, para que lo califiques. Mientras, mirá a la derecha quiénes de Mis candidatos encajan.', demoBtn)}</div>`
        : `<div>
            <div class="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap sm:overflow-visible" role="tablist" aria-label="Etapas">
              ${GROUPS.map(([k, l, sts]) => { const n = sts ? all.filter(a => sts.includes(a.status)).length : all.length; return `<button class="chip shrink-0 ${S.appGroup === k ? 'chip-on' : ''}" data-grp="${k}" role="tab" aria-selected="${S.appGroup === k}">${l} <span class="${S.appGroup === k ? 'opacity-70' : 'text-ink-mute'}">${n}</span></button>`; }).join('')}
            </div>
          </div>
          ${(() => {
            const pend = all.filter(a => a.status === 'Descartado' && !a.notifiedAt).length;
            const out = all.filter(a => a.status === 'Descartado').length;
            const hired = all.some(a => a.status === 'Contratado'), open = all.filter(a => OPEN_STAGES.includes(a.status)).length;
            const box = (tone, ic, t, sub, btn) => `<div class="mt-4 rounded-[18px] ${tone} p-4 flex flex-wrap items-center gap-3"><i class="ph-fill ${ic} text-2xl shrink-0"></i><div class="min-w-0 flex-1"><p class="font-semibold leading-tight text-ink">${t}</p><p class="text-ink-soft text-[0.92rem]">${sub}</p></div>${btn}</div>`;
            if (hired && open) return box('bg-mint text-ok', 'ph-confetti', `¿Cerrás la búsqueda? ${open} ${open === 1 ? 'persona sigue' : 'personas siguen'} en proceso`, 'Avisales a todos de una vez que la búsqueda terminó.', `<button type="button" class="btn btn-primary btn-sm w-full sm:w-auto" data-notify="${j.id}" data-close-all="1"><i class="ph-bold ph-paper-plane-tilt"></i>Avisar a todos</button>`);
            if (pend) return box('bg-sun-soft text-warn', 'ph-hand-heart', `${pend} ${pend === 1 ? 'descartado sin avisar' : 'descartados sin avisar'}`, 'Mandales un mensaje a todos juntos: lo ven en +Humanos y por email, y por WhatsApp uno por uno.', `<button type="button" class="btn btn-primary btn-sm w-full sm:w-auto" data-notify="${j.id}"><i class="ph-bold ph-paper-plane-tilt"></i>Avisar a ${pend === 1 ? 'esa persona' : `los ${pend}`}</button>`);
            if (S.appGroup === 'out' && out) return box('bg-surface text-ok', 'ph-check-circle', 'Ya les avisaste a todos los descartados', 'Gracias por cerrar el círculo: los candidatos lo valoran mucho.', '');
            return '';
          })()}
          <div class="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p class="font-semibold text-ink-soft">${list.length} postulante${list.length === 1 ? '' : 's'}${G[2] ? ` · ${G[1].toLowerCase()}` : ''}</p>
            <div><select id="ap-sort" data-dd class="input h-10 py-0 w-auto font-semibold text-ink" aria-label="Ordenar">
                <option value="match" ${S.appSort !== 'recent' ? 'selected' : ''}>Mayor calificación</option>
                <option value="recent" ${S.appSort === 'recent' ? 'selected' : ''}>Más recientes</option>
              </select></div>
          </div>
          <div class="mt-3 card overflow-hidden">
            <div class="hidden md:grid grid-cols-[46px_minmax(0,1fr)_8.5rem_6.5rem_14px] gap-4 px-4 py-2.5 bg-surface border-b border-line text-[0.85rem] font-bold text-ink-mute">
              <span class="col-span-2">Postulante · calificación</span><span>Etapa</span><span>Recibido</span><span></span></div>
            ${list.length ? `<ul class="divide-y divide-line">${list.map(row).join('')}</ul>` : `<p class="px-4 py-10 text-center text-ink-mute">No hay postulantes en este grupo.</p>`}
          </div>
          ${(() => {
            const read = all.filter(a => cvTextOf(a).trim()).length;
            const rec = aiRecommend(j, all);
            const head = `<div class="flex items-start gap-3"><span class="w-11 h-11 rounded-xl bg-gradient-to-br from-brand to-[#7B3FE4] text-white grid place-items-center shrink-0"><i class="ph-fill ph-sparkle text-xl"></i></span>
              <div class="min-w-0"><p class="font-display font-bold text-[1.15rem] leading-tight">Recomendación de la IA</p><p class="text-ink-mute text-[0.88rem]">Analizó ${read} CV${read === 1 ? '' : 's'} de esta búsqueda</p></div></div>`;
            if (rec.length < 2) return `<section class="mt-6 rounded-[22px] border border-brand/20 bg-gradient-to-br from-brand-soft/70 to-white p-5 sm:p-6" aria-label="Recomendación de la IA">${head}
              <p class="mt-4 text-ink-soft">Cuando tengas al menos 2 CVs en proceso, te recomiendo a quiénes mirar primero y por qué.</p></section>`;
            return `<section class="mt-6 rounded-[22px] border border-brand/20 bg-gradient-to-br from-brand-soft/70 to-white p-5 sm:p-6" aria-label="Recomendación de la IA">${head}
              <p class="mt-4 text-ink leading-relaxed">Luego de leer y analizar los CVs recibidos, y de acuerdo a lo que pide tu búsqueda de <b>${esc(j.title)}</b>, te recomiendo ${rec.length === 3 ? 'estos 3 candidatos' : `estos ${rec.length} candidatos`}:</p>
              <ol class="mt-4 space-y-3">${rec.map(({ a, why, watch }, i) => `<li class="rounded-[18px] bg-white border border-line p-4">
                <div class="flex items-center gap-3">
                  <span class="w-8 h-8 rounded-full bg-ink text-white grid place-items-center font-bold shrink-0">${i + 1}</span>
                  <span class="min-w-0 flex-1"><span class="block font-bold truncate">${esc(a.name)}</span><span class="block text-[0.85rem] text-ink-mute">${esc(a.status)}${Store.inTerna(j.id, a.id) ? ' · en la terna' : ''}</span></span>
                  <button type="button" data-row="${a.id}" class="btn btn-soft btn-sm shrink-0"><i class="ph-bold ph-file-text"></i><span class="max-[380px]:hidden">Ver CV</span></button>
                </div>
                <ul class="mt-3 space-y-1.5">${why.map(w => `<li class="flex gap-2 text-ink-soft leading-snug"><i class="ph-bold ph-check text-ok mt-0.5 shrink-0"></i><span>${esc(w)}</span></li>`).join('')}
                  ${watch ? `<li class="flex gap-2 text-ink-soft leading-snug"><i class="ph-bold ph-warning-circle text-warn mt-0.5 shrink-0"></i><span>${esc(watch)}</span></li>` : ''}</ul>
              </li>`).join('')}</ol>
              <div class="mt-4 flex flex-wrap items-center gap-3 justify-between">
                <p class="text-[0.85rem] text-ink-mute max-w-md">Es una sugerencia para ordenar tu trabajo: la decisión es tuya. Leé cada CV antes de avanzar.</p>
                ${rec.some(r => !Store.inTerna(j.id, r.a.id)) ? `<button type="button" data-ai-terna="${rec.map(r => r.a.id).join(',')}" class="btn btn-primary btn-sm"><i class="ph-bold ph-list-checks"></i>Sumar a la terna</button>` : ''}
              </div></section>`;
          })()}`;
      const so = $('#ap-sort'); if (so) { enhanceSelect(so); so.onchange = e => { S.appSort = e.target.value; drawList(); }; }
    }

    // ----- Columna lateral: terna y banco -----
    function drawSide() {
      const side = $('#js-side'); if (!side) return;
      if (tab === 'tablero') { side.innerHTML = ''; return; }
      const t = Store.ternaOfJob(j.id), items = t ? t.items.map(it => ({ it, a: Store.apps().find(x => x.id === it.appId) })).filter(x => x.a) : [];
      if (t && t.response && !t.responseSeen) Store.updateTerna(t.id, { responseSeen: true, sharedAt: t.sharedAt });
      const st = !items.length ? null : t.response ? ['bg-mint text-ok', 'ph-chat-circle-text', `${esc(t.response.by || 'El cliente')} respondió ${ago(t.response.at).toLowerCase()}`]
        : t.sharedAt ? ['bg-lilac text-brand', 'ph-paper-plane-tilt', `Enviada ${ago(t.sharedAt).toLowerCase()} · esperando respuesta`] : ['bg-sun-soft text-warn', 'ph-pencil-simple-line', 'Borrador · sin compartir'];
      const sug = bankSuggestions(co, j.id, 20);
      side.innerHTML = `<section id="js-terna" class="card p-5" aria-labelledby="tn-t">
          <div class="flex items-center gap-2"><i class="ph-fill ph-list-checks text-brand text-xl"></i><h2 id="tn-t" class="font-display font-bold text-[1.15rem] flex-1">Terna</h2>${items.length ? `<span class="text-ink-mute font-semibold">${items.length}</span>` : ''}</div>
          ${st ? `<p class="mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.88rem] font-semibold ${st[0]}"><i class="ph-fill ${st[1]}"></i>${st[2]}</p>
            <ul class="mt-3 space-y-1">${items.map(({ a }) => { const cv = Store.clientVote(a.id); return `<li class="flex items-center gap-2.5 rounded-xl hover:bg-surface -mx-2 px-2 py-1.5">
              ${rateRing(ratingOf(a), 36)}<button type="button" data-row="${a.id}" class="min-w-0 flex-1 text-left font-semibold truncate hover:text-brand">${esc(a.name)}</button>
              ${cv && cv.vote ? `<span title="${esc(cv.comment || '')}">${cv.vote === 'up' ? '👍' : '👎'}</span>` : ''}
              ${t.sharedAt ? '' : `<button type="button" data-terna-toggle="${a.id}" class="icon-btn w-8 h-8 text-ink-mute hover:text-bad" aria-label="Quitar a ${esc(a.name)} de la terna"><i class="ph ph-x"></i></button>`}</li>`; }).join('')}</ul>
            <button type="button" data-share-terna="${t.id}" class="mt-4 btn btn-primary w-full justify-center">${t.sharedAt ? '<i class="ph ph-arrows-clockwise text-lg"></i>Volver a compartir' : '<i class="ph-fill ph-paper-plane-tilt text-lg"></i>Revisar y compartir'}</button>`
          : `<p class="mt-2 text-ink-soft">Todavía no armaste la terna. Abrí a un postulante y tocá <b class="text-ink">Sumar a terna</b>; después la compartís con ${isCons ? 'tu cliente' : 'quien decide'} con un link.</p>`}
        </section>
        <section id="js-banco" class="card p-5" aria-labelledby="bk-t">
          <div class="flex items-center gap-2"><i class="ph-fill ph-archive-box text-brand text-xl"></i><h2 id="bk-t" class="font-display font-bold text-[1.15rem] flex-1">De Mis candidatos</h2>${sug.length ? `<span class="text-ink-mute font-semibold">${sug.length}</span>` : ''}</div>
          ${sug.length ? `<p class="mt-1 text-ink-soft text-[0.95rem]">Personas que ya conocés y encajan con esta búsqueda.</p>
            <ul class="mt-3 space-y-1">${sug.slice(0, 3).map(({ p, an }) => `<li class="flex items-center gap-2.5 -mx-2 px-2 py-1.5">${avatar(p.name, 'w-9 h-9 text-xs')}<span class="min-w-0 flex-1 font-semibold truncate">${esc(p.name)}</span>
              <button type="button" data-bk-addto="${esc(p.key)}" class="btn btn-sm btn-soft px-3" title="Sumar a la búsqueda"><i class="ph-bold ph-user-plus"></i>Sumar</button></li>`).join('')}</ul>
            ${sug.length > 3 ? `<button type="button" data-bk-all class="mt-2 font-semibold text-brand hover:underline underline-offset-4">Ver las ${sug.length}</button>` : ''}`
          : '<p class="mt-2 text-ink-soft">Nadie de Mis candidatos encaja por ahora. Se arma con quienes se postulan a tus búsquedas.</p>'}
        </section>`;
    }

    // ----- Pestaña Tablero -----
    const kcard = a => {
      const an = analyzeCv(a, j), cv = Store.clientVote(a.id), inT = Store.inTerna(j.id, a.id);
      const hl = (an.summary[0] || '').split(/ con | busca |\. /)[0];
      return `<article class="kcard bg-white rounded-[16px] border border-line p-3 select-none" data-app="${a.id}" tabindex="0" role="button" aria-label="${esc(a.name)}, ${esc(a.status)}. Abrir detalle">
        <div class="flex items-center gap-2.5 xl:gap-2">${rateRing(ratingOf(a), 40)}
          <div class="min-w-0 flex-1"><p class="font-semibold leading-tight truncate xl:whitespace-normal xl:line-clamp-2 xl:text-[0.95rem]">${esc(a.name)}</p><p class="text-[0.85rem] text-ink-mute truncate">${esc(hl)}</p></div>
          ${cv && cv.vote ? `<span class="text-lg">${cv.vote === 'up' ? '👍' : '👎'}</span>` : ''}
          <i class="ph ph-dots-six-vertical text-ink-mute/60 text-lg kgrip xl:hidden" aria-hidden="true"></i></div>
        <div class="mt-2 flex flex-wrap items-center gap-1.5 text-[0.8rem]">
          ${an.reqs.length ? `<span class="inline-flex items-center gap-0.5">${an.reqs.map(r => `<i class="ph-fill ${ICON[r.st][0]} ${ICON[r.st][1]}"></i>`).join('')}</span>` : ''}
          ${inT && a.status !== 'Terna' ? '<span class="rounded-full bg-lilac text-brand px-2 py-0.5 font-semibold">En terna</span>' : ''}
          ${a.notifiedAt ? '<span class="rounded-full bg-surface text-ink-mute px-2 py-0.5 font-semibold"><i class="ph-bold ph-check"></i> Avisado</span>' : ''}
          ${(() => { const nn = notesOf(a).length; return nn ? `<span class="text-brand font-semibold" title="${nn} nota${nn === 1 ? '' : 's'}"><i class="ph-fill ph-note-pencil"></i> ${nn}</span>` : ''; })()}
          <span class="ml-auto text-ink-mute">${ago(a.date)}</span></div>
      </article>`;
    };
    function drawBoard() {
      const apps = appsOf();
      const pendingN = apps.filter(a => a.status === 'Descartado' && !a.notifiedAt).length;
      const hired = apps.filter(a => a.status === 'Contratado');
      const open = apps.filter(a => !['Contratado', 'Descartado'].includes(a.status)).length;
      $('#app-list').innerHTML = `
        <div class="flex flex-wrap items-center justify-between gap-3">
          <p class="text-ink-soft"><span class="hidden sm:inline">Arrastrá las tarjetas para cambiarlas de etapa. Tocá una para ver el detalle.</span><span class="sm:hidden">Mantené apretada una tarjeta para moverla.</span></p>
          <button type="button" class="btn btn-outline btn-sm" data-notify="${j.id}"><i class="ph ph-hand-heart text-lg"></i>Avisar a no seleccionados${pendingN ? ` <span class="rounded-full bg-bad text-white px-2 text-[0.8rem]">${pendingN}</span>` : ''}</button>
        </div>
        ${hired.length && open ? `<div class="mt-4 rounded-[18px] bg-mint p-4 flex flex-wrap items-center gap-3">
          <span class="text-2xl" aria-hidden="true">🎉</span>
          <p class="flex-1 min-w-[12rem]"><b>Cubriste la búsqueda con ${esc(hired.map(h => h.name.split(' ')[0]).join(' y '))}.</b> Quedan ${open} persona${open === 1 ? '' : 's'} esperando respuesta: avisarles cuida la imagen de ${esc(j.client || co.name)}.</p>
          <button type="button" class="btn btn-primary btn-sm" data-notify="${j.id}" data-close-all="1">Avisarles ahora</button></div>` : ''}
        <div class="kanban mt-5 -mx-4 px-4 sm:mx-0 sm:px-0 flex gap-3 overflow-x-auto snap-x snap-mandatory pb-3 md:grid md:grid-cols-3 xl:grid-cols-6 md:gap-4 md:overflow-visible md:snap-none md:pb-0">
          ${STAGES.map(([st, label, col]) => {
            const items = apps.filter(a => a.status === st).sort((x, y) => scoreOf(y) - scoreOf(x));
            return `<section class="kcol snap-start shrink-0 w-[86%] sm:w-[284px] md:w-auto md:min-w-0 bg-surface border border-line rounded-[22px] p-2.5 xl:p-2 flex flex-col" aria-label="${esc(label)}">
              <header class="flex items-center gap-2 px-1.5 pt-1 pb-2.5">
                <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background:${col}"></span>
                <h3 class="font-bold leading-tight min-w-0">${esc(label)}</h3>
                <span class="ml-auto shrink-0 rounded-full bg-white px-2 text-[0.85rem] font-bold text-ink-soft">${items.length}</span>
              </header>
              <div class="klist flex-1 space-y-2 min-h-[120px] max-h-[62vh] overflow-y-auto rounded-[16px] p-0.5" data-stage="${esc(st)}">${items.map(kcard).join('')}</div>
            </section>`;
          }).join('')}
        </div>`;
      initBoardDnD();
    }
    function initBoardDnD() {
      (S.sortables || []).forEach(x => { try { x.destroy(); } catch (e) { /* noop */ } });
      S.sortables = [];
      if (!window.Sortable) return;
      $$('.klist', view).forEach(el => S.sortables.push(new Sortable(el, {
        group: 'kanban', sort: false, animation: 160, delay: 160, delayOnTouchOnly: true, touchStartThreshold: 4, forceFallback: true, fallbackTolerance: 4,
        ghostClass: 'kghost', chosenClass: 'kchosen', dragClass: 'kdrag', scroll: true, bubbleScroll: true, forceAutoScrollFallback: true,
        onStart: () => { S.kDrag = true; },
        onEnd: ev => { setTimeout(() => { S.kDrag = false; }, 60); if (ev.from !== ev.to) moveTo(ev.item.dataset.app, ev.to.dataset.stage); }
      })));
    }

    function moveTo(appId, stage) {
      const a = Store.apps().find(x => x.id === appId); if (!a || a.status === stage) return;
      const prev = a.status, tt = Store.ternaOfJob(a.jobId);
      if (stage === 'Terna' && !Store.inTerna(a.jobId, a.id)) Store.toggleTerna(co.name, a.jobId, a.id);
      if (prev === 'Terna' && stage !== 'Terna' && tt && !tt.sharedAt && Store.inTerna(a.jobId, a.id)) Store.toggleTerna(co.name, a.jobId, a.id);
      Store.updateApp(a.id, { status: stage });
      const first = a.name.split(' ')[0];
      // El candidato ve el cambio en su informe de avance (en producción, además, le llega un WhatsApp)
      toast(`${stage === 'Contratado' ? `¡${first} quedó contratado/a!` : stage === 'Terna' ? `${first} pasó a la terna` : `${first} → ${stage}`}${stage === 'Descartado' ? '' : ' · Le avisamos'}`, stage === 'Contratado' ? 'ph-confetti' : 'ph-arrows-left-right');
      draw();
    }
    // ----- Visor del CV con acciones para decidir (al tocar un postulante) -----
    async function openCvViewer(appId) {
      const a = Store.apps().find(x => x.id === appId); if (!a) return;
      Store.markRead(a.id);
      if (a.status === 'Nuevo') { Store.updateApp(a.id, { status: 'En revisión' }); draw(); }
      closeCvViewer();
      const root = document.createElement('div'); root.id = 'cvv-root';
      root.innerHTML = `<div class="fixed inset-0 z-[70] flex md:p-6" role="dialog" aria-modal="true" aria-label="CV de ${esc(a.name)}">
        <div class="absolute inset-0 bg-ink/60" data-cvv-close></div>
        <div class="relative w-full h-full bg-white md:rounded-[24px] shadow-2xl overflow-hidden flex flex-col md:flex-row">
          <div class="flex-1 min-h-0 flex flex-col bg-surface max-md:h-[58vh] max-md:flex-none">
            <div class="flex items-center gap-2 px-4 h-14 border-b border-line bg-white shrink-0">
              <i class="ph-fill ph-file-pdf text-xl text-bad"></i><span class="font-semibold truncate flex-1">${esc(a.cvName || `CV ${a.name}.pdf`)}</span>
              <a id="cvv-open" target="_blank" rel="noopener" class="btn btn-sm btn-outline max-sm:px-3" title="Abrir en otra pestaña"><i class="ph ph-arrow-square-out text-lg"></i><span class="max-sm:hidden">Otra pestaña</span></a>
              <a id="cvv-dl" class="btn btn-sm btn-outline max-sm:px-3" title="Descargar"><i class="ph ph-download-simple text-lg"></i><span class="max-sm:hidden">Descargar</span></a>
              <button type="button" class="md:hidden icon-btn" data-cvv-close aria-label="Cerrar"><i class="ph-bold ph-x text-xl"></i></button>
            </div>
            <div id="cvv-doc" class="flex-1 min-h-0 grid place-items-center text-ink-mute"><span><i class="ph ph-circle-notch spin"></i> Cargando CV…</span></div>
          </div>
          <aside id="cvv-side" class="w-full md:w-[23rem] shrink-0 border-l border-line overflow-y-auto overscroll-contain p-5 sm:p-6 max-md:flex-1 max-md:min-h-0"></aside>
        </div>
      </div>`;
      document.body.appendChild(root); document.body.style.overflow = 'hidden';
      const key = e => { if (e.key === 'Escape') closeCvViewer(); };
      document.addEventListener('keydown', key); root._key = key;
      root.addEventListener('click', e => { if (e.target.closest('[data-cvv-close]')) closeCvViewer(); });
      drawCvSide(a.id);
      let blob = await Store.getCv(a.id);
      if (!blob) blob = demoPdf(SEED_CANDIDATES.find(c => c.id === a.cand) || a);
      if (!document.getElementById('cvv-root')) return;
      const url = URL.createObjectURL(blob); root._url = url;
      $('#cvv-open').href = url; $('#cvv-dl').href = url; $('#cvv-dl').download = a.cvName || `CV ${a.name}.pdf`;
      const doc = $('#cvv-doc');
      if (!/pdf/.test(blob.type || 'application/pdf')) {
        const txt = cvTextOf(a);
        doc.className = 'flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 sm:p-6';
        doc.innerHTML = txt ? `<div class="mx-auto max-w-[760px] bg-white shadow-card rounded-md p-6 sm:p-10 text-ink"><p class="text-[0.82rem] font-semibold text-ink-mute mb-4 flex items-center gap-1.5"><i class="ph-fill ph-file-doc text-brand"></i>CV en Word · texto del documento</p><div class="whitespace-pre-line leading-relaxed">${esc(txt)}</div></div>`
          : `<div class="text-center p-6"><i class="ph ph-file-doc text-5xl text-brand"></i><p class="mt-2 font-semibold text-ink">Este CV está en Word</p><p>Descargalo para verlo.</p></div>`;
        return;
      }
      // Se dibuja con pdf.js (funciona igual en compu y celular); si falla, el visor del navegador
      if (window.pdfjsLib) {
        try {
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise;
          if (!document.getElementById('cvv-root')) return;
          doc.className = 'flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 sm:p-6 space-y-4';
          doc.innerHTML = '';
          const w = Math.min(doc.clientWidth - 24, 900);
          for (let n = 1; n <= Math.min(pdf.numPages, 8); n++) {
            const page = await pdf.getPage(n), vp0 = page.getViewport({ scale: 1 }), scale = w / vp0.width, dpr = Math.min(window.devicePixelRatio || 1, 2);
            const vp = page.getViewport({ scale: scale * dpr });
            const cv = document.createElement('canvas'); cv.width = vp.width; cv.height = vp.height;
            cv.style.width = `${Math.round(vp.width / dpr)}px`; cv.style.height = `${Math.round(vp.height / dpr)}px`;
            cv.className = 'mx-auto block bg-white shadow-card rounded-md'; cv.setAttribute('aria-label', `Página ${n} del CV`);
            doc.appendChild(cv);
            await page.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
          }
          return;
        } catch (err) { /* sigue con el visor del navegador */ }
      }
      doc.innerHTML = `<iframe src="${url}#view=FitH" title="CV de ${esc(a.name)}" class="w-full h-full bg-white"></iframe>`;
    }
    function closeCvViewer() {
      const r = document.getElementById('cvv-root'); if (!r) return;
      if (r._url) setTimeout(() => URL.revokeObjectURL(r._url), 1000);
      if (r._key) document.removeEventListener('keydown', r._key);
      r.remove(); document.body.style.overflow = '';
    }
    function drawCvSide(appId, flash) {
      const side = $('#cvv-side'); if (!side) return;
      const a = Store.apps().find(x => x.id === appId), an = analyzeCv(a, j), inT = Store.inTerna(j.id, a.id);
      const out = a.status === 'Descartado';
      const prof = Store.coProfile(co.name), waRej = waLink(a.phone, fillTpl(prof.msgReject || DEF_MSG.reject, tplVars(co.name, a.name, j, prof)));
      const STEPS = [['En revisión', 'ph-magnifying-glass'], ['Entrevista', 'ph-chats-circle'], ['Terna', 'ph-list-checks'], ['Contratado', 'ph-confetti']];
      side.innerHTML = `<div class="flex items-start gap-3">
          ${rateRing(ratingOf(a), 56)}
          <div class="min-w-0 flex-1"><h2 class="text-[1.35rem] font-extrabold leading-tight">${esc(a.name)}</h2><p class="text-ink-soft text-[0.95rem]">${a.source === 'hub' ? 'Llegó recomendado/a' : 'Se postuló'} ${ago(a.date).toLowerCase()}</p></div>
          <button type="button" class="max-md:hidden icon-btn -mr-2 -mt-1" data-cvv-close aria-label="Cerrar"><i class="ph-bold ph-x text-xl"></i></button>
        </div>
        ${flash ? `<p class="mt-4 rounded-xl bg-mint text-ok font-semibold px-3 py-2"><i class="ph-bold ph-check"></i> ${flash}</p>` : ''}
        ${a.source === 'hub' && a.referral ? `<div class="mt-5 rounded-[18px] bg-lilac/60 p-4">
          <p class="font-semibold flex items-center gap-2"><i class="ph-fill ph-users-three text-brand"></i>Recomendado/a por ${esc(a.referral.from)}</p>
          ${a.referral.note ? `<p class="mt-1.5 leading-snug">“${esc(a.referral.note)}”</p>` : ''}
          <p class="mt-1.5 text-[0.88rem] text-ink-mute">Llegó desde el Hub. ${a.consent ? `Dio permiso para compartir sus datos el ${new Date(a.consent.at).toLocaleDateString('es-AR')}.` : ''}</p></div>` : ''}
        ${(() => { const qs = questionsOf(j), ans = answersOf(a, j); if (!qs.length) return ''; return `<div class="mt-5 rounded-[18px] border border-line p-4"><p class="font-semibold flex items-center gap-2"><i class="ph ph-list-checks text-brand"></i>Preguntas filtro</p>
          ${ans ? `<ul class="mt-2 space-y-2">${qs.map(q => { const v = ans[q.id], bad = q.must && v && v !== q.ok; return `<li class="text-[0.95rem]"><p class="text-ink-mute leading-snug">${esc(q.text)}${q.must ? ' <span class="text-[0.78rem] font-bold text-ink-soft">· excluyente</span>' : ''}</p><p class="font-semibold ${bad ? 'text-bad' : 'text-ink'}">${bad ? '<i class="ph-bold ph-x"></i>' : '<i class="ph-bold ph-check text-ok"></i>'} ${esc(v || 'Sin responder')}</p></li>`; }).join('')}</ul>` : '<p class="mt-1 text-ink-mute text-[0.92rem]">Se postuló antes de que agregaras las preguntas.</p>'}</div>`; })()}
        <form id="cvv-rate" class="mt-5 rounded-[18px] border border-line p-4">
          <p class="font-semibold">¿Qué tan bien encaja con la búsqueda?</p>
          <p class="text-ink-mute text-[0.9rem]">Calificalo después de leer el CV.</p>
          <div class="mt-3 grid grid-cols-5 gap-1.5" role="radiogroup" aria-label="Calificación">${[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(v => { const on = ratingOf(a) === v; return `<button type="button" role="radio" aria-checked="${on}" data-rate="${v}" class="h-10 rounded-xl font-bold text-[0.95rem] border ${on ? 'bg-brand text-white border-brand' : 'border-line hover:border-brand hover:text-brand'}">${v}%</button>`; }).join('')}</div>
          <label class="sr-only" for="cvv-note">Nota de la calificación</label>
          <textarea id="cvv-note" rows="2" maxlength="300" class="input h-auto py-2.5 mt-3" placeholder="Nota (opcional): por qué le pusiste esa calificación">${esc((a.rating && a.rating.note) || '')}</textarea>
          <button class="mt-2 btn btn-primary btn-sm w-full justify-center" ${ratingOf(a) == null ? 'disabled' : ''} id="cvv-rate-save"><i class="ph-bold ph-check"></i>Guardar calificación</button>
        </form>
        ${out ? `<div class="mt-5 rounded-[18px] bg-surface border border-line p-4">
            <p class="font-bold flex items-center gap-2"><i class="ph-fill ph-x-circle text-ink-mute text-xl"></i>Descartado/a</p>
            <p class="text-ink-soft text-[0.95rem] mt-1">${a.notifiedAt ? 'Ya le avisaste.' : 'Avisale para que no quede esperando.'}</p>
            <div class="mt-3 grid gap-2">
              ${!a.notifiedAt && waRej ? `<a href="${waRej}" target="_blank" rel="noopener" data-cvv-notified class="btn bg-[#25D366] text-white hover:brightness-95 justify-center"><i class="ph-fill ph-whatsapp-logo text-lg"></i>Avisar por WhatsApp</a>` : ''}
              <button type="button" data-cvv-undo class="btn btn-outline justify-center"><i class="ph ph-arrow-counter-clockwise text-lg"></i>Deshacer</button>
            </div></div>`
        : `<p class="mt-6 label !mb-2">Etapa</p>
          <div class="grid grid-cols-2 gap-2">${STEPS.map(([st, ic]) => `<button type="button" data-cvv-move="${st}" class="btn btn-sm justify-center ${a.status === st ? 'bg-brand text-white' : 'btn-outline'}" aria-pressed="${a.status === st}"><i class="${a.status === st ? 'ph-fill' : 'ph'} ${ic} text-lg"></i>${st === 'Terna' && isCons ? 'Terna' : st}</button>`).join('')}</div>
          <div class="mt-5 grid gap-2">
            <button type="button" data-cvv-terna class="btn justify-center ${inT ? 'bg-lilac text-brand' : 'btn-soft'}"><i class="${inT ? 'ph-fill ph-check-square' : 'ph ph-plus-square'} text-lg"></i>${inT ? 'Está en la terna · quitar' : 'Sumar a terna'}</button>
            ${a.interview ? `<button type="button" data-cvv-iv class="btn btn-outline justify-center"><i class="ph-fill ph-calendar-check text-lg text-ok"></i>Entrevista ${ivShort(a.interview.at)} · ${ivTime(a.interview.at)} h</button>`
              : `<button type="button" data-cvv-iv class="btn btn-outline justify-center"><i class="ph ph-calendar-plus text-lg"></i>Agendar entrevista</button>`}
            <button type="button" data-cvv-out class="btn justify-center text-bad border border-bad/30 hover:bg-bad/10"><i class="ph ph-x-circle text-lg"></i>Descartar</button>
          </div>`}
        <div class="mt-6 pt-5 border-t border-line">
          <p class="text-[0.85rem] font-semibold text-ink-mute uppercase tracking-wide">Resumen</p>
          ${an.summary.slice(0, 3).map(l => `<p class="mt-1.5 text-ink-soft leading-snug">${esc(l)}</p>`).join('')}
        </div>`;
      let pick = ratingOf(a);
      $('#cvv-rate').onsubmit = ev => {
        ev.preventDefault(); if (pick == null) return;
        Store.updateApp(a.id, { rating: { pct: pick, note: $('#cvv-note').value.trim(), at: new Date().toISOString() } });
        draw(); drawCvSide(a.id, `Calificación guardada: ${pick}%`);
      };
      side.onclick = e => {
        const rt = e.target.closest('[data-rate]');
        if (rt) { pick = +rt.dataset.rate; $$('[data-rate]', side).forEach(b => { const on = b === rt; b.setAttribute('aria-checked', on); b.className = `h-10 rounded-xl font-bold text-[0.95rem] border ${on ? 'bg-brand text-white border-brand' : 'border-line hover:border-brand hover:text-brand'}`; }); $('#cvv-rate-save').disabled = false; return; }
        const mv = e.target.closest('[data-cvv-move]');
        if (mv) { moveTo(a.id, mv.dataset.cvvMove); drawCvSide(a.id); return; }
        if (e.target.closest('[data-cvv-terna]')) { const on = Store.toggleTerna(co.name, j.id, a.id); draw(); drawCvSide(a.id, on ? 'Sumado/a a la terna' : 'Salió de la terna'); return; }
        if (e.target.closest('[data-cvv-iv]')) { closeCvViewer(); openInterviewSheet({ appId: a.id, back: () => { closeSheet(true); draw(); openCvViewer(a.id); } }); return; }
        if (e.target.closest('[data-cvv-out]')) { moveTo(a.id, 'Descartado'); drawCvSide(a.id); return; }
        if (e.target.closest('[data-cvv-undo]')) { moveTo(a.id, 'En revisión'); drawCvSide(a.id); return; }
        if (e.target.closest('[data-cvv-notified]')) { Store.updateApp(a.id, { notifiedAt: new Date().toISOString() }); setTimeout(() => { draw(); drawCvSide(a.id, 'Le avisaste'); }, 300); return; }
      };
    }
    // Detalle del postulante en un panel al costado, con anterior/siguiente para revisar rápido
    function openAppSheet(appId) {
      const a = Store.apps().find(x => x.id === appId); if (!a) return;
      Store.markRead(a.id); // el candidato ve "CV leído" en su informe de avance
      const ids = order.includes(appId) ? order : appsOf().map(x => x.id);
      const i = ids.indexOf(appId), prevId = ids[i - 1], nextId = ids[i + 1];
      const nav = `<div class="flex items-center gap-2 pr-12 -mt-1 mb-4">
        <button type="button" class="icon-btn border border-line ${prevId ? '' : 'opacity-30 pointer-events-none'}" data-go="${prevId || ''}" aria-label="Anterior"><i class="ph-bold ph-caret-left"></i></button>
        <button type="button" class="icon-btn border border-line ${nextId ? '' : 'opacity-30 pointer-events-none'}" data-go="${nextId || ''}" aria-label="Siguiente"><i class="ph-bold ph-caret-right"></i></button>
        <span class="text-ink-mute font-semibold">${i + 1} de ${ids.length}</span></div>
        <div class="mb-5"><p class="label !mb-1.5">Etapa</p><div class="flex gap-2 overflow-x-auto no-scrollbar sm:flex-wrap">${STAGES.map(([st, label]) => `<button type="button" class="chip shrink-0 h-10 ${a.status === st ? 'chip-on' : ''}" data-move="${esc(st)}">${esc(st === 'Terna' ? 'Terna' : label)}</button>`).join('')}</div></div>`;
      openSheet(sheetScroll(nav + card(a)), c => {
        const keepScroll = fn => { const sc = c.querySelector('.sheet-scroll'), y = sc ? sc.scrollTop : 0; fn(); const sc2 = $('#sheet-content .sheet-scroll'); if (sc2) sc2.scrollTop = y; };
        c.addEventListener('submit', e => {
          const f = e.target.closest('[data-note-form]'); if (!f) return;
          e.preventDefault();
          const t = f.querySelector('textarea').value.trim(); if (!t) { f.querySelector('textarea').focus(); return; }
          Store.addBankNote(co.name, personKey(a), t, { jobId: j.id });
          toast('Nota guardada', 'ph-note-pencil'); draw(); keepScroll(() => openAppSheet(a.id));
        });
        c.addEventListener('click', e => {
          const qn = e.target.closest('[data-note-quick]');
          if (qn) { const ta = c.querySelector('[data-note-form] textarea'); ta.value = ta.value.trim() ? `${ta.value.trim().replace(/[.,]?$/, '')}. ${qn.dataset.noteQuick}.` : `${qn.dataset.noteQuick}.`; ta.focus(); return; }
          const nd = e.target.closest('[data-note-del]');
          if (nd) { askConfirm({ title: '¿Borrar esta nota?', text: 'Se borra también de la ficha de la persona en Mis candidatos.', ok: 'Borrar nota', danger: true }).then(ok => { if (ok) { Store.removeBankNote(co.name, personKey(a), nd.dataset.noteDel); draw(); keepScroll(() => openAppSheet(a.id)); } }); return; }
          const ivb = e.target.closest('[data-iv-sched]'); if (ivb) { openInterviewSheet({ appId: ivb.dataset.ivSched, back: () => { draw(); openAppSheet(a.id); } }); return; }
          const g = e.target.closest('[data-go]'); if (g && g.dataset.go) { openAppSheet(g.dataset.go); return; }
          const mv = e.target.closest('[data-move]'); if (mv) { moveTo(a.id, mv.dataset.move); openAppSheet(a.id); return; }
          if (onCardClick(e)) openAppSheet(a.id);
        });
      }, { side: true });
    }
    function onCardClick(e) {
      const tg = e.target.closest('[data-terna-toggle]');
      if (tg) {
        const a = Store.apps().find(x => x.id === tg.dataset.ternaToggle);
        const on = Store.toggleTerna(co.name, a.jobId, a.id);
        toast(on ? `${a.name.split(' ')[0]} sumado/a a la terna` : `${a.name.split(' ')[0]} salió de la terna`, on ? 'ph-check-square' : 'ph-minus-square');
        draw(); return true;
      }
      const b = e.target.closest('[data-cv]'); if (!b) return false;
      const a = Store.apps().find(x => x.id === b.dataset.cv);
      Store.markRead(a.id);
      viewCv(a, SEED_CANDIDATES.find(c => c.id === a.cand));
      if (a.status === 'Nuevo') { Store.updateApp(a.id, { status: 'En revisión' }); setTimeout(draw, 300); }
      return false;
    }
    function draw() {
      const root = $('#ap-root'); if (!root) return;
      root.classList.toggle('xl:max-w-[88rem]', tab === 'tablero');
      $('#js-head').innerHTML = head();
      $('#js-body').classList.toggle('lg:grid-cols-[minmax(0,1fr)_20rem]', tab !== 'tablero');
      (tab === 'tablero' ? drawBoard : drawList)();
      if (tab === 'tablero') $('#app-list').insertAdjacentHTML('afterbegin', '<div class="mb-4"><button type="button" data-view="postulantes" class="btn btn-outline btn-sm"><i class="ph ph-list-bullets text-lg"></i>Volver a la lista</button></div>');
      drawSide();
      document.body.classList.remove('has-tbar'); const tb = $('#terna-bar'); if (tb) tb.remove();
      renderBottom('company', '/empresa/b');
    }
    function setTab(k) {
      tab = k; S.jobView = { id: j.id, v: k };
      try { history.replaceState(null, '', `#/empresa/b?id=${j.id}${k === 'tablero' ? '&tab=tablero' : ''}`); } catch (e) { /* noop */ }
      draw();
    }
    return {
      html, mount() {
        draw();
        if (params.get('app')) setTimeout(() => openAppSheet(params.get('app')), 30);
        window.addEventListener('hashchange', closeCvViewer, { once: true });
        if (focus === 'terna' || focus === 'banco') setTimeout(() => { const el = $(focus === 'terna' ? '#js-terna' : '#js-banco'); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('ring-2', 'ring-brand'); setTimeout(() => el.classList.remove('ring-2', 'ring-brand'), 1800); } }, 60);
        const root = $('#ap-root');
        root.addEventListener('click', e => {
          const mn = e.target.closest('[data-menu]');
          if (mn) { e.stopPropagation(); const pnl = mn.parentElement.querySelector('[data-menu-panel]'), open = pnl.classList.contains('hidden'); closeMenus(); if (open) { pnl.classList.remove('hidden'); mn.setAttribute('aria-expanded', 'true'); } return; }
          if (e.target.closest('[data-menu-panel]')) closeMenus();
          const vw = e.target.closest('[data-view]'); if (vw) { setTab(vw.dataset.view); return; }
          const gp = e.target.closest('[data-grp]'); if (gp) { S.appGroup = gp.dataset.grp; drawList(); return; }
          if (e.target.closest('[data-bk-all]')) { openBankSuggestions(j.id); return; }
          if (e.target.closest('[data-js-feature]')) { openFeature(j.id); return; }
          if (e.target.closest('[data-js-share]')) { closeMenus(); openShareChannels(j.id); return; }
          if (e.target.closest('[data-js-hub]')) { closeMenus(); openHubAsk(j.id); return; }
          if (e.target.closest('[data-js-qs]')) { closeMenus(); openQuestionsSheet(j.id, () => { draw(); }); return; }
          if (e.target.closest('[data-js-del]')) {
            askConfirm({ title: `¿Eliminar “${esc(j.title)}”?`, text: 'Se borran también sus postulantes. Si solo querés cerrarla, pausala.', ok: 'Eliminar búsqueda', danger: true })
              .then(ok => { if (ok) { Store.removeJob(j.id); toast('Búsqueda eliminada', 'ph-trash'); location.hash = '#/empresa/busquedas'; } });
            return;
          }
          if (e.target.closest('[data-js-toggle]')) {
            if (j.status !== 'activa' && !canActivate(co, 'reactivar')) return;
            if (j.status === 'activa' && j.featured && j.featured.source === 'plan') Store.setFeatured(j.id, null);
            Store.updateJob(j.id, { status: j.status === 'activa' ? 'pausada' : 'activa' });
            toast(j.status === 'activa' ? 'Búsqueda reactivada' : 'Búsqueda pausada', j.status === 'activa' ? 'ph-play-circle' : 'ph-pause-circle');
            draw(); return;
          }
          const r = e.target.closest('[data-row]'); if (r) { openCvViewer(r.dataset.row); return; }
          const kc = e.target.closest('.kcard'); if (kc) { if (!S.kDrag) openAppSheet(kc.dataset.app); return; }
          if (e.target.closest('[data-load-demo]')) { loadDemo(); return; }
          const sh = e.target.closest('[data-share-terna]'); if (sh) { openTernaShare(sh.dataset.shareTerna); S.dirty = true; return; }
          const ad = e.target.closest('[data-bk-addto]');
          if (ad) { const p = bankPeople(co).find(x => x.key === ad.dataset.bkAddto); if (p && addPersonToJob(co, p, j.id)) toast(`${p.name.split(' ')[0]} se sumó a la búsqueda`, 'ph-user-plus'); draw(); return; }
          const bo = e.target.closest('[data-bk-open]'); if (bo) { openBankPerson(bo.dataset.bkOpen); return; }
          const at = e.target.closest('[data-ai-terna]');
          if (at) { const ids = at.dataset.aiTerna.split(','); let n = 0; ids.forEach(id => { if (!Store.inTerna(j.id, id)) { Store.toggleTerna(co.name, j.id, id); n++; } }); toast(`Sumaste ${n} ${n === 1 ? 'persona' : 'personas'} a la terna`, 'ph-list-checks'); draw(); return; }
          const nb = e.target.closest('[data-notify]');
          if (nb) { openRejectSheet(nb.dataset.notify, { closeAll: !!nb.dataset.closeAll, onDone: draw }); return; }
          onCardClick(e);
        });
        root.addEventListener('keydown', e => { const kc = e.target.closest('.kcard'); if (kc && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openAppSheet(kc.dataset.app); } });
      }
    };
  }

  /* ================= BANCO DE TALENTO =================
     Todas las personas que se postularon a las búsquedas de la empresa (en cualquier etapa) + las que se
     guardaron desde "Buscar en +Humanos". Cada una con etiquetas, notas internas, favoritos e historial.
     Cuando se abre una búsqueda nueva, Fedfu sugiere las que encajan. */
  const STAGE_RANK = { 'Nuevo': 1, 'En revisión': 2, 'Entrevista': 3, 'Terna': 4, 'Contratado': 5, 'Descartado': 0 };
  const personKey = a => a.cand ? 'c:' + a.cand : a.email ? 'e:' + norm(a.email) : 'n:' + norm(a.name);
  function bankPeople(co) {
    const ids = new Set(myJobs(co).map(j => j.id));
    const map = new Map();
    Store.apps().filter(a => ids.has(a.jobId)).sort((x, y) => new Date(y.date) - new Date(x.date)).forEach(a => {
      const k = personKey(a);
      if (!map.has(k)) {
        const sc = SEED_CANDIDATES.find(c => c.id === a.cand) || {};
        const j = Store.job(a.jobId) || {};
        map.set(k, { key: k, name: a.name, email: a.email, phone: a.phone, cand: a.cand, cvText: a.cvText || '', headline: sc.headline || '', area: sc.area || j.area,
          province: sc.province || '', city: sc.city || '', apps: [] });
      }
      const p = map.get(k); p.apps.push(a); if (!p.cvText && a.cvText) p.cvText = a.cvText;
      if (!p.declSkills && a.declSkills && a.declSkills.length) { p.declSkills = a.declSkills; p.declComps = a.declComps || []; }
    });
    Object.entries(Store.bankAll(co.name)).forEach(([k, m]) => {
      if (m.saved && m.person && !map.has(k)) map.set(k, { key: k, ...m.person, apps: [] });
    });
    return [...map.values()].map(p => {
      const m = Store.bankMeta(co.name, p.key);
      const live = p.apps.filter(a => a.status !== 'Descartado');
      const best = live.sort((x, y) => STAGE_RANK[y.status] - STAGE_RANK[x.status])[0] || p.apps[0];
      if (!p.headline || !p.province) {
        const an = analyzeCv(pseudoApp(p), genericJob(p));
        if (!p.headline) p.headline = (an.summary[0] || '').split(/ con | busca |\. /)[0];
        if (!p.province && an.loc) { p.province = an.loc.province; p.city = an.loc.city; }
      }
      return { ...p, tags: m.tags || [], notes: m.notes || [], fav: !!m.fav, best, last: p.apps[0] ? p.apps[0].date : null };
    });
  }
  const pseudoApp = p => ({ id: 'bank:' + p.key, name: p.name, cand: p.cand, cvText: p.cvText, declSkills: p.declSkills, declComps: p.declComps });
  const genericJob = p => ({ id: '_bank', title: p.headline || '', area: p.area, province: p.province || '', modality: 'Remoto', seniority: '', requirements: [] });
  const bestLine = p => {
    if (!p.apps.length) return 'Guardado desde la plataforma';
    const b = p.best, j = Store.job(b.jobId) || {};
    const verb = { 'Contratado': 'Contratado/a en', 'Terna': 'Llegó a la terna en', 'Entrevista': 'Llegó a entrevista en', 'En revisión': 'En revisión en', 'Nuevo': 'Se postuló a', 'Descartado': 'No seleccionado/a en' }[b.status] || 'Se postuló a';
    return `${verb} ${j.title || 'una búsqueda'}${p.apps.length > 1 ? ` · ${p.apps.length} búsquedas` : ''}`;
  };
  function inviteText(co, p, j) {
    const link = `${baseUrl()}#/vacantes?job=${j.id}`;
    return `Hola ${p.name.split(' ')[0]}, te escribimos de ${co.name}. Abrimos una búsqueda que puede interesarte: ${j.title}${j.city ? ` en ${j.city}` : ''}. Como ya te conocemos, pensamos en vos. Si querés postularte, entrá acá: ${link}`;
  }
  function addPersonToJob(co, p, jobId) {
    const j = Store.job(jobId); if (!j) return false;
    if (Store.apps().some(a => a.jobId === jobId && personKey(a) === p.key)) return false;
    Store.addApp({ id: 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), jobId, cand: p.cand, name: p.name, email: p.email, phone: p.phone,
      cvName: `CV ${p.name}.pdf`, cvSize: 48000, cvText: p.cvText || '', date: new Date().toISOString(), status: 'Nuevo', mine: false, source: 'banco' });
    return true;
  }
  function bankSuggestions(co, jobId, limit = 8) {
    const j = Store.job(jobId); if (!j) return [];
    return bankPeople(co).filter(p => !p.apps.some(a => a.jobId === jobId) && !p.tags.includes('No recontratar'))
      .map(p => ({ p, an: analyzeCv(pseudoApp(p), j) }))
      .filter(x => x.an.score != null && (x.an.score >= 60 || x.p.area === j.area))
      .sort((a, b) => b.an.score - a.an.score || (b.p.fav ? 1 : 0) - (a.p.fav ? 1 : 0)).slice(0, limit);
  }

  function openBankSuggestions(jobId, opts = {}) {
    const co = Store.company(), j = Store.job(jobId); if (!co || !j) return;
    const sug = bankSuggestions(co, jobId);
    if (!sug.length && opts.afterPublish) return;
    const sel = new Set(sug.filter(x => x.an.score >= 70).map(x => x.p.key));
    const draw = () => {
      const body = `
        ${opts.afterPublish ? `<p class="inline-flex items-center gap-1.5 rounded-full bg-mint text-ok font-semibold px-3 py-1 text-[0.92rem]"><i class="ph-bold ph-check"></i>Búsqueda publicada</p>` : ''}
        <div class="mt-3 flex items-start gap-3 pr-8">${fedfu('w-11 h-11')}<div><h2 class="text-[1.45rem] font-extrabold leading-tight">${sug.length ? `Hay ${sug.length} persona${sug.length === 1 ? '' : 's'} de Mis candidatos para esta búsqueda` : 'Nadie de Mis candidatos encaja'}</h2>
          <p class="text-ink-soft mt-1">${esc(j.title)}${j.client ? ` · ${esc(j.client)}` : ''}. ${sug.length ? 'Ya las conocés: sumalas sin esperar a que se postulen, o invitalas.' : 'A medida que recibas postulantes, Mis candidatos va a crecer.'}</p></div></div>
        <ul class="mt-5 space-y-2.5">${sug.map(({ p, an }) => `<li class="rounded-[18px] border ${sel.has(p.key) ? 'border-brand bg-brand-soft/40' : 'border-line'} p-3.5">
          <label class="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" class="w-5 h-5 accent-[#3B5BFD] shrink-0" data-sg="${esc(p.key)}" ${sel.has(p.key) ? 'checked' : ''}>
            ${matchRing(an.score, 46)}
            <span class="min-w-0 flex-1"><span class="flex items-center gap-1.5 font-bold">${esc(p.name)}${p.fav ? '<i class="ph-fill ph-star text-sun"></i>' : ''}</span>
              <span class="block text-[0.9rem] text-ink-soft truncate">${esc(bestLine(p))}</span></span></label>
          <p class="mt-2 text-[0.95rem] leading-snug">${esc(an.summary[0] || '')}</p>
          ${p.tags.length ? `<div class="mt-2 flex flex-wrap gap-1.5">${p.tags.slice(0, 3).map(t => `<span class="rounded-full bg-lilac px-2.5 py-0.5 text-[0.82rem] font-semibold text-brand">${esc(t)}</span>`).join('')}</div>` : ''}
          ${p.notes[0] ? `<p class="mt-2 text-[0.9rem] text-ink-mute italic truncate">“${esc(p.notes[0].t)}”</p>` : ''}
          ${p.phone ? `<a class="mt-2.5 btn btn-outline btn-sm" href="${esc(waLink(p.phone, inviteText(co, p, j)))}" target="_blank" rel="noopener"><i class="ph-fill ph-whatsapp-logo text-[#25D366] text-lg"></i>Invitar a postularse</a>` : ''}
        </li>`).join('')}</ul>`;
      const n = sel.size;
      const foot = sug.length ? `<button data-close-sheet class="btn btn-outline h-14 px-5">Ahora no</button>
        <button type="button" id="sg-add" class="btn btn-primary flex-1 h-14 text-[1.05rem]" ${n ? '' : 'disabled'}><i class="ph-bold ph-user-plus text-xl"></i>${n ? `Sumar ${n} a la búsqueda` : 'Elegí a quién sumar'}</button>`
        : `<button data-close-sheet class="btn btn-primary flex-1 h-14">Entendido</button>`;
      return sheetScroll(body) + sheetFoot(foot);
    };
    const mount = c => {
      c.addEventListener('change', e => { const cb = e.target.closest('[data-sg]'); if (!cb) return; cb.checked ? sel.add(cb.dataset.sg) : sel.delete(cb.dataset.sg); setSheet(draw(), mount); });
      const b = $('#sg-add', c); if (b) b.onclick = () => {
        let n = 0; sug.forEach(({ p }) => { if (sel.has(p.key) && addPersonToJob(co, p, jobId)) n++; });
        toast(`Sumaste ${n} persona${n === 1 ? '' : 's'} de Mis candidatos a ${j.title}`, 'ph-user-plus');
        closeSheet(true);
        S.appJob = jobId; S.appClient = 'all'; S.appStatus = 'all';
        if (parseHash().path === '/empresa/b') refresh(); else location.hash = `#/empresa/b?id=${jobId}`;
      };
    };
    openSheet(draw(), mount);
  }

  function openBankPerson(key, opts = {}) {
    const co = Store.company();
    const get = () => bankPeople(co).find(p => p.key === key);
    if (!get()) return;
    const draw = () => {
      const p = get(), cmpJob = S.bank.job ? Store.job(S.bank.job) : null;
      const an = analyzeCv(pseudoApp(p), cmpJob || genericJob(p));
      const allTags = [...new Set([...BANK_TAG_SUGGESTIONS, ...bankPeople(co).flatMap(x => x.tags)])].filter(t => !p.tags.includes(t));
      const avail = myJobs(co).filter(j => j.status === 'activa' && !p.apps.some(a => a.jobId === j.id));
      const ICO = { ok: ['ph-check-circle', 'text-ok'], no: ['ph-x-circle', 'text-bad'], unk: ['ph-question', 'text-ink-mute'] };
      const body = `
        <div class="flex items-center gap-3.5 pr-10">
          ${cmpJob ? matchRing(an.score, 56) : avatar(p.name, 'w-14 h-14 text-lg')}
          <div class="min-w-0 flex-1"><h2 class="text-[1.5rem] leading-tight font-extrabold">${esc(p.name)}</h2>
            <p class="text-ink-soft truncate">${esc(p.headline)}${p.city || p.province ? ` · ${esc(p.city || p.province)}` : ''}</p></div>
          <button type="button" class="icon-btn border border-line ${p.fav ? 'text-sun' : ''}" data-bk-fav="${esc(p.key)}" aria-pressed="${p.fav}" aria-label="${p.fav ? 'Quitar de favoritos' : 'Marcar como favorito'}"><i class="${p.fav ? 'ph-fill' : 'ph'} ph-star text-2xl"></i></button>
        </div>
        <div class="mt-4 rounded-[18px] bg-lilac/50 p-3.5 flex gap-3">${fedfu('w-8 h-8')}<div class="min-w-0"><p class="text-[0.82rem] font-semibold text-brand">Resumen del CV${cmpJob ? ` · comparado con ${esc(cmpJob.title)}` : ''}</p>${an.summary.map(l => `<p class="leading-snug mt-0.5">${esc(l)}</p>`).join('')}</div></div>
        ${cmpJob && an.reqs.length ? `<ul class="mt-3 space-y-1.5">${an.reqs.map(r => `<li class="flex items-start gap-2"><i class="ph-fill ${ICO[r.st][0]} ${ICO[r.st][1]} text-xl shrink-0 mt-px"></i><span>${esc(r.text)}${r.note ? ` <span class="text-ink-mute text-[0.9rem]">· ${esc(r.note)}</span>` : ''}</span></li>`).join('')}</ul>` : ''}

        <h3 class="mt-6 font-bold text-lg">Etiquetas</h3>
        <div class="mt-2 flex flex-wrap gap-1.5" id="bk-tags">${p.tags.length ? p.tags.map(t => `<span class="inline-flex items-center gap-1 h-9 pl-3 pr-1 rounded-full bg-lilac text-brand font-semibold">${esc(t)}<button type="button" class="w-7 h-7 grid place-items-center rounded-full hover:bg-brand/15" data-bk-untag="${esc(t)}" aria-label="Quitar etiqueta ${esc(t)}"><i class="ph-bold ph-x text-sm"></i></button></span>`).join('') : '<span class="text-ink-mute">Sin etiquetas todavía.</span>'}</div>
        <form id="bk-tagform" class="mt-2.5 flex gap-2" autocomplete="off">
          <input id="bk-tagin" class="input h-11" list="bk-taglist" maxlength="30" placeholder="Agregar etiqueta (ej: Volver a contactar)" aria-label="Agregar etiqueta">
          <datalist id="bk-taglist">${allTags.map(t => `<option value="${esc(t)}">`).join('')}</datalist>
          <button class="btn btn-outline h-11 px-4 shrink-0" aria-label="Agregar etiqueta"><i class="ph-bold ph-plus"></i></button>
        </form>
        <div class="mt-2 flex flex-wrap gap-1.5">${allTags.slice(0, 5).map(t => `<button type="button" class="chip h-8 px-3 text-[0.85rem]" data-bk-addtag="${esc(t)}"><i class="ph ph-plus"></i>${esc(t)}</button>`).join('')}</div>

        <h3 class="mt-6 font-bold text-lg">Notas internas</h3>
        <p class="text-ink-mute text-[0.9rem]">Solo las ve tu equipo.</p>
        <form id="bk-noteform" class="mt-2">
          <textarea id="bk-note" rows="2" maxlength="500" class="input h-auto py-2.5" placeholder="Ej: Muy buena entrevista, pretende $1.000.000. Disponible desde marzo."></textarea>
          <button class="btn btn-soft btn-sm mt-2"><i class="ph-bold ph-note-pencil"></i>Guardar nota</button>
        </form>
        <ul class="mt-3 space-y-2">${p.notes.map(n => { const nj = n.jobId ? Store.job(n.jobId) : null; return `<li class="rounded-[14px] bg-surface p-3"><p class="whitespace-pre-line">${esc(n.t)}</p><p class="text-[0.82rem] text-ink-mute mt-1">${ago(n.at)}${nj ? ` · en ${esc(nj.title)}` : ''}</p></li>`; }).join('')}</ul>

        <h3 class="mt-6 font-bold text-lg">Historial</h3>
        <ul class="mt-2 space-y-2">${p.apps.length ? p.apps.map(a => { const j = Store.job(a.jobId) || {}; const cv = Store.clientVote(a.id); return `<li class="flex items-center gap-3 rounded-[14px] border border-line p-3">
          <span class="min-w-0 flex-1"><span class="block font-semibold truncate">${esc(j.title || 'Búsqueda finalizada')}</span><span class="block text-[0.88rem] text-ink-mute truncate">${j.client ? esc(j.client) + ' · ' : ''}${ago(a.date)}${a.source === 'banco' ? ' · desde Mis candidatos' : ''}</span></span>
          ${cv && cv.vote ? `<span title="Respuesta del cliente">${cv.vote === 'up' ? '👍' : '👎'}</span>` : ''}${statusPill(a.status)}</li>`; }).join('') : '<li class="text-ink-mute">Todavía no participó en tus búsquedas.</li>'}</ul>

        <h3 class="mt-6 font-bold text-lg">Sumar a una búsqueda</h3>
        ${avail.length ? `<div class="mt-2 flex flex-col sm:flex-row gap-2">
          <select id="bk-job" class="input" aria-label="Búsqueda">${avail.map(j => `<option value="${j.id}" ${S.bank.job === j.id ? 'selected' : ''}>${esc(j.title)}${j.client ? ` · ${esc(j.client)}` : ''}</option>`).join('')}</select>
          <button type="button" id="bk-add" class="btn btn-primary shrink-0"><i class="ph-bold ph-user-plus"></i>Sumar</button>
          ${p.phone ? `<a id="bk-inv" class="btn btn-outline shrink-0" target="_blank" rel="noopener"><i class="ph-fill ph-whatsapp-logo text-[#25D366]"></i>Invitar</a>` : ''}
        </div>` : '<p class="mt-2 text-ink-mute">Ya participa en todas tus búsquedas activas.</p>'}`;
      const foot = `<button type="button" id="bk-cv" class="btn btn-soft h-12"><i class="ph-fill ph-file-pdf text-lg"></i>Ver CV</button><button data-close-sheet class="btn btn-outline flex-1 h-12">Cerrar</button>`;
      return sheetScroll(body) + sheetFoot(foot);
    };
    const redraw = () => { S.dirty = true; setSheet(draw(), mount); };
    const mount = c => {
      const p = get();
      c.addEventListener('click', e => {
        const f = e.target.closest('[data-bk-fav]'); if (f) { Store.setBankMeta(co.name, key, { fav: !p.fav }); redraw(); return; }
        const u = e.target.closest('[data-bk-untag]'); if (u) { Store.setBankMeta(co.name, key, { tags: p.tags.filter(t => t !== u.dataset.bkUntag) }); redraw(); return; }
        const at = e.target.closest('[data-bk-addtag]'); if (at) { Store.setBankMeta(co.name, key, { tags: [...p.tags, at.dataset.bkAddtag] }); redraw(); }
      });
      $('#bk-tagform', c).onsubmit = e => {
        e.preventDefault(); const t = $('#bk-tagin', c).value.trim().replace(/\s+/g, ' '); if (!t) return;
        const tt = t.charAt(0).toUpperCase() + t.slice(1);
        if (!p.tags.some(x => norm(x) === norm(tt))) Store.setBankMeta(co.name, key, { tags: [...p.tags, tt] });
        redraw();
      };
      $('#bk-noteform', c).onsubmit = e => { e.preventDefault(); const t = $('#bk-note', c).value.trim(); if (!t) return; Store.addBankNote(co.name, key, t); toast('Nota guardada', 'ph-note-pencil'); redraw(); };
      $('#bk-cv', c).onclick = () => viewCv(p.apps[0] || null, SEED_CANDIDATES.find(x => x.id === p.cand) || { name: p.name, cvText: p.cvText });
      const sel = $('#bk-job', c), inv = $('#bk-inv', c);
      const syncInv = () => { if (inv && sel) inv.href = waLink(p.phone, inviteText(co, p, Store.job(sel.value))); };
      if (sel) { sel.onchange = syncInv; syncInv(); }
      const add = $('#bk-add', c); if (add) add.onclick = () => {
        const j = Store.job(sel.value);
        if (addPersonToJob(co, p, j.id)) toast(`${p.name.split(' ')[0]} sumado/a a ${j.title}`, 'ph-user-plus');
        redraw();
      };
    };
    openSheet(draw(), mount, { side: true });
  }

  /* ----- Filtro por profesión (Base de datos: Mis candidatos y Buscar en +Humanos) ----- */
  const inProf = (pr, p) => !(pr.excl || []).some(id => inProf(PROFESSIONS.find(x => x.id === id), p)) &&
    (pr.areas.includes(p.area) || pr.kw.some(k => norm(`${p.headline || ''} ${(p.skills || []).join(' ')}`).includes(k)));
  // Botones rápidos con la cantidad de personas por profesión (solo las que tienen alguien)
  function profBar(people) {
    if (!PROFESSIONS.some(pr => pr.id === S.prof)) S.prof = '';
    const counts = PROFESSIONS.map(pr => [pr, people.filter(p => inProf(pr, p)).length]).filter(x => x[1] || x[0].id === S.prof);
    return `<div class="mt-4" role="group" aria-label="Filtrar por profesión">
      <p class="text-[0.9rem] font-semibold text-ink-mute mb-2">Profesión</p>
      <div class="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
        <button type="button" class="chip h-11 shrink-0 ${!S.prof ? 'chip-on' : ''}" data-prof="" aria-pressed="${!S.prof}">Todas <span class="${!S.prof ? 'opacity-70' : 'text-ink-mute'}">${people.length}</span></button>
        ${counts.map(([pr, n]) => `<button type="button" class="chip h-11 shrink-0 ${S.prof === pr.id ? 'chip-on' : ''}" data-prof="${pr.id}" aria-pressed="${S.prof === pr.id}"><i class="${S.prof === pr.id ? 'ph-fill' : 'ph'} ${pr.icon} text-lg ${S.prof === pr.id ? '' : 'text-brand'}"></i>${esc(pr.label)} <span class="${S.prof === pr.id ? 'opacity-70' : 'text-ink-mute'}">${n}</span></button>`).join('')}
      </div></div>`;
  }
  const byProf = list => { const pr = PROFESSIONS.find(x => x.id === S.prof); return pr ? list.filter(p => inProf(pr, p)) : list; };

  /* ================= BASE DE DATOS (antes "Talento") =================
     Una sola página con dos pestañas: Mis candidatos (quienes pasaron por tus búsquedas o guardaste) y Buscar en +Humanos (el resto de la plataforma).
     Filtros al costado (palabra clave, provincia, profesión, experiencia) y lista en filas con "Ver perfil". */
  function platformPool(co) {
    const ids = new Set(myJobs(co).map(j => j.id));
    const pool = SEED_CANDIDATES.filter(c => !Store.isErased(c)).map(c => ({ ...c, appliedTo: Store.apps().filter(a => a.cand === c.id && ids.has(a.jobId)).map(a => a.jobId) }));
    const seen = new Set(pool.map(c => norm(c.email)));
    Store.apps().filter(a => a.mine).forEach(a => {
      const key = norm(a.email || a.phone); if (seen.has(key)) return; seen.add(key);
      const j = Store.job(a.jobId) || {};
      pool.unshift({ id: 'app-' + a.id, app: a, name: a.name, headline: `Interesado/a en ${j.title || 'vacantes'}`, area: j.area, province: j.province, city: j.city, seniority: '', skills: [], email: a.email, phone: a.phone, appliedTo: ids.has(a.jobId) ? [a.jobId] : [] });
    });
    Store.spontCvs().filter(x => x.status === 'aprobado').forEach(x => {
      const key = norm(x.email || x.phone); if (seen.has(key)) return; seen.add(key);
      pool.unshift({ id: 'sp-' + x.id, sp: x, name: x.name, headline: x.area ? `Envió su CV · ${areaOf(x.area).label}` : 'Envió su CV', area: x.area, province: x.province, city: '', seniority: '', skills: [], email: x.email, phone: x.phone, appliedTo: [], date: x.date });
    });
    return pool;
  }
  const platKey = c => c.app ? personKey(c.app) : c.sp ? 'p:' + norm(c.sp.phone || c.sp.email) : 'c:' + c.id;
  function dbRows(co, tab) {
    if (tab === 'bank') return bankPeople(co).map(p => {
      const sc = SEED_CANDIDATES.find(c => c.id === p.cand) || {};
      return { key: p.key, kind: 'bank', name: p.name, headline: p.headline || sc.headline || '', area: p.area || sc.area, province: p.province || sc.province, city: p.city || sc.city,
        seniority: sc.seniority || '', skills: (p.declSkills && p.declSkills.length ? p.declSkills : sc.skills) || [], jobs: [...new Set(p.apps.map(a => a.jobId))], fav: p.fav, last: p.last, ref: p };
    });
    return platformPool(co).map(c => ({ key: platKey(c), kind: 'plat', name: c.name, headline: c.headline || '', area: c.area, province: c.province, city: c.city, seniority: c.seniority || '', skills: c.skills || [], jobs: c.appliedTo || [], fav: false, last: c.date || (c.app && c.app.date) || null, ref: c }));
  }

  /* ----- Página del candidato (desde Base de datos → Ver perfil) ----- */
  function cvSections(text) {
    const out = { perfil: '', estudios: [], exp: [] }; let cur = '';
    String(text || '').split('\n').map(l => l.trim()).filter(Boolean).forEach(l => {
      const h = norm(l);
      if (/^(perfil|sobre mi|resumen)$/.test(h)) { cur = 'perfil'; return; }
      if (/^(experiencia|experiencia laboral)$/.test(h)) { cur = 'exp'; return; }
      if (/^(estudios|educacion|formacion)$/.test(h)) { cur = 'estudios'; return; }
      if (/^(habilidades|skills|idiomas|conocimientos)$/.test(h)) { cur = ''; return; }
      if (cur === 'perfil') out.perfil += (out.perfil ? ' ' : '') + l;
      else if (cur) out[cur].push(l);
    });
    return out;
  }
  function findPerson(co, key) {
    const b = dbRows(co, 'bank').find(r => r.key === key);
    return b || dbRows(co, 'platform').find(r => r.key === key) || null;
  }
  function CandidatePage(params) {
    const co = Store.company(), key = params.get('k') || '';
    const r = findPerson(co, key);
    if (!r) return { html: `<div class="max-w-3xl mx-auto px-4 sm:px-6 py-10 grid">${emptyState('ph-user-circle', 'No encontramos este perfil', 'Puede que ya no esté en la base de datos.', '<a href="#/empresa/candidatos" class="btn btn-primary">Volver a la base de datos</a>')}</div>` };
    const ref = r.ref, isBank = r.kind === 'bank';
    const sc = SEED_CANDIDATES.find(c => c.id === (ref.cand || ref.id)) || {};
    const text = (ref.cvText) || (ref.app && ref.app.cvText) || (ref.sp && ref.sp.cvText) || (typeof SEED_CV !== 'undefined' && (SEED_CV[ref.cand] || SEED_CV[ref.id])) || '';
    const cvs = cvSections(text);
    const pseudo = { id: 'page:' + key, name: r.name, cand: ref.cand || (sc.id || null), cvText: text, declSkills: ref.declSkills, declComps: ref.declComps };
    const an = analyzeCv(pseudo, genericJob({ headline: r.headline, area: r.area, province: r.province }));
    const meta = Store.bankMeta(co.name, key), tags = meta.tags || [], notes = meta.notes || [];
    const saved = isBank || !!meta.saved;
    const loc = [r.city, r.province].filter(Boolean).join(', ');
    const phone = ref.phone || sc.phone || '', email = ref.email || sc.email || '';
    const tx = contactTexts(co.name, r.name, null), wa = waLink(phone, tx.wa);
    // Contacto bloqueado: personas de la base de +Humanos que no se postularon a tus búsquedas
    const locked = !(isBank && ((ref.apps && ref.apps.length) || ref.imported)) && !hasBase(co);
    const lockedVal = `<span class="text-ink-mute tracking-widest select-none" aria-label="Oculto">••• ••• ••••</span>`;
    const js = r.jobs.map(id => Store.job(id)).filter(Boolean);
    const origin = isBank ? (ref.apps && ref.apps.length ? `Se postuló a ${ref.apps.length === 1 ? 'una búsqueda tuya' : `${ref.apps.length} búsquedas tuyas`}` : ref.imported ? `Importado por tu equipo ${ago(ref.imported).toLowerCase()}` : 'Guardado desde la plataforma')
      : ref.sp ? `Envió su CV a +Humanos ${ago(ref.sp.date).toLowerCase()}` : ref.app ? 'Se postuló desde la web' : 'Perfil de la plataforma (acepta ser contactado)';
    const pret = (text.match(/pretensi[oó]n[^\n:]*:?\s*([^\n]+)/i) || [])[1];
    const edad = (text.match(/(\d{2})\s*a[nñ]os/i) || [])[1];
    const avail = myJobs(co).filter(j => j.status === 'activa' && !r.jobs.includes(j.id));
    const info = (ic, l, v, extra = '') => `<li class="flex gap-4"><i class="ph ${ic} text-[1.6rem] text-brand shrink-0 mt-0.5"></i><div class="min-w-0"><p class="font-display font-bold text-[1.05rem]">${l}</p><div class="mt-0.5 ${v ? 'text-ink-soft' : 'text-ink-mute italic'}">${v || 'Sin dato'}</div>${extra}</div></li>`;
    const allTags = [...new Set([...BANK_TAG_SUGGESTIONS])].filter(t => !tags.includes(t));
    const html = `<section class="bg-gradient-to-br from-brand-soft via-[#EEF1FF] to-[#E4E9FF]">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-10 md:pb-14">
          <a href="#/empresa/candidatos" class="inline-flex items-center gap-1.5 font-semibold text-ink-soft hover:text-brand"><i class="ph-bold ph-arrow-left"></i>Base de datos</a>
          <div class="mt-6 flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-10">
            <div class="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-7 min-w-0 flex-1">
              ${avatar(r.name, 'w-24 h-24 sm:w-32 sm:h-32 text-3xl sm:text-4xl ring-4 ring-white')}
              <div class="min-w-0">
                <h1 class="text-[2rem] sm:text-[2.4rem] leading-tight font-extrabold flex items-center gap-2">${esc(r.name)}${r.fav ? '<i class="ph-fill ph-star text-sun text-2xl" title="Favorito"></i>' : ''}</h1>
                <div class="mt-1.5 flex flex-wrap items-center gap-x-6 gap-y-1 text-[1.02rem]">
                  <span class="text-brand font-semibold">${esc(r.headline || areaOf(r.area).label)}</span>
                  ${loc ? `<span class="inline-flex items-center gap-1.5 text-ink-soft"><i class="ph ph-map-pin text-lg"></i>${esc(loc)}</span>` : ''}
                  ${r.seniority ? `<span class="inline-flex items-center gap-1.5 text-ink-soft"><i class="ph ph-medal text-lg"></i>${senLabel(r.seniority)}</span>` : ''}
                </div>
                ${r.skills.length ? `<div class="mt-4 flex flex-wrap gap-2">${r.skills.map(x => `<span class="rounded-full bg-[#DCE3FF] text-brand px-4 py-1.5 font-medium">${esc(x)}</span>`).join('')}</div>` : ''}
              </div>
            </div>
            <div class="flex flex-wrap items-center gap-3 shrink-0">
              <button type="button" id="cp-cv" class="btn btn-primary h-14 px-7 text-[1.05rem]"><i class="ph-fill ${locked ? 'ph-lock-key-open' : 'ph-file-text'} text-xl"></i>${locked ? 'Ver CV (plan Pro)' : 'Ver CV'}</button>
              <div class="relative" data-menu-wrap>
                <button type="button" data-menu="cp-add" class="btn btn-primary h-14 px-7 text-[1.05rem]" aria-haspopup="true" aria-expanded="false" ${avail.length ? '' : 'disabled title="Ya participa en todas tus búsquedas activas"'}><i class="ph-bold ph-user-plus text-xl"></i>Sumar a búsqueda</button>
                <div data-menu-panel="cp-add" class="hidden dd-pop absolute right-0 top-full mt-2 z-50 w-80 max-w-[calc(100vw-2rem)] max-h-80 overflow-y-auto bg-white rounded-2xl border border-line shadow-[0_24px_48px_-20px_rgba(20,18,58,.35)] p-1.5">
                  <p class="px-3 pt-2 pb-1.5 text-[0.82rem] font-bold uppercase tracking-wide text-ink-mute">Elegí la búsqueda</p>
                  ${avail.map(j => `<button type="button" data-cp-add="${j.id}" class="w-full text-left px-3 py-2.5 rounded-xl hover:bg-surface"><span class="block font-semibold leading-tight">${esc(j.title)}</span><span class="block text-ink-mute text-[0.9rem]">${esc(j.client || 'Búsqueda propia')} · ${esc(j.city)}</span></button>`).join('')}
                </div>
              </div>
              <button type="button" id="cp-save" class="w-14 h-14 rounded-2xl grid place-items-center ${saved ? 'bg-brand text-white' : 'bg-white/70 text-brand hover:bg-white'} transition" aria-pressed="${saved}" title="${saved ? 'Está en Mis candidatos' : 'Guardar en Mis candidatos'}" aria-label="${saved ? 'Está en Mis candidatos' : 'Guardar en Mis candidatos'}"><i class="${saved ? 'ph-fill' : 'ph'} ph-bookmark-simple text-2xl"></i></button>
            </div>
          </div>
        </div>
      </section>
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-10 md:py-14 grid gap-10 lg:grid-cols-[minmax(0,1fr)_23rem] items-start">
        <div class="min-w-0 space-y-10">
          <section aria-labelledby="cp-about">
            <h2 id="cp-about" class="text-[1.4rem] font-extrabold">Sobre el candidato</h2>
            ${cvs.perfil ? `<p class="mt-4 text-ink-soft text-[1.05rem] leading-relaxed">${esc(cvs.perfil)}</p>` : ''}
            ${an.summary.length ? `<ul class="mt-4 space-y-2">${an.summary.map(l => `<li class="flex gap-3 text-ink-soft leading-relaxed"><i class="ph-fill ph-check-circle text-brand text-xl shrink-0 mt-0.5"></i><span>${esc(l)}</span></li>`).join('')}</ul>` : ''}
            ${!cvs.perfil && !an.summary.length ? '<p class="mt-4 text-ink-mute">Todavía no hay información del CV. Abrí el CV para verlo completo.</p>' : ''}
          </section>
          <section aria-labelledby="cp-tags">
            <h2 id="cp-tags" class="text-[1.4rem] font-extrabold">Etiquetas</h2>
            <div class="mt-3 flex flex-wrap gap-2">${tags.length ? tags.map(t => `<span class="inline-flex items-center gap-1 h-10 pl-4 pr-1.5 rounded-full bg-lilac text-brand font-semibold">${esc(t)}<button type="button" class="w-8 h-8 grid place-items-center rounded-full hover:bg-brand/15" data-cp-untag="${esc(t)}" aria-label="Quitar etiqueta ${esc(t)}"><i class="ph-bold ph-x text-sm"></i></button></span>`).join('') : '<span class="text-ink-mute">Sin etiquetas todavía.</span>'}</div>
            <form id="cp-tagform" class="mt-3 flex gap-2 max-w-md" autocomplete="off"><input id="cp-tagin" class="input h-12" maxlength="30" placeholder="Agregar etiqueta" aria-label="Agregar etiqueta"><button class="btn btn-outline h-12 px-4 shrink-0" aria-label="Agregar etiqueta"><i class="ph-bold ph-plus"></i></button></form>
            <div class="mt-2 flex flex-wrap gap-1.5">${allTags.slice(0, 6).map(t => `<button type="button" class="chip h-9 px-3 text-[0.88rem]" data-cp-addtag="${esc(t)}"><i class="ph ph-plus"></i>${esc(t)}</button>`).join('')}</div>
          </section>
          <section aria-labelledby="cp-notes">
            <h2 id="cp-notes" class="text-[1.4rem] font-extrabold">Notas del equipo</h2>
            <p class="text-ink-mute">Solo las ve tu equipo.</p>
            <form id="cp-noteform" class="mt-3"><textarea id="cp-note" rows="3" maxlength="500" class="input h-auto py-3" placeholder="Ej: Muy buena entrevista. Disponible desde marzo."></textarea><button class="btn btn-soft mt-2"><i class="ph-bold ph-note-pencil"></i>Guardar nota</button></form>
            <ul class="mt-4 space-y-2.5">${notes.map(n => { const nj = n.jobId ? Store.job(n.jobId) : null; return `<li class="rounded-[16px] bg-white border border-line p-4 flex gap-3"><div class="min-w-0 flex-1"><p class="whitespace-pre-line">${esc(n.t)}</p><p class="text-[0.85rem] text-ink-mute mt-1">${ago(n.at)}${nj ? ` · en ${esc(nj.title)}` : ''}</p></div><button type="button" class="icon-btn w-9 h-9 text-ink-mute hover:text-bad shrink-0" data-cp-delnote="${esc(n.at)}" aria-label="Borrar nota"><i class="ph ph-trash"></i></button></li>`; }).join('')}</ul>
          </section>
        </div>
        <aside class="rounded-[20px] bg-[#EEF0F7] p-6 sm:p-8 lg:sticky lg:top-24">
          <ul class="space-y-7">
            ${info('ph-briefcase', 'Profesión', esc(r.headline || areaOf(r.area).label))}
            ${info('ph-medal', 'Experiencia', r.seniority ? senLabel(r.seniority) : '')}
            ${info('ph-map-pin', 'Ubicación', esc(loc))}
            ${locked ? `<li class="rounded-2xl bg-white p-4"><p class="font-display font-bold flex items-center gap-2"><i class="ph-fill ph-lock-simple text-brand text-xl"></i>Contacto bloqueado</p>
              <p class="mt-1 text-ink-soft text-[0.95rem]">No se postuló a tus búsquedas. Con el plan Pro ves su CV completo, celular y email.</p>
              <button type="button" id="cp-unlock" class="mt-3 btn btn-primary btn-sm w-full justify-center"><i class="ph-fill ph-crown-simple"></i>Pasar a Pro</button></li>` : ''}
            ${info('ph-whatsapp-logo', 'Celular', locked ? lockedVal : esc(phone), !locked && wa ? `<a href="${wa}" target="_blank" rel="noopener" class="mt-2 btn btn-sm bg-[#25D366] text-white hover:brightness-95"><i class="ph-fill ph-whatsapp-logo"></i>Escribir por WhatsApp</a>` : '')}
            ${info('ph-envelope-simple', 'Email', locked ? lockedVal : email ? `<a href="${esc(mailto(email, tx))}" class="text-brand hover:underline underline-offset-2 break-all">${esc(email)}</a>` : '')}
            ${info('ph-signpost', 'Origen', esc(origin) + (js.length ? `<ul class="mt-1.5 space-y-1">${js.map(j => { const a = (ref.apps || []).find(x => x.jobId === j.id); return `<li class="text-[0.95rem]"><a href="#/empresa/b?id=${j.id}${a ? `&app=${a.id}` : ''}" class="text-ink hover:text-brand font-medium">${esc(j.title)}</a>${j.client ? ` <span class="text-ink-mute">· ${esc(j.client)}</span>` : ''}${a ? ` · <span class="text-ink-soft">${esc(a.status)}</span>` : ''}</li>`; }).join('')}</ul>` : ''))}
            ${info('ph-money', 'Pretensión salarial', pret ? esc(pret) : '')}
            ${info('ph-hourglass-medium', 'Edad', edad ? `${edad} años` : '')}
            ${info('ph-graduation-cap', 'Estudios', cvs.estudios.length ? cvs.estudios.map(esc).join('<br>') : '')}
            ${(() => {
              const cs = [...(ref.apps || []), ...(ref.app ? [ref.app] : [])].map(a => a.consent ? a.consent.at : a.date).filter(Boolean).sort();
              const sp = ref.sp && (ref.sp.consent ? ref.sp.consent.at : ref.sp.date);
              const txt = cs.length ? `Aceptó el uso de sus datos al postularse, el ${fmtDT(cs[cs.length - 1])}.` : sp ? `Aceptó aparecer en la base de +Humanos al enviar su CV, el ${fmtDT(sp)}.` : 'Aceptó ser contactado/a por empresas de +Humanos al registrarse.';
              return info('ph-shield-check', 'Consentimiento', esc(txt));
            })()}
          </ul>
          ${isBank ? `<button type="button" id="cp-erase" class="mt-8 w-full btn btn-outline btn-sm bg-white text-bad border-bad/30 hover:bg-bad/5 justify-center"><i class="ph-bold ph-trash"></i>Borrar sus datos de mi base</button>
          <p class="mt-2 text-[0.85rem] text-ink-mute text-center">Usalo si la persona te pide que borres sus datos.</p>` : ''}
        </aside>
      </div>`;
    return {
      title: r.name,
      html, mount() {
        const personObj = isBank ? ref : { key, name: r.name, email, phone, cand: ref.app ? ref.app.cand : (sc.id || null), cvText: text };
        const gate = fn => locked ? openBaseUpsell(co) : fn && fn();
        const ul = $('#cp-unlock'); if (ul) ul.onclick = () => gate();
        const openCvNow = () => ref.cvKey && !(ref.apps && ref.apps.length) ? Store.getCv(ref.cvKey).then(b => { if (!b) { toast('No encontramos el archivo del CV', 'ph-warning'); return; } const u = URL.createObjectURL(b); if (/pdf/.test(b.type)) window.open(u, '_blank'); else { const l = document.createElement('a'); l.href = u; l.download = ref.cvName || 'CV.docx'; l.click(); } setTimeout(() => URL.revokeObjectURL(u), 60000); }) : isBank ? viewCv(ref.apps[0] || null, SEED_CANDIDATES.find(x => x.id === ref.cand) || { name: r.name, cvText: text }) : viewCv(ref.app || null, ref);
        $('#cp-cv').onclick = () => gate(openCvNow);
        const er = $('#cp-erase'); if (er) er.onclick = async () => {
          const ok = await askConfirm({ title: `¿Borrar los datos de ${r.name}?`, text: 'Se borran sus postulaciones a tus búsquedas, su CV, tus notas y etiquetas, y su lugar en las ternas. No se puede deshacer.', ok: 'Borrar datos', danger: true, icon: 'ph-trash' });
          if (!ok) return;
          const res = await Store.erasePerson({ phone, email, cand: ref.cand || null, key, company: co.name }, new Set(myJobs(co).map(x => x.id)));
          const at = new Date().toISOString();
          Store.addDelReq({ id: 'dr' + Date.now().toString(36), name: r.name, phone, email, at, due: at, status: 'completado', doneAt: at, origin: 'consultora', company: co.name, result: `${res.apps} postulaciones` });
          toast(`Borraste los datos de ${r.name.split(' ')[0]}`, 'ph-trash'); location.hash = '#/empresa/candidatos';
        };
        $('#cp-save').onclick = () => {
          if (saved) { toast(isBank ? 'Ya está en Mis candidatos porque se postuló a tus búsquedas' : 'Ya está en Mis candidatos', 'ph-archive-box'); return; }
          Store.setBankMeta(co.name, key, { saved: true, person: { name: r.name, email, phone, cand: personObj.cand, cvText: text, headline: r.headline, area: r.area, province: r.province, city: r.city } });
          toast(`${r.name.split(' ')[0]} quedó en Mis candidatos`, 'ph-archive-box'); refresh();
        };
        const m = $('[data-menu="cp-add"]');
        m.onclick = e => { e.stopPropagation(); const p = m.parentElement.querySelector('[data-menu-panel]'), open = p.classList.contains('hidden'); closeMenus(); if (open) { p.classList.remove('hidden'); m.setAttribute('aria-expanded', 'true'); } };
        $$('[data-cp-add]').forEach(b => b.onclick = () => { const j = Store.job(b.dataset.cpAdd); closeMenus(); const add = () => { if (addPersonToJob(co, personObj, j.id)) toast(`${r.name.split(' ')[0]} se sumó a ${j.title}`, 'ph-user-plus'); refresh(); }; locked ? openBaseUpsell(co) : add(); });
        const setTags = list => { Store.setBankMeta(co.name, key, { tags: list }); refresh(); };
        $('#view').querySelectorAll('[data-cp-untag]').forEach(b => b.onclick = () => setTags(tags.filter(t => t !== b.dataset.cpUntag)));
        $$('[data-cp-addtag]').forEach(b => b.onclick = () => setTags([...tags, b.dataset.cpAddtag]));
        $('#cp-tagform').onsubmit = e => { e.preventDefault(); const t = $('#cp-tagin').value.trim().replace(/\s+/g, ' '); if (!t) return; const tt = t.charAt(0).toUpperCase() + t.slice(1); if (!tags.some(x => norm(x) === norm(tt))) setTags([...tags, tt]); };
        $('#cp-noteform').onsubmit = e => { e.preventDefault(); const t = $('#cp-note').value.trim(); if (!t) { $('#cp-note').focus(); return; } Store.addBankNote(co.name, key, t); toast('Nota guardada', 'ph-note-pencil'); refresh(); };
        $$('[data-cp-delnote]').forEach(b => b.onclick = () => askConfirm({ title: '¿Borrar esta nota?', ok: 'Borrar', danger: true }).then(ok => { if (ok) { Store.removeBankNote(co.name, key, b.dataset.cpDelnote); refresh(); } }));
      }
    };
  }

  function CoCands() {
    const co = Store.company();
    const F = S.db || (S.db = { tab: 'bank', q: '', prov: '', prof: '', sen: '', sort: 'recent', per: 9, limit: 9 });
    const jobs = myJobs(co).filter(j => j.status === 'activa');
    if (S.bank.job && !Store.job(S.bank.job)) S.bank.job = '';
    const lab = (t, ctrl) => `<div><p class="font-display font-bold text-[1.05rem] mb-2.5">${t}</p>${ctrl}</div>`;
    const sel = (id, ic, opts, val, aria) => `<div class="relative"><i class="ph ${ic} text-xl text-ink-mute absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-[1]"></i><select id="${id}" data-dd class="input pl-12 bg-white border-transparent" aria-label="${aria}">${opts.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(val) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div>`;
    const html = `<section class="bg-brand-soft">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 py-10 md:py-14 text-center">
          <h1 class="text-[2.1rem] sm:text-[2.6rem] leading-tight font-extrabold">Base de datos</h1>
          <nav class="mt-2 text-ink-soft font-semibold" aria-label="Migas de pan"><a href="#/empresa" class="hover:text-brand">Inicio</a><span class="mx-2 text-ink-mute">/</span><span class="text-ink" aria-current="page">Base de datos</span></nav>
        </div>
      </section>
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-12 grid gap-8 lg:grid-cols-[20rem_minmax(0,1fr)] items-start">
        <button type="button" id="db-ftog" class="lg:hidden btn btn-outline h-12 w-full justify-center bg-white" aria-expanded="false" aria-controls="db-filters"><i class="ph ph-sliders-horizontal text-lg"></i>Filtros<span id="db-fn" class="text-brand"></span></button>
        <aside id="db-filters" class="hidden lg:block -mt-4 lg:mt-0 rounded-[20px] bg-[#EEF0F7] p-5 sm:p-7 space-y-6 lg:sticky lg:top-24" aria-label="Filtros">
          ${lab('Buscar por palabra clave', `<div class="relative"><i class="ph ph-magnifying-glass text-xl text-ink-mute absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"></i><input id="db-q" type="search" class="input pl-12 bg-white border-transparent" placeholder="Nombre, puesto o skill" value="${esc(F.q)}" aria-label="Buscar por palabra clave (nombre, puesto, skill, etiqueta o nota)"></div>`)}
          ${lab('Provincia', sel('db-prov', 'ph-map-pin', [['', 'Todas las provincias'], ...PROVINCES.map(p => [p, p])], F.prov, 'Provincia'))}
          ${lab('Profesión', '<div id="db-prof-w"></div>')}
          ${lab('Experiencia', sel('db-sen', 'ph-medal', [['', 'Cualquier experiencia'], ...SENIORITIES.map(s2 => [s2.id, s2.label])], F.sen, 'Experiencia'))}
          ${F.tab === 'bank' && jobs.length ? lab('Comparar con una búsqueda', sel('db-cmp', 'ph-target', [['', 'Ninguna'], ...jobs.map(j => [j.id, `${j.title}${j.client ? ' · ' + j.client : ''}`])], S.bank.job, 'Comparar con una búsqueda')) : ''}
          <button type="button" id="db-clear" class="btn btn-primary w-full h-12 justify-center">Limpiar filtros</button>
        </aside>
        <section class="min-w-0">
          <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="max-w-full overflow-x-auto"><div class="inline-flex rounded-full bg-white border border-line p-1 whitespace-nowrap" role="tablist" aria-label="Dónde buscar">
            ${[['bank', 'ph-address-book', 'Mis candidatos'], ['platform', 'ph-magnifying-glass', 'Buscar en +Humanos']].map(([v, ic, l]) => `<button type="button" role="tab" data-ttab="${v}" aria-selected="${F.tab === v}" class="h-10 px-4 rounded-full font-semibold inline-flex items-center gap-1.5 ${F.tab === v ? 'bg-ink text-white' : 'text-ink-soft hover:text-ink'}"><i class="ph ${ic} text-lg"></i>${l}</button>`).join('')}
          </div></div>
          <button type="button" id="db-import" class="btn btn-outline bg-white h-12 px-5"><i class="ph-bold ph-upload-simple text-lg"></i>Importar candidatos</button>
          </div>
          <p class="mt-3 text-ink-soft max-w-2xl">${F.tab === 'bank' ? 'Personas que se postularon a tus búsquedas o que guardaste. Ya tenés su historial y tus notas.' : (hasBase(co) ? 'Toda la gente registrada en +Humanos, aunque nunca se haya postulado a tus búsquedas, con su CV y contacto.' : 'Toda la gente registrada en +Humanos, aunque nunca se haya postulado a tus búsquedas. Está incluida en el plan Pro.')}</p>
          <div class="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p id="db-count" class="font-semibold text-ink" aria-live="polite"></p>
            <div class="flex flex-wrap gap-2">
              <select id="db-sort" data-dd class="input h-11 py-0 w-auto bg-[#EEF0F7] border-transparent font-semibold" aria-label="Ordenar"></select>
              <select id="db-per" data-dd class="input h-11 py-0 w-auto bg-[#EEF0F7] border-transparent font-semibold" aria-label="Por página">${[9, 18, 36].map(n => `<option value="${n}" ${F.per === n ? 'selected' : ''}>${n} por página</option>`).join('')}</select>
            </div>
          </div>
          <ul id="db-list" class="mt-5 space-y-4"></ul>
          <div id="db-more" class="mt-6 text-center"></div>
        </section>
      </div>`;
    let rows = [];
    function draw() {
      if (F.tab === 'platform' && !hasBase(co)) {
        $('#db-count').textContent = ''; $('#db-more').innerHTML = '';
        $('#db-list').innerHTML = `<li class="rounded-[22px] bg-white border border-line p-6 sm:p-8 text-center">
          <span class="mx-auto w-16 h-16 rounded-full bg-brand-soft text-brand grid place-items-center"><i class="ph-fill ph-database text-3xl"></i></span>
          <h2 class="mt-4 text-[1.4rem] font-extrabold">La base de datos de +Humanos está en el plan Pro</h2>
          <p class="mt-2 text-ink-soft max-w-md mx-auto">Buscá entre ${platformPool(co).length} personas registradas por provincia, profesión y experiencia, y mirá su CV y contacto. Pro también suma búsquedas ilimitadas y 5 destacadas.</p>
          <button type="button" id="db-upsell" class="mt-5 btn btn-primary h-12 px-6"><i class="ph-fill ph-crown-simple"></i>Pasar a Pro · ${usd(PLANS.find(p => p.id === 'pro').price)}/mes</button></li>`;
        $('#db-upsell').onclick = () => choosePlan('pro');
        return;
      }
      rows = dbRows(co, F.tab);
      const cmp = F.tab === 'bank' && S.bank.job ? Store.job(S.bank.job) : null;
      const q = norm(F.q.trim());
      const base = rows.filter(r => (!F.prov || r.province === F.prov) && (!F.sen || r.seniority === F.sen) &&
        (!q || norm(`${r.name} ${r.headline} ${r.skills.join(' ')} ${r.city || ''} ${areaOf(r.area).label} ${r.kind === 'bank' ? `${r.ref.tags.join(' ')} ${r.ref.notes.map(n => n.t).join(' ')}` : ''} ${r.jobs.map(id => (Store.job(id) || {}).title).join(' ')}`).includes(q)));
      // Profesión: desplegable con cantidades según los demás filtros
      if (F.prof && !PROFESSIONS.some(p => p.id === F.prof)) F.prof = '';
      const counts = PROFESSIONS.map(pr => [pr, base.filter(r => inProf(pr, r)).length]).filter(x => x[1] || x[0].id === F.prof);
      $('#db-prof-w').innerHTML = sel('db-prof', 'ph-briefcase', [['', 'Todas las profesiones'], ...counts.map(([pr, n]) => [pr.id, `${pr.label} (${n})`])], F.prof, 'Profesión');
      enhanceSelect($('#db-prof'));
      $('#db-prof').onchange = e => { F.prof = e.target.value; F.limit = F.per; draw(); };
      const pr = PROFESSIONS.find(x => x.id === F.prof);
      let list = pr ? base.filter(r => inProf(pr, r)) : base;
      const scored = list.map(r => ({ r, s: cmp ? analyzeCv(pseudoApp(r.ref), cmp).score : null }));
      const sortOpts = [['recent', 'Más recientes'], ['az', 'Nombre (A a Z)'], ...(cmp ? [['fit', 'Afinidad con la búsqueda']] : [])];
      if (!sortOpts.some(o => o[0] === F.sort)) F.sort = 'recent';
      if (cmp && F._cmp !== cmp.id) { F.sort = 'fit'; F._cmp = cmp.id; }
      const ss = $('#db-sort'); ss.innerHTML = sortOpts.map(([v, l]) => `<option value="${v}" ${F.sort === v ? 'selected' : ''}>${l}</option>`).join(''); if (ss._ddSync) ss._ddSync();
      scored.sort(F.sort === 'az' ? (a, b) => a.r.name.localeCompare(b.r.name, 'es') : F.sort === 'fit' ? (a, b) => (b.s ?? -1) - (a.s ?? -1) : (a, b) => (b.r.fav - a.r.fav) || new Date(b.r.last || 0) - new Date(a.r.last || 0));
      const shown = scored.slice(0, F.limit);
      $('#db-count').textContent = scored.length ? `Mostrando 1 – ${shown.length} de ${scored.length} resultado${scored.length === 1 ? '' : 's'}` : 'Sin resultados';
      $('#db-list').innerHTML = shown.length ? shown.map(({ r, s }) => {
        const loc = [r.city, r.province].filter(Boolean).join(', ');
        const js = r.jobs.map(id => Store.job(id)).filter(Boolean);
        const inCmp = cmp && r.jobs.includes(cmp.id);
        return `<li><article class="rounded-[18px] bg-white border border-line p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 hover:border-brand/40 transition">
          <div class="flex items-start gap-4 sm:gap-6 min-w-0 flex-1">
            <div class="shrink-0">${cmp ? matchRing(s, 80) : avatar(r.name, 'w-16 h-16 sm:w-20 sm:h-20 text-xl sm:text-2xl')}</div>
            <div class="min-w-0 flex-1">
              <h3 class="font-display font-bold text-[1.2rem] sm:text-[1.3rem] leading-tight flex items-center gap-2">${esc(r.name)}${r.fav ? '<i class="ph-fill ph-star text-sun text-lg" title="Favorito"></i>' : ''}</h3>
              <div class="mt-1.5 flex flex-wrap items-center gap-x-5 gap-y-1 text-[0.98rem]">
                <span class="text-brand font-medium">${esc(r.headline || areaOf(r.area).label)}</span>
                ${loc ? `<span class="inline-flex items-center gap-1.5 text-ink-soft"><i class="ph ph-map-pin text-lg"></i>${esc(loc)}</span>` : ''}
                ${r.seniority ? `<span class="inline-flex items-center gap-1.5 text-ink-soft"><i class="ph ph-medal text-lg"></i>${senLabel(r.seniority)}</span>` : ''}
              </div>
              ${r.skills.length ? `<div class="mt-3 flex flex-wrap gap-2">${r.skills.slice(0, 4).map(x => `<span class="rounded-full bg-surface border border-line px-3.5 py-1 text-[0.92rem] text-ink-soft">${esc(x)}</span>`).join('')}${r.skills.length > 4 ? `<span class="text-ink-mute text-[0.9rem] self-center">+${r.skills.length - 4}</span>` : ''}</div>` : ''}
              ${js.length ? `<p class="mt-3 text-[0.92rem] text-ink-soft flex items-start gap-1.5"><i class="ph ph-briefcase text-lg shrink-0"></i><span class="min-w-0"><span class="font-semibold text-ink">Se postuló a:</span> ${js.slice(0, 2).map(j => `${esc(j.title)}${j.client ? ` <span class="text-ink-mute">(${esc(j.client)})</span>` : ''}`).join(' · ')}${js.length > 2 ? ` · +${js.length - 2}` : ''}</span></p>` : ''}
            </div>
          </div>
          <div class="flex sm:flex-col gap-2 shrink-0">
            <button type="button" class="btn bg-brand-soft text-brand hover:bg-brand hover:text-white h-12 px-6 flex-1 sm:flex-none sm:w-40 justify-center" data-db-open="${esc(r.key)}">Ver perfil</button>
            ${cmp ? (inCmp ? '<span class="btn btn-sm bg-mint text-ok justify-center flex-1 sm:flex-none"><i class="ph-bold ph-check"></i>Ya está</span>' : `<button type="button" class="btn btn-sm btn-outline justify-center flex-1 sm:flex-none" data-db-add="${esc(r.key)}"><i class="ph-bold ph-user-plus"></i>Sumar</button>`) : ''}
          </div>
        </article></li>`;
      }).join('') : `<li>${emptyState('ph-users-three', rows.length ? 'Nadie coincide con esos filtros' : F.tab === 'bank' ? 'Todavía no tenés candidatos' : 'Todavía no hay perfiles', rows.length ? 'Probá con otra palabra, provincia o profesión.' : 'Cuando recibas postulantes, van a quedar guardados acá.')}</li>`;
      const nf = [F.q.trim(), F.prov, F.prof, F.sen, F.tab === 'bank' && S.bank.job].filter(Boolean).length; $('#db-fn').textContent = nf ? ` (${nf})` : '';
      const rest = scored.length - shown.length;
      $('#db-more').innerHTML = rest > 0 ? `<button type="button" id="db-more-btn" class="btn btn-outline h-12 px-6">Ver ${Math.min(rest, F.per)} más</button>` : '';
      const mb = $('#db-more-btn'); if (mb) mb.onclick = () => { F.limit += F.per; draw(); };
    }
    return {
      html, mount() {
        enhanceSelects($('#view'));
        draw();
        let t;
        $('#db-q').addEventListener('input', e => { clearTimeout(t); t = setTimeout(() => { F.q = e.target.value; F.limit = F.per; draw(); }, 180); });
        $('#db-prov').onchange = e => { F.prov = e.target.value; F.limit = F.per; draw(); };
        $('#db-sen').onchange = e => { F.sen = e.target.value; F.limit = F.per; draw(); };
        const cm = $('#db-cmp'); if (cm) cm.onchange = e => { S.bank.job = e.target.value; F._cmp = ''; draw(); };
        $('#db-sort').onchange = e => { F.sort = e.target.value; draw(); };
        $('#db-per').onchange = e => { F.per = +e.target.value; F.limit = F.per; draw(); };
        $('#db-ftog').onclick = e => { const f = $('#db-filters'), open = f.classList.toggle('hidden') === false; e.currentTarget.setAttribute('aria-expanded', open); };
        $('#db-clear').onclick = () => { Object.assign(F, { q: '', prov: '', prof: '', sen: '', limit: F.per }); S.bank.job = ''; refresh(); };
        $('#db-import').onclick = () => openImport(co);
        $$('[data-ttab]').forEach(b => b.onclick = () => { F.tab = b.dataset.ttab; F.prof = ''; F.limit = F.per; refresh(); });
        $('#db-list').addEventListener('click', e => {
          const ad = e.target.closest('[data-db-add]');
          if (ad) { const r = rows.find(x => x.key === ad.dataset.dbAdd), j = Store.job(S.bank.job); if (r && j && addPersonToJob(co, r.ref, j.id)) toast(`${r.name.split(' ')[0]} sumado/a a ${j.title}`, 'ph-user-plus'); draw(); return; }
          const o = e.target.closest('[data-db-open]'); if (!o) return;
          const r = rows.find(x => x.key === o.dataset.dbOpen); if (!r) return;
          location.hash = `#/empresa/candidato?k=${encodeURIComponent(r.key)}`;
        });
      }
    };
  }

  /* ================= PERFIL DE EMPRESA / CONSULTORA ================= */

  const SIZES = ['1 a 10', '11 a 50', '51 a 200', '201 a 500', 'Más de 500'];
  const DEF_MSG = {
    wa: 'Hola {nombre}, te escribimos de {empresa} por tu postulación a {puesto}. ¿Tenés un momento para coordinar una entrevista?',
    subj: 'Tu postulación a {puesto}',
    body: 'Hola {nombre},\n\nGracias por postularte a {puesto}. Revisamos tu CV y nos gustaría conocerte.\n¿Qué días y horarios te quedan cómodos para una entrevista?\n\nSaludos,\n{responsable}\n{empresa}',
    reject: 'Hola {nombre}, gracias por postularte a {puesto} y por tu tiempo. En esta oportunidad avanzamos con otros perfiles, pero guardamos tu CV para tenerte en cuenta en próximas búsquedas. ¡Te deseamos muchos éxitos!\n\n{responsable}\n{empresa}'
  };
  const TPL_VARS = [['{nombre}', 'Nombre'], ['{puesto}', 'Puesto'], ['{cliente}', 'Cliente'], ['{empresa}', 'Tu empresa'], ['{responsable}', 'Responsable']];
  const fillTpl = (t, v) => String(t || '').replace(/\{(\w+)\}/g, (m, k) => (v[k] != null ? v[k] : m));
  function tplVars(coName, name, job, prof) {
    const p = prof || Store.coProfile(coName);
    return {
      nombre: String(name || '').split(' ')[0], puesto: job ? job.title : 'una de nuestras búsquedas', empresa: coName,
      cliente: job && job.client ? (job.showClient ? job.client : 'nuestro cliente') : coName,
      responsable: p.contactName || `Equipo de ${coName}`
    };
  }
  function contactTexts(coName, name, job) {
    const p = Store.coProfile(coName), v = tplVars(coName, name, job, p);
    return { wa: fillTpl(p.msgWhatsapp || DEF_MSG.wa, v), subj: fillTpl(p.msgEmailSubject || DEF_MSG.subj, v), body: fillTpl(p.msgEmailBody || DEF_MSG.body, v) };
  }
  const mailto = (email, t) => `mailto:${email}?subject=${encodeURIComponent(t.subj)}&body=${encodeURIComponent(t.body)}`;
  const toUrl = (v, base) => {
    v = String(v || '').trim(); if (!v) return '';
    if (/^https?:\/\//i.test(v)) return v;
    if (/\.[a-z]{2,}/i.test(v) && (!base || v.includes('/'))) return 'https://' + v;
    return base ? base + v.replace(/^@/, '') : 'https://' + v;
  };
  const LINKEDIN = 'https://www.linkedin.com/company/', INSTAGRAM = 'https://www.instagram.com/';

  function readLogo(file) {
    return new Promise((res, rej) => {
      if (!file || !/^image\//.test(file.type)) return rej('El logo tiene que ser una imagen (PNG, JPG, WEBP o SVG).');
      if (file.size > 5 * 1048576) return rej('La imagen pesa más de 5 MB.');
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        const max = 256, r = Math.min(1, max / Math.max(img.width || max, img.height || max));
        const w = Math.max(1, Math.round((img.width || max) * r)), h = Math.max(1, Math.round((img.height || max) * r));
        const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
        cv.getContext('2d').drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url); res(cv.toDataURL('image/png'));
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej('No pudimos leer la imagen.'); };
      img.src = url;
    });
  }
  // Selector de logo reutilizable: devuelve el HTML y una función para conectarlo
  function logoPicker(id, name, src) {
    return `<div class="flex items-center gap-4" id="${id}">
      <div data-lp-prev>${logoBox(name || '?', src, 'w-20 h-20 text-2xl')}</div>
      <div class="flex flex-col items-start gap-1.5">
        <label for="${id}-file" class="btn btn-soft btn-sm cursor-pointer"><i class="ph-bold ph-upload-simple"></i><span data-lp-lbl>${src ? 'Cambiar logo' : 'Subir logo'}</span></label>
        <button type="button" data-lp-del class="text-bad font-semibold text-[0.95rem] px-1 ${src ? '' : 'hidden'}">Quitar logo</button>
        <span data-lp-hint class="text-ink-mute text-[0.9rem] ${src ? 'hidden' : ''}">PNG o JPG, idealmente cuadrado</span>
      </div>
      <input id="${id}-file" type="file" accept="image/*" class="sr-only">
    </div>
    <p data-lp-err class="err hidden"></p>`;
  }
  function bindLogoPicker(root, id, getName, state, onChange) {
    const box = $('#' + id, root), err = box.nextElementSibling;
    const draw = () => {
      $('[data-lp-prev]', box).innerHTML = logoBox(getName() || '?', state.logo, 'w-20 h-20 text-2xl');
      $('[data-lp-lbl]', box).textContent = state.logo ? 'Cambiar logo' : 'Subir logo';
      $('[data-lp-del]', box).classList.toggle('hidden', !state.logo);
      $('[data-lp-hint]', box).classList.toggle('hidden', !!state.logo);
    };
    $('#' + id + '-file', root).onchange = async e => {
      err.classList.add('hidden');
      try { state.logo = await readLogo(e.target.files[0]); draw(); onChange && onChange(); }
      catch (m) { err.textContent = m; err.classList.remove('hidden'); }
      e.target.value = '';
    };
    $('[data-lp-del]', box).onclick = () => { state.logo = null; draw(); onChange && onChange(); };
    return draw;
  }

  function profileCompleteness(p) {
    const checks = [!!p.logo, !!p.description, !!p.industry, !!p.size, !!(p.city && p.province), !!(p.website || p.linkedin || p.instagram), !!p.contactName, !!(p.contactEmail || p.contactPhone)];
    return Math.round(100 * checks.filter(Boolean).length / checks.length);
  }

  function CoProfile() {
    const co = Store.company();
    const p = Store.coProfile(co.name);
    const isCons = co.type === 'Consultora';
    const st = { logo: p.logo || null, provinces: [...(p.provinces || [])], type: co.type };
    const pct = profileCompleteness(p);
    const field = (id, label, val, extra = '', icon = '') => `<div><label class="label" for="${id}">${label}</label>
      <div class="relative">${icon ? `<i class="ph ${icon} absolute left-4 top-1/2 -translate-y-1/2 text-xl text-ink-mute pointer-events-none"></i>` : ''}
      <input id="${id}" class="input ${icon ? 'pl-12' : ''}" value="${esc(val || '')}" ${extra}></div></div>`;
    const section = (icon, title, sub, inner, panel = 'empresa') => `<section class="card p-5 sm:p-6" data-panel="${panel}">
      <h2 class="text-xl font-extrabold tracking-tight flex items-center gap-2"><i class="ph-fill ${icon} text-brand"></i>${title}</h2>
      ${sub ? `<p class="text-ink-soft mt-1">${sub}</p>` : ''}<div class="mt-5 space-y-4">${inner}</div></section>`;
    const sampleJob = myJobs(co)[0];
    const clients = isCons ? Store.clientsOf(co.name) : [];
    // Pestañas: Empresa · Clientes (solo consultoras) · Mensajes · Plan y pagos
    const PTABS = [['empresa', 'ph-identification-card', 'Empresa'], ...(isCons ? [['clientes', 'ph-buildings', 'Clientes']] : []), ['mensajes', 'ph-chat-text', 'Mensajes'], ...(BILLING ? [['plan', 'ph-crown-simple', 'Plan y pagos']] : [])];
    const qTab = parseHash().params.get('tab');
    if (PTABS.some(t => t[0] === qTab)) S.profTab = qTab;
    if (!PTABS.some(t => t[0] === S.profTab)) S.profTab = 'empresa';
    const info = Store.planInfo(co.name), pays = info.payments || [];
    const featNow = myJobs(co).filter(j => Store.isFeatured(j));

    const html = `<div class="max-w-3xl mx-auto px-4 sm:px-6 py-8 md:py-12 pb-32 space-y-5">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div><p class="text-ink-soft font-semibold">${esc(co.type)}</p><h1 class="text-[2rem] sm:text-[2.4rem] leading-tight font-extrabold">Perfil</h1></div>
        <a href="#/e?n=${encodeURIComponent(co.name)}" class="btn btn-outline btn-sm"><i class="ph ph-eye text-lg"></i>Ver página pública</a>
      </div>
      <nav id="cp-tabs" class="!mt-6 border-b border-line flex sm:gap-1" role="tablist" aria-label="Secciones del perfil">
        ${PTABS.map(([k, ic, l]) => `<button type="button" role="tab" data-ptab="${k}" aria-selected="${S.profTab === k}"
          class="flex-1 sm:flex-none min-w-0 py-2 sm:py-0 sm:h-12 px-1 sm:px-4 -mb-px border-b-[3px] font-semibold flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 text-[0.74rem] min-[360px]:text-[0.82rem] sm:text-base ${S.profTab === k ? 'border-brand text-brand' : 'border-transparent text-ink-soft hover:text-ink'}">
          <i class="${S.profTab === k ? 'ph-fill' : 'ph'} ${ic} text-xl sm:text-lg"></i><span class="truncate max-w-full">${l}</span></button>`).join('')}
      </nav>
      <div class="card p-4 flex items-center gap-4" data-panel="empresa">
        <div class="flex-1">
          <p class="font-semibold">Tu perfil está completo al <span class="text-brand">${pct}%</span></p>
          <div class="mt-2 h-2 rounded-full bg-line overflow-hidden"><div class="h-full rounded-full ${pct === 100 ? 'bg-ok' : 'bg-brand'}" style="width:${pct}%"></div></div>
          <p class="text-ink-mute text-[0.92rem] mt-1.5">${pct === 100 ? '¡Excelente! Los perfiles completos reciben más postulaciones.' : 'Los perfiles completos generan más confianza y reciben más postulaciones.'}</p>
        </div>
      </div>

      <form id="cp-form" class="space-y-5" novalidate>
        ${section('ph-identification-card', 'Identidad', 'Tu logo y nombre aparecen en cada búsqueda que publicás.', `
          ${logoPicker('cp-logo', co.name, st.logo)}
          ${field('cp-name', 'Nombre de la empresa o consultora *', co.name, 'maxlength="60" autocomplete="organization"')}
          <div><p class="label">Tipo de cuenta</p><div class="grid grid-cols-2 gap-2">
            ${['Consultora', 'Empresa'].map(t => `<label class="cursor-pointer"><input type="radio" name="cp-type" value="${t}" class="peer sr-only" ${co.type === t ? 'checked' : ''}>
              <span class="flex items-center justify-center gap-2 h-12 rounded-xl border border-line font-semibold peer-checked:border-brand peer-checked:bg-brand-soft peer-checked:text-brand"><i class="ph ${t === 'Empresa' ? 'ph-buildings' : 'ph-users-three'} text-xl"></i>${t}</span></label>`).join('')}
          </div></div>`)}

        ${section('ph-globe', 'Sitio web y redes', 'Se muestran en tu página pública, donde los candidatos ven tus vacantes.', `
          ${field('cp-web', 'Sitio web', p.website, 'type="url" inputmode="url" placeholder="www.tuempresa.com.ar"', 'ph-globe')}
          ${field('cp-li', 'LinkedIn', p.linkedin, 'placeholder="linkedin.com/company/tu-empresa"', 'ph-linkedin-logo')}
          ${field('cp-ig', 'Instagram', p.instagram, 'placeholder="@tuempresa"', 'ph-instagram-logo')}`)}

        ${section('ph-info', 'Sobre la empresa', 'Contale a los candidatos quiénes son y qué hacen.', `
          <div><label class="label" for="cp-desc">Descripción</label>
            <textarea id="cp-desc" rows="4" maxlength="600" class="input h-auto py-3" placeholder="Ej: Somos una consultora de RRHH del NOA…">${esc(p.description || '')}</textarea>
            <p class="text-ink-mute text-[0.88rem] text-right mt-1"><span id="cp-desc-n">${(p.description || '').length}</span>/600</p></div>
          <div class="grid sm:grid-cols-2 gap-4">
            <div><label class="label" for="cp-ind">Rubro</label><select id="cp-ind" class="input">${industryOpts(p.industry || companyOf(co.name).industry)}</select></div>
            <div><label class="label" for="cp-size">Cantidad de empleados</label><select id="cp-size" class="input"><option value="">Elegí una opción</option>
              ${SIZES.map(x => `<option ${p.size === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
          </div>`)}

        ${section('ph-map-pin', 'Ubicación y sedes', '', `
          ${field('cp-addr', 'Dirección', p.address, 'placeholder="Ej: Av. Mate de Luna 1850, piso 3" autocomplete="street-address"')}
          <div class="grid sm:grid-cols-2 gap-4">
            ${field('cp-city', 'Ciudad', p.city, 'placeholder="Ej: San Miguel de Tucumán" autocomplete="address-level2"')}
            <div><label class="label" for="cp-prov">Provincia</label><select id="cp-prov" class="input"><option value="">Elegí una provincia</option>
              ${PROVINCES.map(x => `<option ${p.province === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
          </div>
          <div><p class="label">Provincias donde operan</p>
            <div id="cp-provs" class="flex flex-wrap gap-2"></div>
            <select id="cp-prov-add" class="input mt-3" aria-label="Agregar provincia"></select></div>`)}



        ${section('ph-address-book', 'Contacto para candidatos', 'Se muestra en tu página pública para que los candidatos te consulten.', `
          ${field('cp-cname', 'Responsable de selección', p.contactName, 'placeholder="Ej: Carolina Sosa" autocomplete="name"', 'ph-user')}
          <div class="grid sm:grid-cols-2 gap-4">
            ${field('cp-cemail', 'Email', p.contactEmail, 'type="email" inputmode="email" placeholder="busquedas@tuempresa.com" autocomplete="email"', 'ph-envelope-simple')}
            ${field('cp-cphone', 'WhatsApp', p.contactPhone, 'type="tel" inputmode="tel" placeholder="381 400-1200" autocomplete="tel"', 'ph-whatsapp-logo')}
          </div>`)}

        ${section('ph-chat-text', 'Mensajes predeterminados', 'Se usan al tocar WhatsApp o Email en un postulante. Tocá una etiqueta para insertarla donde está el cursor.', `
          <div class="flex flex-wrap gap-2" id="cp-vars">${TPL_VARS.map(([v, l]) => `<button type="button" class="chip h-9 px-3 text-[0.9rem]" data-var="${v}"><i class="ph ph-brackets-curly"></i>${l}</button>`).join('')}</div>
          <div><label class="label flex items-center gap-2" for="cp-mwa"><i class="ph-fill ph-whatsapp-logo text-[#25D366] text-xl"></i>WhatsApp</label>
            <textarea id="cp-mwa" rows="3" class="input h-auto py-3" data-tpl>${esc(p.msgWhatsapp || DEF_MSG.wa)}</textarea></div>
          <div><label class="label flex items-center gap-2" for="cp-msubj"><i class="ph-fill ph-envelope-simple text-brand text-xl"></i>Email · asunto</label>
            <input id="cp-msubj" class="input" data-tpl value="${esc(p.msgEmailSubject || DEF_MSG.subj)}"></div>
          <div><label class="label" for="cp-mbody">Email · mensaje</label>
            <textarea id="cp-mbody" rows="7" class="input h-auto py-3" data-tpl>${esc(p.msgEmailBody || DEF_MSG.body)}</textarea></div>
          <div class="rounded-2xl bg-surface p-4">
            <p class="font-semibold flex items-center gap-2"><i class="ph ph-eye"></i>Vista previa del WhatsApp</p>
            <div class="mt-3 bg-[#DCF8C6] text-ink rounded-2xl rounded-tr-md px-4 py-3 ml-auto max-w-[90%] whitespace-pre-line shadow-card" id="cp-preview"></div>
            <p class="text-ink-mute text-[0.88rem] mt-2">Ejemplo con “Lucía” postulada a “${esc(sampleJob ? sampleJob.title : 'Asistente administrativo/a')}”.</p>
          </div>
          <div><label class="label flex items-center gap-2" for="cp-mrej"><i class="ph-fill ph-hand-heart text-bad text-xl"></i>Para los no seleccionados</label>
            <textarea id="cp-mrej" rows="5" class="input h-auto py-3" data-tpl>${esc(p.msgReject || DEF_MSG.reject)}</textarea>
            <p class="text-ink-mute text-[0.9rem] mt-1.5">Se usa en "Avisar a los no seleccionados". Un mensaje amable cuida la imagen de tu empresa.</p></div>
          <button type="button" id="cp-reset-msg" class="text-brand font-semibold inline-flex items-center gap-1.5"><i class="ph ph-arrow-counter-clockwise"></i>Volver a los mensajes sugeridos</button>`, 'mensajes')}
      </form>

      ${isCons ? `<section class="card p-5 sm:p-6" data-panel="clientes">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div><h2 class="text-xl font-extrabold tracking-tight flex items-center gap-2"><i class="ph-fill ph-buildings text-brand"></i>Clientes</h2>
          <p class="text-ink-soft mt-1">Las empresas para las que hacés búsquedas.</p></div>
          <button type="button" class="btn btn-soft btn-sm" data-client-new><i class="ph-bold ph-plus"></i>Agregar cliente</button>
        </div>
        <div class="mt-5 grid gap-3 sm:grid-cols-2">
          ${clients.length ? clients.map(cl => {
            const n = myJobs(co).filter(j => j.client === cl.name && j.status === 'activa').length;
            return `<button type="button" data-client="${esc(cl.name)}" class="text-left rounded-2xl border border-line p-4 flex items-center gap-3 hover:border-brand hover:bg-brand-soft/40 transition">
              ${logo(cl.name, 'w-12 h-12 text-sm')}
              <span class="min-w-0 flex-1">
                <span class="block font-bold truncate">${esc(cl.name)}</span>
                <span class="block text-ink-soft text-[0.92rem] truncate">${cl.industry ? esc(cl.industry) + ' · ' : ''}${n} búsqueda${n === 1 ? '' : 's'} activa${n === 1 ? '' : 's'}</span>
                <span class="mt-1 inline-flex items-center gap-1 text-[0.82rem] font-bold ${cl.showName ? 'text-ok' : 'text-ink-mute'}"><i class="ph-fill ${cl.showName ? 'ph-eye' : 'ph-eye-slash'}"></i>${cl.showName ? 'Nombre público' : 'Confidencial'}</span>
              </span>
              <i class="ph-bold ph-pencil-simple text-ink-mute"></i>
            </button>`;
          }).join('') : `<p class="text-ink-soft col-span-full">Todavía no cargaste clientes. También se crean solos al publicar una búsqueda.</p>`}
        </div>
      </section>` : ''}

      <section data-panel="plan" class="space-y-5">
        ${BILLING ? `<div class="card p-5 sm:p-6">${planMeter(co)}
          <div class="mt-5 flex flex-wrap gap-2"><a href="#/empresa/planes" class="btn btn-primary btn-sm"><i class="ph ph-arrows-left-right text-lg"></i>Comparar y cambiar de plan</a></div></div>` : ''}
        <div class="card p-5 sm:p-6">
          <h2 class="text-xl font-extrabold flex items-center gap-2"><i class="ph-fill ph-star text-warn"></i>Búsquedas destacadas</h2>
          ${featNow.length ? `<ul class="mt-3 divide-y divide-line">${featNow.map(j => `<li><a href="#/empresa/b?id=${j.id}" class="py-3 flex items-center gap-3 hover:text-brand">
            <span class="min-w-0 flex-1"><span class="block font-semibold truncate">${esc(j.title)}</span><span class="block text-ink-mute text-[0.92rem]">${j.featured.source === 'plan' ? 'Incluida en tu plan' : `Hasta el ${fmtDate(j.featured.until)}`}</span></span><i class="ph-bold ph-caret-right text-ink-mute"></i></a></li>`).join('')}</ul>`
            : `<p class="mt-2 text-ink-soft">No tenés búsquedas destacadas. Se destacan desde cada búsqueda.</p>`}
        </div>
        ${BILLING ? `<div class="card p-5 sm:p-6">
          <h2 class="text-xl font-extrabold flex items-center gap-2"><i class="ph-fill ph-receipt text-brand"></i>Pagos</h2>
          ${pays.length ? `<ul class="mt-3 divide-y divide-line">${pays.map(x => `<li class="py-3 flex items-center gap-3"><div class="min-w-0 flex-1"><p class="font-semibold leading-tight">${esc(x.concept)}</p><p class="text-ink-mute text-[0.92rem]">${fmtDate(x.at)} · ${esc(x.method)}</p></div><p class="font-display font-bold whitespace-nowrap">${money(x)}</p></li>`).join('')}</ul>`
            : '<p class="mt-2 text-ink-soft">Todavía no hiciste pagos.</p>'}
        </div>` : ''}
      </section>

      <div class="flex flex-col sm:flex-row gap-3 justify-between pt-2" data-panel="empresa">
        <button type="button" id="cp-logout" class="btn btn-outline"><i class="ph ph-sign-out text-lg"></i>Cerrar sesión</button>
        <button type="button" id="reset-demo" class="btn text-ink-mute hover:text-ink hover:bg-surface" title="Vuelve los datos de prueba al inicio"><i class="ph ph-arrow-counter-clockwise text-lg"></i>Restablecer demo</button>
      </div>
    </div>

    <div id="cp-bar" class="save-bar fixed inset-x-0 z-30 translate-y-[150%] transition-transform duration-300">
      <div class="max-w-3xl mx-auto px-4 sm:px-6 pb-3">
        <div class="rounded-2xl bg-ink text-white shadow-lift p-3 pl-5 flex items-center gap-3">
          <span class="flex-1 min-w-0 font-semibold leading-tight">Tenés cambios sin guardar</span>
          <button type="button" id="cp-discard" class="btn btn-sm text-white hover:bg-white/10 px-3">Descartar</button>
          <button type="button" id="cp-save" class="btn btn-primary btn-sm">Guardar</button>
        </div>
        <p id="cp-err" class="err hidden bg-white rounded-xl px-3 py-2 shadow-card"></p>
      </div>
    </div>`;

    function mount() {
      $('#reset-demo').onclick = async () => { if (await askConfirm({ title: '¿Restablecer la demo?', text: 'Se borran tus búsquedas, postulaciones y vacantes publicadas en este dispositivo.', ok: 'Restablecer', danger: true, icon: 'ph-arrow-counter-clockwise' })) Store.reset(); };
      const showTab = k => {
        S.profTab = k;
        $$('[data-panel]').forEach(el => el.classList.toggle('hidden', el.dataset.panel !== k));
        $$('[data-ptab]').forEach(b => { const on = b.dataset.ptab === k; b.setAttribute('aria-selected', on);
          b.classList.toggle('border-brand', on); b.classList.toggle('text-brand', on); b.classList.toggle('border-transparent', !on); b.classList.toggle('text-ink-soft', !on);
          const i = b.querySelector('i'); i.classList.toggle('ph-fill', on); i.classList.toggle('ph', !on); });
        try { history.replaceState(null, '', `#/empresa/perfil${k === 'empresa' ? '' : `?tab=${k}`}`); } catch (e) { /* noop */ }
      };
      $$('[data-ptab]').forEach(b => b.onclick = () => showTab(b.dataset.ptab));
      showTab(S.profTab);
      const form = $('#cp-form'), bar = $('#cp-bar');
      let dirty = false;
      const setDirty = () => { if (!dirty) { dirty = true; bar.classList.remove('translate-y-[150%]'); } };
      form.addEventListener('input', setDirty);
      form.addEventListener('change', setDirty);
      bindLogoPicker(form, 'cp-logo', () => $('#cp-name').value.trim() || co.name, st, setDirty);
      $('#cp-name').addEventListener('input', () => { if (!st.logo) $('#cp-logo [data-lp-prev]').innerHTML = logoBox($('#cp-name').value.trim() || '?', null, 'w-20 h-20 text-2xl'); });
      $('#cp-desc').addEventListener('input', e => { $('#cp-desc-n').textContent = e.target.value.length; });

      // Provincias donde operan
      const drawProvs = () => {
        $('#cp-provs').innerHTML = st.provinces.length ? st.provinces.map(pr => `<span class="inline-flex items-center gap-1 h-10 pl-4 pr-1.5 rounded-full bg-brand-soft text-brand font-semibold">${esc(pr)}
          <button type="button" class="w-7 h-7 grid place-items-center rounded-full hover:bg-brand/15" data-prov-del="${esc(pr)}" aria-label="Quitar ${esc(pr)}"><i class="ph-bold ph-x"></i></button></span>`).join('')
          : '<span class="text-ink-mute">Ninguna todavía.</span>';
        $('#cp-prov-add').innerHTML = `<option value="">+ Agregar provincia</option><option value="__all">Todo el país</option>` +
          PROVINCES.filter(x => !st.provinces.includes(x)).map(x => `<option>${x}</option>`).join('');
      };
      drawProvs();
      $('#cp-prov-add').onchange = e => {
        const v = e.target.value; if (!v) return;
        st.provinces = v === '__all' ? [...PROVINCES] : [...st.provinces, v];
        drawProvs(); setDirty();
      };
      $('#cp-provs').onclick = e => { const b = e.target.closest('[data-prov-del]'); if (!b) return; st.provinces = st.provinces.filter(x => x !== b.dataset.provDel); drawProvs(); setDirty(); };

      // Mensajes: insertar variables y vista previa
      let lastTpl = $('#cp-mwa');
      $$('[data-tpl]').forEach(t => t.addEventListener('focus', () => { lastTpl = t; }));
      $('#cp-vars').onclick = e => {
        const b = e.target.closest('[data-var]'); if (!b) return;
        const t = lastTpl, v = b.dataset.var, a = t.selectionStart ?? t.value.length, z = t.selectionEnd ?? t.value.length;
        t.value = t.value.slice(0, a) + v + t.value.slice(z);
        t.focus(); t.setSelectionRange(a + v.length, a + v.length);
        t.dispatchEvent(new Event('input', { bubbles: true }));
      };
      const preview = () => {
        const prof = { contactName: $('#cp-cname').value.trim() };
        const v = tplVars($('#cp-name').value.trim() || co.name, 'Lucía Fernández', sampleJob || { title: 'Asistente administrativo/a' }, prof);
        $('#cp-preview').textContent = fillTpl($('#cp-mwa').value, v);
      };
      ['cp-mwa', 'cp-name', 'cp-cname'].forEach(id => $('#' + id).addEventListener('input', preview));
      preview();
      $('#cp-reset-msg').onclick = () => { $('#cp-mwa').value = DEF_MSG.wa; $('#cp-msubj').value = DEF_MSG.subj; $('#cp-mbody').value = DEF_MSG.body; $('#cp-mrej').value = DEF_MSG.reject; preview(); setDirty(); };

      // Clientes
      $$('[data-client]').forEach(b => b.onclick = () => openClientSheet(b.dataset.client));
      $$('[data-client-new]').forEach(b => b.onclick = () => openClientSheet(null));

      $('#cp-logout').onclick = async () => { if (await askConfirm({ title: `¿Cerrar la sesión de ${esc(co.name)}?`, ok: 'Cerrar sesión', icon: 'ph-sign-out' })) { Store.logoutCompany(); location.hash = '#/empresa'; render(); } };
      $('#cp-discard').onclick = () => refresh();
      $('#cp-save').onclick = () => {
        const v = id => $('#' + id).value.trim();
        const err = $('#cp-err'); const fail = m => { err.textContent = m; err.classList.remove('hidden'); };
        err.classList.add('hidden');
        const name = v('cp-name');
        if (name.length < 2) return fail('Escribí el nombre de la empresa.');
        if (name !== co.name && Store.companyExists(name)) return fail('Ya existe una empresa con ese nombre.');
        if (v('cp-cemail') && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v('cp-cemail'))) return fail('Revisá el email de contacto.');
        const type = $('input[name="cp-type"]:checked').value;
        if (name !== co.name) Store.renameCompany(co.name, name);
        Store.saveCoProfile(name, {
          logo: st.logo, description: v('cp-desc'), industry: v('cp-ind'), size: v('cp-size'),
          address: v('cp-addr'), city: v('cp-city'), province: v('cp-prov'), provinces: st.provinces,
          website: v('cp-web'), linkedin: v('cp-li'), instagram: v('cp-ig'),
          contactName: v('cp-cname'), contactEmail: v('cp-cemail'), contactPhone: v('cp-cphone'),
          msgWhatsapp: v('cp-mwa'), msgEmailSubject: v('cp-msubj'), msgEmailBody: $('#cp-mbody').value, msgReject: $('#cp-mrej').value
        });
        Store.jobs().filter(j => j.company === name).forEach(j => { if (j.companyType !== type) Store.updateJob(j.id, { companyType: type }); });
        Store.setCompany({ name, type });
        toast('Perfil guardado');
        render({ keep: true });
      };
    }
    return { html, mount };
  }

  function openClientSheet(name) {
    const co = Store.company();
    const cl = name ? Store.client(co.name, name) : null;
    const st = { logo: (cl && cl.logo) || null };
    const jobsN = name ? myJobs(co).filter(j => j.client === name).length : 0;
    const body = `
      <h2 class="text-[1.65rem] font-extrabold tracking-tight pr-10">${cl ? 'Editar cliente' : 'Nuevo cliente'}</h2>
      <p class="text-ink-soft mt-1">${cl ? `${jobsN} búsqueda${jobsN === 1 ? '' : 's'} publicada${jobsN === 1 ? '' : 's'} para este cliente.` : 'Cargalo una vez y elegilo al publicar.'}</p>
      <form id="cl-form" class="mt-5 space-y-4" novalidate>
        ${logoPicker('cl-logo', name || '', st.logo)}
        <div><label class="label" for="cl-name">Nombre de la empresa cliente *</label><input id="cl-name" class="input" value="${esc(cl ? cl.name : '')}" maxlength="60" placeholder="Ej: Estudio Contable Ruiz & Asoc."></div>
        <div><label class="label" for="cl-ind">Rubro</label><input id="cl-ind" class="input" value="${esc(cl ? cl.industry : '')}" maxlength="40" placeholder="Ej: Estudio contable"></div>
        <div class="grid sm:grid-cols-2 gap-3">
          <div><label class="label" for="cl-prov">Provincia</label><select id="cl-prov" class="input"><option value="">Elegí una provincia</option>${PROVINCES.map(p => `<option ${cl && cl.province === p ? 'selected' : ''}>${esc(p)}</option>`).join('')}</select></div>
          <div><label class="label" for="cl-city">Ciudad</label><input id="cl-city" class="input" value="${esc(cl && cl.city)}" placeholder="Ej: San Miguel de Tucumán"></div>
        </div>
        <div><label class="label" for="cl-web">Sitio web</label><input id="cl-web" class="input" inputmode="url" value="${esc(cl && cl.website)}" placeholder="Ej: estudioruiz.com.ar"></div>
        <div class="rounded-2xl bg-surface p-4 space-y-4">
          <p class="font-semibold">Contacto en el cliente <span class="font-normal text-ink-mute">(uso interno)</span></p>
          <input id="cl-cname" class="input" value="${esc(cl && cl.contactName)}" placeholder="Nombre y cargo" aria-label="Nombre y cargo del contacto">
          <div class="grid sm:grid-cols-2 gap-3">
            <input id="cl-cemail" type="email" inputmode="email" class="input" value="${esc(cl && cl.contactEmail)}" placeholder="Email" aria-label="Email del contacto">
            <input id="cl-cphone" type="tel" inputmode="tel" class="input" value="${esc(cl && cl.contactPhone)}" placeholder="Teléfono" aria-label="Teléfono del contacto">
          </div>
        </div>
        <div><label class="label" for="cl-notes">Sobre el cliente <span class="font-normal text-ink-mute">(notas internas)</span></label><textarea id="cl-notes" rows="3" maxlength="800" class="input h-auto py-3" placeholder="Cómo trabaja, qué valora, plazos habituales…">${esc(cl && cl.notes)}</textarea></div>
        <label class="flex gap-3 items-start cursor-pointer">
          <input type="checkbox" id="cl-show" class="w-5 h-5 mt-0.5 accent-[#0866FF] shrink-0" ${cl && cl.showName ? 'checked' : ''}>
          <span><span class="font-semibold">Mostrar el nombre a los candidatos</span><span class="block text-ink-mute text-[0.92rem]">Si no, sus búsquedas aparecen como “Empresa confidencial” con el rubro. Se aplica a todas sus búsquedas.</span></span>
        </label>
        <p id="cl-err" class="err hidden"></p>
      </form>`;
    const foot = `${cl && !jobsN ? `<button type="button" id="cl-del" class="btn btn-outline text-bad h-14 px-4" aria-label="Eliminar cliente"><i class="ph ph-trash text-xl"></i></button>` : ''}
      <button form="cl-form" class="btn btn-primary flex-1 h-14 text-lg"><i class="ph-bold ph-check text-xl"></i>${cl ? 'Guardar cliente' : 'Agregar cliente'}</button>`;
    openSheet(sheetScroll(body) + sheetFoot(foot), c => {
      bindLogoPicker(c, 'cl-logo', () => $('#cl-name', c).value.trim(), st);
      $('#cl-form', c).onsubmit = e => {
        e.preventDefault();
        const v = id => $('#' + id, c).value.trim(), err = $('#cl-err', c);
        const nm = v('cl-name');
        if (nm.length < 2) { err.textContent = 'Escribí el nombre del cliente.'; err.classList.remove('hidden'); return; }
        if (nm !== name && Store.client(co.name, nm)) { err.textContent = 'Ya tenés un cliente con ese nombre.'; err.classList.remove('hidden'); return; }
        Store.saveClient(co.name, name, { name: nm, industry: v('cl-ind'), logo: st.logo, contactName: v('cl-cname'), contactEmail: v('cl-cemail'), contactPhone: v('cl-cphone'), province: v('cl-prov'), city: v('cl-city'), website: v('cl-web'), notes: v('cl-notes'), showName: $('#cl-show', c).checked });
        closeSheet(true); toast(cl ? 'Cliente actualizado' : 'Cliente agregado'); refresh();
      };
      const del = $('#cl-del', c);
      if (del) del.onclick = async () => { if (await askConfirm({ title: `¿Eliminar a ${esc(name)} de tus clientes?`, text: 'Sus búsquedas no se borran.', ok: 'Eliminar cliente', danger: true })) { Store.deleteClient(co.name, name); closeSheet(true); toast('Cliente eliminado', 'ph-trash'); refresh(); } };
    });
  }

  /* ----- Página pública de la empresa (la ven los candidatos) ----- */
  function CompanyPage(params) {
    const name = params.get('n') || '';
    if (!name || !Store.companyExists(name)) {
      return { html: `<div class="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid">${emptyState('ph-buildings', 'No encontramos esta empresa', 'Puede que haya cambiado de nombre o ya no publique en +Humanos.', '<a href="#/vacantes" class="btn btn-primary">Ver vacantes</a>')}</div>` };
    }
    const p = Store.coProfile(name), cmp = companyOf(name);
    const all = Store.jobs().filter(j => j.company === name);
    const type = p.type || (all[0] && all[0].companyType) || cmp.type;
    const jobs = all.filter(j => j.status === 'activa').sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt));
    const prof = Store.profile();
    const own = (Store.company() || {}).name === name;
    const pubClients = [...new Set(jobs.filter(j => j.client && j.showClient).map(j => j.client))];
    const links = [[toUrl(p.website), 'ph-globe', 'Sitio web'], [toUrl(p.linkedin, LINKEDIN), 'ph-linkedin-logo', 'LinkedIn'], [toUrl(p.instagram, INSTAGRAM), 'ph-instagram-logo', 'Instagram']].filter(l => l[0]);
    const wa = waLink(p.contactPhone, `Hola, vi el perfil de ${name} en +Humanos y quería consultar por sus búsquedas.`);
    const meta = [type, industryOf(p.industry || cmp.industry), p.size ? `${p.size} empleados` : '', [p.city, p.province].filter(Boolean).join(', ')].filter(Boolean);
    const html = `
      ${own ? `<div class="bg-ink text-white"><div class="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 flex items-center gap-3 text-[0.95rem]">
        <i class="ph-fill ph-eye text-lg"></i><span class="flex-1">Así ven tu página los candidatos.</span>
        <a href="#/empresa/perfil" class="font-semibold underline underline-offset-2">Editar perfil</a></div></div>` : ''}
      <section class="bg-white border-b border-line">
        <div class="h-28 sm:h-40" style="background:linear-gradient(120deg, ${cmp.color}, ${cmp.color}cc 55%, #1C2B33)"></div>
        <div class="max-w-6xl mx-auto px-4 sm:px-6 pb-6">
          <div class="flex flex-col sm:flex-row sm:items-end gap-4">
            <div class="-mt-12 sm:-mt-14 rounded-2xl ring-4 ring-white bg-white w-fit shadow-lift shrink-0">${logo(name, 'w-24 h-24 sm:w-28 sm:h-28 text-3xl')}</div>
            <div class="min-w-0 flex-1 sm:pb-1">
              <h1 class="text-[1.9rem] sm:text-4xl font-extrabold tracking-tight leading-tight">${esc(name)}</h1>
              <p class="text-ink-soft mt-1">${meta.map(esc).join(' · ')}</p>
            </div>
            ${links.length ? `<div class="flex gap-2">${links.map(([u, ic, l]) => `<a href="${esc(u)}" target="_blank" rel="noopener" class="icon-btn border border-line w-12 h-12" aria-label="${l}" title="${l}"><i class="ph ${ic} text-2xl"></i></a>`).join('')}</div>` : ''}
          </div>
        </div>
      </section>
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-6 grid gap-6 lg:grid-cols-[1fr_20rem] items-start">
        <div class="space-y-6 min-w-0">
          ${p.description ? `<section class="card p-5 sm:p-6"><h2 class="text-xl font-extrabold tracking-tight">Sobre ${esc(name)}</h2><p class="mt-2 text-ink-soft leading-relaxed whitespace-pre-line">${esc(p.description)}</p></section>` : ''}
          <section>
            <h2 class="text-xl font-extrabold tracking-tight mb-3">Vacantes abiertas <span class="text-ink-mute font-bold">(${jobs.length})</span></h2>
            <div class="grid gap-3 sm:gap-4 md:grid-cols-2">
              ${jobs.length ? jobs.map(j => jobCard(j, score(j, prof))).join('') : emptyState('ph-briefcase', 'Sin vacantes abiertas por ahora', 'Guardá esta página y volvé pronto.')}
            </div>
          </section>
        </div>
        <aside class="space-y-4 lg:sticky lg:top-24">
          ${(p.contactName || p.contactEmail || wa || links.length) ? `<section class="card p-5">
            <h2 class="text-lg font-bold">Contacto</h2>
            ${p.contactName ? `<p class="mt-2 flex items-center gap-2 text-ink-soft"><i class="ph ph-user text-lg"></i>${esc(p.contactName)}</p>` : ''}
            <div class="mt-4 grid gap-2">
              ${wa ? `<a href="${esc(wa)}" target="_blank" rel="noopener" class="btn btn-primary"><i class="ph-fill ph-whatsapp-logo text-xl"></i>Escribir por WhatsApp</a>` : ''}
              ${p.contactEmail ? `<a href="mailto:${esc(p.contactEmail)}" class="btn btn-outline"><i class="ph ph-envelope-simple text-xl"></i>${esc(p.contactEmail)}</a>` : ''}
            </div>
            ${links.length ? `<ul class="mt-4 pt-4 border-t border-line space-y-2">${links.map(([u, ic, l]) => `<li><a href="${esc(u)}" target="_blank" rel="noopener" class="flex items-center gap-3 rounded-xl px-2 py-2 -mx-2 hover:bg-surface group">
                <span class="w-9 h-9 rounded-lg bg-surface grid place-items-center shrink-0 group-hover:bg-white"><i class="ph${ic === 'ph-globe' ? '' : '-fill'} ${ic} text-lg text-brand"></i></span>
                <span class="min-w-0 flex-1 leading-tight"><span class="block font-semibold">${l}</span><span class="block text-[0.85rem] text-ink-mute truncate">${esc(u.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''))}</span></span>
                <i class="ph-bold ph-arrow-up-right text-ink-mute"></i></a></li>`).join('')}</ul>` : ''}
          </section>` : ''}
          ${(p.address || p.city || (p.provinces || []).length) ? `<section class="card p-5">
            <h2 class="text-lg font-bold">Dónde están</h2>
            ${p.address || p.city ? `<p class="mt-2 flex items-start gap-2 text-ink-soft"><i class="ph ph-map-pin text-lg mt-0.5"></i><span>${esc([p.address, p.city, p.province].filter(Boolean).join(', '))}</span></p>` : ''}
            ${(p.provinces || []).length ? `<p class="mt-4 font-semibold">Operan en</p><div class="mt-2 flex flex-wrap gap-1.5">
              ${(p.provinces.length === PROVINCES.length ? ['Todo el país'] : p.provinces).map(x => `<span class="bg-surface rounded-full px-3 py-1 text-[0.92rem] font-medium">${esc(x)}</span>`).join('')}</div>` : ''}
          </section>` : ''}
          ${pubClients.length ? `<section class="card p-5">
            <h2 class="text-lg font-bold">Buscando para</h2>
            <div class="mt-3 space-y-2">${pubClients.map(cn => `<div class="flex items-center gap-3">${logo(cn, 'w-10 h-10 text-sm')}<span class="font-semibold truncate">${esc(cn)}</span></div>`).join('')}</div>
            <p class="text-ink-mute text-[0.88rem] mt-3">Algunas búsquedas son confidenciales.</p>
          </section>` : ''}
        </aside>
      </div>`;
    return { html };
  }

  /* ---------------- PDF de demostración (para CVs de ejemplo) ---------------- */
  function demoPdf(c) {
    c = c || {};
    let seedText = (typeof SEED_CV !== 'undefined' && (SEED_CV[c.id] || SEED_CV[c.cand])) || c.cvText || '';
    if (c.hideContact) seedText = sanitizeCv(seedText);
    const lat = s => String(s ?? '').replace(/[^\x20-\xFF]/g, '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    const ops = [];
    let y = 760;
    const text = (t, size, bold, gap = 10) => { ops.push(`BT /${bold ? 'F1' : 'F2'} ${size} Tf 56 ${y} Td (${lat(t)}) Tj ET`); y -= size + gap; };
    const wrap = (t, n = 88) => { const out = []; let cur = ''; String(t).split(' ').forEach(w => { if ((cur + ' ' + w).trim().length > n) { out.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); }); if (cur) out.push(cur); return out; };
    ops.push('0.231 0.357 0.992 rg 0 806 595 36 re f', '0.078 0.071 0.227 rg');
    if (c.scanned) {
      ops.push('0.93 0.93 0.95 rg 40 120 515 660 re f', '0.80 0.80 0.84 rg');
      for (let k = 0; k < 22; k++) ops.push(`70 ${740 - k * 26} ${k % 4 === 0 ? 260 : 420 - (k * 37) % 140} 9 re f`);
      ops.push('0.42 0.49 0.55 rg'); y = 90; text('Documento escaneado: es una imagen, no tiene texto para leer.', 10, false);
    } else if (seedText) {
      seedText.split('\n').forEach((ln, i) => {
        const t = ln.trim(); if (!t) return;
        if (i === 0) text(t, 26, true, 8);
        else if (i === 1) text(t, 14, false, 8);
        else if (i === 2) text(t, 10.5, false, 24);
        else if (/^[A-ZÁÉÍÓÚÑ ]{5,}$/.test(t)) { y -= 8; text(t, 12, true, 8); }
        else wrap(t).forEach(l => text(l, 11, false, 6));
      });
      y -= 24; ops.push('0.42 0.49 0.55 rg'); text('CV de demostración del prototipo de +Humanos.', 9, false);
    } else {
    text(c.name || 'Candidato/a', 26, true, 8);
    text(c.headline || 'Postulante', 14, false, 8);
    text([c.email, c.phone, [c.city, c.province].filter(Boolean).join(', ')].filter(Boolean).join('   |   '), 10.5, false, 26);
    text('PERFIL', 12, true, 8);
    wrap(`${c.headline || 'Profesional'} con ${senLabel(c.seniority) ? senLabel(c.seniority).toLowerCase() : 'experiencia'} en ${areaOf(c.area).label.toLowerCase()}. Orientado/a a resultados, con buena comunicación y disponibilidad para incorporarse.`).forEach(l => text(l, 11, false, 6));
    y -= 16;
    text('HABILIDADES', 12, true, 8);
    text((c.skills && c.skills.length ? c.skills : ['Trabajo en equipo', 'Comunicación', 'Organización']).join('  ·  '), 11, false, 24);
    text('EXPERIENCIA', 12, true, 8);
    ['2022 - actualidad   ' + (c.headline || 'Puesto actual') + ' - Empresa del sector', '2019 - 2022   Puesto anterior - Empresa regional'].forEach(l => text(l, 11, false, 6));
    y -= 30;
    ops.push('0.42 0.49 0.55 rg');
    text('CV de demostración generado por el prototipo de +Humanos.', 9, false);
    }
    const content = ops.join('\n');
    const objs = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
      `<< /Length ${content.length} >>\nstream\n${content}\nendstream`
    ];
    let pdf = '%PDF-1.4\n';
    const offs = [];
    objs.forEach((o, i) => { offs.push(pdf.length); pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; });
    const xref = pdf.length;
    pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offs.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('') +
      `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    const bytes = new Uint8Array(pdf.length);
    for (let i = 0; i < pdf.length; i++) bytes[i] = pdf.charCodeAt(i) & 0xff;
    return new Blob([bytes], { type: 'application/pdf' });
  }

  /* ---------------- Router ---------------- */
  function parseHash() {
    const h = location.hash.replace(/^#/, '') || '/';
    const [path, qs] = h.split('?');
    return { path: path || '/', params: new URLSearchParams(qs || '') };
  }


  /* ================= REPORTES =================
     Días para cubrir cada búsqueda, canal de origen de los postulantes, embudo de etapas
     e informe en PDF por cliente (armado acá mismo, sin librerías). */
  const chOf = id => CHANNELS.find(c => c[0] === id) || CHANNELS[CHANNELS.length - 1];
  // Origen del postulante: el que trajo el link/pregunta; en los ejemplos, uno fijo según el id
  const SEED_SRC = ['emplea', 'emplea', 'emplea', 'linkedin', 'linkedin', 'whatsapp', 'whatsapp', 'instagram', 'facebook', 'computrabajo', 'referido'];
  const srcOf = a => a.source || SEED_SRC[[...String(a.id)].reduce((x, c) => x + c.charCodeAt(0), 0) % SEED_SRC.length];
  const histSts = a => new Set([...(a.history || []).map(h => h.st), a.status]);
  const FUNNEL = [
    ['Postulantes', () => true],
    ['CV revisado', a => !!a.readAt || a.status !== 'Nuevo'],
    ['Entrevistados', a => { const h = histSts(a); return !!a.interview || ['Entrevista', 'Terna', 'Contratado'].some(x => h.has(x)); }],
    ['En terna', a => { const h = histSts(a); return Store.inTerna(a.jobId, a.id) || ['Terna', 'Contratado'].some(x => h.has(x)); }],
    ['Contratados', a => a.status === 'Contratado']
  ];
  function hireOf(j, ja) {
    const h = ja.filter(a => a.status === 'Contratado'); if (!h.length) return null;
    const at = h.map(a => ((a.history || []).find(x => x.st === 'Contratado') || {}).at || a.changedAt || a.date).sort()[0];
    return { a: h[0], at, days: Math.max(1, Math.ceil((new Date(at) - new Date(j.postedAt)) / 864e5)) };
  }
  function repData(co, F) {
    const since = F.per === 'all' ? 0 : Date.now() - (+F.per) * 864e5;
    const jobs = myJobs(co).filter(j => new Date(j.postedAt).getTime() >= since && (F.client === 'all' || (co.type === 'Consultora' && j.client ? j.client : OWN) === F.client));
    const ids = new Set(jobs.map(j => j.id));
    const apps = Store.apps().filter(a => ids.has(a.jobId));
    const rows = jobs.map(j => { const ja = apps.filter(a => a.jobId === j.id); return { j, ja, hire: hireOf(j, ja) }; })
      .sort((a, b) => new Date(b.j.postedAt) - new Date(a.j.postedAt));
    const covered = rows.filter(r => r.hire);
    const avg = covered.length ? Math.round(covered.reduce((x, r) => x + r.hire.days, 0) / covered.length) : null;
    const funnel = FUNNEL.map(([l, fn]) => [l, apps.filter(fn).length]);
    const ch = {}; apps.forEach(a => { const s2 = srcOf(a); (ch[s2] = ch[s2] || { n: 0, hired: 0 }).n++; if (a.status === 'Contratado') ch[s2].hired++; });
    const channels = Object.entries(ch).sort((a, b) => b[1].n - a[1].n);
    return { jobs, apps, rows, covered, avg, funnel, channels };
  }
  const coverTxt = r => r.hire ? `Cubierta en ${r.hire.days} ${plural(r.hire.days, 'día', 'días')}` : r.j.status === 'activa' ? (daysSince(r.j.postedAt) < 1 ? 'Abierta desde hoy' : `Abierta hace ${daysSince(r.j.postedAt)} ${plural(daysSince(r.j.postedAt), 'día', 'días')}`) : 'Pausada sin cubrir';
  const PERIODS = [['30', 'Últimos 30 días'], ['90', 'Últimos 90 días'], ['365', 'Último año'], ['all', 'Todo']];


  // Historial de ejemplo para los reportes: búsquedas ya cubiertas (cerradas) en las cuentas demo
  function seedReportHistory(co) {
    const key = 'emplea.repseed.' + co.name;
    try { if (localStorage.getItem(key)) return; localStorage.setItem(key, '1'); } catch (e) { return; }
    const base = myJobs(co).filter(j => !j.repSeed).slice(0, 3); if (!base.length) return;
    const dIso = d => new Date(Date.now() - d * 864e5).toISOString();
    const cands = SEED_CANDIDATES;
    const plan = [[58, 21, 12], [40, 14, 9], [25, 18, 7]]; // [publicada hace N días, días hasta cubrir, postulantes]
    base.forEach((src, k) => {
      const [ago0, cover, nA] = plan[k % plan.length];
      const id = `rh${k}${Date.now().toString(36)}`;
      Store.addJob({ ...src, id, repSeed: true, postedAt: dIso(ago0), status: 'pausada', featured: undefined });
      for (let i = 0; i < nA; i++) {
        const c = cands[(k * 5 + i) % cands.length], d0 = ago0 - Math.min(cover - 1, i % 6);
        const at = n => dIso(Math.max(0, d0 - n));
        const H = [{ st: 'Nuevo', at: at(0) }];
        let st = 'Descartado';
        if (i === 0) { H.push({ st: 'En revisión', at: at(2) }, { st: 'Entrevista', at: at(5) }, { st: 'Terna', at: at(9) }); H.push({ st: 'Contratado', at: dIso(ago0 - cover) }); st = 'Contratado'; }
        else if (i < 3) { H.push({ st: 'En revisión', at: at(2) }, { st: 'Entrevista', at: at(5) }, { st: 'Terna', at: at(9) }, { st: 'Descartado', at: dIso(ago0 - cover) }); }
        else if (i < 6) { H.push({ st: 'En revisión', at: at(2) }, { st: 'Entrevista', at: at(6) }, { st: 'Descartado', at: at(10) }); }
        else if (i < 9) { H.push({ st: 'En revisión', at: at(2) }, { st: 'Descartado', at: at(4) }); }
        else H.push({ st: 'Descartado', at: at(3) });
        const aid = `${id}a${i}`;
        Store.addApp({ id: aid, jobId: id, cand: c.id, name: c.name, email: c.email, phone: c.phone, cvName: `CV ${c.name}.pdf`, cvSize: 48000, date: H[0].at, status: st, history: H, changedAt: H[H.length - 1].at, readAt: H[1] ? H[1].at : undefined, notifiedAt: st === 'Descartado' ? H[H.length - 1].at : undefined, rating: i < 3 ? { pct: [90, 80, 70][i], note: '', at: H[H.length - 1].at } : undefined, mine: false });
        if (i < 3) Store.toggleTerna(co.name, id, aid);
      }
    });
  }

  function Reports() {
    const co = Store.company(), isCons = co.type === 'Consultora';
    if (SEED_PLANS[co.name]) seedReportHistory(co);
    const F = S.rep || (S.rep = { per: 'all', client: 'all' });
    const groups = clientGroups(co);
    if (F.client !== 'all' && !groups.some(g => g.key === F.client)) F.client = 'all';
    const D = repData(co, F);
    const tile = (ic, v, l, sub = '') => `<div class="card p-4 sm:p-5"><i class="ph-fill ${ic} text-2xl text-brand"></i><p class="mt-2 font-display text-[2rem] leading-none font-extrabold tabular-nums">${v}</p><p class="mt-1.5 text-ink-soft leading-tight">${l}</p>${sub ? `<p class="text-[0.85rem] text-ink-mute mt-0.5">${sub}</p>` : ''}</div>`;
    const top = D.funnel[0][1] || 0;
    const bar = (l, n, max, extra, ic) => `<li class="grid grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)_auto] sm:grid-cols-[11rem_minmax(0,1fr)_auto] items-center gap-3" title="${esc(l)}: ${n}">
        <span class="font-semibold text-ink leading-tight flex items-center gap-2 min-w-0">${ic ? `<i class="ph ${ic} text-lg text-ink-mute shrink-0"></i>` : ''}<span class="truncate">${esc(l)}</span></span>
        <span class="h-7 rounded-md bg-surface overflow-hidden"><span class="block h-full rounded-r-[4px] bg-brand" style="width:${max ? Math.max(n ? 2 : 0, Math.round(n / max * 100)) : 0}%"></span></span>
        <span class="text-right tabular-nums whitespace-nowrap min-w-[4.5rem]"><b class="text-ink">${n}</b> <span class="text-ink-mute text-[0.88rem]">${extra}</span></span></li>`;
    const funnelHtml = D.funnel.map(([l, n], i) => bar(l, n, top, i === 0 ? '' : `${top ? Math.round(n / top * 100) : 0}%`)).join('');
    const chMax = D.channels.length ? D.channels[0][1].n : 0;
    const chHtml = D.channels.map(([id, v]) => bar(chOf(id)[1], v.n, chMax, `${D.apps.length ? Math.round(v.n / D.apps.length * 100) : 0}%${v.hired ? ` · <i class="ph-fill ph-check-circle text-ok" title="${v.hired} ${plural(v.hired, 'contratado', 'contratados')}"></i>${v.hired}` : ''}`, chOf(id)[2])).join('');
    const sel = (id, opts, val, aria) => `<select id="${id}" data-dd class="input h-11 py-0 w-full sm:w-auto bg-white font-semibold" aria-label="${aria}">${opts.map(([v, l]) => `<option value="${esc(v)}" ${v === val ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
    const html = `<div class="max-w-6xl mx-auto px-4 sm:px-6 py-6 md:py-10 space-y-6">
      <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div><h1 class="text-[2rem] sm:text-[2.4rem] leading-tight font-extrabold">Reportes</h1>
          <p class="text-ink-soft mt-1">Cuánto tardás en cubrir cada búsqueda, de dónde vienen tus postulantes y cómo avanzan.</p></div>
        <div class="flex flex-col sm:flex-row gap-2">
          ${isCons ? sel('rep-client', [['all', 'Todos los clientes'], ...groups.map(g => [g.key, g.name])], F.client, 'Cliente') : ''}
          ${sel('rep-per', PERIODS, F.per, 'Período')}
        </div>
      </div>
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        ${tile('ph-users-three', D.apps.length, 'Postulantes recibidos', `en ${D.jobs.length} ${plural(D.jobs.length, 'búsqueda', 'búsquedas')}`)}
        ${tile('ph-check-circle', `${D.covered.length}<span class="text-ink-mute text-[1.2rem]"> de ${D.jobs.length}</span>`, 'Búsquedas cubiertas')}
        ${tile('ph-timer', D.avg == null ? '–' : D.avg, 'Días promedio para cubrir', D.avg == null ? 'Todavía no cubriste ninguna' : 'desde la publicación hasta el contratado')}
        ${tile('ph-calendar-check', D.funnel[2][1], 'Personas entrevistadas')}
      </div>
      <div class="grid gap-6 lg:grid-cols-2">
        <section class="card p-5 sm:p-6" aria-labelledby="rep-f">
          <h2 id="rep-f" class="text-xl font-extrabold">Cómo avanzan los postulantes</h2>
          <p class="text-ink-mute text-[0.92rem] mt-0.5">Cuántos llegaron a cada etapa y qué porcentaje del total representan.</p>
          ${top ? `<ul class="mt-5 space-y-3">${funnelHtml}</ul>` : '<p class="mt-5 text-ink-mute">Todavía no hay postulantes en este período.</p>'}
        </section>
        <section class="card p-5 sm:p-6" aria-labelledby="rep-c">
          <div class="flex items-start justify-between gap-3"><div><h2 id="rep-c" class="text-xl font-extrabold">De dónde vienen</h2>
            <p class="text-ink-mute text-[0.92rem] mt-0.5">Canal por el que llegó cada postulante. <i class="ph-fill ph-check-circle text-ok"></i> = contratados por ese canal.</p></div></div>
          ${D.channels.length ? `<ul class="mt-5 space-y-3">${chHtml}</ul>` : '<p class="mt-5 text-ink-mute">Todavía no hay postulantes en este período.</p>'}
          <p class="mt-5 text-[0.9rem] text-ink-mute flex gap-2"><i class="ph ph-info text-lg shrink-0"></i><span>Para medir cada canal, compartí tus avisos con el link de cada uno: botón <b class="text-ink-soft">Compartir</b> en cada búsqueda.</span></p>
        </section>
      </div>
      <section class="card overflow-hidden" aria-labelledby="rep-j">
        <div class="p-5 sm:p-6 pb-3"><h2 id="rep-j" class="text-xl font-extrabold">Búsquedas</h2></div>
        ${D.rows.length ? `<div class="hidden md:grid grid-cols-[minmax(0,1.6fr)_7rem_6rem_minmax(0,1fr)] gap-4 px-6 py-2.5 bg-surface border-y border-line text-[0.85rem] font-bold text-ink-mute"><span>Búsqueda</span><span>Publicada</span><span>Postulantes</span><span>Resultado</span></div>
        <ul class="divide-y divide-line">${D.rows.map(r => `<li><a href="#/empresa/b?id=${r.j.id}" class="grid md:grid-cols-[minmax(0,1.6fr)_7rem_6rem_minmax(0,1fr)] gap-1 md:gap-4 px-5 sm:px-6 py-3.5 hover:bg-surface md:items-center">
            <span class="min-w-0"><span class="block font-semibold truncate">${esc(r.j.title)}</span><span class="block text-[0.88rem] text-ink-mute truncate">${esc(r.j.client || (isCons ? 'Búsqueda propia' : r.j.city))}</span></span>
            <span class="text-ink-soft text-[0.92rem]"><span class="md:hidden">Publicada </span>${fmtDate(r.j.postedAt)}</span>
            <span class="text-ink-soft text-[0.92rem] tabular-nums">${r.ja.length}<span class="md:hidden"> postulantes</span></span>
            <span class="font-semibold ${r.hire ? 'text-ok' : 'text-ink-soft'} text-[0.95rem]">${r.hire ? '<i class="ph-fill ph-check-circle"></i> ' : ''}${coverTxt(r)}${r.hire ? `<span class="block font-normal text-ink-mute text-[0.88rem] truncate">${esc(r.hire.a.name)}</span>` : ''}</span></a></li>`).join('')}</ul>`
          : `<p class="px-6 pb-6 text-ink-mute">No hay búsquedas en este período.</p>`}
      </section>
      <section aria-labelledby="rep-pdf">
        <h2 id="rep-pdf" class="text-xl font-extrabold">Informe para cada cliente</h2>
        <p class="text-ink-soft mt-0.5">Un PDF con el resumen de sus búsquedas, el embudo, los canales, la terna y la persona elegida. Listo para mandarle.</p>
        <ul class="mt-4 grid gap-3 md:grid-cols-2">${groups.map(g => `<li class="card p-4 flex items-center gap-3">
            ${logo(g.logoName, 'w-12 h-12 text-sm')}
            <div class="min-w-0 flex-1"><p class="font-semibold truncate">${esc(g.name)}</p><p class="text-ink-mute text-[0.9rem]">${g.jobs.length} ${plural(g.jobs.length, 'búsqueda', 'búsquedas')} · ${g.apps} postulantes</p></div>
            <button type="button" data-rep-pdf="${esc(g.key)}" class="btn btn-outline btn-sm shrink-0"><i class="ph-bold ph-file-pdf text-lg"></i>PDF</button></li>`).join('')}</ul>
      </section>
    </div>`;
    return { html, mount() {
      const rc = $('#rep-client'); if (rc) rc.onchange = e => { F.client = e.target.value; refresh(); };
      $('#rep-per').onchange = e => { F.per = e.target.value; refresh(); };
      $$('[data-rep-pdf]').forEach(b => b.onclick = () => downloadClientReport(co, b.dataset.repPdf, F.per));
    } };
  }

  // Informe PDF por cliente (A4, Helvetica). Arma las páginas a mano, sin librerías.
  // Logo subido (PNG/JPG en data URL) → JPEG sobre fondo blanco, para incrustarlo en el PDF
  function logoJpeg(src, px = 240) {
    return new Promise(res => {
      if (!src) return res(null);
      const im = new Image();
      im.onload = () => {
        const k = Math.min(px / im.width, px / im.height, 1) || 1, w = Math.max(1, Math.round(im.width * k)), h = Math.max(1, Math.round(im.height * k));
        const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
        const x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.drawImage(im, 0, 0, w, h);
        try { res({ data: atob(cv.toDataURL('image/jpeg', 0.92).split(',')[1]), w, h }); } catch (e) { res(null); }
      };
      im.onerror = () => res(null);
      im.src = src;
    });
  }
  function clientReportPdf(co, key, per, logoImg) {
    const isCons = co.type === 'Consultora';
    const g = clientGroups(co).find(x => x.key === key);
    const D = repData(co, { per, client: key });
    const W = 595, H = 842, M = 48;
    const lat = s2 => String(s2 ?? '').replace(/[–—]/g, '-').replace(/[“”]/g, '"').replace(/[^\x20-\xFF]/g, '').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    const rgb = hex => { const h = hex.replace('#', ''); return [0, 2, 4].map(i => (parseInt(h.substr(i, 2), 16) / 255).toFixed(3)).join(' '); };
    const C = { ink: '#14123A', soft: '#4A4868', mute: '#64627C', brand: '#3B5BFD', line: '#E4E3EE', surf: '#F4F4FA', ok: '#0B7A55', lilac: '#ECEEFF' };
    const pages = []; let ops, y;
    const tw = (t, size) => lat(t).length * size * 0.5;
    const text = (x, yy, t, size, bold, color = C.ink) => ops.push(`${rgb(color)} rg BT /${bold ? 'F1' : 'F2'} ${size} Tf ${x.toFixed(1)} ${yy.toFixed(1)} Td (${lat(t)}) Tj ET`);
    const rect = (x, yy, w, h, color) => ops.push(`${rgb(color)} rg ${x.toFixed(1)} ${yy.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re f`);
    const footer = () => { text(M, 28, `Informe generado con +Humanos · ${co.name}`, 8.5, false, C.mute); text(W - M - 40, 28, `Página ${pages.length}`, 8.5, false, C.mute); };
    const newPage = () => { if (ops) { footer(); } ops = []; pages.push(ops); y = H - M; };
    const need = h => { if (y - h < 60) { newPage(); } };
    const fit = (t, size, maxW) => { let s2 = String(t); while (s2.length > 3 && tw(s2, size) > maxW) s2 = s2.slice(0, -2); return s2 === String(t) ? s2 : s2.trim() + '...'; };
    newPage();
    // Encabezado: logo (iniciales en el color de la consultora), nombre y destinatario
    rect(0, H - 6, W, 6, C.brand);
    if (logoImg) {
      const k = 44 / Math.max(logoImg.w, logoImg.h), lw = logoImg.w * k, lh = logoImg.h * k;
      ops.push(`q ${lw.toFixed(1)} 0 0 ${lh.toFixed(1)} ${(M + (44 - lw) / 2).toFixed(1)} ${(y - 44 + (44 - lh) / 2).toFixed(1)} cm /Im1 Do Q`);
    } else {
      rect(M, y - 44, 44, 44, companyOf(co.name).color);
      const ini = initials(co.name); text(M + 22 - tw(ini, 15) / 2, y - 27, ini, 15, true, '#FFFFFF');
    }
    text(M + 58, y - 17, co.name, 15, true); text(M + 58, y - 35, isCons ? 'Consultora de selección' : 'Empresa', 10, false, C.mute);
    y -= 80;
    text(M, y, 'Informe de búsquedas', 24, true); y -= 24;
    text(M, y, `Para: ${g ? (g.key === OWN ? co.name : g.name) : ''}`, 12, false, C.soft); y -= 16;
    text(M, y, `Período: ${(PERIODS.find(p => p[0] === per) || PERIODS[3])[1]} · Generado el ${new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}`, 10, false, C.mute); y -= 30;
    // Indicadores
    const kp = [[D.jobs.length, 'Búsquedas'], [D.apps.length, 'Postulantes'], [`${D.covered.length}/${D.jobs.length}`, 'Cubiertas'], [D.avg == null ? '-' : D.avg, 'Días prom. para cubrir']];
    const kw = (W - 2 * M - 3 * 10) / 4;
    kp.forEach(([v, l], i) => { const x = M + i * (kw + 10); rect(x, y - 58, kw, 58, C.surf); text(x + 12, y - 30, String(v), 20, true); text(x + 12, y - 47, l, 9, false, C.mute); });
    y -= 84;
    const bars = (title, rows, max, color) => {
      need(30 + rows.length * 20);
      text(M, y, title, 13, true); y -= 20;
      rows.forEach(([l, n, extra]) => {
        text(M, y - 10, fit(l, 10, 120), 10, false, C.soft);
        const bw = W - 2 * M - 130 - 90; rect(M + 130, y - 14, bw, 14, C.surf);
        if (n) rect(M + 130, y - 14, Math.max(2, bw * n / (max || 1)), 14, color);
        text(M + 130 + bw + 10, y - 10, `${n}${extra ? '  ' + extra : ''}`, 10, true);
        y -= 20;
      });
      y -= 14;
    };
    const t0 = D.funnel[0][1];
    bars('Cómo avanzaron los postulantes', D.funnel.map(([l, n], i) => [l, n, i && t0 ? `${Math.round(n / t0 * 100)}%` : '']), t0, C.brand);
    if (D.channels.length) bars('De dónde vinieron', D.channels.map(([id, v]) => [chOf(id)[1], v.n, D.apps.length ? `${Math.round(v.n / D.apps.length * 100)}%` : '']), D.channels[0][1].n, '#7B3FE4');
    // Detalle por búsqueda
    need(40); text(M, y, 'Detalle por búsqueda', 13, true); y -= 10;
    D.rows.forEach(r => {
      const t = Store.ternaOfJob(r.j.id);
      const terna = t ? t.items.map(it => Store.apps().find(a => a.id === it.appId)).filter(Boolean) : [];
      const h = 70 + terna.length * 14 + (r.hire ? 16 : 0);
      need(h + 10);
      y -= 8; rect(M, y - h, W - 2 * M, h, C.surf); rect(M, y - h, 4, h, r.hire ? C.ok : C.brand);
      let yy = y - 20;
      text(M + 16, yy, fit(r.j.title, 13, 300), 13, true);
      const st = coverTxt(r); text(W - M - 14 - tw(st, 10), yy, st, 10, true, r.hire ? C.ok : C.soft);
      yy -= 16; text(M + 16, yy, `${r.j.city}, ${r.j.province} · ${r.j.modality} · Publicada el ${fmtDate(r.j.postedAt)} · ${r.ja.length} postulantes`, 9.5, false, C.mute);
      yy -= 18;
      const f = FUNNEL.map(([l, fn]) => `${l}: ${r.ja.filter(fn).length}`).join('   ');
      text(M + 16, yy, f, 9.5, false, C.soft);
      if (terna.length) {
        yy -= 18; text(M + 16, yy, 'Terna presentada', 10, true);
        terna.forEach(a => { yy -= 14; const rt = ratingOf(a); text(M + 26, yy, `- ${a.name}${rt != null ? `  (calificación ${rt}%)` : ''}${a.status === 'Contratado' ? '  · ELEGIDO/A' : ''}`, 9.5, a.status === 'Contratado', a.status === 'Contratado' ? C.ok : C.soft); });
      }
      if (r.hire && !terna.some(a => a.id === r.hire.a.id)) { yy -= 16; text(M + 16, yy, `Persona elegida: ${r.hire.a.name}`, 10, true, C.ok); }
      y -= h + 4;
    });
    if (!D.rows.length) { text(M, y - 14, 'No hay búsquedas en este período.', 10, false, C.mute); }
    footer();
    // Armado del archivo
    // Objetos: 1 catálogo · 2 páginas · 3-4 fuentes · 5 logo (si hay) · luego página + contenido de cada hoja
    const off = logoImg ? 6 : 5;
    const nP = pages.length, objs = ['<< /Type /Catalog /Pages 2 0 R >>', `<< /Type /Pages /Kids [${pages.map((_, i) => `${off + i * 2} 0 R`).join(' ')}] /Count ${nP} >>`,
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'];
    if (logoImg) objs.push(`<< /Type /XObject /Subtype /Image /Width ${logoImg.w} /Height ${logoImg.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${logoImg.data.length} >>\nstream\n${logoImg.data}\nendstream`);
    pages.forEach((p, i) => {
      const content = p.join('\n');
      objs.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >>${logoImg ? ' /XObject << /Im1 5 0 R >>' : ''} >> /Contents ${off + 1 + i * 2} 0 R >>`);
      objs.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    });
    let pdf = '%PDF-1.4\n'; const offs = [];
    objs.forEach((o, i) => { offs.push(pdf.length); pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; });
    const xref = pdf.length;
    pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offs.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('') + `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    const bytes = new Uint8Array(pdf.length); for (let i = 0; i < pdf.length; i++) bytes[i] = pdf.charCodeAt(i) & 0xff;
    return { blob: new Blob([bytes], { type: 'application/pdf' }), name: g ? (g.key === OWN ? co.name : g.name) : 'cliente' };
  }
  async function downloadClientReport(co, key, per) {
    const { blob, name } = clientReportPdf(co, key, per, await logoJpeg(Store.logoOf(co.name)));
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = `Informe ${name} - ${co.name}.pdf`.replace(/[\\/:*?"<>|]/g, ''); document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    toast('Descargamos el informe en PDF', 'ph-file-pdf');
  }

  // Compartir un aviso con un link por canal (?src=), para saber de dónde vienen los postulantes
  function openShareChannels(jobId) {
    const j = Store.job(jobId); if (!j) return;
    const base = location.href.split('#')[0];
    const link = ch => `${base}#/vacante?id=${encodeURIComponent(j.id)}&src=${ch}`;
    const txt = `Buscamos ${j.title} en ${j.city}, ${j.province}. Postulate acá:`;
    const share = { whatsapp: u => `https://wa.me/?text=${encodeURIComponent(txt + ' ' + u)}`, linkedin: u => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(u)}`, facebook: u => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}` };
    const body = `<h2 class="text-[1.6rem] font-extrabold pr-10 leading-tight">Compartir por canal</h2>
      <p class="text-ink-soft mt-1">${esc(j.title)}${j.client ? ` · ${esc(j.client)}` : ''}</p>
      <p class="mt-3 text-ink-soft">Usá el link de cada canal: así en <b class="text-ink">Reportes</b> ves de dónde vino cada postulante.</p>
      <ul class="mt-4 space-y-2">${CHANNELS.filter(c => !['emplea', 'referido', 'banco', 'importado'].includes(c[0])).map(([id, l, ic]) => `<li class="flex items-center gap-3 rounded-[16px] border border-line p-3">
          <span class="w-10 h-10 rounded-xl bg-surface grid place-items-center shrink-0"><i class="ph ${ic} text-xl"></i></span>
          <span class="min-w-0 flex-1"><span class="block font-semibold">${l}</span><span class="block text-[0.82rem] text-ink-mute truncate">…&src=${id}</span></span>
          ${share[id] ? `<a href="${esc(share[id](link(id)))}" target="_blank" rel="noopener" class="btn btn-soft btn-sm px-3" aria-label="Publicar en ${l}"><i class="ph-bold ph-share-fat"></i><span class="hidden sm:inline">Publicar</span></a>` : ''}
          <button type="button" data-copy-ch="${id}" class="btn btn-outline btn-sm px-3" aria-label="Copiar link para ${l}"><i class="ph-bold ph-copy"></i><span class="hidden sm:inline">Copiar</span></button></li>`).join('')}</ul>`;
    openSheet(sheetScroll(body), c => {
      $$('[data-copy-ch]', c).forEach(b => b.onclick = async () => {
        const u = link(b.dataset.copyCh);
        try { await navigator.clipboard.writeText(u); } catch (e) { const ta = document.createElement('textarea'); ta.value = u; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e2) { /* nada */ } ta.remove(); }
        b.innerHTML = '<i class="ph-bold ph-check"></i><span class="hidden sm:inline">Copiado</span>'; toast(`Link para ${chOf(b.dataset.copyCh)[1]} copiado`, 'ph-copy');
      });
    });
  }


  /* ================= DATOS PERSONALES (Ley 25.326) =================
     El consentimiento queda registrado en cada postulación y CV enviado (fecha y texto aceptado).
     El candidato puede borrar sus datos (con cuenta) o pedirlo con un formulario; la consultora borra
     a una persona de su base. La ley da 5 días hábiles para la supresión (art. 16). */
  const CONSENT_APPLY = co => `Acepto que ${co} use mis datos y mi CV para este proceso de selección y que +Humanos los guarde, según la Política de privacidad. Puedo pedir que los borren cuando quiera.`;
  const CONSENT_SPONT = 'Acepto que las empresas y consultoras de +Humanos vean mi CV y me contacten. Puedo pedir que lo borren cuando quiera.';
  const fmtDT = iso => new Date(iso).toLocaleString('es-AR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }) + ' h';
  function addBizDays(iso, n) { const d = new Date(iso); while (n > 0) { d.setDate(d.getDate() + 1); if (d.getDay() % 6) n--; } return d; }
  const bizDaysLeft = iso => { let n = 0; const d = new Date(); d.setHours(0, 0, 0, 0); const end = new Date(iso); end.setHours(0, 0, 0, 0); while (d < end) { d.setDate(d.getDate() + 1); if (d.getDay() % 6) n++; } return n; };
  // Coincidencias de un pedido en toda la plataforma
  function matchesOf(m) {
    const d10 = x => digits(x).slice(-10), em = x => String(x || '').trim().toLowerCase();
    const hit = o => (m.phone && d10(o.phone) && d10(o.phone) === d10(m.phone)) || (m.email && em(o.email) && em(o.email) === em(m.email));
    const ap = Store.apps().filter(hit), sp = Store.spontCvs().filter(hit);
    return { apps: ap, sp, companies: [...new Set(ap.map(a => (Store.job(a.jobId) || {}).company).filter(Boolean))] };
  }
  function openDeleteRequest() {
    const c0 = Store.candidate() || Store.contact() || {};
    const body = `<h2 class="text-[1.6rem] font-extrabold pr-10 leading-tight">Pedir que borren mis datos</h2>
      <p class="mt-2 text-ink-soft">Borramos tu CV, tus postulaciones y tus datos de contacto de +Humanos y de las consultoras a las que te postulaste. Lo resolvemos dentro de los <b class="text-ink">5 días hábiles</b> que fija la Ley 25.326.</p>
      <div class="mt-5 space-y-3">
        <input id="dr-name" class="input" placeholder="Nombre y apellido" autocomplete="name" value="${esc(c0.name || '')}" aria-label="Nombre y apellido">
        <input id="dr-phone" type="tel" inputmode="tel" class="input" placeholder="Celular con el que te postulaste" autocomplete="tel" value="${esc(c0.phone || '')}" aria-label="Celular">
        <input id="dr-email" type="email" class="input" placeholder="Email (opcional)" autocomplete="email" value="${esc(c0.email || '')}" aria-label="Email">
        <textarea id="dr-msg" rows="3" class="input h-auto py-3" placeholder="Comentario (opcional)" aria-label="Comentario"></textarea>
      </div>
      <p id="dr-err" class="err hidden"></p>
      <p class="mt-3 text-[0.9rem] text-ink-mute">Para confirmar que sos vos, te podemos escribir al celular o email que dejes.</p>`;
    openSheet(sheetScroll(body) + sheetFoot('<button id="dr-send" class="btn btn-primary w-full h-14"><i class="ph-bold ph-trash"></i>Enviar pedido</button>'), c => {
      $('#dr-send', c).onclick = () => {
        const name = $('#dr-name', c).value.trim(), phone = $('#dr-phone', c).value.trim(), email = $('#dr-email', c).value.trim(), er = $('#dr-err', c);
        const err = m => { er.textContent = m; er.classList.remove('hidden'); };
        if (name.length < 3) return err('Escribí tu nombre y apellido.');
        if (digits(phone).length < 8 && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return err('Dejanos el celular o el email con el que te postulaste.');
        const at = new Date().toISOString();
        Store.addDelReq({ id: 'dr' + Date.now().toString(36), name, phone, email, msg: $('#dr-msg', c).value.trim(), at, due: addBizDays(at, 5).toISOString(), status: 'pendiente', origin: 'formulario' });
        setSheet(sheetScroll(`<div class="text-center py-8"><div class="success-pop w-16 h-16 mx-auto rounded-full bg-ok text-white grid place-items-center"><i class="ph-bold ph-check text-3xl"></i></div>
          <h2 class="mt-4 text-[1.5rem] font-extrabold">Recibimos tu pedido</h2><p class="mt-2 text-ink-soft max-w-sm mx-auto">Lo resolvemos antes del ${fmtDate(addBizDays(at, 5).toISOString())} y te avisamos cuando tus datos estén borrados.</p></div>`)
          + sheetFoot('<button data-close-sheet class="btn btn-primary w-full h-14">Listo</button>'));
      };
    });
  }
  // El candidato con cuenta borra todo lo suyo al instante
  async function eraseMyData() {
    const cand = Store.candidate() || {}, ct = Store.contact() || {};
    const ok = await askConfirm({ title: '¿Borrar todos tus datos?', text: 'Se borran tu CV, tus postulaciones, tus alertas y tus datos de contacto, también para las consultoras a las que te postulaste. No se puede deshacer.', ok: 'Borrar todo', danger: true, icon: 'ph-trash' });
    if (!ok) return;
    const m = { phone: cand.phone || ct.phone, email: ct.email };
    const r = await Store.erasePerson(m, null);
    Store.alerts().forEach(a => Store.removeAlert(a.id));
    ['emplea.profile', 'emplea.contact', 'emplea.cvmeta', 'emplea.saved'].forEach(k => { try { localStorage.removeItem(k); } catch (e) { /* nada */ } });
    await Store.delCv('last');
    const at = new Date().toISOString();
    Store.addDelReq({ id: 'dr' + Date.now().toString(36), name: cand.name || ct.name || 'Candidato/a', phone: m.phone || '', email: m.email || '', at, due: at, status: 'completado', doneAt: at, origin: 'cuenta', result: `${r.apps} postulaciones y ${r.cvs} CVs` });
    Store.logoutCandidate();
    toast('Borramos tus datos', 'ph-trash'); location.hash = '#/'; render();
  }


  /* ================= CHARLA DE CAFÉ (blog) =================
     Notas y entrevistas con consultoras. Listado con nota destacada + grilla y filtro por categoría;
     cada nota tiene su página (pregunta y respuesta). Se cargan desde el panel de admin. */
  const catOf = id => POST_CATS.find(c => c[0] === id) || POST_CATS[0];
  const fmtLong = iso => new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
  const readMins = p => Math.max(2, Math.round(([p.intro, ...(p.qa || []).flat()].join(' ').split(/\s+/).length) / 180));
  const livePosts = () => Store.posts().filter(p => p.published).sort((a, b) => new Date(b.date) - new Date(a.date));
  const postImg = (p, cls) => `<div class="${cls} overflow-hidden bg-brand-soft">${p.img ? `<img src="${esc(imgSrc(p.img, 1200))}" alt="" class="w-full h-full object-cover transition duration-500 group-hover:scale-[1.03]" loading="lazy" onerror="this.remove()">` : `<div class="w-full h-full grid place-items-center text-brand/40"><i class="ph-fill ph-coffee text-6xl"></i></div>`}</div>`;
  const catPill = (id, light) => { const c = catOf(id); return `<span class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.82rem] font-bold ${light ? 'bg-white/90 text-ink' : 'bg-brand-soft text-brand'}"><i class="ph-fill ${c[2]}"></i>${esc(c[1])}</span>`; };
  const byline = p => `<span class="flex items-center gap-2.5 min-w-0">${p.consultora ? logo(p.consultora, 'w-9 h-9 text-[0.7rem]') : `<span class="w-9 h-9 rounded-xl bg-white border border-line grid place-items-center shrink-0">${MARK('w-6 h-6')}</span>`}<span class="min-w-0 leading-tight"><span class="block font-semibold text-ink truncate">${esc(p.consultora || '')}</span><span class="block text-[0.85rem] text-ink-mute truncate">${fmtDate(p.date)} · ${readMins(p)} min de lectura</span></span></span>`;
  const postCard = p => `<li><a href="#/cafe/nota?id=${encodeURIComponent(p.id)}" class="group h-full flex flex-col rounded-[22px] bg-white border border-line overflow-hidden hover:shadow-lift hover:border-brand/30 transition">
      ${postImg(p, 'aspect-[16/10]')}
      <div class="p-5 flex flex-col flex-1">
        <div>${catPill(p.cat)}</div>
        <h3 class="mt-3 font-display text-[1.25rem] font-extrabold leading-snug group-hover:text-brand">${esc(p.title)}</h3>
        <p class="mt-2 text-ink-soft leading-relaxed line-clamp-3">${esc(p.excerpt)}</p>
        <div class="mt-auto pt-5">${byline(p)}</div>
      </div></a></li>`;
  const cafeHeader = crumb => `<section class="bg-brand-soft">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-12 md:py-16 text-center">
        <span class="mx-auto w-14 h-14 rounded-2xl bg-white text-brand grid place-items-center"><i class="ph-fill ph-coffee text-3xl"></i></span>
        <h1 class="mt-4 text-[2.2rem] sm:text-[2.8rem] leading-tight font-extrabold">Charla de café</h1>
        <p class="mt-2 text-ink-soft text-[1.08rem] max-w-2xl mx-auto">Notas y entrevistas con consultoras de RRHH: mitos y verdades, tendencias y las preguntas que más nos hacen.</p>
        <nav class="mt-3 text-ink-soft font-semibold" aria-label="Migas de pan"><a href="#/" class="hover:text-brand">Inicio</a><span class="mx-2 text-ink-mute">/</span>${crumb || '<span class="text-ink" aria-current="page">Charla de café</span>'}</nav>
      </div>
    </section>`;

  function CafePage() {
    const F = S.cafe || (S.cafe = { cat: '' });
    const all = livePosts(), list = all.filter(p => !F.cat || p.cat === F.cat);
    const [feat, ...rest] = list;
    const html = `${cafeHeader()}
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-10 md:py-14">
        <div class="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap" role="tablist" aria-label="Categorías">
          ${[['', 'Todas', 'ph-squares-four'], ...POST_CATS].map(([id, l, ic]) => { const n = id ? all.filter(p => p.cat === id).length : all.length; return `<button type="button" role="tab" data-cafe-cat="${id}" aria-selected="${F.cat === id}" class="chip shrink-0 ${F.cat === id ? 'chip-on' : ''}"><i class="ph ${ic} text-lg"></i>${l} <span class="${F.cat === id ? 'opacity-70' : 'text-ink-mute'}">${n}</span></button>`; }).join('')}
        </div>
        ${feat ? `<a href="#/cafe/nota?id=${encodeURIComponent(feat.id)}" class="group mt-8 grid lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] rounded-[26px] bg-white border border-line overflow-hidden hover:shadow-lift hover:border-brand/30 transition">
            ${postImg(feat, 'aspect-[16/10] lg:aspect-auto lg:min-h-[400px]')}
            <div class="p-6 sm:p-9 flex flex-col">
              <div class="flex flex-wrap items-center gap-2">${catPill(feat.cat)}<span class="rounded-full bg-sun-soft text-ink px-3 py-1 text-[0.82rem] font-bold">Última nota</span></div>
              <h2 class="mt-4 text-[1.8rem] sm:text-[2.2rem] leading-[1.1] font-extrabold group-hover:text-brand">${esc(feat.title)}</h2>
              <p class="mt-3 text-ink-soft text-[1.08rem] leading-relaxed">${esc(feat.excerpt)}</p>
              <div class="mt-auto pt-6 flex flex-wrap items-center justify-between gap-4">${byline(feat)}<span class="font-semibold text-brand inline-flex items-center gap-1.5">Leer la nota<i class="ph-bold ph-arrow-right"></i></span></div>
            </div></a>
          ${rest.length ? `<ul class="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">${rest.map(postCard).join('')}</ul>` : ''}`
          : `<div class="mt-8">${emptyState('ph-coffee', 'Todavía no hay notas en esta categoría', 'Pronto vamos a publicar nuevas charlas con consultoras.')}</div>`}
      </div>
      ${siteFooter()}`;
    return { html, mount() { $$('[data-cafe-cat]').forEach(b => b.onclick = () => { F.cat = b.dataset.cafeCat; refresh(); }); } };
  }

  function CafePost(params) {
    const p = Store.posts().find(x => x.id === params.get('id') && x.published);
    if (!p) return { html: `${cafeHeader()}<div class="max-w-3xl mx-auto px-4 sm:px-6 py-12 grid">${emptyState('ph-coffee', 'No encontramos esta nota', 'Puede que se haya despublicado.', '<a href="#/cafe" class="btn btn-primary">Ver todas las notas</a>')}</div>${siteFooter()}` };
    const url = location.href.split('#')[0] + `#/cafe/nota?id=${encodeURIComponent(p.id)}`;
    const share = [['WhatsApp', 'ph-whatsapp-logo', `https://wa.me/?text=${encodeURIComponent(p.title + ' ' + url)}`], ['LinkedIn', 'ph-linkedin-logo', `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`], ['Facebook', 'ph-facebook-logo', `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`]];
    const others = livePosts().filter(x => x.id !== p.id);
    const related = [...others.filter(x => x.cat === p.cat), ...others.filter(x => x.cat !== p.cat)].slice(0, 3);
    const qa = p.qa || [];
    const mid = Math.ceil(qa.length / 2);
    const qaHtml = (list) => list.map(([q, a]) => `<h2>${esc(q)}</h2>${String(a).split(/\n+/).filter(Boolean).map(x => `<p>${esc(x)}</p>`).join('')}`).join('');
    const html = `<article>
      <div class="max-w-3xl mx-auto px-4 sm:px-6 pt-8 md:pt-12">
        <a href="#/cafe" class="inline-flex items-center gap-1.5 font-semibold text-ink-soft hover:text-brand"><i class="ph-bold ph-arrow-left"></i>Charla de café</a>
        <div class="mt-6">${catPill(p.cat)}</div>
        <h1 class="mt-4 text-[2rem] sm:text-[2.8rem] leading-[1.08] font-extrabold tracking-tight">${esc(p.title)}</h1>
        <p class="mt-4 text-[1.15rem] text-ink-soft leading-relaxed">${esc(p.excerpt)}</p>
        <div class="mt-6 flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-line">
          <span class="flex items-center gap-3">${p.consultora ? logo(p.consultora, 'w-12 h-12 text-sm') : `<span class="w-12 h-12 rounded-xl bg-white border border-line grid place-items-center shrink-0">${MARK('w-8 h-8')}</span>`}<span class="leading-tight"><span class="block font-bold">${esc(p.person || p.consultora)}</span><span class="block text-ink-mute text-[0.92rem]">${esc([p.role, p.consultora].filter(Boolean).join(' · '))}</span><span class="block text-ink-mute text-[0.85rem] mt-0.5">${fmtLong(p.date)} · ${readMins(p)} min de lectura</span></span></span>
          <span class="flex gap-2">${share.map(([l, ic, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener" aria-label="Compartir en ${l}" title="Compartir en ${l}" class="w-10 h-10 rounded-full bg-surface grid place-items-center hover:bg-brand hover:text-white"><i class="ph-fill ${ic} text-lg"></i></a>`).join('')}<button type="button" id="cafe-copy" aria-label="Copiar link" title="Copiar link" class="w-10 h-10 rounded-full bg-surface grid place-items-center hover:bg-brand hover:text-white"><i class="ph-bold ph-link text-lg"></i></button></span>
        </div>
      </div>
      ${p.img ? `<div class="max-w-5xl mx-auto px-4 sm:px-6 mt-8">${postImg(p, 'rounded-[24px] aspect-[16/9]')}</div>` : ''}
      <div class="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div class="info-prose cafe-prose">
          ${p.intro ? `<p class="!text-[1.15rem] !text-ink">${esc(p.intro)}</p>` : ''}
          ${qaHtml(qa.slice(0, mid))}
          ${p.quote ? `<blockquote class="not-prose my-10 rounded-[22px] bg-brand-soft p-6 sm:p-8"><i class="ph-fill ph-quotes text-3xl text-brand"></i><p class="mt-2 font-display text-[1.4rem] sm:text-[1.6rem] font-extrabold leading-snug">${esc(p.quote)}</p><p class="mt-3 text-ink-soft font-semibold">${esc(p.person || p.consultora)}${p.consultora && p.person ? `, ${esc(p.consultora)}` : ''}</p></blockquote>` : ''}
          ${qaHtml(qa.slice(mid))}
        </div>
        <div class="mt-10 rounded-[22px] bg-white border border-line p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <span class="w-12 h-12 rounded-xl bg-sun-soft text-warn grid place-items-center shrink-0"><i class="ph-fill ph-coffee text-2xl"></i></span>
          <div class="min-w-0 flex-1"><p class="font-bold">¿Tenés una consultora y querés sumarte a una charla?</p><p class="text-ink-soft text-[0.95rem]">Escribinos y la próxima nota puede ser con vos.</p></div>
          <button type="button" data-hub-join class="btn btn-outline h-11 px-5 shrink-0">Sumate al Hub</button>
        </div>
      </div>
    </article>
    ${related.length ? `<section class="bg-white border-t border-line" aria-labelledby="cafe-rel"><div class="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <h2 id="cafe-rel" class="text-[1.6rem] font-extrabold">Seguí leyendo</h2>
        <div class="mt-6 md:hidden">${swiperOf(related.map(x => `<ul class="h-full">${postCard(x)}</ul>`))}</div>
        <ul class="mt-6 hidden md:grid gap-6 md:grid-cols-3">${related.map(postCard).join('')}</ul>
      </div></section>` : ''}
    ${siteFooter()}`;
    return { title: p.title, html, mount() {
      initSwipers();
      $('#cafe-copy').onclick = async () => { try { await navigator.clipboard.writeText(url); } catch (e) { /* sin portapapeles */ } toast('Link copiado', 'ph-link'); };
    } };
  }

  // Admin: notas de Charla de café
  function AdminPosts() {
    const all = Store.posts().sort((a, b) => new Date(b.date) - new Date(a.date));
    return {
      title: 'Admin',
      html: `<div class="max-w-5xl mx-auto px-4 sm:px-6 py-6 md:py-8">
        ${adminSwitch()}
        <div class="flex flex-wrap items-end justify-between gap-3">
          <div><h1 class="text-[1.75rem] md:text-[2rem] font-extrabold tracking-tight leading-tight">Charla de café</h1>
            <p class="text-ink-soft mt-1">Notas y entrevistas con consultoras. Las publicadas se ven en <a href="#/cafe" class="text-brand font-semibold hover:underline">/cafe</a>.</p></div>
          <button type="button" id="ap-new" class="btn btn-primary h-12 px-5"><i class="ph-bold ph-plus"></i>Nueva nota</button>
        </div>
        <ul class="mt-6 space-y-3">${all.map(p => `<li class="card p-3 sm:p-4 flex flex-wrap sm:flex-nowrap items-center gap-x-4 gap-y-3">
            ${postImg(p, 'w-20 h-16 sm:w-28 sm:h-20 rounded-xl shrink-0')}
            <div class="min-w-0 flex-1 basis-[10rem]"><div class="flex flex-wrap items-center gap-2">${catPill(p.cat)}<span class="rounded-full px-2.5 py-0.5 text-[0.8rem] font-bold ${p.published ? 'bg-ok/10 text-ok' : 'bg-surface text-ink-mute border border-line'}">${p.published ? 'Publicada' : 'Borrador'}</span></div>
              <p class="mt-1.5 font-bold leading-snug line-clamp-2">${esc(p.title)}</p><p class="text-ink-mute text-[0.88rem] truncate">${esc(p.consultora || '')} · ${fmtDate(p.date)}</p></div>
            <div class="flex gap-2 shrink-0 max-sm:w-full max-sm:justify-end">
              ${p.published ? `<a href="#/cafe/nota?id=${encodeURIComponent(p.id)}" class="icon-btn w-10 h-10 border border-line hover:bg-surface" title="Ver" aria-label="Ver nota"><i class="ph-bold ph-eye text-lg"></i></a>` : ''}
              <button type="button" data-post-edit="${esc(p.id)}" class="icon-btn w-10 h-10 border border-line hover:bg-surface" title="Editar" aria-label="Editar nota"><i class="ph-bold ph-pencil-simple text-lg"></i></button>
              <button type="button" data-post-del="${esc(p.id)}" class="icon-btn w-10 h-10 border border-line hover:bg-surface text-[#C62828]" title="Eliminar" aria-label="Eliminar nota"><i class="ph-bold ph-trash text-lg"></i></button>
            </div></li>`).join('') || `<li>${emptyState('ph-coffee', 'Todavía no hay notas', 'Creá la primera con “Nueva nota”.')}</li>`}</ul>
      </div>`,
      mount() {
        bindAdminSwitch();
        $('#ap-new').onclick = () => openPostEditor(null);
        $$('[data-post-edit]').forEach(b => b.onclick = () => openPostEditor(Store.posts().find(x => x.id === b.dataset.postEdit)));
        $$('[data-post-del]').forEach(b => b.onclick = async () => {
          const p = Store.posts().find(x => x.id === b.dataset.postDel); if (!p) return;
          if (await askConfirm({ title: '¿Eliminar esta nota?', text: p.title, ok: 'Eliminar', danger: true, icon: 'ph-trash' })) { Store.removePost(p.id); toast('Nota eliminada', 'ph-trash'); render(); }
        });
      }
    };
  }
  function shrinkImage(file, max = 1400) {
    return new Promise(res => {
      const url = URL.createObjectURL(file), im = new Image();
      im.onload = () => { const k = Math.min(1, max / Math.max(im.width, im.height)); const cv = document.createElement('canvas'); cv.width = Math.round(im.width * k); cv.height = Math.round(im.height * k); cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height); URL.revokeObjectURL(url); res(cv.toDataURL('image/jpeg', 0.8)); };
      im.onerror = () => { URL.revokeObjectURL(url); res(null); };
      im.src = url;
    });
  }
  function openPostEditor(p0) {
    const p = p0 ? JSON.parse(JSON.stringify(p0)) : { id: 'n' + Date.now().toString(36), cat: 'entrevistas', title: '', excerpt: '', consultora: '', person: '', role: '', img: 'lib:p1', intro: '', quote: '', qa: [['', '']], published: false, date: new Date().toISOString() };
    if (!p.qa || !p.qa.length) p.qa = [['', '']];
    const consultoras = [...new Set(Store.jobs().filter(j => (j.companyType || companyOf(j.company).type) === 'Consultora').map(j => j.company))];
    const lib = Object.keys(LOCAL_IMG);
    const read = c => {
      ['title', 'excerpt', 'consultora', 'person', 'role', 'intro', 'quote'].forEach(k => { const el = $('#pe-' + k, c); if (el) p[k] = el.value.trim(); });
      p.cat = $('#pe-cat', c).value; p.published = $('#pe-pub', c).checked;
      p.qa = $$('[data-qa]', c).map(r => [$('[data-q]', r).value.trim(), $('[data-a]', r).value.trim()]);
    };
    const draw = () => {
      const f = (id, l, v, ph = '', area = 0) => `<div><label class="label" for="pe-${id}">${l}</label>${area ? `<textarea id="pe-${id}" rows="${area}" class="input h-auto py-3" placeholder="${esc(ph)}">${esc(v || '')}</textarea>` : `<input id="pe-${id}" class="input" placeholder="${esc(ph)}" value="${esc(v || '')}">`}</div>`;
      return sheetScroll(`<h2 class="text-[1.6rem] font-extrabold pr-10">${p0 ? 'Editar nota' : 'Nueva nota'}</h2>
        <div class="mt-5 space-y-4">
          ${f('title', 'Título', p.title, 'Ej: Mitos y verdades del CV')}
          <div><label class="label" for="pe-cat">Categoría</label><select id="pe-cat" class="input">${POST_CATS.map(([id, l]) => `<option value="${id}" ${p.cat === id ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div>
          ${f('excerpt', 'Bajada (se ve en el listado)', p.excerpt, 'Una o dos líneas que inviten a leer', 2)}
          <div class="grid sm:grid-cols-3 gap-3">
            <div><label class="label" for="pe-consultora">Consultora</label><input id="pe-consultora" class="input" list="pe-cons-list" value="${esc(p.consultora || '')}"><datalist id="pe-cons-list">${consultoras.map(x => `<option value="${esc(x)}">`).join('')}</datalist></div>
            ${f('person', 'Entrevistado/a', p.person)}${f('role', 'Cargo', p.role)}
          </div>
          <div><p class="label">Foto</p>
            <div class="flex flex-wrap gap-2">${lib.map(k => `<button type="button" data-pe-img="lib:${k}" class="w-20 h-14 rounded-xl overflow-hidden ring-2 ${p.img === 'lib:' + k ? 'ring-brand' : 'ring-transparent'}" aria-label="Usar esta foto"><img src="${esc(LOCAL_IMG[k])}" alt="" class="w-full h-full object-cover"></button>`).join('')}
              ${p.img && !p.img.startsWith('lib:') ? `<span class="w-20 h-14 rounded-xl overflow-hidden ring-2 ring-brand"><img src="${esc(imgSrc(p.img))}" alt="" class="w-full h-full object-cover"></span>` : ''}
              <label class="w-20 h-14 rounded-xl border-2 border-dashed border-line grid place-items-center text-ink-mute cursor-pointer hover:border-brand hover:text-brand" title="Subir foto"><i class="ph-bold ph-upload-simple text-xl"></i><input type="file" id="pe-file" accept="image/*" class="sr-only"></label>
            </div></div>
          ${f('intro', 'Introducción', p.intro, 'Quién es la consultora y de qué se trata la charla', 3)}
          <div><p class="label">Preguntas y respuestas</p>
            <div class="space-y-3">${p.qa.map(([q, a], i) => `<div data-qa class="rounded-[18px] border border-line p-3 space-y-2">
                <div class="flex gap-2"><input data-q class="input" placeholder="Pregunta ${i + 1}" value="${esc(q)}">${p.qa.length > 1 ? `<button type="button" data-qa-del="${i}" class="icon-btn w-12 h-12 border border-line shrink-0" aria-label="Quitar pregunta"><i class="ph-bold ph-x"></i></button>` : ''}</div>
                <textarea data-a rows="3" class="input h-auto py-3" placeholder="Respuesta">${esc(a)}</textarea></div>`).join('')}</div>
            <button type="button" id="pe-qa-add" class="mt-2 btn btn-soft btn-sm"><i class="ph-bold ph-plus"></i>Agregar pregunta</button></div>
          ${f('quote', 'Frase destacada (opcional)', p.quote, 'Se muestra grande en el medio de la nota')}
          <label class="flex items-center gap-3 cursor-pointer"><input type="checkbox" id="pe-pub" class="w-5 h-5 accent-[#3B5BFD]" ${p.published ? 'checked' : ''}><span class="font-semibold">Publicada</span><span class="text-ink-mute text-[0.92rem]">(si no, queda como borrador)</span></label>
          <p id="pe-err" class="err hidden"></p>
        </div>`) + sheetFoot('<button id="pe-save" class="btn btn-primary w-full h-14">Guardar nota</button>');
    };
    const mount = c => {
      $$('[data-pe-img]', c).forEach(b => b.onclick = () => { read(c); p.img = b.dataset.peImg; setSheet(draw(), mount); });
      $('#pe-file', c).onchange = async e => { const fl = e.target.files[0]; if (!fl) return; read(c); const d = await shrinkImage(fl); if (d) { p.img = d; setSheet(draw(), mount); } else toast('No pudimos leer esa imagen', 'ph-warning'); };
      $('#pe-qa-add', c).onclick = () => { read(c); p.qa.push(['', '']); setSheet(draw(), mount); setTimeout(() => { const qs = $$('[data-q]', c); if (qs.length) qs[qs.length - 1].focus(); }, 50); };
      $$('[data-qa-del]', c).forEach(b => b.onclick = () => { read(c); p.qa.splice(+b.dataset.qaDel, 1); setSheet(draw(), mount); });
      $('#pe-save', c).onclick = () => {
        read(c);
        const err = m => { const e = $('#pe-err', c); e.textContent = m; e.classList.remove('hidden'); };
        if (p.title.length < 5) return err('Escribí un título.');
        if (!p.excerpt) return err('Escribí la bajada.');
        p.qa = p.qa.filter(([q, a]) => q || a);
        if (!p.qa.length) return err('Agregá al menos una pregunta con su respuesta.');
        if (!p0 || (p.published && !p0.published)) p.date = new Date().toISOString();
        try { Store.savePost(p); } catch (e) { return err('No hay espacio para guardar: probá con una foto más chica.'); }
        closeSheet(true); toast(p.published ? 'Nota publicada' : 'Borrador guardado', 'ph-coffee'); render();
      };
    };
    openSheet(draw(), mount);
  }


  /* ================= IMPORTAR CANDIDATOS =================
     CVs en PDF o Word (varios a la vez) o una planilla Excel/CSV. Todo se lee en el navegador:
     PDF con pdf.js; .docx y .xlsx son archivos ZIP con XML adentro (se descomprimen con DecompressionStream). */
  async function readZip(buf) {
    const u8 = new Uint8Array(buf), dv = new DataView(buf);
    let eocd = -1; for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw new Error('zip');
    const n = dv.getUint16(eocd + 10, true); let p = dv.getUint32(eocd + 16, true);
    const files = {};
    for (let k = 0; k < n; k++) {
      const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nlen = dv.getUint16(p + 28, true), xlen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
      const name = new TextDecoder().decode(u8.subarray(p + 46, p + 46 + nlen));
      files[name] = async () => {
        const ln = dv.getUint16(off + 26, true), lx = dv.getUint16(off + 28, true), start = off + 30 + ln + lx, data = u8.subarray(start, start + csize);
        const out = method === 0 ? data : new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
        return new TextDecoder().decode(out);
      };
      p += 46 + nlen + xlen + clen;
    }
    return files;
  }
  const xmlText = x => x.replace(/<[^>]+>/g, '').replace(/&#(\d+);/g, (m, n) => String.fromCharCode(+n)).replace(/&#x([0-9a-f]+);/gi, (m, n) => String.fromCharCode(parseInt(n, 16))).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
  async function docxText(file) {
    try { const z = await readZip(await file.arrayBuffer()); if (!z['word/document.xml']) return ''; const x = await z['word/document.xml']();
      return xmlText(x.replace(/<w:tab\/>/g, ' ').replace(/<\/w:p>/g, '\n')).split('\n').map(l => l.trim()).filter(Boolean).join('\n').slice(0, 12000); } catch (e) { return ''; }
  }
  // Datos de contacto a partir del texto del CV (mismo criterio que al postularse)
  function cvContact(text, fileName = '') {
    const lines = String(text || '').split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
    const email = (text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/) || [])[0] || '';
    const phones = text.match(/(\+?\s?54[\s-]?)?(9[\s-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/g) || [];
    const phone = phones.map(x => x.trim()).find(x => digits(x).length >= 8 && digits(x).length <= 13) || '';
    let name = lines.find(l => /^[A-Za-zÁÉÍÓÚÑáéíóúñü' .-]{5,40}$/.test(l) && l.split(' ').length >= 2 && l.split(' ').length <= 4 && !/curr[ií]culum|vitae|\bcv\b|perfil|datos/i.test(l)) || '';
    if (!name) name = fileName.replace(/\.(pdf|docx?)$/i, '').replace(/[_-]+/g, ' ').replace(/\b(cv|curriculum|vitae|20\d\d)\b/gi, '').replace(/\s+/g, ' ').trim();
    if (name && name === name.toUpperCase()) name = name.toLowerCase().replace(/\b\p{L}/gu, m => m.toUpperCase());
    const prov = detectProvince(text.slice(0, 1500)) || '';
    const area = detectArea(text.slice(0, 600)) || '';
    const headline = (lines[1] && lines[1].length < 60 && !/@|\d{6,}/.test(lines[1])) ? lines[1] : '';
    return { name, email, phone, province: prov === 'any' ? '' : prov, area, headline };
  }
  async function readCvFile(file) {
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    let text = '';
    if (ext === 'pdf') text = (await extractFromPdf(file)).text || '';
    else if (ext === 'docx') text = await docxText(file);
    return { file, ext, text, ...cvContact(text, file.name) };
  }
  // Planillas: CSV (coma o punto y coma) y XLSX (primera hoja)
  function parseCsv(txt) {
    const first = txt.split('\n')[0] || '', d = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : ',';
    const rows = []; let row = [], cur = '', q = false;
    for (let i = 0; i < txt.length; i++) {
      const ch = txt[i];
      if (q) { if (ch === '"' && txt[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
      else if (ch === '"') q = true; else if (ch === d) { row.push(cur); cur = ''; } else if (ch === '\n' || ch === '\r') { if (ch === '\r' && txt[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; } else cur += ch;
    }
    if (cur || row.length) { row.push(cur); rows.push(row); }
    return rows.map(r => r.map(c => c.trim())).filter(r => r.some(Boolean));
  }
  async function parseXlsx(file) {
    const z = await readZip(await file.arrayBuffer());
    const ss = z['xl/sharedStrings.xml'] ? [...(await z['xl/sharedStrings.xml']()).matchAll(/<si>([\s\S]*?)<\/si>/g)].map(m => xmlText(m[1])) : [];
    const sheetName = Object.keys(z).filter(k => /^xl\/worksheets\/sheet\d+\.xml$/.test(k)).sort()[0]; if (!sheetName) return [];
    const x = await z[sheetName]();
    const col = ref => { let n = 0; for (const ch of ref.replace(/\d+/g, '')) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };
    return [...x.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)].map(rm => {
      const r = [];
      for (const cm of rm[1].matchAll(/<c r="([A-Z]+\d+)"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const t = (cm[2].match(/t="(\w+)"/) || [])[1], body = cm[3] || '';
        const v = (body.match(/<v>([\s\S]*?)<\/v>/) || [])[1], is = (body.match(/<is>([\s\S]*?)<\/is>/) || [])[1];
        r[col(cm[1])] = (t === 's' ? ss[+v] : t === 'inlineStr' ? xmlText(is || '') : xmlText(v || '')) || '';
      }
      return Array.from(r, c => (c || '').trim());
    }).filter(r => r.some(Boolean));
  }
  const IMP_FIELDS = [['name', 'Nombre y apellido', /^(nombre( y apellido| completo)?|name|candidato|postulante)$/], ['last', 'Apellido', /^apellidos?$/], ['phone', 'Celular', /cel|tel|whats|m[oó]vil|phone/], ['email', 'Email', /mail|correo/],
    ['province', 'Provincia', /provincia/], ['city', 'Ciudad', /ciudad|localidad|ubicaci/], ['headline', 'Puesto o perfil', /puesto|perfil|profesi|cargo|ocupaci|rubro|t[ií]tulo/], ['notes', 'Notas', /nota|observ|coment/]];
  function guessCols(header) {
    const h = header.map(x => norm(x).trim()), map = {};
    IMP_FIELDS.forEach(([k, , re]) => { const i = h.findIndex((x, ix) => re.test(x) && !Object.values(map).includes(ix)); if (i >= 0) map[k] = i; });
    if (map.name == null) { const i = h.findIndex(x => /nombre/.test(x)); if (i >= 0) map.name = i; }
    return map;
  }
  const IMP_TEMPLATE = 'Nombre y apellido;Celular;Email;Provincia;Ciudad;Puesto o perfil;Notas\nLucía Gómez;381 555-0101;lucia.gomez@mail.com;Tucumán;Yerba Buena;Asistente administrativa;Muy buena entrevista en 2025\n';

  function openImport(co) {
    const st = { tab: 'cvs', items: [], rows: null, map: {}, job: '', busy: false, done: null };
    const jobs = myJobs(co).filter(j => j.status === 'activa');
    const prov = p => p && PROVINCES.includes(p) ? p : (detectProvince(p || '') && detectProvince(p) !== 'any' ? detectProvince(p) : '');
    const people = () => st.tab === 'cvs' ? st.items.filter(x => x.ok !== false && x.name && x.name.length >= 3).map(x => ({ name: x.name, phone: x.phone, email: x.email, province: x.province, city: '', headline: x.headline || (x.area ? areaOf(x.area).label : ''), area: x.area, cvText: x.text, file: x.file }))
      : (st.rows || []).slice(1).map(r => {
          const g = k => st.map[k] != null ? (r[st.map[k]] || '').trim() : '';
          const name = [g('name'), g('last')].filter(Boolean).join(' ').replace(/\s+/g, ' ');
          const pr = prov(g('province') || g('city'));
          return { name, phone: g('phone'), email: g('email'), province: pr, city: g('city'), headline: g('headline'), area: detectArea(g('headline')) || '', notes: g('notes'), cvText: '' };
        }).filter(p => p.name.length >= 3 && (p.phone || p.email || p.name));
    const keyOf = p => p.email ? 'e:' + norm(p.email) : 'n:' + norm(p.name);
    const draw = () => {
      if (st.done) return sheetScroll(`<div class="text-center py-8"><div class="success-pop w-16 h-16 mx-auto rounded-full bg-ok text-white grid place-items-center"><i class="ph-bold ph-check text-3xl"></i></div>
          <h2 class="mt-4 text-[1.6rem] font-extrabold leading-tight">Importaste ${st.done.n} ${plural(st.done.n, 'candidato', 'candidatos')}</h2>
          <p class="mt-2 text-ink-soft max-w-sm mx-auto">Quedaron en <b class="text-ink">Mis candidatos</b> con la etiqueta “Importado”${st.done.job ? ` y se sumaron a <b class="text-ink">${esc(st.done.job)}</b> como nuevos` : ''}.${st.done.dup ? ` ${st.done.dup} ya ${plural(st.done.dup, 'estaba', 'estaban')} y no se duplicaron.` : ''}</p></div>`)
        + sheetFoot('<button data-close-sheet class="btn btn-primary w-full h-14">Listo</button>');
      const tabs = `<div class="inline-flex rounded-full bg-surface p-1 mt-4" role="tablist">${[['cvs', 'ph-files', 'CVs<span class="max-sm:hidden"> (PDF o Word)</span>'], ['sheet', 'ph-table', 'Planilla<span class="max-sm:hidden"> (Excel o CSV)</span>']].map(([v, ic, l]) => `<button type="button" role="tab" data-imp-tab="${v}" aria-selected="${st.tab === v}" class="h-10 px-4 rounded-full font-semibold inline-flex items-center gap-1.5 ${st.tab === v ? 'bg-ink text-white' : 'text-ink-soft'}"><i class="ph ${ic}"></i>${l}</button>`).join('')}</div>`;
      let body;
      if (st.tab === 'cvs') {
        body = `<label id="imp-drop" class="mt-4 dropzone flex flex-col items-center justify-center text-center gap-2 rounded-[22px] border-2 border-dashed border-line bg-surface/60 p-6 cursor-pointer hover:border-brand/50">
            <span class="w-14 h-14 rounded-full bg-brand-soft text-brand grid place-items-center"><i class="ph-bold ph-upload-simple text-2xl"></i></span>
            <span class="font-bold">Arrastrá los CVs o tocá para elegirlos</span><span class="text-ink-mute text-[0.92rem]">PDF o Word · podés elegir muchos a la vez</span>
            <input type="file" id="imp-files" multiple accept=".pdf,.doc,.docx" class="sr-only"></label>
          ${st.busy ? `<p class="mt-3 text-brand font-semibold flex items-center gap-2"><i class="ph ph-circle-notch spin"></i>Leyendo ${st.busy}…</p>` : ''}
          ${st.items.length ? `<p class="mt-5 font-semibold">${st.items.length} ${plural(st.items.length, 'CV', 'CVs')} · revisá los nombres</p>
            <ul class="mt-2 space-y-2">${st.items.map((x, i) => `<li class="rounded-[16px] border ${x.name && x.name.length >= 3 ? 'border-line' : 'border-bad/40 bg-bad/5'} p-3">
              <div class="flex items-center gap-2"><i class="ph-fill ${x.ext === 'pdf' ? 'ph-file-pdf text-bad' : 'ph-file-doc text-brand'} text-xl shrink-0"></i><span class="text-[0.85rem] text-ink-mute truncate flex-1">${esc(x.file.name)}</span>
                <button type="button" data-imp-rm="${i}" class="icon-btn w-8 h-8 text-ink-mute" aria-label="Quitar"><i class="ph-bold ph-x"></i></button></div>
              <input data-imp-name="${i}" class="input h-11 mt-2" value="${esc(x.name)}" placeholder="Nombre y apellido" aria-label="Nombre">
              <p class="mt-1.5 text-[0.85rem] text-ink-mute">${[x.phone, x.email, x.province].filter(Boolean).map(esc).join(' · ') || (x.ext === 'doc' ? 'Word antiguo (.doc): no se pudo leer el texto' : 'No encontramos celular ni email en el CV')}</p></li>`).join('')}</ul>` : ''}`;
      } else {
        const hdr = st.rows ? st.rows[0] : [];
        body = `<label class="mt-4 dropzone flex flex-col items-center justify-center text-center gap-2 rounded-[22px] border-2 border-dashed border-line bg-surface/60 p-6 cursor-pointer hover:border-brand/50">
            <span class="w-14 h-14 rounded-full bg-brand-soft text-brand grid place-items-center"><i class="ph-bold ph-table text-2xl"></i></span>
            <span class="font-bold">Elegí tu planilla</span><span class="text-ink-mute text-[0.92rem]">Excel (.xlsx) o CSV · una fila por candidato, con títulos en la primera fila</span>
            <input type="file" id="imp-sheet" accept=".xlsx,.csv,text/csv" class="sr-only"></label>
          <a id="imp-tpl" class="mt-2 inline-flex items-center gap-1.5 text-brand font-semibold text-[0.95rem]" download="plantilla-candidatos-emplea.csv"><i class="ph-bold ph-download-simple"></i>Descargar planilla de ejemplo</a>
          ${st.rows ? `<p class="mt-5 font-semibold">${st.rows.length - 1} ${plural(st.rows.length - 1, 'fila', 'filas')} · ¿qué columna es cada dato?</p>
            <div class="mt-2 grid sm:grid-cols-2 gap-2">${IMP_FIELDS.map(([k, l]) => `<label class="block rounded-xl bg-surface px-3 py-2"><span class="block text-[0.85rem] font-semibold mb-1">${l}</span>
              <select data-imp-col="${k}" class="input h-10 py-0 bg-white text-[0.92rem] w-full"><option value="">—</option>${hdr.map((h, i) => `<option value="${i}" ${st.map[k] === i ? 'selected' : ''}>${esc(h || `Columna ${i + 1}`)}</option>`).join('')}</select></label>`).join('')}</div>
            <p class="mt-4 text-[0.9rem] font-semibold text-ink-mute">Vista previa</p>
            <ul class="mt-1 rounded-[16px] border border-line divide-y divide-line">${people().slice(0, 4).map(p => `<li class="px-3 py-2"><p class="font-semibold">${esc(p.name)}</p><p class="text-[0.85rem] text-ink-mute">${[p.phone, p.email, p.province, p.headline].filter(Boolean).map(esc).join(' · ')}</p></li>`).join('') || '<li class="px-3 py-3 text-ink-mute">Elegí al menos la columna del nombre.</li>'}</ul>` : ''}`;
      }
      const n = people().length;
      return sheetScroll(`<h2 class="text-[1.6rem] font-extrabold pr-10 leading-tight">Importar candidatos</h2>
          <p class="text-ink-soft mt-1">Traé los CVs y las planillas que ya tenés. Quedan en Mis candidatos para tus próximas búsquedas.</p>
          ${tabs}${body}
          ${n ? `<div class="mt-6 rounded-[18px] bg-surface p-4"><label class="label" for="imp-job">Sumarlos también a una búsqueda <span class="font-normal text-ink-mute">(opcional)</span></label>
            <select id="imp-job" class="input bg-white"><option value="">No, solo a Mis candidatos</option>${jobs.map(j => `<option value="${j.id}" ${st.job === j.id ? 'selected' : ''}>${esc(j.title)}${j.client ? ' · ' + esc(j.client) : ''}</option>`).join('')}</select></div>` : ''}
          <p class="mt-4 text-[0.85rem] text-ink-mute flex gap-2"><i class="ph ph-shield-check text-lg shrink-0"></i>Usá solo CVs que las personas te hayan enviado para procesos de selección. Pueden pedir que los borres cuando quieran.</p>`)
        + sheetFoot(`<button id="imp-go" class="btn btn-primary w-full h-14" ${n && !st.busy ? '' : 'disabled'}><i class="ph-bold ph-download-simple text-xl"></i>${n ? `Importar ${n} ${plural(n, 'candidato', 'candidatos')}` : 'Elegí los archivos'}</button>`);
    };
    const mount = c => {
      $$('[data-imp-tab]', c).forEach(b => b.onclick = () => { st.tab = b.dataset.impTab; setSheet(draw(), mount); });
      const tpl = $('#imp-tpl', c); if (tpl) tpl.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent('﻿' + IMP_TEMPLATE);
      const jsel = $('#imp-job', c); if (jsel) jsel.onchange = () => { st.job = jsel.value; };
      $$('[data-imp-name]', c).forEach(inp => inp.oninput = () => { st.items[+inp.dataset.impName].name = inp.value.trim(); const go = $('#imp-go', c); const n = people().length; go.disabled = !n; go.innerHTML = `<i class="ph-bold ph-download-simple text-xl"></i>${n ? `Importar ${n} ${plural(n, 'candidato', 'candidatos')}` : 'Elegí los archivos'}`; });
      $$('[data-imp-rm]', c).forEach(b => b.onclick = () => { st.items.splice(+b.dataset.impRm, 1); setSheet(draw(), mount); });
      $$('[data-imp-col]', c).forEach(sl => sl.onchange = () => { const k = sl.dataset.impCol; if (sl.value === '') delete st.map[k]; else st.map[k] = +sl.value; setSheet(draw(), mount); });
      const addFiles = async list => {
        const fs = [...list].filter(f => /\.(pdf|docx?)$/i.test(f.name) && f.size <= 8 * 1048576);
        if (!fs.length) { toast('Elegí archivos PDF o Word', 'ph-warning'); return; }
        for (const f of fs) { st.busy = f.name; setSheet(draw(), mount); st.items.push(await readCvFile(f)); }
        st.busy = false; setSheet(draw(), mount);
      };
      const fi = $('#imp-files', c); if (fi) fi.onchange = () => addFiles(fi.files);
      const dz = $('#imp-drop', c);
      if (dz) { dz.ondragover = e => { e.preventDefault(); dz.classList.add('drag'); }; dz.ondragleave = () => dz.classList.remove('drag'); dz.ondrop = e => { e.preventDefault(); dz.classList.remove('drag'); addFiles(e.dataTransfer.files); }; }
      const sh = $('#imp-sheet', c);
      if (sh) sh.onchange = async () => {
        const f = sh.files[0]; if (!f) return;
        try {
          const rows = /\.xlsx$/i.test(f.name) ? await parseXlsx(f) : parseCsv((await f.text()).replace(/^﻿/, ''));
          if (rows.length < 2) { toast('La planilla está vacía o no tiene títulos', 'ph-warning'); return; }
          st.rows = rows; st.map = guessCols(rows[0]); setSheet(draw(), mount);
        } catch (e) { toast('No pudimos leer la planilla. Probá guardarla como .xlsx o .csv', 'ph-warning'); }
      };
      const goBtn = $('#imp-go', c); if (!goBtn) return;
      goBtn.onclick = async () => {
        const list = people(); if (!list.length) return;
        const b = $('#imp-go', c); b.disabled = true; b.innerHTML = '<i class="ph ph-circle-notch spin text-xl"></i>Importando…';
        const now = new Date().toISOString(), job = st.job ? Store.job(st.job) : null;
        let n = 0, dup = 0;
        for (const p of list) {
          const key = keyOf(p), meta = Store.bankAll(co.name)[key];
          const inBank = (meta && meta.saved) || bankPeople(co).some(x => x.key === key);
          if (inBank) dup++;
          else {
            let cvKey = '';
            if (p.file) { cvKey = 'imp-' + key; await Store.putCv(cvKey, p.file); }
            Store.setBankMeta(co.name, key, { saved: true, tags: ['Importado'], notes: p.notes ? [{ t: p.notes, at: now }] : [],
              person: { name: p.name, email: p.email, phone: p.phone, cvText: p.cvText || '', headline: p.headline, area: p.area, province: p.province, city: p.city, imported: now, cvKey, cvName: p.file ? p.file.name : '' } });
            n++;
          }
          if (job && !Store.apps().some(a => a.jobId === job.id && personKey(a) === key)) {
            const id = 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
            if (p.file) await Store.putCv(id, p.file);
            Store.addApp({ id, jobId: job.id, name: p.name, email: p.email, phone: p.phone, cvName: p.file ? p.file.name : `CV ${p.name}.pdf`, cvSize: p.file ? p.file.size : 0, cvType: p.file ? (p.file.name.split('.').pop() || '').toLowerCase() : 'pdf', cvText: p.cvText || '', date: now, status: 'Nuevo', mine: false, source: 'importado', consent: { at: now, text: 'CV importado por la consultora (enviado por el candidato fuera de +Humanos).' } });
          }
        }
        st.done = { n, dup, job: job ? job.title : '' };
        S.dirty = true; setSheet(draw(), mount);
      };
    };
    openSheet(draw(), mount);
  }

  /* ================= PANEL DE ADMINISTRACIÓN =================
     Recibe los CVs que llegan por "Enviar CV". El admin los revisa y aprueba los que pasan
     a la Base de datos de las empresas. La clave es solo de demo: en producción el acceso
     va con usuario y contraseña validados en el servidor. */
  /* ================= HUB: RECOMENDACIONES ENTRE SELECTORES =================
     Tablero "Busco perfil": cada pedido va atado a una búsqueda abierta. Otro selector del Hub recomienda a alguien
     de Mis candidatos y el candidato da permiso caso por caso (link por WhatsApp). Recién cuando acepta, sus datos
     y su CV llegan a la búsqueda como postulante (canal "hub"). Antes, quien pidió solo ve que hay uno en espera.
     Con backend: el link lleva un id corto y el pedido de permiso sale por WhatsApp/email desde el servidor. */
  const CONSENT_REF = (from, to) => `Acepto que ${from} le pase mi nombre, mi contacto y mi CV a ${to} para esta búsqueda, y que ${to} los use para su proceso de selección según la Política de privacidad.`;
  const hubId = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const reqOfJob = jobId => Store.hubReqs().find(r => r.jobId === jobId && r.status === 'abierto');
  const refsOf = reqId => Store.referrals().filter(r => r.reqId === reqId);
  const d10 = x => String(x || '').replace(/\D/g, '').slice(-10);
  function refAskText(r) {
    const j = Store.job(r.jobId) || {};
    return `Hola ${r.person.name.split(' ')[0]}, te escribimos de ${r.from}. ${r.to} busca ${j.title || 'un perfil'}${j.city ? ` en ${j.city}` : ''} y pensamos en vos. ¿Nos das permiso para pasarle tu CV y tu contacto? Respondé acá, es un toque: ${baseUrl()}#/recomendacion?id=${r.id}`;
  }
  // Ejemplo para la cuenta: un pedido propio con una recomendación que ya llegó y otra esperando el permiso
  function seedHubFor(co) {
    const k = 'emplea.hubseed.' + co.name;
    try { if (localStorage.getItem(k)) return; } catch (e) { return; }
    const j = myJobs(co).find(x => (x.demoOf === 'j32' || x.id === 'j32') && x.status === 'activa'); if (!j) return;
    const from = co.name === 'Selecta RRHH' ? 'Talento Norte' : 'Selecta RRHH', from2 = 'Grupo Andino';
    const iso = d => new Date(Date.now() - d * 864e5).toISOString();
    const req = { id: hubId('h'), company: co.name, jobId: j.id, note: 'Auxiliar contable con Tango, ideal en Tucumán. Si tenés a alguien que quedó afuera de una búsqueda tuya, nos viene bárbaro.', createdAt: iso(3), status: 'abierto' };
    Store.saveHubReq(req);
    const c = SEED_CANDIDATES.find(x => x.id === 'c25');
    if (c && !Store.apps().some(a => a.jobId === j.id && a.cand === c.id)) {
      const note = 'Quedó segunda en una búsqueda nuestra de analista contable. Muy prolija, maneja Tango y AFIP, y vive en Yerba Buena.';
      const appId = hubId('hb');
      Store.addApp({ id: appId, jobId: j.id, cand: c.id, name: c.name, email: c.email, phone: c.phone, cvName: `CV ${c.name}.pdf`, cvSize: 48000, date: iso(1), status: 'Nuevo', mine: false,
        source: 'hub', referral: { from, note }, consent: { at: iso(1), text: CONSENT_REF(from, co.name) } });
      Store.saveReferral({ id: hubId('r'), reqId: req.id, from, to: co.name, jobId: j.id, person: { name: c.name, phone: c.phone, email: c.email, cand: c.id }, note, status: 'aceptada', createdAt: iso(2), answeredAt: iso(1), appId });
    }
    Store.saveReferral({ id: hubId('r'), reqId: req.id, from: from2, to: co.name, jobId: j.id, person: { name: 'Julián Medina', phone: '381 555-7788', email: 'julian.medina@mail.com' },
      note: 'Hizo una pasantía en administración con nosotros. Responsable y rápido con Excel.', status: 'pendiente', createdAt: iso(0.3) });
    try { localStorage.setItem(k, '1'); } catch (e) { /* sin storage */ }
  }

  function HubPage(params) {
    const co = Store.company();
    seedHubFor(co);
    const tab = S.hubTab = (params && params.get('tab')) || S.hubTab || 'board';
    const reqs = Store.hubReqs(), refs = Store.referrals();
    const board = reqs.filter(r => r.status === 'abierto' && r.company !== co.name && (Store.job(r.jobId) || {}).status === 'activa');
    const mine = reqs.filter(r => r.company === co.name && Store.job(r.jobId));
    const sent = refs.filter(r => r.from === co.name);
    const TABS = [['board', 'ph-megaphone', 'Busco perfil', board.length], ['mine', 'ph-tray', 'Mis pedidos', mine.length], ['sent', 'ph-paper-plane-tilt', '<span class="sm:hidden">Enviadas</span><span class="max-sm:hidden">Mis recomendaciones</span>', sent.length]];
    const pill = (cls, ic, t) => `<span class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[0.85rem] font-bold ${cls}"><i class="ph-bold ${ic}"></i>${t}</span>`;
    const jobLine = j => `${esc(j.city)}, ${esc(j.province)} · ${esc(j.modality)}`;
    const boardCard = r => {
      const j = Store.job(r.jobId), n = refs.filter(x => x.reqId === r.id && x.from === co.name).length;
      return `<li class="rounded-[22px] bg-white border border-line p-5 sm:p-6">
        <div class="flex items-center gap-3">${logo(r.company, 'w-11 h-11 text-[0.8rem]')}<div class="min-w-0"><p class="font-semibold leading-tight truncate">${esc(r.company)}</p><p class="text-[0.9rem] text-ink-mute">Pidió ${ago(r.createdAt).toLowerCase()}</p></div></div>
        <h3 class="mt-4 text-[1.3rem] font-extrabold leading-tight">${esc(j.title)}</h3>
        <p class="text-ink-soft">${jobLine(j)}</p>
        ${r.note ? `<p class="mt-3 rounded-2xl bg-surface px-4 py-3 leading-snug">“${esc(r.note)}”</p>` : ''}
        <div class="mt-4 flex flex-wrap items-center gap-2">
          <button type="button" data-hub-rec="${r.id}" class="btn btn-primary"><i class="ph-bold ph-user-plus text-lg"></i>Recomendar a alguien</button>
          <a href="#/vacante?id=${j.id}" class="btn btn-outline"><i class="ph ph-eye text-lg"></i>Ver aviso</a>
          ${n ? `<span class="text-ok font-semibold text-[0.95rem]"><i class="ph-bold ph-check"></i> Recomendaste a ${n}</span>` : ''}
        </div></li>`;
    };
    const mineCard = r => {
      const j = Store.job(r.jobId), rs = refs.filter(x => x.reqId === r.id);
      const ok = rs.filter(x => x.status === 'aceptada').length, wait = rs.filter(x => x.status === 'pendiente').length, no = rs.filter(x => x.status === 'rechazada').length;
      const open = r.status === 'abierto';
      return `<li class="rounded-[22px] bg-white border border-line p-5 sm:p-6">
        <div class="flex flex-wrap items-center gap-2">${open ? pill('bg-ok/10 text-ok', 'ph-broadcast', 'Abierto en el Hub') : pill('bg-surface text-ink-mute', 'ph-lock-simple', 'Cerrado')}<span class="text-[0.9rem] text-ink-mute">Pedido ${ago(r.createdAt).toLowerCase()}</span></div>
        <h3 class="mt-3 text-[1.3rem] font-extrabold leading-tight">${esc(j.title)}</h3>
        <p class="text-ink-soft">${j.client ? `${esc(j.client)} · ` : ''}${jobLine(j)}</p>
        ${r.note ? `<p class="mt-3 rounded-2xl bg-surface px-4 py-3 leading-snug">“${esc(r.note)}”</p>` : ''}
        <ul class="mt-4 grid grid-cols-3 gap-2 text-center">
          <li class="rounded-2xl bg-mint px-2 py-3"><p class="text-[1.5rem] font-extrabold text-ok leading-none">${ok}</p><p class="mt-1 text-[0.85rem] font-semibold text-ink-soft leading-tight">Llegaron a la búsqueda</p></li>
          <li class="rounded-2xl bg-sun-soft px-2 py-3"><p class="text-[1.5rem] font-extrabold text-warn leading-none">${wait}</p><p class="mt-1 text-[0.85rem] font-semibold text-ink-soft leading-tight">Esperando permiso</p></li>
          <li class="rounded-2xl bg-surface px-2 py-3"><p class="text-[1.5rem] font-extrabold text-ink-mute leading-none">${no}</p><p class="mt-1 text-[0.85rem] font-semibold text-ink-soft leading-tight">No aceptaron</p></li>
        </ul>
        ${wait ? '<p class="mt-2 text-[0.9rem] text-ink-mute">Ves sus datos recién cuando el candidato da permiso.</p>' : ''}
        <div class="mt-4 flex flex-wrap gap-2">
          ${ok ? `<a href="#/empresa/b?id=${j.id}" class="btn btn-primary"><i class="ph-bold ph-users text-lg"></i>Ver recomendados</a>` : ''}
          <button type="button" data-hub-toggle="${r.id}" class="btn btn-outline">${open ? '<i class="ph ph-lock-simple text-lg"></i>Cerrar pedido' : '<i class="ph ph-broadcast text-lg"></i>Volver a abrir'}</button>
        </div></li>`;
    };
    const ST = { pendiente: ['bg-sun-soft text-warn', 'ph-hourglass-medium', 'Esperando su permiso'], aceptada: ['bg-ok/10 text-ok', 'ph-check', 'Aceptó · ya está en la búsqueda'], rechazada: ['bg-surface text-ink-mute', 'ph-x', 'No aceptó'], cancelada: ['bg-surface text-ink-mute', 'ph-x', 'Cancelada'] };
    const sentCard = r => {
      const j = Store.job(r.jobId) || { title: 'Búsqueda cerrada' }, s = ST[r.status] || ST.pendiente;
      return `<li class="rounded-[22px] bg-white border border-line p-4 sm:p-5">
        <div class="flex items-start gap-3">${avatar(r.person.name, 'w-11 h-11 text-[0.85rem]')}
          <div class="min-w-0 flex-1"><p class="font-bold leading-tight">${esc(r.person.name)}</p>
            <p class="text-ink-soft text-[0.95rem] leading-snug">A <b class="text-ink">${esc(r.to)}</b> para ${esc(j.title)} · ${ago(r.createdAt).toLowerCase()}</p>
            <p class="mt-2">${pill(s[0], s[1], s[2])}</p></div></div>
        ${r.status === 'pendiente' ? `<div class="mt-3 flex flex-wrap gap-2">
          ${r.person.phone ? `<a href="${esc(waLink(r.person.phone, refAskText(r)))}" target="_blank" rel="noopener" class="btn btn-outline btn-sm"><i class="ph-fill ph-whatsapp-logo text-[#25D366] text-lg"></i>Volver a pedirle permiso</a>` : ''}
          <button type="button" data-hub-copy="${r.id}" class="btn btn-outline btn-sm"><i class="ph ph-link text-lg"></i>Copiar link</button>
          <button type="button" data-hub-cancel="${r.id}" class="btn btn-outline btn-sm text-bad"><i class="ph ph-x text-lg"></i>Cancelar</button></div>` : ''}
      </li>`;
    };
    const list = tab === 'board' ? (board.length ? `<ul class="grid gap-4 md:grid-cols-2">${board.map(boardCard).join('')}</ul>` : emptyState('ph-megaphone', 'No hay pedidos abiertos', 'Cuando otro selector del Hub busque un perfil, lo vas a ver acá.'))
      : tab === 'mine' ? (mine.length ? `<ul class="grid gap-4 md:grid-cols-2">${mine.map(mineCard).join('')}</ul>` : emptyState('ph-tray', 'Todavía no pediste perfiles', 'Pedí recomendaciones para una búsqueda difícil: otros selectores te pasan candidatos que ya conocen.', '<button type="button" data-hub-ask class="btn btn-primary"><i class="ph-bold ph-megaphone"></i>Pedir recomendaciones</button>'))
      : (sent.length ? `<ul class="grid gap-3 md:grid-cols-2">${sent.map(sentCard).join('')}</ul>` : emptyState('ph-paper-plane-tilt', 'Todavía no recomendaste a nadie', 'Mirá los pedidos en "Busco perfil": si alguien de Mis candidatos encaja, pasáselo a otro selector.'));
    const html = `<section class="bg-brand-soft">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 py-10 md:py-14 text-center">
          <h1 class="text-[2.1rem] sm:text-[2.6rem] leading-tight font-extrabold">Hub</h1>
          <nav class="mt-2 text-ink-soft font-semibold" aria-label="Migas de pan"><a href="#/empresa" class="hover:text-brand">Inicio</a><span class="mx-2 text-ink-mute">/</span><span class="text-ink" aria-current="page">Hub</span></nav>
        </div>
      </section>
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-12">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="max-w-2xl"><h2 class="text-[1.5rem] font-extrabold leading-tight">Recomendaciones entre selectores</h2>
            <p class="mt-1 text-ink-soft">¿Tenés un buen candidato que no te sirvió? Pasáselo a otro selector del Hub que busca ese perfil. ¿Una búsqueda difícil? Pedí que te recomienden. <b class="text-ink">El candidato siempre da permiso antes de que pasemos sus datos.</b></p></div>
          <button type="button" data-hub-ask class="btn btn-primary h-12 px-5"><i class="ph-bold ph-megaphone text-lg"></i>Pedir recomendaciones</button>
        </div>
        <div class="mt-6 -mx-4 px-4 overflow-x-auto"><div class="inline-flex rounded-full bg-white border border-line p-1" role="tablist" aria-label="Hub">
          ${TABS.map(([v, ic, l, n]) => `<button type="button" role="tab" data-htab="${v}" aria-selected="${tab === v}" class="h-10 px-3 sm:px-4 rounded-full font-semibold inline-flex items-center gap-1.5 whitespace-nowrap ${tab === v ? 'bg-ink text-white' : 'text-ink-soft hover:text-ink'}"><i class="ph ${ic} text-lg max-[400px]:hidden"></i>${l}${n ? ` <span class="${tab === v ? 'text-white/70' : 'text-ink-mute'}">${n}</span>` : ''}</button>`).join('')}
        </div></div>
        <div class="mt-6">${list}</div>
      </div>`;
    return {
      html, mount() {
        $('#view').onclick = (async e => {
          const t = e.target.closest('[data-htab]'); if (t) { S.hubTab = t.dataset.htab; if (parseHash().params.get('tab')) location.hash = '#/empresa/hub'; else refresh(); return; }
          if (e.target.closest('[data-hub-ask]')) { openHubAsk(); return; }
          const rc = e.target.closest('[data-hub-rec]'); if (rc) { openHubRecommend(rc.dataset.hubRec); return; }
          const tg = e.target.closest('[data-hub-toggle]'); if (tg) { const r = Store.hubReqs().find(x => x.id === tg.dataset.hubToggle); const open = r.status === 'abierto'; Store.saveHubReq({ id: r.id, status: open ? 'cerrado' : 'abierto' }); toast(open ? 'Cerraste el pedido: ya no aparece en el Hub' : 'El pedido volvió al Hub', 'ph-megaphone'); refresh(); return; }
          const cp = e.target.closest('[data-hub-copy]'); if (cp) { const r = Store.referral(cp.dataset.hubCopy); try { await navigator.clipboard.writeText(`${baseUrl()}#/recomendacion?id=${r.id}`); toast('Link copiado', 'ph-link'); } catch (er) { toast('No pudimos copiar el link', 'ph-warning'); } return; }
          const cn = e.target.closest('[data-hub-cancel]'); if (cn) { if (await askConfirm({ title: '¿Cancelar la recomendación?', text: 'El link que le mandaste deja de funcionar.', ok: 'Cancelar recomendación', cancel: 'Volver', danger: true })) { Store.saveReferral({ id: cn.dataset.hubCancel, status: 'cancelada' }); toast('Recomendación cancelada', 'ph-x'); refresh(); } return; }
        });
      }
    };
  }

  // Pedir recomendaciones para una búsqueda propia
  function openHubAsk(jobId) {
    const co = Store.company();
    const jobs = myJobs(co).filter(j => j.status === 'activa' && !reqOfJob(j.id));
    if (!jobs.length) { toast(myJobs(co).some(j => j.status === 'activa') ? 'Todas tus búsquedas activas ya están pedidas en el Hub' : 'Publicá una búsqueda para pedir recomendaciones', 'ph-info'); return; }
    const pre = jobs.some(j => j.id === jobId) ? jobId : jobs[0].id;
    const body = `<span class="w-14 h-14 rounded-2xl bg-brand-soft text-brand grid place-items-center"><i class="ph-fill ph-megaphone text-3xl"></i></span>
      <h2 class="mt-4 text-[1.6rem] font-extrabold pr-10 leading-tight">Pedir recomendaciones</h2>
      <p class="mt-1 text-ink-soft">Lo ven los selectores del Hub. Si alguien tiene un candidato que encaja, te lo recomienda y, cuando el candidato da permiso, llega a tu búsqueda como postulante.</p>
      <label class="label mt-5" for="ha-job">¿Para qué búsqueda?</label>
      <select id="ha-job" data-dd class="input">${jobs.map(j => `<option value="${j.id}" ${j.id === pre ? 'selected' : ''}>${esc(j.title)}${j.client ? ` · ${esc(j.client)}` : ''}</option>`).join('')}</select>
      <label class="label mt-4" for="ha-note">¿Qué perfil buscás? <span class="font-normal text-ink-mute">(opcional)</span></label>
      <textarea id="ha-note" rows="3" maxlength="280" class="input h-auto py-3" placeholder="Ej.: Con Tango y conciliaciones, ideal en Tucumán. Lo que más nos cuesta encontrar es…"></textarea>
      <p class="mt-3 text-[0.92rem] text-ink-mute"><i class="ph ph-shield-check"></i> Si tu búsqueda es para un cliente, en el Hub se ve igual que en el aviso: sin el nombre del cliente si lo ocultaste.</p>`;
    openSheet(sheetScroll(body) + sheetFoot('<button id="ha-go" class="btn btn-primary w-full h-14"><i class="ph-bold ph-megaphone text-xl"></i>Publicar en el Hub</button>'), c => {
      $('#ha-go', c).onclick = () => {
        Store.saveHubReq({ id: hubId('h'), company: co.name, jobId: $('#ha-job', c).value, note: $('#ha-note', c).value.trim(), createdAt: new Date().toISOString(), status: 'abierto' });
        closeSheet(true); toast('Pedido publicado en el Hub', 'ph-megaphone');
        S.hubTab = 'mine'; if (parseHash().path === '/empresa/hub') refresh(); else location.hash = '#/empresa/hub';
      };
    });
  }

  // Recomendar a alguien de Mis candidatos para el pedido de otro selector
  function openHubRecommend(reqId) {
    const co = Store.company(), r = Store.hubReqs().find(x => x.id === reqId), j = r && Store.job(r.jobId); if (!j) return;
    const done = new Set(Store.referrals().filter(x => x.reqId === r.id && x.status !== 'cancelada').map(x => d10(x.person.phone) || norm(x.person.email || x.person.name)));
    const inJob = new Set(Store.apps().filter(a => a.jobId === j.id).map(a => d10(a.phone)).filter(Boolean));
    const people = bankPeople(co).filter(p => !p.tags.includes('No recontratar') && !(p.phone && inJob.has(d10(p.phone))) && !done.has(d10(p.phone) || norm(p.email || p.name)))
      .map(p => ({ p, an: analyzeCv(pseudoApp(p), j) })).sort((a, b) => (b.an.score || 0) - (a.an.score || 0));
    let pick = '', q = '';
    const row = ({ p, an }) => `<li><label class="flex items-center gap-3 rounded-[18px] border ${pick === p.key ? 'border-brand bg-brand-soft/40' : 'border-line'} p-3 cursor-pointer">
        <input type="radio" name="hr-p" value="${esc(p.key)}" class="w-5 h-5 accent-[#3B5BFD] shrink-0" ${pick === p.key ? 'checked' : ''}>
        ${avatar(p.name, 'w-11 h-11 text-[0.85rem]')}
        <span class="min-w-0 flex-1"><span class="block font-bold leading-tight">${esc(p.name)}${p.fav ? ' <i class="ph-fill ph-star text-sun"></i>' : ''}</span><span class="block text-[0.9rem] text-ink-soft truncate">${esc(bestLine(p))}</span>${p.phone ? '' : '<span class="block text-[0.85rem] text-warn">Sin celular: le vas a pasar el link a mano</span>'}</span></label></li>`;
    const listHtml = () => { const f = people.filter(x => !q || norm(x.p.name + ' ' + (x.p.headline || '')).includes(q)); return f.length ? f.slice(0, 30).map(row).join('') : '<li class="text-ink-mute py-4 text-center">No encontramos a nadie con ese nombre en Mis candidatos.</li>'; };
    const body = `<p class="text-ink-soft font-semibold flex items-center gap-2">${logo(r.company, 'w-8 h-8 text-[0.65rem]')}${esc(r.company)} busca</p>
      <h2 class="mt-2 text-[1.5rem] font-extrabold pr-10 leading-tight">${esc(j.title)}</h2>
      <p class="text-ink-soft">${esc(j.city)}, ${esc(j.province)} · ${esc(j.modality)}</p>
      ${r.note ? `<p class="mt-3 rounded-2xl bg-surface px-4 py-3 leading-snug">“${esc(r.note)}”</p>` : ''}
      ${people.length ? `<p class="label mt-5">¿A quién de Mis candidatos recomendás?</p>
      <div class="relative"><i class="ph ph-magnifying-glass text-xl text-ink-mute absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"></i><input id="hr-q" type="search" class="input pl-12" placeholder="Buscar por nombre o puesto" aria-label="Buscar en Mis candidatos"></div>
      <p class="mt-2 text-[0.9rem] text-ink-mute">Primero, los que más encajan con el aviso.</p>
      <ul id="hr-list" class="mt-3 space-y-2">${listHtml()}</ul>
      <label class="label mt-5" for="hr-note">¿Por qué lo recomendás? <span class="font-normal text-ink-mute">(lo ve ${esc(r.company)})</span></label>
      <textarea id="hr-note" rows="3" maxlength="300" class="input h-auto py-3" placeholder="Ej.: Quedó segunda en una búsqueda nuestra. Muy prolija y con buena experiencia en…"></textarea>
      <p class="mt-3 text-[0.92rem] text-ink-mute"><i class="ph ph-shield-check"></i> No le pasamos nada a ${esc(r.company)} hasta que el candidato acepte desde el link que le mandás.</p>`
      : `<div class="mt-5">${emptyState('ph-address-book', 'No tenés a nadie para recomendar', 'Las personas de Mis candidatos que ya están en esta búsqueda o que ya recomendaste no aparecen.')}</div>`}`;
    const foot = people.length ? '<button id="hr-go" class="btn btn-primary w-full h-14" disabled><i class="ph-bold ph-user-plus text-xl"></i>Elegí a quién recomendar</button>' : '<button data-close-sheet class="btn btn-primary w-full h-14">Entendido</button>';
    openSheet(sheetScroll(body) + sheetFoot(foot), c => {
      const go = $('#hr-go', c); if (!go) return;
      const sync = () => { const p = pick && people.find(x => x.p.key === pick); go.disabled = !p; go.innerHTML = p ? `<i class="ph-bold ph-paper-plane-tilt text-xl"></i>Pedirle permiso a ${esc(p.p.name.split(' ')[0])}` : '<i class="ph-bold ph-user-plus text-xl"></i>Elegí a quién recomendar'; };
      c.addEventListener('change', e => { const rb = e.target.closest('[name="hr-p"]'); if (rb) { pick = rb.value; $('#hr-list', c).innerHTML = listHtml(); sync(); } });
      $('#hr-q', c).oninput = e => { q = norm(e.target.value.trim()); $('#hr-list', c).innerHTML = listHtml(); };
      go.onclick = () => {
        const { p } = people.find(x => x.p.key === pick);
        const ref = { id: hubId('r'), reqId: r.id, from: co.name, to: r.company, jobId: j.id, note: $('#hr-note', c).value.trim(), status: 'pendiente', createdAt: new Date().toISOString(),
          person: { name: p.name, phone: p.phone || '', email: p.email || '', cand: p.cand || '', cvText: p.cvText || '', cvKey: p.cvKey || '', cvName: p.cvName || '' } };
        Store.saveReferral(ref);
        const link = `${baseUrl()}#/recomendacion?id=${ref.id}`;
        setSheet(sheetScroll(`<span class="w-14 h-14 rounded-2xl bg-sun-soft text-warn grid place-items-center"><i class="ph-fill ph-hourglass-medium text-3xl"></i></span>
          <h2 class="mt-4 text-[1.6rem] font-extrabold pr-10 leading-tight">Falta el permiso de ${esc(p.name.split(' ')[0])}</h2>
          <p class="mt-2 text-ink-soft">Mandale el link: ahí ve quién lo quiere conocer y para qué puesto. Si acepta, llega a la búsqueda de ${esc(r.company)} con tu recomendación. Lo seguís en <b class="text-ink">Hub → Mis recomendaciones</b>.</p>
          <div class="mt-5 grid gap-2.5">
            ${p.phone ? `<a href="${esc(waLink(p.phone, refAskText(ref)))}" target="_blank" rel="noopener" class="btn btn-primary h-14 justify-center"><i class="ph-fill ph-whatsapp-logo text-xl"></i>Pedirle permiso por WhatsApp</a>` : ''}
            <button type="button" id="hr-copy" class="btn btn-outline h-12 justify-center"><i class="ph ph-link text-lg"></i>Copiar link</button>
          </div>`) + sheetFoot('<button data-close-sheet class="btn btn-outline w-full h-14">Listo</button>'), c2 => {
          $('#hr-copy', c2).onclick = async () => { try { await navigator.clipboard.writeText(link); toast('Link copiado', 'ph-link'); } catch (er) { toast('No pudimos copiar el link', 'ph-warning'); } };
        });
        if (parseHash().path === '/empresa/hub') { S.hubTab = 'sent'; const y = window.scrollY; view.innerHTML = HubPage().html; window.scrollTo(0, y); }
      };
    });
  }

  // Página del candidato: acepta o no que lo recomienden
  function RefPermission(params) {
    const r = Store.referral(params.get('id')), j = r && Store.job(r.jobId);
    const wrap = inner => `<div class="max-w-xl mx-auto px-4 sm:px-6 py-8 md:py-14">${inner}</div>`;
    if (!r || r.status === 'cancelada') return { html: wrap(emptyState('ph-link-break', 'Este link ya no funciona', 'Puede que la recomendación se haya cancelado. Igual podés ver las vacantes abiertas.', '<a href="#/vacantes" class="btn btn-primary">Ver vacantes</a>')), title: 'Recomendación' };
    const first = esc(r.person.name.split(' ')[0]);
    let inner;
    if (r.status === 'aceptada') inner = `<div class="card p-6 sm:p-8 text-center"><span class="mx-auto w-16 h-16 rounded-full bg-mint text-ok grid place-items-center"><i class="ph-fill ph-check-circle text-4xl"></i></span>
      <h1 class="mt-4 text-[1.8rem] font-extrabold leading-tight">¡Listo, ${first}!</h1><p class="mt-2 text-ink-soft">${esc(r.to)} ya tiene tu CV para <b class="text-ink">${esc(j ? j.title : 'la búsqueda')}</b>. Seguí el avance en Mis postulaciones.</p>
      <a href="#/postulaciones" class="mt-5 btn btn-primary h-12 px-6">Ver mis postulaciones</a></div>`;
    else if (r.status === 'rechazada') inner = `<div class="card p-6 sm:p-8 text-center"><span class="mx-auto w-16 h-16 rounded-full bg-surface text-ink-mute grid place-items-center"><i class="ph-fill ph-hand-palm text-4xl"></i></span>
      <h1 class="mt-4 text-[1.8rem] font-extrabold leading-tight">No le pasamos tus datos</h1><p class="mt-2 text-ink-soft">${esc(r.to)} no recibió nada. Si cambiás de idea, podés postularte vos desde el aviso.</p>
      ${j && j.status === 'activa' ? `<a href="#/vacante?id=${j.id}" class="mt-5 btn btn-outline h-12 px-6">Ver el aviso</a>` : ''}</div>`;
    else if (!j || j.status !== 'activa') inner = emptyState('ph-door', 'Esta búsqueda ya cerró', 'No le pasamos tus datos a nadie. Mirá las vacantes abiertas.', '<a href="#/vacantes" class="btn btn-primary">Ver vacantes</a>');
    else inner = `<div class="card p-6 sm:p-8">
      <div class="flex items-center gap-2">${logo(r.from, 'w-12 h-12 text-[0.8rem]')}<i class="ph-bold ph-arrow-right text-ink-mute text-xl"></i>${logo(r.to, 'w-12 h-12 text-[0.8rem]')}</div>
      <h1 class="mt-5 text-[1.7rem] sm:text-[2rem] font-extrabold leading-tight">Hola ${first}, ${esc(r.from)} quiere recomendarte</h1>
      <p class="mt-2 text-ink-soft text-[1.05rem]">${esc(r.to)} busca a alguien para este puesto y ${esc(r.from)} pensó en vos. Las dos son parte del Hub de Consultoras de RRHH y Empresas de Tucumán.</p>
      <button type="button" data-open-job="${j.id}" class="mt-5 w-full text-left rounded-[18px] border border-line p-4 flex items-center gap-3 hover:border-brand/40">
        ${logo(j.company, 'w-11 h-11 text-[0.75rem]')}<span class="min-w-0 flex-1"><span class="block font-bold leading-tight">${esc(j.title)}</span><span class="block text-[0.92rem] text-ink-soft truncate">${esc(j.company)} · ${esc(j.city)}, ${esc(j.province)} · ${esc(j.modality)}</span></span><i class="ph-bold ph-caret-right text-ink-mute"></i></button>
      <div class="mt-5 rounded-[18px] bg-surface p-4"><p class="font-semibold">Si aceptás, le pasamos a ${esc(r.to)}:</p>
        <ul class="mt-2 space-y-1 text-ink-soft"><li><i class="ph-bold ph-check text-ok"></i> Tu nombre y tu contacto</li><li><i class="ph-bold ph-check text-ok"></i> Tu CV</li><li><i class="ph-bold ph-check text-ok"></i> Por qué ${esc(r.from)} te recomienda</li></ul>
        <p class="mt-2 text-[0.92rem] text-ink-mute">Quedás postulado/a y seguís el avance en Mis postulaciones. Si no aceptás, no le pasamos nada.</p></div>
      <p class="mt-4 text-[0.88rem] text-ink-mute">${esc(CONSENT_REF(r.from, r.to))}</p>
      <div class="mt-5 grid sm:grid-cols-[1fr_auto] gap-2.5">
        <button type="button" id="rp-yes" class="btn btn-primary h-14 justify-center text-[1.05rem]"><i class="ph-bold ph-check text-xl"></i>Sí, acepto</button>
        <button type="button" id="rp-no" class="btn btn-outline h-14 px-6 justify-center">No, gracias</button>
      </div></div>`;
    return {
      html: wrap(inner), title: 'Recomendación',
      mount() {
        const y = $('#rp-yes'); if (!y) return;
        y.onclick = async () => {
          const now = new Date().toISOString(), P = r.person;
          const dup = Store.apps().find(a => a.jobId === j.id && ((P.phone && d10(a.phone) === d10(P.phone)) || (P.cand && a.cand === P.cand)));
          let appId = dup && dup.id;
          if (!dup) {
            appId = hubId('hb');
            Store.addApp({ id: appId, jobId: j.id, cand: P.cand || undefined, name: P.name, email: P.email, phone: P.phone, cvName: P.cvName || `CV ${P.name}.pdf`, cvSize: 48000, cvText: P.cvText || '',
              date: now, status: 'Nuevo', mine: false, source: 'hub', referral: { from: r.from, note: r.note }, consent: { at: now, text: CONSENT_REF(r.from, r.to) } });
            if (P.cvKey) { const blob = await Store.getCv(P.cvKey); if (blob) await Store.putCv(appId, blob); }
          }
          Store.saveReferral({ id: r.id, status: 'aceptada', answeredAt: now, appId });
          refresh();
        };
        $('#rp-no').onclick = () => { Store.saveReferral({ id: r.id, status: 'rechazada', answeredAt: new Date().toISOString() }); refresh(); };
      }
    };
  }

  /* ================= AVISOS EXTERNOS (cargados con IA) =================
     Para que el sitio tenga avisos aunque las empresas todavía no publiquen: el admin pega un post de Instagram,
     Facebook o un grupo de WhatsApp (o lo trae una revisión diaria de páginas de empresas y organismos) y la IA
     arma el aviso. Pasa por la bandeja del Admin antes de publicarse. Quien se postula va al contacto original.
     En el prototipo, aiParsePost() usa reglas en el navegador. En producción: reemplazarla por una llamada a un
     modelo de IA que devuelva el mismo objeto (ver README: "Avisos externos con IA"). */
  const extSrc = id => EXT_SOURCES.find(s => s[0] === id) || EXT_SOURCES[EXT_SOURCES.length - 1];
  const TUC_CITIES = ['San Miguel de Tucumán', 'Yerba Buena', 'Tafí Viejo', 'Banda del Río Salí', 'Alderetes', 'Las Talitas', 'Lules', 'Famaillá', 'Monteros', 'Concepción', 'Aguilares', 'Simoca', 'Tafí del Valle', 'Bella Vista', 'Juan Bautista Alberdi', 'Trancas', 'El Manantial', 'San Pablo'];
  const SCAM_RX = /(abon(a|á)r?|pag(a|á)r?|transfer(i|í)r?|deposit(a|á)r?)\s+(la\s+|una\s+|el\s+)?(inscripci|matr[ií]cula|kit|curso|seguro|cuota)|desde tu casa.{0,40}\$\s?\d|gan(a|á)\s+\$\s?[\d.]+\s+(por|al)\s+d[ií]a|inversi[oó]n inicial|sin experiencia.{0,30}gan(a|á)/i;
  const sentence = t => { t = t.trim().replace(/\s+/g, ' '); const caps = t === t.toUpperCase(); if (caps) t = t.toLowerCase(); return t.charAt(0).toUpperCase() + t.slice(1); };
  function aiParsePost(raw, meta = {}) {
    const text = String(raw || '').replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, '').replace(/[ \t]+/g, ' ').trim();
    const flat = text.replace(/\n+/g, ' ');
    const t = norm(flat);
    // Puesto
    let title = '';
    const mt = flat.match(/(?:se\s+busca|se\s+necesita|se\s+solicita|busc(?:a|amos|o)|necesit(?:a|amos|o)|incorpor(?:a|amos)|seleccion(?:a|amos)|contrat(?:a|amos))\s+(?:a\s+|un\/a\s+|una?\s+|un\s+)?([^.,:;!\n(]{3,60}?)(?=\s+(?:para|con|en|de\s+lunes|que|full|part|turno|mayor|zona|sin|y\s+(?:con|en))\b|[.,:;!\n(]|$)/i);
    if (mt) title = sentence(mt[1]);
    else { const first = text.split('\n').find(l => l.trim().length > 4) || ''; title = sentence(first.replace(/^(urgente|atenci[oó]n|importante)[:!\s-]*/i, '').slice(0, 60)); }
    title = title.replace(/^(personal|un|una)\s+(de\s+)?/i, m => /personal/i.test(m) ? m : '').replace(/\s+(urgente|ya)$/i, '');
    if (title) title = title.charAt(0).toUpperCase() + title.slice(1);
    // Empresa
    let company = '';
    const CO_RX = /^\s*([A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑáéíóúñ&.'-]*(?:\s+[A-ZÁÉÍÓÚÑ"“][\wÁÉÍÓÚÑáéíóúñ&.'”"-]*){0,4})\s+(?:busca|incorpora|selecciona|necesita|contrata)\b/;
    const mc = [flat, ...text.split('\n')].map(l => l.match(CO_RX)).find(m => m && !/^(se|hoy|urgente|empresa|importante|estamos|buscamos)$/i.test(m[1]));
    if (mc && !/^(se|hoy|urgente|empresa|importante)$/i.test(mc[1])) company = mc[1].trim();
    let fromAuthor = false;
    if (!company && meta.author && !/^grupo\b/i.test(meta.author)) fromAuthor = true;
    if (fromAuthor) company = meta.author.replace(/^@/, '').replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();
    // Lugar
    let city = TUC_CITIES.find(c => t.includes(norm(c))) || (/\bcentro\b/.test(t) ? 'San Miguel de Tucumán' : '');
    let province = detectProvince(flat) || (city ? 'Tucumán' : '');
    if (!province) province = 'Tucumán';
    if (!city && province === 'Tucumán') city = 'San Miguel de Tucumán';
    // Condiciones
    const modality = /remot|desde (tu|su) casa|home ?office/.test(t) ? 'Remoto' : /hibrid/.test(t) ? 'Híbrido' : 'Presencial';
    const type = /part ?time|medio tiempo|media jornada|medio turno/.test(t) ? 'Part time' : /full ?time|jornada completa|tiempo completo/.test(t) ? 'Full time' : /\bturno (manana|tarde|noche)\b/.test(t) ? 'Part time' : '';
    const seniority = /sin experiencia|experiencia no excluyente|primer empleo/.test(t) ? 'sin-exp' : /(\d+)\s*anos? de experiencia/.test(t) ? (+t.match(/(\d+)\s*anos? de experiencia/)[1] >= 3 ? 'semi' : 'junior') : /con experiencia|experiencia en|experiencia comprobable/.test(t) ? 'junior' : 'sin-exp';
    const ms = flat.match(/\$\s?\d[\d.]*(?:\s*(?:a|-|y)\s*\$?\s?\d[\d.]*)?(?:\s*(?:\+|más)\s*[a-záéíóú ]{3,30})?/i);
    const salary = ms ? ms[0].replace(/\s+/g, ' ').trim() : '';
    // Requisitos: viñetas o lo que sigue a "Requisitos:"
    let reqs = text.split('\n').map(l => l.trim()).filter(l => /^[-•*✔✓▪>]/.test(l)).map(l => sentence(l.replace(/^[-•*✔✓▪>]\s*/, '')));
    if (!reqs.length) { const mr = flat.match(/requisitos?\s*:?\s*([^.]+)/i); if (mr) reqs = mr[1].split(/,|;|\sy\s/).map(x => sentence(x)).filter(x => x.length > 3); }
    if (!reqs.length) { const me = flat.match(/(con experiencia[^.]*|experiencia en[^.]*|con carnet[^.]*|mayor de \d+[^.,]*)/i); if (me) reqs = me[1].split(/,|\sy\s/).map(x => sentence(x)).filter(x => x.length > 3).slice(0, 4); }
    // Contacto
    const mp = flat.match(/(?:\+?54\s?9?\s?)?\(?(?:0?3\d{2,3})\)?[\s-]?(?:15[\s-]?)?\d{3}[\s-]?\d{4}/);
    const me2 = flat.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/);
    const mu = flat.match(/https?:\/\/[^\s)]+/);
    const contact = { phone: mp ? mp[0].trim() : '', email: me2 ? me2[0] : '', url: mu ? mu[0] : (meta.url || '') };
    const area = detectArea(title + ' ' + flat) || 'atencion';
    const description = text.split('\n').filter(l => !/^[-•*✔✓▪>]/.test(l.trim()) && !/^requisitos?\s*:?\s*$/i.test(l.trim())).join(' ').replace(/\s+/g, ' ').trim();
    // Alertas para el admin
    const warn = [];
    if (SCAM_RX.test(flat)) warn.push(['bad', 'Puede ser una estafa: pide pagar algo o promete mucha plata']);
    if (!contact.phone && !contact.email && !contact.url) warn.push(['warn', 'No dice cómo postularse']);
    if (!company) warn.push(['warn', 'No dice el nombre de la empresa']);
    else if (fromAuthor && /^@/.test(meta.author || '')) warn.push(['warn', 'Confirmá el nombre de la empresa: lo sacamos de la cuenta']);
    if (!type) warn.push(['warn', 'Confirmá la jornada']);
    if (!mt) warn.push(['warn', 'Revisá el puesto']);
    const dup = Store.activeJobs().find(j => norm(j.title) === norm(title) && (!company || norm(j.company) === norm(company)));
    if (dup) warn.push(['warn', `Parece repetido: ya está “${dup.title}” de ${dup.company}`]);
    return { title, company, area, province, city, modality, type: type || 'Full time', seniority, salary, requirements: reqs.slice(0, 6), description, contact, warn };
  }

  function extJobFrom(d, f) {
    const now = new Date().toISOString(), until = new Date(Date.now() + 30 * 864e5).toISOString();
    return { id: 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), title: f.title, company: f.company || 'Empresa de Tucumán', companyType: 'Aviso externo',
      area: f.area, seniority: f.seniority, province: f.province, city: f.city, modality: f.modality, type: f.type, salary: f.salary, description: f.description,
      requirements: f.requirements, benefits: [], postedAt: now, status: 'activa',
      external: { src: d.src, author: d.author || '', url: f.contact.url || d.url || '', phone: f.contact.phone, email: f.contact.email, original: d.text, img: d.img || '', importedAt: now, until, foundAt: d.at || now, reports: 0 } };
  }

  // Editor del borrador: lo que armó la IA, editable, con las alertas arriba
  function openExtEditor(id, onDone) {
    const d = Store.extQueue().find(x => x.id === id); if (!d) return;
    const f = d.draft || aiParsePost(d.text, d);
    const S2 = extSrc(d.src);
    const inp = (k, l, v, ph = '') => `<label class="label mt-4" for="xe-${k}">${l}</label><input id="xe-${k}" class="input" value="${esc(v || '')}" placeholder="${esc(ph)}">`;
    const sel = (k, l, opts, v) => `<div><label class="label mt-4" for="xe-${k}">${l}</label><select id="xe-${k}" data-dd class="input">${opts.map(([a, b]) => `<option value="${esc(a)}" ${a === v ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select></div>`;
    const body = `<p class="inline-flex items-center gap-1.5 rounded-full bg-brand-soft text-brand font-semibold px-3 py-1 text-[0.9rem]"><i class="ph-fill ph-sparkle"></i>Armado con IA · revisalo antes de publicar</p>
      <h2 class="mt-3 text-[1.5rem] font-extrabold pr-10 leading-tight">Revisar aviso</h2>
      ${f.warn.length ? `<ul class="mt-4 space-y-2">${f.warn.map(([k, w]) => `<li class="rounded-xl px-3 py-2 font-semibold text-[0.95rem] flex gap-2 ${k === 'bad' ? 'bg-bad/10 text-bad' : 'bg-sun-soft text-warn'}"><i class="ph-bold ${k === 'bad' ? 'ph-warning-octagon' : 'ph-warning'} shrink-0 mt-0.5"></i>${esc(w)}</li>`).join('')}</ul>` : '<p class="mt-4 rounded-xl px-3 py-2 font-semibold bg-mint text-ok"><i class="ph-bold ph-check"></i> No encontramos nada raro</p>'}
      <details class="mt-4 rounded-[18px] bg-surface p-4"><summary class="font-semibold cursor-pointer flex items-center gap-2"><i class="ph ${S2[2]} text-lg"></i>Publicación original · ${esc(S2[1])}${d.author ? ` · ${esc(d.author)}` : ''}</summary>${d.img ? `<img src="${d.img}" alt="Foto del aviso" class="mt-3 rounded-xl max-h-72 w-auto">` : ''}<p class="mt-2 whitespace-pre-line text-ink-soft text-[0.95rem]">${esc(d.text)}</p></details>
      ${inp('title', 'Puesto', f.title)}
      ${inp('company', 'Empresa', f.company, 'Si no lo dice, dejalo vacío')}
      <div class="grid grid-cols-2 gap-x-3">
        ${sel('area', 'Rubro', AREAS.map(a => [a.id, a.label]), f.area)}
        ${sel('sen', 'Experiencia', SENIORITIES.map(x => [x.id, x.label]), f.seniority)}
        ${sel('prov', 'Provincia', PROVINCES.map(p => [p, p]), f.province)}
        <div>${inp('city', 'Ciudad', f.city)}</div>
        ${sel('mod', 'Modalidad', MODALITIES.map(m => [m, m]), f.modality)}
        ${sel('type', 'Jornada', JOB_TYPES.map(m => [m, m]), f.type)}
      </div>
      ${inp('salary', 'Sueldo', f.salary, 'Si no lo dice, dejalo vacío')}
      <label class="label mt-4" for="xe-desc">Descripción</label><textarea id="xe-desc" rows="4" class="input h-auto py-3">${esc(f.description)}</textarea>
      <label class="label mt-4" for="xe-reqs">Calificaciones <span class="font-normal text-ink-mute">(uno por línea)</span></label><textarea id="xe-reqs" rows="3" class="input h-auto py-3">${esc(f.requirements.join('\n'))}</textarea>
      <p class="label mt-5">Cómo postularse</p>
      <div class="grid gap-x-3 sm:grid-cols-3">${inp('phone', 'WhatsApp', f.contact.phone)}${inp('email', 'Email', f.contact.email)}${inp('url', 'Link', f.contact.url)}</div>
      <p class="mt-3 text-[0.9rem] text-ink-mute"><i class="ph ph-clock"></i> Se publica por 30 días y después vence solo.</p>`;
    const foot = `<button type="button" id="xe-save" class="btn btn-outline h-14 px-5">Guardar</button><button type="button" id="xe-pub" class="btn btn-primary flex-1 h-14"><i class="ph-bold ph-check text-xl"></i>Publicar aviso</button>`;
    openSheet(sheetScroll(body) + sheetFoot(foot), c => {
      const v = k => $('#xe-' + k, c).value.trim();
      const read = () => ({ ...f, title: v('title'), company: v('company'), area: v('area'), seniority: v('sen'), province: v('prov'), city: v('city'), modality: v('mod'), type: v('type'), salary: v('salary'),
        description: v('desc'), requirements: v('reqs').split('\n').map(x => x.trim()).filter(Boolean), contact: { phone: v('phone'), email: v('email'), url: v('url') } });
      $('#xe-save', c).onclick = () => { Store.saveExt({ id: d.id, draft: read() }); closeSheet(true); toast('Borrador guardado', 'ph-floppy-disk'); if (onDone) onDone(); };
      $('#xe-pub', c).onclick = () => {
        const g = read();
        if (!g.title) { toast('Falta el puesto', 'ph-warning'); return; }
        if (!g.contact.phone && !g.contact.email && !g.contact.url) { toast('Poné cómo postularse: WhatsApp, email o link', 'ph-warning'); return; }
        const j = extJobFrom(d, g); Store.addJob(j); Store.saveExt({ id: d.id, status: 'publicado', jobId: j.id, draft: g });
        closeSheet(true); toast('Aviso publicado', 'ph-check-circle'); if (onDone) onDone();
      };
    });
  }

  /* Leer el texto de una foto del aviso. En el prototipo: Tesseract.js en el navegador (se carga recién cuando se usa).
     En producción: mandar la imagen directo al modelo de IA, que la lee mejor (flyers con diseño, letras sobre fotos). */
  const OCR_CDN = { lib: 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js', worker: 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js',
    core: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1', lang: 'https://cdn.jsdelivr.net/npm/@tesseract.js-data/spa/4.0.0_best_int' };
  let ocrLib = null;
  const loadOcr = () => ocrLib || (ocrLib = new Promise((res, rej) => { if (window.Tesseract) return res(window.Tesseract); const sc = document.createElement('script'); sc.src = OCR_CDN.lib; sc.onload = () => window.Tesseract ? res(window.Tesseract) : rej(new Error('ocr')); sc.onerror = () => { ocrLib = null; rej(new Error('ocr')); }; document.head.appendChild(sc); }));
  async function ocrImage(file, onProgress) {
    const T = await loadOcr();
    const w = await T.createWorker('spa', 1, { workerPath: OCR_CDN.worker, corePath: OCR_CDN.core, langPath: OCR_CDN.lang,
      logger: m => { if (m.status === 'recognizing text' && onProgress) onProgress(Math.round(m.progress * 100)); } });
    try { const { data } = await w.recognize(file); return cleanOcr(data.text || ''); } finally { w.terminate(); }
  }
  const cleanOcr = t => t.split('\n').map(l => l.replace(/[|_~`^]+/g, ' ').replace(/\s{2,}/g, ' ').trim()).filter(l => (l.match(/[\p{L}\d]/gu) || []).length >= 2).join('\n').replace(/\n{3,}/g, '\n\n').trim();

  function AdminExternal() {
    const q = Store.extQueue(), pend = q.filter(x => x.status === 'nuevo');
    const pub = Store.jobs().filter(j => j.external).sort((a, b) => b.postedAt.localeCompare(a.postedAt));
    const srcs = Store.extSources();
    const chip = (src, author) => { const s = extSrc(src); return `<span class="inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-0.5 text-[0.85rem] font-semibold text-ink-soft"><i class="ph ${s[2]}"></i>${esc(s[1])}${author ? ` · ${esc(author)}` : ''}</span>`; };
    const pendCard = d => {
      const f = d.draft || aiParsePost(d.text, d), bad = f.warn.some(w => w[0] === 'bad');
      return `<li class="rounded-[20px] bg-white border ${bad ? 'border-bad/40' : 'border-line'} p-4 sm:p-5">
        <div class="flex flex-wrap items-center gap-2">${chip(d.src, d.author)}${d.img ? '<span class="inline-flex items-center gap-1 rounded-full bg-lilac px-2.5 py-0.5 text-[0.85rem] font-semibold text-brand"><i class="ph ph-image"></i>Desde foto</span>' : ''}<span class="text-[0.85rem] text-ink-mute">${ago(d.at)}</span></div>
        <h3 class="mt-2 text-[1.2rem] font-extrabold leading-tight">${esc(f.title || 'Sin puesto')}</h3>
        <p class="text-ink-soft">${esc(f.company || 'Empresa sin nombre')} · ${esc(f.city)}, ${esc(f.province)}${f.salary ? ` · ${esc(f.salary)}` : ''}</p>
        ${f.warn.length ? `<ul class="mt-2 flex flex-wrap gap-1.5">${f.warn.map(([k, w]) => `<li class="rounded-full px-2.5 py-0.5 text-[0.82rem] font-bold ${k === 'bad' ? 'bg-bad/10 text-bad' : 'bg-sun-soft text-warn'}">${esc(w)}</li>`).join('')}</ul>` : ''}
        <div class="mt-3 flex flex-wrap gap-2">
          <button type="button" data-xe-open="${d.id}" class="btn btn-primary btn-sm"><i class="ph-bold ph-pencil-simple"></i>Revisar y publicar</button>
          <button type="button" data-xe-drop="${d.id}" class="btn btn-outline btn-sm ${bad ? 'text-bad' : ''}"><i class="ph ph-trash"></i>Descartar</button>
        </div></li>`;
    };
    const pubRow = j => {
      const x = j.external, left = Math.ceil((new Date(x.until) - Date.now()) / 864e5), on = j.status === 'activa';
      return `<li class="py-3 flex flex-wrap items-center gap-3">
        <div class="min-w-0 flex-1"><a href="#/vacante?id=${j.id}" class="font-semibold hover:text-brand">${esc(j.title)}</a>
          <p class="text-[0.9rem] text-ink-mute">${esc(j.company)} · ${esc(extSrc(x.src)[1])} · ${on ? `vence en ${left} día${left === 1 ? '' : 's'}` : j.status === 'vencida' ? 'vencido' : 'despublicado'}${x.reports ? ` · <b class="text-bad">${x.reports} reporte${x.reports === 1 ? '' : 's'}</b>` : ''}</p></div>
        ${on ? `<button type="button" data-xe-off="${j.id}" class="btn btn-outline btn-sm">Despublicar</button>` : `<button type="button" data-xe-on="${j.id}" class="btn btn-outline btn-sm">Volver a publicar</button>`}
      </li>`;
    };
    const html = `<div class="max-w-5xl mx-auto px-4 sm:px-6 py-8 md:py-12">
      ${adminSwitch()}
      <h1 class="text-[2rem] font-extrabold leading-tight">Avisos externos</h1>
      <p class="mt-1 text-ink-soft max-w-2xl">Avisos que circulan en redes y en páginas de empresas de Tucumán, para que el sitio tenga ofertas aunque esas empresas todavía no publiquen acá. La IA arma el aviso; vos lo revisás. Quien se postula va directo al contacto original.</p>
      <div class="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] items-start">
        <section class="card p-5 sm:p-6" aria-labelledby="xi-t">
          <h2 id="xi-t" class="text-[1.3rem] font-extrabold flex items-center gap-2"><i class="ph-fill ph-sparkle text-brand"></i>Cargar desde un post</h2>
          <p class="mt-1 text-ink-soft text-[0.95rem]">Subí la foto del post o pegá su texto: de Instagram, Facebook o un grupo de WhatsApp.</p>
          <label class="label mt-4" for="xi-src">¿De dónde es?</label>
          <select id="xi-src" data-dd class="input">${EXT_SOURCES.map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join('')}</select>
          <div class="grid sm:grid-cols-2 gap-x-3">
            <div><label class="label mt-4" for="xi-author">¿Quién lo publicó? <span class="font-normal text-ink-mute">(opcional)</span></label><input id="xi-author" class="input" placeholder="@cuenta o nombre"></div>
            <div><label class="label mt-4" for="xi-url">Link <span class="font-normal text-ink-mute">(opcional)</span></label><input id="xi-url" class="input" placeholder="https://…"></div>
          </div>
          <p class="label mt-4">Foto del aviso <span class="font-normal text-ink-mute">(si el post es una imagen)</span></p>
          <label id="xi-drop" class="flex items-center gap-3 rounded-[18px] border-2 border-dashed border-line hover:border-brand/50 p-3.5 cursor-pointer transition">
            <input id="xi-img" type="file" accept="image/*" class="sr-only">
            <span id="xi-thumb" class="w-16 h-16 rounded-xl bg-surface grid place-items-center shrink-0 overflow-hidden"><i class="ph ph-image text-2xl text-ink-mute"></i></span>
            <span class="min-w-0"><span id="xi-img-t" class="block font-semibold">Subir una foto o captura</span><span id="xi-ocr" class="block text-[0.9rem] text-ink-mute" aria-live="polite">La IA lee el texto y lo escribe abajo. También podés pegar la captura con Ctrl+V.</span></span>
          </label>
          <label class="label mt-4" for="xi-text">Texto del aviso</label>
          <textarea id="xi-text" rows="6" class="input h-auto py-3" placeholder="Ej.: Se busca cajero/a para supermercado en Yerba Buena. Full time. Enviar CV a…"></textarea>
          <p id="xi-err" class="text-bad font-semibold mt-2 hidden" role="alert"></p>
          <button type="button" id="xi-go" class="mt-4 btn btn-primary h-12 w-full justify-center"><i class="ph-fill ph-sparkle text-lg"></i>Armar aviso con IA</button>
        </section>
        <section aria-labelledby="xq-t">
          <h2 id="xq-t" class="text-[1.3rem] font-extrabold">Para revisar ${pend.length ? `<span class="text-ink-mute font-semibold">${pend.length}</span>` : ''}</h2>
          ${pend.length ? `<ul class="mt-3 space-y-3">${pend.map(pendCard).join('')}</ul>` : '<p class="mt-3 card p-5 text-ink-soft">No hay avisos esperando. Pegá uno o sumá fuentes para revisar todos los días.</p>'}
        </section>
      </div>
      <div class="mt-8 grid gap-6 lg:grid-cols-2 items-start">
        <section class="card p-5 sm:p-6" aria-labelledby="xs-t">
          <h2 id="xs-t" class="text-[1.3rem] font-extrabold flex items-center gap-2"><i class="ph ph-globe text-brand"></i>Fuentes que revisamos todos los días</h2>
          <p class="mt-1 text-ink-soft text-[0.95rem]">Páginas de "Trabajá con nosotros" de empresas tucumanas y de organismos públicos. Cada mañana la IA las lee y deja lo nuevo en "Para revisar".</p>
          ${srcs.length ? `<ul class="mt-3 divide-y divide-line">${srcs.map((s, i) => `<li class="py-2.5 flex items-center gap-3"><i class="ph ${extSrc(s.type)[2]} text-xl text-ink-soft"></i><span class="min-w-0 flex-1"><span class="block font-semibold truncate">${esc(s.name)}</span><a href="${esc(s.url)}" target="_blank" rel="noopener" class="block text-[0.88rem] text-brand truncate hover:underline">${esc(s.url)}</a></span><button type="button" data-xs-del="${i}" class="icon-btn w-9 h-9 text-ink-mute hover:text-bad" aria-label="Quitar ${esc(s.name)}"><i class="ph ph-trash"></i></button></li>`).join('')}</ul>` : '<p class="mt-3 text-ink-mute">Todavía no sumaste fuentes.</p>'}
          <div class="mt-4 grid sm:grid-cols-[1fr_1fr_auto] gap-2">
            <input id="xs-name" class="input" placeholder="Nombre (ej.: Oficina de Empleo)" aria-label="Nombre de la fuente">
            <input id="xs-url" class="input" placeholder="https://…" aria-label="Link de la página">
            <button type="button" id="xs-add" class="btn btn-outline h-12"><i class="ph-bold ph-plus"></i>Sumar</button>
          </div>
          <button type="button" id="xs-run" class="mt-3 btn btn-soft btn-sm"><i class="ph ph-arrows-clockwise"></i>Revisar ahora</button>
        </section>
        <section class="card p-5 sm:p-6" aria-labelledby="xp-t">
          <h2 id="xp-t" class="text-[1.3rem] font-extrabold">Publicados ${pub.length ? `<span class="text-ink-mute font-semibold">${pub.length}</span>` : ''}</h2>
          ${pub.length ? `<ul class="mt-2 divide-y divide-line">${pub.map(pubRow).join('')}</ul>` : '<p class="mt-2 text-ink-mute">Todavía no publicaste avisos externos.</p>'}
        </section>
      </div>
    </div>`;
    return {
      html, mount() {
        bindAdminSwitch();
        const again = () => { const y = window.scrollY; render({ keep: true }); window.scrollTo(0, y); };
        let img = null, reading = false;
        const setOcr = (t, cls = 'text-ink-mute') => { const o = $('#xi-ocr'); if (o) { o.className = 'block text-[0.9rem] ' + cls; o.innerHTML = t; } };
        const takeImage = async file => {
          if (!file || !/^image\//.test(file.type)) { toast('Elegí una imagen (JPG, PNG o captura)', 'ph-warning'); return; }
          if (reading) return;
          reading = true; $('#xi-go').disabled = true;
          img = await shrinkImage(file, 1000);
          if (img) $('#xi-thumb').innerHTML = `<img src="${img}" alt="" class="w-full h-full object-cover">`;
          $('#xi-img-t').textContent = file.name && file.name !== 'image.png' ? file.name : 'Captura pegada';
          setOcr('<i class="ph ph-spinner animate-spin"></i> Leyendo la foto…', 'text-brand font-semibold');
          try {
            const text = await ocrImage(file, pc => setOcr(`<i class="ph ph-spinner animate-spin"></i> Leyendo la foto… ${pc}%`, 'text-brand font-semibold'));
            if (text.length < 10) setOcr('No encontramos texto en la foto. Escribilo abajo a mano.', 'text-warn font-semibold');
            else {
              const ta = $('#xi-text'); ta.value = (ta.value.trim() ? ta.value.trim() + '\n\n' : '') + text;
              setOcr('<i class="ph-bold ph-check"></i> Listo: revisá el texto abajo y corregí lo que haya leído mal.', 'text-ok font-semibold');
            }
          } catch (er) { setOcr('No pudimos leer la foto (revisá la conexión). Escribí el texto abajo.', 'text-bad font-semibold'); }
          reading = false; $('#xi-go').disabled = false;
        };
        $('#xi-img').onchange = e => { takeImage(e.target.files[0]); e.target.value = ''; };
        const drop = $('#xi-drop');
        drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('border-brand', 'bg-brand-soft/40'); });
        drop.addEventListener('dragleave', () => drop.classList.remove('border-brand', 'bg-brand-soft/40'));
        drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('border-brand', 'bg-brand-soft/40'); takeImage(e.dataTransfer.files[0]); });
        $('#xi-text').closest('section').addEventListener('paste', e => { const f = [...(e.clipboardData && e.clipboardData.files || [])].find(x => /^image\//.test(x.type)); if (f) { e.preventDefault(); takeImage(f); } });
        $('#xi-go').onclick = () => {
          const text = $('#xi-text').value.trim(), err = $('#xi-err');
          if (text.length < 25) { err.textContent = img ? 'Todavía no hay texto: esperá a que termine de leer la foto o escribilo a mano.' : 'Pegá el texto completo del aviso o subí una foto.'; err.classList.remove('hidden'); return; }
          const d = { id: 'xp' + Date.now().toString(36), src: $('#xi-src').value, author: $('#xi-author').value.trim(), url: $('#xi-url').value.trim(), text, img, at: new Date().toISOString(), status: 'nuevo' };
          Store.saveExt(d); again(); openExtEditor(d.id, again);
        };
        $('#xs-add').onclick = () => {
          const name = $('#xs-name').value.trim(), url = $('#xs-url').value.trim();
          if (!name || !/^https?:\/\//.test(url)) { toast('Poné un nombre y un link que empiece con https://', 'ph-warning'); return; }
          Store.saveExtSources([...Store.extSources(), { name, url, type: /gob|gov|municip|ministerio|oficina de empleo/i.test(name + url) ? 'organismo' : 'web' }]); again();
        };
        $('#xs-run').onclick = () => askConfirm({ title: 'La revisión automática necesita el servidor', text: 'En el sitio real, cada mañana la IA lee estas páginas y deja los avisos nuevos en "Para revisar". En este prototipo no puede entrar a otras páginas: mientras tanto, copiá el texto del aviso y pegalo en "Cargar desde un post".', ok: 'Entendido', cancel: 'Cerrar', icon: 'ph-globe' });
        $('#view').onclick = (async e => {
          const o = e.target.closest('[data-xe-open]'); if (o) { openExtEditor(o.dataset.xeOpen, again); return; }
          const dr = e.target.closest('[data-xe-drop]'); if (dr) { Store.saveExt({ id: dr.dataset.xeDrop, status: 'descartado' }); toast('Aviso descartado', 'ph-trash'); again(); return; }
          const off = e.target.closest('[data-xe-off]'); if (off) { Store.updateJob(off.dataset.xeOff, { status: 'pausada' }); toast('Aviso despublicado', 'ph-eye-slash'); again(); return; }
          const on = e.target.closest('[data-xe-on]'); if (on) { const j = Store.job(on.dataset.xeOn); Store.updateJob(j.id, { status: 'activa', external: { ...j.external, until: new Date(Date.now() + 30 * 864e5).toISOString() } }); toast('Aviso publicado otra vez por 30 días', 'ph-check-circle'); again(); return; }
          const xd = e.target.closest('[data-xs-del]'); if (xd) { const l = Store.extSources(); l.splice(+xd.dataset.xsDel, 1); Store.saveExtSources(l); again(); }
        });
      }
    };
  }

  // Candidato: un aviso externo se postula en el contacto original
  function openExternalApply(j) {
    const x = j.external, s = extSrc(x.src);
    const msg = `Hola, vi en +Humanos el aviso de ${j.title}${j.company && j.company !== 'Empresa de Tucumán' ? ` de ${j.company}` : ''} y me interesa postularme. Les puedo enviar mi CV por acá.`;
    const body = `<span class="w-14 h-14 rounded-2xl bg-brand-soft text-brand grid place-items-center"><i class="ph-fill ph-paper-plane-tilt text-3xl"></i></span>
      <h2 class="mt-4 text-[1.5rem] font-extrabold pr-10 leading-tight">Postulate directo con ${esc(j.company)}</h2>
      <p class="mt-2 text-ink-soft">Este aviso lo encontramos en ${esc(s[1])}${x.author ? ` (${esc(x.author)})` : ''}. La búsqueda la maneja la empresa: mandales tu CV por acá.</p>
      <div class="mt-5 grid gap-2.5">
        ${x.phone ? `<a href="${esc(waLink(x.phone, msg))}" target="_blank" rel="noopener" class="btn btn-primary h-14 justify-center text-[1.05rem]" data-ext-go><i class="ph-fill ph-whatsapp-logo text-xl"></i>Escribir por WhatsApp</a>` : ''}
        ${x.email ? `<a href="mailto:${esc(x.email)}?subject=${encodeURIComponent('Postulación: ' + j.title)}&body=${encodeURIComponent(msg.replace(' por acá', ' adjunto'))}" class="btn ${x.phone ? 'btn-outline' : 'btn-primary'} h-14 justify-center" data-ext-go><i class="ph ph-envelope-simple text-xl"></i>Mandar CV por email</a>` : ''}
        ${x.url ? `<a href="${esc(x.url)}" target="_blank" rel="noopener" class="btn btn-outline h-12 justify-center" data-ext-go><i class="ph ph-arrow-square-out text-lg"></i>Ver la publicación original</a>` : ''}
      </div>
      <p class="mt-4 text-[0.92rem] text-ink-mute"><i class="ph ph-file-pdf"></i> Tené tu CV en PDF a mano para adjuntarlo.</p>
      <div class="mt-5 rounded-[18px] bg-surface p-4">
        <p class="font-semibold">Cuidá tus datos</p>
        <p class="mt-1 text-ink-soft text-[0.95rem]">Nunca pagues para conseguir un trabajo ni para una entrevista. Si te piden plata o algo te parece raro, avisanos.</p>
        <button type="button" id="ext-report" class="mt-2 font-semibold text-bad hover:underline underline-offset-4"><i class="ph ph-flag"></i> Reportar este aviso</button>
      </div>`;
    openSheet(sheetScroll(body), c => {
      $('#ext-report', c).onclick = () => { const jj = Store.job(j.id); Store.updateJob(j.id, { external: { ...jj.external, reports: (jj.external.reports || 0) + 1 } }); closeSheet(true); toast('Gracias, lo vamos a revisar', 'ph-flag'); };
    });
  }

  /* ================= ADMIN: EMPRESAS Y CONSULTORAS ADHERIDAS =================
     Lista todo lo que aparece en "Empresas adheridas": cuentas registradas, perfiles cargados a mano por el admin
     y las cuentas de ejemplo. Desde acá se agrega una empresa a mano, se edita su perfil o se oculta de la página. */
  function adminCompanies() {
    const acc = Store.coAccounts(), profs = Store.coProfilesAll();
    const by = {};
    const get = (name, type) => by[name] || (by[name] = { name, type: type || '', origin: 'ejemplo', email: '', since: '', active: 0, total: 0, last: '' });
    Object.entries(acc).forEach(([email, a]) => { const e = get(a.name, a.type); e.origin = 'registro'; e.email = email; e.since = a.createdAt || ''; e.type = a.type || e.type; });
    Object.entries(profs).forEach(([name, p]) => { if (p.manual) { const e = get(name, p.type); if (e.origin !== 'registro') { e.origin = 'manual'; e.since = p.addedAt || ''; } } });
    Store.jobs().filter(j => !j.external).forEach(j => { const e = get(j.company, j.companyType); e.total++; if (j.status === 'activa') e.active++; if (!e.last || j.postedAt > e.last) e.last = j.postedAt; if (!e.type) e.type = j.companyType; });
    return Object.values(by).map(e => { const p = Store.coProfile(e.name); return { ...e, type: p.type || e.type || companyOf(e.name).type, industry: industryOf(p.industry || companyOf(e.name).industry), city: p.city || '', province: p.province || '', hidden: !!p.hidden }; });
  }

  function openCompanyEditor(name0, onDone) {
    const p0 = name0 ? Store.coProfile(name0) : {};
    const st = { logo: p0.logo || null };
    const type0 = p0.type || (name0 ? companyOf(name0).type : 'Empresa');
    const inp = (id, l, v, ph = '', t = 'text') => `<div><label class="label mt-4" for="ce-${id}">${l}</label><input id="ce-${id}" type="${t}" class="input" value="${esc(v || '')}" placeholder="${esc(ph)}"></div>`;
    const body = `<h2 class="text-[1.6rem] font-extrabold pr-10 leading-tight">${name0 ? 'Editar empresa' : 'Agregar empresa'}</h2>
      <p class="mt-1 text-ink-soft">${name0 ? 'Los cambios se ven en su página y en "Empresas adheridas".' : 'Aparece en "Empresas adheridas" con su página propia, aunque todavía no publique búsquedas.'}</p>
      <p class="label mt-5">Tipo</p>
      <div class="grid grid-cols-2 gap-2">${['Empresa', 'Consultora'].map(t => `<label class="flex items-center gap-2.5 rounded-2xl border border-line px-4 h-12 cursor-pointer has-[:checked]:border-brand has-[:checked]:bg-brand-soft/50 font-semibold"><input type="radio" name="ce-type" value="${t}" class="w-5 h-5 accent-[#3B5BFD]" ${type0 === t ? 'checked' : ''}>${t}</label>`).join('')}</div>
      ${inp('name', 'Nombre', name0, 'Ej.: Estudio Contable Gramajo')}
      <p class="label mt-4">Logo <span class="font-normal text-ink-mute">(opcional)</span></p>
      ${logoPicker('ce-logo', name0, st.logo)}
      <div class="grid sm:grid-cols-2 gap-x-3">
        <div><label class="label mt-4" for="ce-ind">Rubro</label><select id="ce-ind" data-dd class="input">${industryOpts(p0.industry || (name0 ? companyOf(name0).industry : ''))}</select></div>
        <div><label class="label mt-4" for="ce-size">Tamaño</label><select id="ce-size" data-dd class="input"><option value="">Sin dato</option>${SIZES.map(s => `<option ${p0.size === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
        <div><label class="label mt-4" for="ce-prov">Provincia</label><select id="ce-prov" data-dd class="input">${PROVINCES.map(pv => `<option ${(p0.province || 'Tucumán') === pv ? 'selected' : ''}>${pv}</option>`).join('')}</select></div>
        ${inp('city', 'Ciudad', p0.city, 'Ej.: San Miguel de Tucumán')}
      </div>
      ${inp('addr', 'Dirección', p0.address, 'Opcional')}
      <label class="label mt-4" for="ce-desc">Descripción</label><textarea id="ce-desc" rows="4" maxlength="800" class="input h-auto py-3" placeholder="A qué se dedica, hace cuánto, qué la hace un buen lugar para trabajar.">${esc(p0.description || '')}</textarea>
      <p class="label mt-5">Contacto y redes <span class="font-normal text-ink-mute">(se ven en su página)</span></p>
      <div class="grid sm:grid-cols-2 gap-x-3">
        ${inp('web', 'Sitio web', p0.website, 'https://…')}
        ${inp('li', 'LinkedIn', p0.linkedin, 'linkedin.com/company/…')}
        ${inp('ig', 'Instagram', p0.instagram, '@cuenta')}
        ${inp('wa', 'WhatsApp de contacto', p0.contactPhone, '381 …', 'tel')}
      </div>
      ${inp('mail', 'Email de contacto', p0.contactEmail, 'rrhh@…', 'email')}
      <p id="ce-err" class="err hidden mt-3" role="alert"></p>`;
    openSheet(sheetScroll(body) + sheetFoot(`<button type="button" id="ce-save" class="btn btn-primary w-full h-14"><i class="ph-bold ph-check text-xl"></i>${name0 ? 'Guardar cambios' : 'Agregar a Empresas adheridas'}</button>`), c => {
      bindLogoPicker(c, 'ce-logo', () => $('#ce-name', c).value.trim(), st);
      $('#ce-save', c).onclick = () => {
        const v = k => $('#ce-' + k, c).value.trim(), name = v('name'), er = $('#ce-err', c);
        if (name.length < 2) { er.textContent = 'Escribí el nombre.'; er.classList.remove('hidden'); return; }
        if (name !== name0 && Store.companyExists(name)) { er.textContent = 'Ya hay una empresa con ese nombre.'; er.classList.remove('hidden'); return; }
        if (name0 && name !== name0) Store.renameCompany(name0, name);
        const data = { type: $('input[name="ce-type"]:checked', c).value, industry: v('ind'), size: v('size'), province: v('prov'), city: v('city'), address: v('addr'), description: v('desc'),
          website: v('web'), linkedin: v('li'), instagram: v('ig'), contactPhone: v('wa'), contactEmail: v('mail'), logo: st.logo || null };
        if (!name0) Object.assign(data, { manual: true, addedAt: new Date().toISOString() });
        Store.saveCoProfile(name, data);
        closeSheet(true); toast(name0 ? 'Empresa actualizada' : `${name} ya aparece en Empresas adheridas`, 'ph-buildings'); if (onDone) onDone();
      };
    });
  }

  function AdminCompanies() {
    const F = S.admEmp || (S.admEmp = { q: '', type: '' });
    const all = adminCompanies();
    const ORIG = { registro: ['ph-user-circle-check', 'Se registró'], manual: ['ph-hand-pointing', 'Cargada por el admin'], ejemplo: ['ph-flask', 'De ejemplo'] };
    const nC = all.filter(e => e.type === 'Consultora').length;
    const stat = (n, l) => `<div class="rounded-[20px] bg-white border border-line p-4"><p class="font-display text-[2rem] font-extrabold leading-none text-brand">${n}</p><p class="mt-1 text-ink-soft leading-tight">${l}</p></div>`;
    const html = `<div class="max-w-5xl mx-auto px-4 sm:px-6 py-8 md:py-12">
      ${adminSwitch()}
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div><h1 class="text-[2rem] font-extrabold leading-tight">Empresas y consultoras</h1>
          <p class="mt-1 text-ink-soft">Las que se sumaron a +Humanos y las que cargaste vos. Todas aparecen en "Empresas adheridas", salvo las que ocultes.</p></div>
        <button type="button" id="ae-add" class="btn btn-primary h-12 px-5"><i class="ph-bold ph-plus"></i>Agregar empresa</button>
      </div>
      <div class="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        ${stat(all.length, 'Adheridas en total')}${stat(nC, 'Consultoras')}${stat(all.length - nC, 'Empresas')}${stat(all.filter(e => e.active).length, 'Con búsquedas abiertas')}
      </div>
      <div class="mt-6 flex flex-col sm:flex-row gap-3">
        <div class="relative flex-1"><i class="ph ph-magnifying-glass text-xl text-ink-mute absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"></i><input id="ae-q" type="search" class="input pl-12 bg-white" placeholder="Buscar por nombre, rubro o email" value="${esc(F.q)}" aria-label="Buscar empresas"></div>
        <div class="max-w-full overflow-x-auto self-start"><div class="inline-flex rounded-full bg-white border border-line p-1 whitespace-nowrap" role="tablist" aria-label="Tipo">${[['', 'Todas'], ['Consultora', 'Consultoras'], ['Empresa', 'Empresas']].map(([v, l]) => `<button type="button" role="tab" data-ae-type="${v}" aria-selected="${F.type === v}" class="h-10 px-4 rounded-full font-semibold ${F.type === v ? 'bg-ink text-white' : 'text-ink-soft hover:text-ink'}">${l}</button>`).join('')}</div></div>
      </div>
      <ul id="ae-list" class="mt-5 space-y-3"></ul>
    </div>`;
    const draw = () => {
      const q = norm(F.q.trim());
      const list = all.filter(e => (!F.type || e.type === F.type) && (!q || norm(`${e.name} ${e.industry} ${e.email}`).includes(q)))
        .sort((a, b) => (b.since || b.last || '').localeCompare(a.since || a.last || '') || a.name.localeCompare(b.name, 'es'));
      $('#ae-list').innerHTML = list.length ? list.map(e => {
        const o = ORIG[e.origin], loc = [e.city, e.province].filter(Boolean).join(', ');
        return `<li class="rounded-[20px] bg-white border border-line p-4 sm:p-5 ${e.hidden ? 'opacity-70' : ''}">
          <div class="flex items-start gap-3.5">
            ${logo(e.name, 'w-14 h-14 text-base')}
            <div class="min-w-0 flex-1">
              <p class="flex flex-wrap items-center gap-x-2 gap-y-1"><span class="font-display font-bold text-[1.15rem] leading-tight">${esc(e.name)}</span><span class="rounded-full ${e.type === 'Consultora' ? 'bg-lilac text-brand' : 'bg-surface text-ink-soft'} px-2.5 py-0.5 text-[0.8rem] font-bold">${esc(e.type)}</span>${e.hidden ? '<span class="rounded-full bg-sun-soft text-warn px-2.5 py-0.5 text-[0.8rem] font-bold"><i class="ph-bold ph-eye-slash"></i> Oculta</span>' : ''}</p>
              <p class="text-ink-soft text-[0.95rem] mt-0.5">${[e.industry, loc].filter(Boolean).map(esc).join(' · ') || '<span class="text-ink-mute">Sin rubro ni ubicación</span>'}</p>
              <p class="mt-1.5 text-[0.9rem] text-ink-mute flex flex-wrap gap-x-3 gap-y-1">
                <span><i class="ph ${o[0]}"></i> ${o[1]}${e.since ? ` ${ago(e.since).toLowerCase()}` : ''}</span>
                ${e.email ? `<span><i class="ph ph-envelope-simple"></i> ${esc(e.email)}</span>` : ''}
                <span><i class="ph ph-briefcase"></i> ${e.active} abierta${e.active === 1 ? '' : 's'} de ${e.total}</span>
                ${e.last ? `<span><i class="ph ph-clock"></i> Última publicación ${ago(e.last).toLowerCase()}</span>` : ''}</p>
            </div>
          </div>
          <div class="mt-3 flex flex-wrap gap-2">
            <a href="#/e?n=${encodeURIComponent(e.name)}" class="btn btn-outline btn-sm"><i class="ph ph-eye"></i>Ver página</a>
            <button type="button" data-ae-edit="${esc(e.name)}" class="btn btn-outline btn-sm"><i class="ph ph-pencil-simple"></i>Editar perfil</button>
            <button type="button" data-ae-hide="${esc(e.name)}" class="btn btn-outline btn-sm">${e.hidden ? '<i class="ph ph-eye"></i>Mostrar en Empresas' : '<i class="ph ph-eye-slash"></i>Ocultar de Empresas'}</button>
            ${e.origin === 'manual' && !e.total ? `<button type="button" data-ae-del="${esc(e.name)}" class="btn btn-outline btn-sm text-bad"><i class="ph ph-trash"></i>Borrar</button>` : ''}
          </div></li>`;
      }).join('') : `<li>${emptyState('ph-buildings', 'No hay empresas con ese filtro', 'Probá con otro nombre o agregá una.')}</li>`;
    };
    return {
      html, mount() {
        bindAdminSwitch(); draw();
        const again = () => { const y = window.scrollY; render({ keep: true }); window.scrollTo(0, y); };
        $('#ae-add').onclick = () => openCompanyEditor('', again);
        $('#ae-q').oninput = e => { F.q = e.target.value; draw(); };
        $('#view').onclick = (async e => {
          const t = e.target.closest('[data-ae-type]'); if (t) { F.type = t.dataset.aeType; again(); return; }
          const ed = e.target.closest('[data-ae-edit]'); if (ed) { openCompanyEditor(ed.dataset.aeEdit, again); return; }
          const h = e.target.closest('[data-ae-hide]'); if (h) { const n = h.dataset.aeHide, on = !Store.coProfile(n).hidden; Store.saveCoProfile(n, { hidden: on }); toast(on ? `${n} ya no aparece en Empresas adheridas` : `${n} vuelve a aparecer en Empresas adheridas`, on ? 'ph-eye-slash' : 'ph-eye'); again(); return; }
          const d = e.target.closest('[data-ae-del]'); if (d) { if (await askConfirm({ title: `¿Borrar ${esc(d.dataset.aeDel)}?`, text: 'Se borra su perfil y deja de aparecer en Empresas adheridas.', ok: 'Borrar', danger: true })) { Store.removeCoProfile(d.dataset.aeDel); toast('Empresa borrada', 'ph-trash'); again(); } }
        });
      }
    };
  }

  // Solo se guarda la huella (SHA-256) de la clave, no la clave. En producción el acceso se valida en el servidor.
  const ADMIN_HASH = '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918';
  const sha256 = async t => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)))].map(b => b.toString(16).padStart(2, '0')).join('');
  const adminOn = () => { try { return sessionStorage.getItem('emplea.admin') === '1'; } catch (e) { return !!S.admin; } };
  const adminSet = on => { S.admin = on; try { on ? sessionStorage.setItem('emplea.admin', '1') : sessionStorage.removeItem('emplea.admin'); } catch (e) { /* sin storage */ } };
  const SP_ST = {
    nuevo: ['Por revisar', 'bg-sun-soft text-ink'],
    aprobado: ['Aprobado', 'bg-ok/10 text-ok'],
    descartado: ['Descartado', 'bg-surface text-ink-mute border border-line']
  };
  const spSt = x => SP_ST[x.status] ? x.status : 'nuevo';
  function seedAdminCvs() {
    try { if (localStorage.getItem('emplea.adminseed')) return; localStorage.setItem('emplea.adminseed', '1'); } catch (e) { return; }
    const d = h => new Date(Date.now() - h * 3600e3).toISOString();
    const mk = (id, name, phone, email, province, area, title, h, status, ext = 'pdf') => ({ id, name, phone, email, province, area, demo: true, status,
      cvName: `CV ${name}.${ext}`, cvSize: 90000 + (id.length * 13771) % 200000, cvType: ext, date: d(h),
      cvText: `${name}\n${title}\n${province} · ${phone} · ${email}\n\nPerfil\n${title} con experiencia en empresas de la región. Responsable, puntual y con ganas de crecer.\n\nExperiencia\n2021 - actual · ${title}\n2018 - 2021 · Puesto anterior en el rubro\n\nEducación\nSecundario completo. Cursos de formación profesional.` });
    const demo = [
      mk('spd1', 'Sofía Herrera', '381 555-2041', 'sofia.herrera@mail.com', 'Tucumán', 'administracion', 'Asistente administrativa', 3, 'nuevo'),
      mk('spd2', 'Martín Quiroga', '387 555-7790', 'mquiroga@mail.com', 'Salta', 'ventas', 'Vendedor de salón', 9, 'nuevo', 'docx'),
      mk('spd3', 'Valentina Paz', '388 555-3318', 'valepaz@mail.com', 'Jujuy', 'salud', 'Enfermera profesional', 26, 'nuevo'),
      mk('spd4', 'Joaquín Ledesma', '381 555-9902', 'joaquin.ledesma@mail.com', 'Tucumán', 'logistica', 'Chofer y repartidor', 50, 'aprobado'),
      mk('spd5', 'Camila Ríos', '385 555-4471', 'camirios@mail.com', 'Santiago del Estero', 'atencion', 'Atención al cliente', 120, 'aprobado'),
      mk('spd6', 'Nicolás Albornoz', '383 555-6620', 'nalbornoz@mail.com', 'Catamarca', 'tecnologia', 'Soporte técnico IT', 200, 'descartado', 'docx')
    ];
    const have = new Set(Store.spontCvs().map(x => x.id));
    demo.reverse().forEach(x => { if (!have.has(x.id)) Store.addSpontCv(x); });
  }

  function AdminLogin() {
    return {
      title: 'Admin',
      html: `<div class="min-h-[calc(100vh-4rem)] grid place-items-center px-4 py-10 bg-surface">
        <form id="adm-login" class="w-full max-w-sm bg-white rounded-[24px] border border-line p-6 sm:p-7 shadow-lift">
          <span class="w-14 h-14 rounded-2xl bg-ink text-white grid place-items-center"><i class="ph-fill ph-lock-simple text-2xl"></i></span>
          <h1 class="mt-4 text-[1.6rem] font-extrabold tracking-tight leading-tight">Panel de administración</h1>
          <p class="mt-1 text-ink-soft">Acceso solo para el equipo de +Humanos.</p>
          <label class="label mt-5 block" for="adm-pass">Clave</label>
          <div class="relative"><i class="ph ph-key absolute left-4 top-1/2 -translate-y-1/2 text-xl text-ink-mute"></i>
            <input id="adm-pass" type="password" class="input pl-12" autocomplete="current-password" placeholder="Tu clave" required></div>
          <p id="adm-err" class="err hidden"></p>
          <button class="btn btn-primary w-full justify-center mt-4 h-12">Ingresar</button>
        </form></div>`,
      mount() {
        $('#adm-pass').focus();
        $('#adm-login').onsubmit = async e => {
          e.preventDefault();
          let ok = false; try { ok = (await sha256($('#adm-pass').value.trim())) === ADMIN_HASH; } catch (er) { ok = false; }
          if (!ok) { const er = $('#adm-err'); er.textContent = 'La clave no es correcta.'; er.classList.remove('hidden'); return; }
          adminSet(true); render();
        };
      }
    };
  }

  const adminSwitch = () => {
    const pend = Store.delReqs().filter(r => r.status === 'pendiente').length;
    return `<div class="-mx-4 px-4 overflow-x-auto mb-6"><div class="inline-flex rounded-full bg-white border border-line p-1 whitespace-nowrap" role="tablist" aria-label="Secciones del panel">
      ${[['cvs', 'ph-tray', 'CVs recibidos', 0], ['datos', 'ph-shield-check', 'Pedidos de datos', pend], ['notas', 'ph-coffee', 'Charla de café', 0], ['ext', 'ph-sparkle', 'Avisos externos', Store.extQueue().filter(x => x.status === 'nuevo').length], ['emp', 'ph-buildings', 'Empresas', 0]].map(([v, ic, l, n]) => `<button type="button" role="tab" data-adm-view="${v}" aria-selected="${(S.admView || 'cvs') === v}" class="h-10 px-4 rounded-full font-semibold inline-flex items-center gap-1.5 ${(S.admView || 'cvs') === v ? 'bg-ink text-white' : 'text-ink-soft hover:text-ink'}"><i class="ph ${ic} text-lg"></i>${l}${n ? `<span class="rounded-full bg-bad text-white px-1.5 text-[0.75rem] leading-5">${n}</span>` : ''}</button>`).join('')}
    </div></div>`;
  };
  const bindAdminSwitch = () => $$('[data-adm-view]').forEach(b => b.onclick = () => { S.admView = b.dataset.admView; render(); });

  function AdminRequests() {
    const all = Store.delReqs();
    const pend = all.filter(r => r.status === 'pendiente'), done = all.filter(r => r.status !== 'pendiente');
    const ORIG = { formulario: 'Formulario de privacidad', cuenta: 'Lo borró desde su cuenta', consultora: 'Borrado por una consultora' };
    const card = r => {
      const m = matchesOf(r), left = bizDaysLeft(r.due), late = left <= 0;
      return `<li class="card p-4 sm:p-5">
        <div class="flex flex-wrap items-start gap-3">
          ${avatar(r.name, 'w-11 h-11 text-sm')}
          <div class="min-w-0 flex-1"><p class="font-bold">${esc(r.name)}</p><p class="text-ink-mute text-[0.92rem]">${[r.phone, r.email].filter(Boolean).map(esc).join(' · ')}</p>
            <p class="text-ink-mute text-[0.88rem] mt-0.5">Pedido el ${fmtDT(r.at)}</p></div>
          <span class="rounded-full px-2.5 py-1 text-[0.8rem] font-bold ${late ? 'bg-bad/10 text-bad' : left <= 2 ? 'bg-sun-soft text-warn' : 'bg-surface text-ink-soft'}">${late ? 'Vencido' : `Vence en ${left} ${plural(left, 'día hábil', 'días hábiles')}`}</span>
        </div>
        ${r.msg ? `<p class="mt-3 rounded-[14px] bg-surface p-3 text-ink-soft">${esc(r.msg)}</p>` : ''}
        <div class="mt-3 text-[0.95rem]"><p class="font-semibold">Qué encontramos</p>
          <p class="text-ink-soft">${m.apps.length || m.sp.length ? `${m.apps.length} ${plural(m.apps.length, 'postulación', 'postulaciones')}${m.companies.length ? ` (en ${m.companies.map(esc).join(', ')})` : ''}${m.sp.length ? ` y ${m.sp.length} CV enviado al sitio` : ''}.` : 'No hay datos con ese celular o email.'}</p></div>
        <div class="mt-4 flex flex-wrap gap-2">
          <button type="button" data-dr-erase="${r.id}" class="btn btn-primary btn-sm"><i class="ph-bold ph-trash"></i>${m.apps.length || m.sp.length ? 'Borrar sus datos' : 'Marcar como resuelto'}</button>
          ${r.phone ? `<a href="${waLink(r.phone, `Hola ${r.name.split(' ')[0]}, te escribimos de +Humanos por tu pedido de borrar tus datos.`)}" target="_blank" rel="noopener" class="btn btn-outline btn-sm"><i class="ph-fill ph-whatsapp-logo text-ok"></i>Escribirle</a>` : ''}
        </div></li>`;
    };
    return {
      title: 'Admin',
      html: `<div class="max-w-4xl mx-auto px-4 sm:px-6 py-6 md:py-8">
        ${adminSwitch()}
        <h1 class="text-[1.75rem] md:text-[2rem] font-extrabold tracking-tight leading-tight">Pedidos de datos personales</h1>
        <p class="text-ink-soft mt-1">Pedidos de borrado según la Ley 25.326. Hay <b>5 días hábiles</b> para resolverlos. Al borrar, se eliminan el CV, las postulaciones y los datos de la persona en todas las consultoras.</p>
        <h2 class="mt-6 text-lg font-extrabold">Pendientes <span class="text-ink-mute font-semibold">${pend.length}</span></h2>
        ${pend.length ? `<ul class="mt-3 space-y-3">${pend.map(card).join('')}</ul>` : `<div class="mt-3">${emptyState('ph-shield-check', 'No hay pedidos pendientes', 'Los pedidos llegan desde el formulario de la Política de privacidad.')}</div>`}
        <h2 class="mt-10 text-lg font-extrabold">Registro <span class="text-ink-mute font-semibold">${done.length}</span></h2>
        <p class="text-ink-mute text-[0.92rem]">Queda como constancia de cada borrado.</p>
        ${done.length ? `<ul class="mt-3 card divide-y divide-line">${done.map(r => `<li class="px-4 py-3 flex flex-wrap items-center gap-x-3 gap-y-1">
            <i class="ph-fill ph-check-circle text-ok text-xl"></i><span class="font-semibold">${esc(r.name)}</span>
            <span class="text-ink-mute text-[0.9rem]">${esc(ORIG[r.origin] || '')}${r.company ? ` · ${esc(r.company)}` : ''}${r.result ? ` · ${esc(r.result)}` : ''}</span>
            <span class="ml-auto text-ink-mute text-[0.9rem]">${fmtDT(r.doneAt || r.at)}</span></li>`).join('')}</ul>` : '<p class="mt-3 text-ink-mute">Todavía no hay borrados registrados.</p>'}
      </div>`,
      mount() {
        bindAdminSwitch();
        $$('[data-dr-erase]').forEach(b => b.onclick = async () => {
          const r = Store.delReqs().find(x => x.id === b.dataset.drErase); if (!r) return;
          const m = matchesOf(r), has = m.apps.length || m.sp.length;
          if (has && !(await askConfirm({ title: `¿Borrar los datos de ${r.name}?`, text: 'Se borran su CV, sus postulaciones y sus datos en todas las consultoras. No se puede deshacer.', ok: 'Borrar datos', danger: true, icon: 'ph-trash' }))) return;
          const res = has ? await Store.erasePerson({ phone: r.phone, email: r.email }, null) : { apps: 0, cvs: 0 };
          Store.updateDelReq(r.id, { status: 'completado', doneAt: new Date().toISOString(), result: has ? `${res.apps} postulaciones y ${res.cvs} CVs` : 'Sin datos para borrar' });
          toast(has ? `Borraste los datos de ${r.name.split(' ')[0]}` : 'Pedido resuelto', 'ph-check-circle'); render();
        });
      }
    };
  }

  function AdminPage() {
    if (!adminOn()) return AdminLogin();
    if (S.admView === 'datos') return AdminRequests();
    if (S.admView === 'notas') return AdminPosts();
    if (S.admView === 'ext') return AdminExternal();
    if (S.admView === 'emp') return AdminCompanies();
    seedAdminCvs();
    const F = S.adm || (S.adm = { st: 'nuevo', q: '', prov: '', area: '' });
    const all = Store.spontCvs();
    const cnt = k => all.filter(x => spSt(x) === k).length;
    const week = all.filter(x => daysSince(x.date) <= 7).length;
    const stat = (ic, n, l, tone) => `<div class="rounded-[20px] bg-white border border-line p-4 sm:p-5 flex items-center gap-3"><span class="w-11 h-11 rounded-xl ${tone} grid place-items-center shrink-0"><i class="ph-fill ${ic} text-xl"></i></span><div class="min-w-0"><p class="text-[1.6rem] font-extrabold leading-none">${n}</p><p class="text-ink-mute text-[0.92rem] mt-1 leading-tight">${l}</p></div></div>`;
    const tabs = [['nuevo', 'Por revisar'], ['aprobado', 'Aprobados'], ['descartado', 'Descartados'], ['', 'Todos']];
    const provs = [...new Set(all.map(x => x.province).filter(Boolean))].sort();
    const areas = [...new Set(all.map(x => x.area).filter(Boolean))];
    return {
      title: 'Admin',
      html: `<div class="max-w-6xl mx-auto px-4 sm:px-6 py-6 md:py-8">
        ${adminSwitch()}
        <h1 class="text-[1.75rem] md:text-[2rem] font-extrabold tracking-tight leading-tight">CVs recibidos</h1>
        <p class="text-ink-soft mt-1">Llegan desde el botón <b>Enviar CV</b> del sitio. Los que aprobás pasan a la Base de datos de las empresas y consultoras.</p>
        <div class="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
          ${stat('ph-tray', cnt('nuevo'), 'Por revisar', 'bg-sun text-ink')}
          ${stat('ph-check-circle', cnt('aprobado'), 'En la Base de datos', 'bg-ok/10 text-ok')}
          ${stat('ph-calendar-blank', week, 'Últimos 7 días', 'bg-brand-soft text-brand')}
          ${stat('ph-files', all.length, 'Total recibidos', 'bg-surface text-ink')}
        </div>
        <div class="mt-6 flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0" role="tablist">
          ${tabs.map(([k, l]) => `<button type="button" role="tab" aria-selected="${F.st === k}" data-adm-tab="${k}" class="shrink-0 inline-flex items-center gap-2 h-10 px-4 rounded-full font-semibold ${F.st === k ? 'bg-ink text-white' : 'bg-white border border-line text-ink-soft hover:bg-surface'}">${l}<span class="text-[0.82rem] ${F.st === k ? 'text-white/80' : 'text-ink-mute'}">${k ? cnt(k) : all.length}</span></button>`).join('')}
        </div>
        <div class="mt-3 grid gap-2.5 md:grid-cols-[minmax(0,1fr)_14rem_14rem]">
          <div class="relative"><i class="ph ph-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-xl text-ink-mute"></i><input id="adm-q" class="input pl-12 bg-white" placeholder="Buscar por nombre, teléfono o email" value="${esc(F.q)}" aria-label="Buscar"></div>
          <select id="adm-prov" data-dd class="input bg-white" aria-label="Provincia"><option value="">Todas las provincias</option>${provs.map(p => `<option ${p === F.prov ? 'selected' : ''}>${esc(p)}</option>`).join('')}</select>
          <select id="adm-area" data-dd class="input bg-white" aria-label="Área"><option value="">Todas las áreas</option>${areas.map(a => `<option value="${a}" ${a === F.area ? 'selected' : ''}>${esc(areaOf(a).label)}</option>`).join('')}</select>
        </div>
        <div id="adm-list" class="mt-4"></div>
      </div>`,
      mount() {
        bindAdminSwitch();
        const draw = () => {
          const q = norm(F.q.trim());
          const list = Store.spontCvs().filter(x => (!F.st || spSt(x) === F.st) && (!F.prov || x.province === F.prov) && (!F.area || x.area === F.area)
            && (!q || norm(`${x.name} ${x.phone} ${x.email}`).includes(q) || digits(x.phone).includes(digits(F.q)) && digits(F.q).length > 2))
            .sort((a, b) => new Date(b.date) - new Date(a.date));
          const el = $('#adm-list');
          if (!list.length) { el.innerHTML = emptyState('ph-tray', F.st === 'nuevo' && !q && !F.prov && !F.area ? 'No hay CVs por revisar' : 'No hay CVs con esos filtros', F.st === 'nuevo' ? 'Cuando alguien envíe su CV desde el sitio, aparece acá.' : 'Probá con otra búsqueda o filtro.'); return; }
          const ibtn = (attr, ic, l, cls = '') => `<button type="button" ${attr} title="${l}" aria-label="${l}" class="icon-btn w-10 h-10 border border-line hover:bg-surface ${cls}"><i class="ph-bold ${ic} text-lg"></i></button>`;
          el.innerHTML = `<div class="hidden lg:grid grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)_minmax(0,1fr)_8rem_auto] gap-4 px-5 pb-2 text-[0.85rem] font-semibold text-ink-mute uppercase tracking-wide">
              <span>Candidato</span><span>Provincia · Área</span><span>Archivo</span><span>Estado</span><span class="w-[13.5rem] text-right">Acciones</span></div>
            <ul class="space-y-2.5">${list.map(x => {
              const st = spSt(x), [sl, sc] = SP_ST[st];
              return `<li class="bg-white rounded-[18px] border border-line p-4 lg:px-5 grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)_minmax(0,1fr)_8rem_auto] lg:items-center">
                <div class="flex items-center gap-3 min-w-0">${avatar(x.name, 'w-11 h-11 text-sm')}<div class="min-w-0"><p class="font-bold truncate">${esc(x.name)}</p><p class="text-ink-mute text-[0.9rem] truncate">${esc(x.phone)}${x.email ? ' · ' + esc(x.email) : ''}</p></div>
                  <span class="lg:hidden ml-auto shrink-0 rounded-full px-2.5 py-1 text-[0.8rem] font-bold ${sc}">${sl}</span></div>
                <p class="text-ink-soft min-w-0 truncate"><i class="ph ph-map-pin text-ink-mute"></i> ${esc(x.province || 'Sin provincia')} · ${esc(x.area ? areaOf(x.area).label : 'Sin área')}</p>
                <p class="text-ink-soft min-w-0 truncate"><span class="inline-flex rounded-md px-1.5 py-0.5 text-[0.75rem] font-bold mr-1 ${x.cvType === 'pdf' ? 'bg-[#FFE4E4] text-[#C62828]' : 'bg-brand-soft text-brand'}">${x.cvType === 'pdf' ? 'PDF' : 'WORD'}</span>${x.cvSize ? fmtSize(x.cvSize) : ''} · ${ago(x.date)}${x.consent || x.demo ? ` <i class="ph-fill ph-shield-check text-ok" title="Aceptó el uso de sus datos el ${fmtDT((x.consent || {}).at || x.date)}" aria-label="Consentimiento registrado"></i>` : ''}</p>
                <span class="hidden lg:inline-flex w-fit rounded-full px-2.5 py-1 text-[0.8rem] font-bold ${sc}">${sl}</span>
                <div class="flex items-center gap-2 lg:justify-end flex-wrap">
                  <button type="button" data-adm-view="${x.id}" class="btn btn-outline h-10 px-3.5"><i class="ph-bold ph-file-text"></i>Ver CV</button>
                  ${st !== 'aprobado' ? `<button type="button" data-adm-ok="${x.id}" class="btn btn-primary h-10 px-3.5"><i class="ph-bold ph-check"></i>Aprobar</button>` : ibtn(`data-adm-undo="${x.id}"`, 'ph-arrow-counter-clockwise', 'Quitar de la Base de datos')}
                  <a href="${waLink(x.phone, `Hola ${x.name.split(' ')[0]}, te escribimos de +Humanos por el CV que nos enviaste.`)}" target="_blank" rel="noopener" title="WhatsApp" aria-label="Escribir por WhatsApp" class="icon-btn w-10 h-10 border border-line hover:bg-surface text-ok"><i class="ph-fill ph-whatsapp-logo text-lg"></i></a>
                  ${st !== 'descartado' ? ibtn(`data-adm-no="${x.id}"`, 'ph-x', 'Descartar') : ''}
                  ${ibtn(`data-adm-del="${x.id}"`, 'ph-trash', 'Eliminar', 'text-[#C62828]')}
                </div></li>`; }).join('')}</ul>`;
        };
        const redraw = () => { const y = window.scrollY; render({ keep: true }); window.scrollTo({ top: y, behavior: 'instant' }); };
        draw();
        let t; $('#adm-q').oninput = e => { F.q = e.target.value; clearTimeout(t); t = setTimeout(draw, 120); };
        $('#adm-prov').onchange = e => { F.prov = e.target.value; draw(); };
        $('#adm-area').onchange = e => { F.area = e.target.value; draw(); };
        $$('[data-adm-tab]').forEach(b => b.onclick = () => { F.st = b.dataset.admTab; redraw(); });
        const find = id => Store.spontCvs().find(x => x.id === id);
        $('#adm-list').onclick = async e => {
          const b = e.target.closest('button'); if (!b) return;
          const id = b.dataset.admView || b.dataset.admOk || b.dataset.admUndo || b.dataset.admNo || b.dataset.admDel; const x = id && find(id); if (!x) return;
          if (b.dataset.admView) { viewCv(null, { sp: x, name: x.name }); return; }
          if (b.dataset.admOk) { Store.updateSpontCv(id, { status: 'aprobado', reviewedAt: new Date().toISOString() }); toast(`${x.name.split(' ')[0]} ya está en la Base de datos`, 'ph-check-circle'); }
          if (b.dataset.admUndo) { Store.updateSpontCv(id, { status: 'nuevo' }); toast('Lo quitaste de la Base de datos', 'ph-arrow-counter-clockwise'); }
          if (b.dataset.admNo) { Store.updateSpontCv(id, { status: 'descartado', reviewedAt: new Date().toISOString() }); toast('CV descartado', 'ph-x'); }
          if (b.dataset.admDel) {
            const ok = await askConfirm({ title: `¿Eliminar el CV de ${x.name}?`, text: 'Se borra el archivo y sus datos. No se puede deshacer.', ok: 'Eliminar', danger: true, icon: 'ph-trash' });
            if (!ok) return;
            Store.removeSpontCv(id); await Store.delCv('sp-' + id); toast('CV eliminado', 'ph-trash');
          }
          redraw();
        };
      }
    };
  }

  const ROUTES = {
    '/': Welcome, '/chat': Chat, '/vacantes': Jobs, '/guardadas': Saved, '/postulaciones': MyApps, '/notificaciones': Notifs,
    '/empresa': CoHome, '/empresa/busquedas': CoDash, '/empresa/b': JobSpace, '/empresa/candidatos': CoCands,
    '/empresa/perfil': CoProfile, '/empresa/cliente': ClientPage, '/empresa/entrevistas': Interviews, '/empresa/reportes': Reports, '/empresa/hub': HubPage, '/recomendacion': RefPermission, '/empresa/candidato': CandidatePage, '/empresa/planes': Plans, '/e': CompanyPage, '/terna': ClientTerna, '/terna-respuesta': TernaReply,
    '/nosotros': AboutPage, '/vacante': JobPage, '/empresas': Employers, '/faqs': () => InfoPage('faqs'), '/terminos': () => InfoPage('terminos'), '/privacidad': () => InfoPage('privacidad'), '/admin': AdminPage, '/cafe': CafePage, '/cafe/nota': CafePost
  };
  const TITLES = { '/admin': 'Admin', '/empresa/hub': 'Hub', '/recomendacion': 'Recomendación', '/cafe': 'Charla de café', '/cafe/nota': 'Charla de café', '/empresa/reportes': 'Reportes', '/empresa/cliente': 'Cliente', '/empresa/candidato': 'Perfil', '/empresa/candidatos': 'Base de datos', '/vacante': 'Aviso', '/empresa/entrevistas': 'Entrevistas', '/empresas': 'Empresas adheridas', '/nosotros': 'Nosotros', '/faqs': 'Preguntas frecuentes', '/terminos': 'Términos y condiciones', '/privacidad': 'Política de privacidad', '/chat': 'Armá tu alerta', '/vacantes': 'Vacantes', '/guardadas': 'Guardadas', '/postulaciones': 'Mis postulaciones', '/notificaciones': 'Notificaciones', '/empresa': 'Inicio', '/empresa/busquedas': 'Búsquedas', '/empresa/b': 'Búsqueda', '/empresa/perfil': 'Mi perfil', '/empresa/planes': 'Planes', '/e': 'Empresa', '/terna': 'Terna', '/terna-respuesta': 'Respuesta de terna' };

  function render(opts = {}) {
    const { path, params } = parseHash();
    // Links viejos: Postulantes ahora vive dentro de cada búsqueda
    if (path === '/empresa/postulantes') {
      const jid = params.get('job');
      if (params.get('client')) S.dashClient = params.get('client');
      location.replace(jid ? `#/empresa/b?id=${encodeURIComponent(jid)}` : '#/empresa/busquedas'); return;
    }
    // El chat de alertas se reemplazó por un formulario: los links viejos abren el formulario en Notificaciones
    if (path === '/empresa/planes' && !BILLING) { location.replace('#/empresa'); return; }
    if (path === '/chat') { location.replace('#/notificaciones'); setTimeout(() => openAlertForm(), 250); return; }
    S.dirty = false;
    destroySwipers();
    closeSheet(true);
    document.body.classList.remove('has-tbar');
    if (path !== '/chat') chatToken++;
    // Pantalla de ingreso del candidato: sin el menú de candidato hasta que ingrese
    const mode = path === '/admin' ? 'admin' : path.startsWith('/terna') ? 'terna' : (path === '/empresa' || path.startsWith('/empresa/')) ? 'company' : path === '/' || path === '/empresas' || path === '/recomendacion' || INFO_PATHS.includes(path) ? 'home' : path === '/chat' ? 'chat'
      : (path === '/postulaciones' || path === '/notificaciones') && !Store.candidate() ? 'login' : 'candidate';
    { const src = params.get('src'), jid = params.get('id') || params.get('job'); if (src && jid && CHANNELS.some(c => c[0] === src)) { try { sessionStorage.setItem('emplea.src.' + jid, src); } catch (e) { /* sin storage */ } } }
    checkAlerts(); // Fedfu revisa si hay vacantes nuevas para las alertas del candidato
    let fn = ROUTES[path] || Welcome;
    if (mode === 'company' && !Store.company() && path !== '/empresa/planes') fn = CoLogin;
    renderTop(mode, path);
    renderBottom(mode, path);
    const out = fn(params);
    view.onclick = null; // cada página pone su propio manejador de clics
    view.innerHTML = out.html;
    if (ddOpen) ddOpen.close();
    if (out.mount) out.mount();
    enhanceSelects(view);
    document.title = (out.title ? out.title + ' · ' : TITLES[path] ? TITLES[path] + ' · ' : '') + '+Humanos';
    if (!opts.keep) window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function refresh() { const y = window.scrollY; render({ keep: true }); window.scrollTo({ top: y, behavior: 'instant' }); }

  /* ---------------- Eventos globales ---------------- */
  function toggleSave(id) {
    const on = Store.toggleSaved(id);
    $$(`[data-save-job="${id}"]`).forEach(b => {
      b.classList.toggle('text-brand', on);
      b.setAttribute('aria-pressed', on);
      b.setAttribute('aria-label', on ? 'Quitar de guardadas' : 'Guardar vacante');
      b.innerHTML = `<i class="${on ? 'ph-fill' : 'ph'} ph-bookmark-simple text-2xl"></i>`;
    });
    toast(on ? 'Vacante guardada' : 'Quitada de guardadas', on ? 'ph-bookmark-simple' : 'ph-bookmark-simple');
    if (parseHash().path === '/guardadas') { if (sheetRoot.firstElementChild) S.dirty = true; else refresh(); }
  }
  document.addEventListener('click', e => {
    const sv = e.target.closest('[data-save-job]');
    if (sv) { e.preventDefault(); e.stopPropagation(); toggleSave(sv.dataset.saveJob); return; }
    if (e.target.closest('[data-send-cv]')) { e.preventDefault(); openSendCv(); return; }
    if (e.target.closest('[data-del-req]')) { e.preventDefault(); openDeleteRequest(); return; }
    if (e.target.closest('[data-alert-new]')) { e.preventDefault(); openAlertForm(); return; }
    if (e.target.closest('[data-hub-join]')) { e.preventDefault(); openHubJoin(); return; }
    const ap = e.target.closest('[data-apply-job]');
    if (ap) { e.preventDefault(); e.stopPropagation(); openApply(ap.dataset.applyJob); return; }
    if (e.target.closest('[data-close-sheet]')) { closeSheet(); return; }
    const op = e.target.closest('[data-open-job]');
    if (op) { e.preventDefault(); openJob(op.dataset.openJob); }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && sheetRoot.firstElementChild) closeSheet();
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-open-job][tabindex]')) { e.preventDefault(); openJob(e.target.dataset.openJob); }
  });
  window.addEventListener('hashchange', () => render());

  render();

  // Exponer utilidades puras para pruebas
  window.__emplea = { analyzeCv, score, isForYou, detectArea, detectProvince, detectModality, detectSeniority, demoPdf, render };
})();
