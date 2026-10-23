/* Capa de datos del prototipo.
   - Vacantes, postulaciones y preferencias: localStorage
   - CVs en PDF: IndexedDB vía localForage
   Reemplazar estas funciones por llamadas a tu API cuando haya backend. */

const Store = (() => {
  const V = 'v1';
  const K = {
    jobs: `emplea.jobs.${V}`, apps: `emplea.apps.${V}`, saved: 'emplea.saved', profile: 'emplea.profile',
    contact: 'emplea.contact', company: 'emplea.company', cvMeta: 'emplea.cvmeta'
  };
  const read = (k, f) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : f; } catch (e) { return f; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* almacenamiento lleno o bloqueado */ } };
  const isoDaysAgo = (d, h = 3) => new Date(Date.now() - d * 864e5 - h * 36e5).toISOString();

  let jobs = read(K.jobs, null);
  if (!Array.isArray(jobs)) {
    jobs = SEED_JOBS.map((j, i) => ({ ...j, postedAt: isoDaysAgo(j.daysAgo, (i % 6) + 1), status: 'activa' }));
    write(K.jobs, jobs);
  }

  // Los avisos externos vencen solos (no hay una empresa que los cierre)
  if (jobs.some(j => j.external && j.status === 'activa' && j.external.until && new Date(j.external.until) < new Date())) {
    jobs.forEach(j => { if (j.external && j.status === 'activa' && j.external.until && new Date(j.external.until) < new Date()) j.status = 'vencida'; });
    write(K.jobs, jobs);
  }

  const seedApp = a => {
    const c = SEED_CANDIDATES.find(x => x.id === a.cand) || {};
    return { id: a.id, jobId: a.jobId, cand: a.cand, name: c.name, email: c.email, phone: c.phone, message: a.message || '',
      cvName: `CV ${c.name}.pdf`, cvSize: 48000, date: isoDaysAgo(a.daysAgo, 2), status: a.status, mine: false };
  };
  let apps = read(K.apps, null);
  if (!Array.isArray(apps)) {
    apps = SEED_APPS.map(seedApp);
    write(K.apps, apps);
  }

  // Migración: datos guardados antes de que existieran las empresas cliente
  const SEED_REV = 5;
  // rev 5: skills y competencias en las vacantes de ejemplo ya guardadas
  if (read('emplea.seedrev', 1) === 4) {
    jobs.forEach(j => { const sj = SEED_JOBS.find(x => x.id === j.id || x.id === j.demoOf); if (sj && sj.skills && !j.skills) { j.skills = sj.skills.map(x => ({ ...x })); j.comps = [...(sj.comps || [])]; } });
    write(K.jobs, jobs); write('emplea.seedrev', SEED_REV);
  }
  if (read('emplea.seedrev', 1) === 3) {
    jobs.forEach(j => { const sj = SEED_JOBS.find(x => x.id === j.id || x.id === j.demoOf); if (sj && sj.skills && !j.skills) { j.skills = sj.skills.map(x => ({ ...x })); j.comps = [...(sj.comps || [])]; } });
    write(K.jobs, jobs);
    SEED_APPS.filter(x => +x.id.slice(1) >= 10 && !apps.some(y => y.id === x.id) && jobs.some(j => j.id === x.jobId)).forEach(x => apps.push(seedApp(x)));
    write(K.apps, apps); write('emplea.seedrev', SEED_REV);
  }
  if (read('emplea.seedrev', 1) === 2) {
    SEED_JOBS.filter(x => ['j33', 'j34'].includes(x.id) && !jobs.some(j => j.id === x.id)).forEach(x => jobs.push({ ...x, postedAt: isoDaysAgo(x.daysAgo, 2), status: 'activa' }));
    write(K.jobs, jobs); write('emplea.seedrev', 3);
  }
  if (read('emplea.seedrev', 1) < SEED_REV) {
    SEED_JOBS.forEach((s, i) => {
      const j = jobs.find(x => x.id === s.id);
      if (j) { if (s.client && !j.client) Object.assign(j, { client: s.client, clientIndustry: s.clientIndustry, showClient: s.showClient }); }
      else if (['j30', 'j31', 'j32', 'j33', 'j34'].includes(s.id)) jobs.push({ ...s, postedAt: isoDaysAgo(s.daysAgo, (i % 6) + 1), status: 'activa' });
    });
    SEED_APPS.forEach(a => { if (!apps.some(x => x.id === a.id) && jobs.some(j => j.id === a.jobId)) apps.push(seedApp(a)); });
    write(K.jobs, jobs); write(K.apps, apps); write('emplea.seedrev', SEED_REV);
  }
  // Skills/competencias de ejemplo en vacantes guardadas que todavía no las tienen (idempotente)
  if (jobs.some(j => !j.skills && SEED_JOBS.some(x => (x.id === j.id || x.id === j.demoOf) && x.skills))) {
    jobs.forEach(j => { const sj = SEED_JOBS.find(x => x.id === j.id || x.id === j.demoOf); if (sj && sj.skills && !j.skills) { j.skills = sj.skills.map(x => ({ ...x })); j.comps = [...(sj.comps || [])]; } });
    write(K.jobs, jobs);
  }

  // Vacantes destacadas de ejemplo (una sola vez, también para datos ya guardados)
  if (read('emplea.featseed', 0) < 2 && typeof SEED_FEATURED !== 'undefined') {
    Object.entries(SEED_FEATURED).forEach(([id, v]) => {
      const j = jobs.find(x => x.id === id);
      if (j && !j.featured) j.featured = v === 'plan' ? { source: 'plan', since: isoDaysAgo(2) } : { source: 'compra', since: isoDaysAgo(FEATURE_DAYS - v), until: isoDaysAgo(-v, 0) };
    });
    write(K.jobs, jobs); write('emplea.featseed', 2);
  }

  // Planes: { [empresa]: { id, since, trialUntil?, payments:[{ at, concept, amount, method }] } }
  const KPL = 'emplea.plans';
  let plans = read(KPL, {});
  const savePl = () => write(KPL, plans);
  // Sin cobros (BILLING = false) no hay avisos destacados: es una función de plan pago
  const isFeat = j => (typeof BILLING === 'undefined' || BILLING) && !!(j && j.status === 'activa' && j.featured && (j.featured.source === 'plan' || new Date(j.featured.until) > new Date()));

  let saved = read(K.saved, []);

  // Perfiles de empresas/consultoras y fichas de clientes de cada consultora
  const KP = 'emplea.coprofiles', KC = 'emplea.clients';
  let coProfiles = read(KP, {});
  let clientsDb = read(KC, {});
  const byName = (a, b) => a.name.localeCompare(b.name, 'es');

  // Ternas: una por vacante. items = [{ appId, note }]; response = lo que respondió el cliente
  const KT = 'emplea.ternas';
  let ternas = read(KT, {});
  const saveT = () => write(KT, ternas);

  // Banco de talento: { [empresa]: { [clavePersona]: { tags, notes:[{t, at}], fav, saved, person } } }
  const KB = 'emplea.bank';
  let bank = read(KB, {});
  const saveB = () => write(KB, bank);
  const seedMeta = key => {
    const s0 = typeof SEED_BANK !== 'undefined' && SEED_BANK[key];
    if (!s0) return { tags: [], notes: [], fav: false };
    return { tags: [...(s0.tags || [])], fav: !!s0.fav, notes: (s0.notes || []).map(n => ({ t: n.t, at: isoDaysAgo(n.d || 0, 4) })) };
  };

  const KCAND = 'emplea.cand', KSEEN = 'emplea.candseen', KACC = 'emplea.coaccounts';
  const KSP = 'emplea.spontcvs';
  const KUL = 'emplea.unlocks';
  const KDR = 'emplea.delreqs';
  const KER = 'emplea.erased';
  const KPO = 'emplea.posts';
  // Hub: pedidos "Busco perfil" entre selectores y recomendaciones de candidatos (con permiso del candidato)
  const KHR = 'emplea.hubreqs', KRF = 'emplea.referrals';
  // Avisos externos (cargados con IA desde posts de redes y páginas de empresas): borradores para revisar y fuentes
  const KEQ = 'emplea.extqueue', KES = 'emplea.extsources';
  const KAL = 'emplea.alerts', KNT = 'emplea.notifs', KNS = 'emplea.notifseen', KNC = 'emplea.notifcleared';
  // Cuenta demo: talento@demo.com.ar / demo1234
  const DEMO_ACC = { 'talento@demo.com.ar': { name: 'Talento Norte', type: 'Consultora', pass: 'hbr2v10' } };
  const lf = window.localforage ? localforage.createInstance({ name: 'emplea', storeName: 'cvs' }) : null;
  const mem = new Map();

  return {
    // Vacantes
    jobs: () => jobs,
    activeJobs: () => jobs.filter(j => j.status === 'activa'),
    job: id => jobs.find(j => j.id === id),
    addJob(j) { jobs.unshift(j); write(K.jobs, jobs); },
    updateJob(id, patch) { const j = jobs.find(x => x.id === id); if (j) { Object.assign(j, patch); write(K.jobs, jobs); } },
    // Destacadas
    isFeatured: isFeat,
    featuredJobs: () => jobs.filter(isFeat),
    setFeatured(id, f) { const j = jobs.find(x => x.id === id); if (j) { if (f) j.featured = f; else delete j.featured; write(K.jobs, jobs); } },

    // Plan de la empresa (la prueba vencida vuelve a Gratis)
    planInfo(co) {
      const p = plans[co];
      if (p && p.trialUntil && new Date(p.trialUntil) < new Date()) { p.id = 'vencido'; delete p.trialUntil; p.trialEnded = true; savePl(); }
      if (p) return p;
      const seed = typeof SEED_PLANS !== 'undefined' && SEED_PLANS[co];
      if (seed) return { id: seed, payments: [] };
      // Cuenta nueva: prueba gratis del plan Pro
      plans[co] = { id: 'pro', trialUntil: new Date(Date.now() + (typeof TRIAL_DAYS !== 'undefined' ? TRIAL_DAYS : 14) * 864e5).toISOString(), payments: [] }; savePl();
      return plans[co];
    },
    setPlan(co, id, extra = {}) {
      const prev = this.planInfo(co);
      plans[co] = { payments: [], ...prev, id, since: new Date().toISOString(), ...extra };
      if (!extra.trialUntil) delete plans[co].trialUntil;
      savePl();
    },
    // Contactos desbloqueados de la base de +Humanos: cupo mensual del plan + packs extra que no vencen
    unlockInfo(co) {
      const all = read(KUL, {}), m = new Date().toISOString().slice(0, 7);
      const u = { keys: {}, used: 0, extra: 0, month: m, ...(all[co] || {}) };
      if (u.month !== m) { u.month = m; u.used = 0; }
      return u;
    },
    unlock(co, key, fromExtra) { const all = read(KUL, {}), u = this.unlockInfo(co); u.keys[key] = new Date().toISOString(); if (fromExtra) u.extra = Math.max(0, u.extra - 1); else u.used++; all[co] = u; write(KUL, all); },
    addContacts(co, n) { const all = read(KUL, {}), u = this.unlockInfo(co); u.extra += n; all[co] = u; write(KUL, all); },
    addPayment(co, rec) { const p = plans[co] || (plans[co] = { ...this.planInfo(co) }); p.payments = [{ at: new Date().toISOString(), ...rec }, ...(p.payments || [])]; savePl(); },

    removeJob(id) { jobs = jobs.filter(j => j.id !== id); apps = apps.filter(a => a.jobId !== id || a.mine); write(K.jobs, jobs); write(K.apps, apps); },

    // Postulaciones
    apps: () => apps,
    // Postulaciones del candidato: las enviadas desde este dispositivo o con su celular (si ingresó)
    // Solo las de la persona que ingresó: por dueño (celular con el que ingresó) o por el celular de la postulación
    myApps() {
      const c = read(KCAND, null), d = x => String(x || '').replace(/\D/g, '').slice(-10);
      if (!c || !c.phone) return [];
      const me = d(c.phone);
      return apps.filter(a => a.owner ? a.owner === me : (d(a.phone) && d(a.phone) === me));
    },
    hasApplied(jobId) { return this.myApps().some(a => a.jobId === jobId); },
    addApp(a) { apps.unshift(a); write(K.apps, apps); },
    // Borra postulaciones puntuales (y sus CVs y lugares en ternas)
    async removeApps(ids) { const set = new Set(ids); apps = apps.filter(a => !set.has(a.id)); write(K.apps, apps); Object.values(ternas).forEach(t => { t.items = t.items.filter(x => !set.has(x.appId)); }); saveT(); for (const id of ids) await this.delCv(id); },
    // Cada cambio de etapa queda en el historial (lo ve el candidato en su informe de avance)
    updateApp(id, patch) {
      const a = apps.find(x => x.id === id); if (!a) return;
      if (patch.status && patch.status !== a.status) {
        const now = new Date().toISOString();
        a.history = [...(a.history || [{ st: a.status, at: a.date }]), { st: patch.status, at: now }];
        a.changedAt = now;
      }
      Object.assign(a, patch); write(K.apps, apps);
    },
    // La empresa abrió el detalle o el CV: el candidato ve "CV leído"
    markRead(id) { const a = apps.find(x => x.id === id); if (a && !a.readAt) { a.readAt = new Date().toISOString(); a.changedAt = a.changedAt && a.changedAt > a.readAt ? a.changedAt : a.readAt; write(K.apps, apps); } },

    // Guardadas
    saved: () => saved,
    isSaved: id => saved.includes(id),
    toggleSaved(id) { const on = !saved.includes(id); saved = on ? [id, ...saved] : saved.filter(x => x !== id); write(K.saved, saved); return on; },

    // Perfil del candidato (respuestas del chat) y datos de contacto
    profile: () => read(K.profile, null),
    setProfile: p => write(K.profile, p),
    contact: () => read(K.contact, null),
    setContact: c => write(K.contact, c),

    // Perfil de empresa / consultora
    coProfile: name => ({ ...((typeof COMPANY_PROFILES !== 'undefined' && COMPANY_PROFILES[name]) || {}), ...(coProfiles[name] || {}) }),
    saveCoProfile(name, data) { coProfiles[name] = { ...(coProfiles[name] || {}), ...data }; write(KP, coProfiles); },
    renameCompany(oldN, newN) {
      if (!newN || oldN === newN) return;
      const merged = this.coProfile(oldN);
      jobs.forEach(j => { if (j.company === oldN) j.company = newN; });
      coProfiles[newN] = { ...merged, ...(coProfiles[newN] || {}) };
      delete coProfiles[oldN];
      if (clientsDb[oldN]) { clientsDb[newN] = clientsDb[oldN]; delete clientsDb[oldN]; }
      Object.values(ternas).forEach(t => { if (t.company === oldN) t.company = newN; });
      if (bank[oldN]) { bank[newN] = bank[oldN]; delete bank[oldN]; saveB(); }
      if (plans[oldN]) { plans[newN] = plans[oldN]; delete plans[oldN]; savePl(); }
      const acc = read(KACC, DEMO_ACC); Object.values(acc).forEach(a => { if (a.name === oldN) a.name = newN; }); write(KACC, acc);
      write(K.jobs, jobs); write(KP, coProfiles); write(KC, clientsDb); saveT();
    },
    companyExists: name => jobs.some(j => j.company === name) || !!coProfiles[name] || (typeof COMPANY_PROFILES !== 'undefined' && !!COMPANY_PROFILES[name]),

    // Clientes de una consultora: fichas guardadas + clientes que aparecen en sus búsquedas
    clientsOf(co) {
      const map = {};
      const seed = n => (typeof SEED_CLIENT_INFO !== 'undefined' && SEED_CLIENT_INFO[n]) || {};
      Object.values(clientsDb[co] || {}).forEach(c => { map[c.name] = { ...seed(c.name), ...c }; });
      jobs.filter(j => j.company === co && j.client).forEach(j => {
        if (!map[j.client]) map[j.client] = { ...seed(j.client), name: j.client, industry: j.clientIndustry || '', showName: !!j.showClient };
      });
      return Object.values(map).sort(byName);
    },
    client(co, name) { return this.clientsOf(co).find(c => c.name === name) || null; },
    saveClient(co, oldName, data) {
      const db = clientsDb[co] || (clientsDb[co] = {});
      const prev = (oldName && db[oldName]) || db[data.name] || {};
      if (oldName && oldName !== data.name) {
        delete db[oldName];
        jobs.forEach(j => { if (j.company === co && j.client === oldName) j.client = data.name; });
      }
      db[data.name] = { ...prev, ...data };
      jobs.forEach(j => { if (j.company === co && j.client === data.name) { j.clientIndustry = data.industry || ''; j.showClient = !!data.showName; } });
      write(KC, clientsDb); write(K.jobs, jobs);
    },
    deleteClient(co, name) { if (clientsDb[co]) { delete clientsDb[co][name]; write(KC, clientsDb); } },
    logoOf(name) {
      if (coProfiles[name] && coProfiles[name].logo) return coProfiles[name].logo;
      for (const co in clientsDb) { const c = clientsDb[co][name]; if (c && c.logo) return c.logo; }
      return null;
    },

    // Copia las búsquedas y postulantes de ejemplo a la cuenta actual (para probar con cualquier empresa)
    seedDemoFor(co) {
      const tpl = ['j8', 'j32', 'j6', 'j12', 'j24', 'j2'];
      const map = {}, stamp = Date.now().toString(36);
      tpl.forEach((tid, i) => {
        let mine = jobs.find(j => j.company === co.name && j.demoOf === tid);
        if (!mine) {
          const src = SEED_JOBS.find(j => j.id === tid); if (!src) return;
          mine = { ...src, id: `d${stamp}${i}`, demoOf: tid, company: co.name, companyType: co.type, postedAt: isoDaysAgo(src.daysAgo, 3), status: 'activa' };
          if (co.type !== 'Consultora') { delete mine.client; delete mine.clientIndustry; delete mine.showClient; }
          jobs.unshift(mine);
        }
        map[tid] = mine.id;
      });
      let n = 0;
      SEED_APPS.forEach(a => {
        if (!map[a.jobId] || apps.some(x => x.id === `${a.id}-${map[a.jobId]}`)) return;
        apps.push({ ...seedApp(a), id: `${a.id}-${map[a.jobId]}`, jobId: map[a.jobId] }); n++;
      });
      write(K.jobs, jobs); write(K.apps, apps);
      return n;
    },

    // Banco de talento
    bankMeta: (co, key) => (bank[co] && bank[co][key]) || seedMeta(key),
    bankAll: co => ({ ...(bank[co] || {}) }),
    setBankMeta(co, key, patch) {
      const b = bank[co] || (bank[co] = {});
      b[key] = { ...this.bankMeta(co, key), ...b[key], ...patch };
      saveB();
    },
    // Notas internas de una persona (se comparten entre el banco y cada búsqueda; extra = { jobId })
    addBankNote(co, key, t, extra = {}) { const m = this.bankMeta(co, key); this.setBankMeta(co, key, { notes: [{ t, at: new Date().toISOString(), ...extra }, ...(m.notes || [])] }); },
    removeBankNote(co, key, at) { const m = this.bankMeta(co, key); this.setBankMeta(co, key, { notes: (m.notes || []).filter(n => n.at !== at) }); },

    // Ternas
    ternas: co => Object.values(ternas).filter(t => t.company === co).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')),
    terna: id => ternas[id] || null,
    ternaOfJob: jobId => Object.values(ternas).find(t => t.jobId === jobId) || null,
    toggleTerna(co, jobId, appId) {
      let t = this.ternaOfJob(jobId);
      if (!t) { t = { id: 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), company: co, jobId, items: [], createdAt: new Date().toISOString() }; ternas[t.id] = t; }
      const i = t.items.findIndex(x => x.appId === appId);
      if (i >= 0) t.items.splice(i, 1); else t.items.push({ appId, note: '' });
      t.updatedAt = new Date().toISOString();
      saveT(); return i < 0;
    },
    inTerna: (jobId, appId) => { const t = Object.values(ternas).find(x => x.jobId === jobId); return !!(t && t.items.some(x => x.appId === appId)); },
    updateTerna(id, patch) { if (ternas[id]) { Object.assign(ternas[id], patch, { updatedAt: patch.sharedAt || new Date().toISOString() }); saveT(); } },
    saveTernaResponse(resp) {
      const t = ternas[resp.id];
      if (t) { t.response = resp; t.responseSeen = false; t.updatedAt = new Date().toISOString(); }
      else ternas[resp.id] = { id: resp.id, orphan: true, company: resp.co || '', jobId: resp.jobId || '', items: [], response: resp, updatedAt: new Date().toISOString() };
      saveT(); return !!t;
    },
    clientVote(appId) {
      for (const t of Object.values(ternas)) {
        const r = t.response && t.response.r && t.response.r.find(x => x[0] === appId);
        if (r) return { vote: r[1], comment: r[2] || '', by: t.response.by || '', at: t.response.at };
      }
      return null;
    },

    // Sesión del candidato (ingreso con código por WhatsApp, simulado) y novedades vistas
    candidate: () => read(KCAND, null),
    // Si ingresa otra persona en este dispositivo, se borran los datos personales del anterior (perfil, alertas, avisos, CV guardado)
    setCandidate(c) {
      const d = x => String(x || '').replace(/\D/g, '').slice(-10), prev = read('emplea.candlast', ''), cur = d(c.phone);
      if (prev && prev !== cur) {
        [K.profile, K.contact, K.cvMeta, K.saved, KAL, KNT, KNS, KNC, KSEEN].forEach(k => localStorage.removeItem(k));
        saved = [];
        this.delCv('last');
      }
      write('emplea.candlast', cur); write(KCAND, c);
    },
    logoutCandidate: () => localStorage.removeItem(KCAND),
    candSeen: () => read(KSEEN, {}),
    markCandSeen(ids) { const m = read(KSEEN, {}), now = new Date().toISOString(); ids.forEach(id => { m[id] = now; }); write(KSEEN, m); },

    // Cuentas de empresa (prototipo: se guardan en este navegador; en producción, en el servidor)
    coAccount: email => (read(KACC, DEMO_ACC)[String(email || '').trim().toLowerCase()] || null),
    addCoAccount(email, data) { const m = read(KACC, DEMO_ACC); m[String(email).trim().toLowerCase()] = data; write(KACC, m); },
    passHash: p => { let h = 5381; for (const ch of String(p)) h = ((h << 5) + h + ch.charCodeAt(0)) | 0; return 'h' + (h >>> 0).toString(36); },

    // Alertas de vacantes del candidato y avisos de Fedfu
    // CVs enviados desde "Enviar CV" (sin postularse a una vacante): van a "Toda la plataforma"
    spontCvs: () => read(KSP, []),
    updateSpontCv(id, patch) { write(KSP, read(KSP, []).map(o => o.id === id ? { ...o, ...patch } : o)); },
    removeSpontCv(id) { write(KSP, read(KSP, []).filter(o => o.id !== id)); },
    addSpontCv(x) { const l = read(KSP, []).filter(o => !(x.phone && o.phone && o.phone.replace(/\D/g, '').slice(-10) === x.phone.replace(/\D/g, '').slice(-10))); l.unshift(x); write(KSP, l); },
    // Datos personales (Ley 25.326): pedidos de borrado y borrado de una persona
    // Charla de café: notas (las de ejemplo hasta que se guarde la primera)
    posts() { const l = read(KPO, null); if (l) return l; const iso = d => new Date(Date.now() - d * 864e5).toISOString(); return (typeof SEED_POSTS !== 'undefined' ? SEED_POSTS : []).map(p => ({ ...p, date: iso(p.daysAgo || 0) })); },
    savePost(p) { const l = this.posts(); const i = l.findIndex(x => x.id === p.id); if (i >= 0) l[i] = p; else l.unshift(p); write(KPO, l); },
    removePost(id) { write(KPO, this.posts().filter(x => x.id !== id)); },
    hubReqs() {
      const l = read(KHR, null); if (l) return l;
      const seed = (typeof SEED_HUB_REQS !== 'undefined' ? SEED_HUB_REQS : []).map(r => ({ ...r, createdAt: isoDaysAgo(r.daysAgo || 0, 4), status: 'abierto' }));
      write(KHR, seed); return seed;
    },
    saveHubReq(r) { const l = this.hubReqs(); const i = l.findIndex(x => x.id === r.id); if (i >= 0) l[i] = { ...l[i], ...r }; else l.unshift(r); write(KHR, l); },
    referrals: () => read(KRF, []),
    referral(id) { return read(KRF, []).find(r => r.id === id) || null; },
    saveReferral(r) { const l = read(KRF, []); const i = l.findIndex(x => x.id === r.id); if (i >= 0) l[i] = { ...l[i], ...r }; else l.unshift(r); write(KRF, l); },
    extQueue() {
      const l = read(KEQ, null); if (l) return l;
      const seed = (typeof SEED_EXT_POSTS !== 'undefined' ? SEED_EXT_POSTS : []).map(x => ({ ...x, at: isoDaysAgo(x.daysAgo || 0, 2), status: 'nuevo' }));
      write(KEQ, seed); return seed;
    },
    saveExt(d) { const l = this.extQueue(); const i = l.findIndex(x => x.id === d.id); if (i >= 0) l[i] = { ...l[i], ...d }; else l.unshift(d); write(KEQ, l); },
    removeExt(id) { write(KEQ, this.extQueue().filter(x => x.id !== id)); },
    extSources: () => read(KES, []),
    saveExtSources: l => write(KES, l),
    delReqs: () => read(KDR, []),
    // Personas borradas de toda la plataforma (para ocultar perfiles de ejemplo que vienen en el código)
    isErased(o) { const d10 = x => String(x || '').replace(/\D/g, '').slice(-10), em = x => String(x || '').trim().toLowerCase(); return read(KER, []).some(e => (e.phone && e.phone === d10(o.phone)) || (e.email && e.email === em(o.email))); },
    addDelReq(r) { const l = read(KDR, []); l.unshift(r); write(KDR, l); },
    updateDelReq(id, patch) { write(KDR, read(KDR, []).map(r => r.id === id ? { ...r, ...patch } : r)); },
    // Borra postulaciones (y sus CVs), lugares en ternas y fichas del banco. jobIds = null: en todas las empresas
    async erasePerson(match, jobIds) {
      const d10 = x => String(x || '').replace(/\D/g, '').slice(-10), em = x => String(x || '').trim().toLowerCase();
      const hit = o => (match.phone && d10(o.phone) && d10(o.phone) === d10(match.phone)) || (match.email && em(o.email) && em(o.email) === em(match.email)) || (match.cand && o.cand === match.cand);
      const gone = apps.filter(a => hit(a) && (!jobIds || jobIds.has(a.jobId)));
      const ids = new Set(gone.map(a => a.id));
      apps = apps.filter(a => !ids.has(a.id)); write(K.apps, apps);
      Object.values(ternas).forEach(t => { t.items = t.items.filter(x => !ids.has(x.appId)); }); saveT();
      const keys = new Set(gone.map(a => a.cand ? 'c:' + a.cand : a.email ? 'e:' + em(a.email) : '').filter(Boolean));
      if (match.key) keys.add(match.key);
      Object.keys(bank).forEach(co => { if (match.company && co !== match.company) return; Object.keys(bank[co]).forEach(k => { const m = bank[co][k]; if (keys.has(k) || (m && m.person && hit(m.person))) delete bank[co][k]; }); }); saveB();
      let nSp = 0;
      if (!jobIds) { const er = read(KER, []); er.push({ phone: d10(match.phone), email: em(match.email) }); write(KER, er); }
      if (!jobIds) { const sp = read(KSP, []); const keep = sp.filter(o => !hit(o)); nSp = sp.length - keep.length; for (const o of sp.filter(hit)) await this.delCv('sp-' + o.id); write(KSP, keep); }
      if (!jobIds) write(KRF, read(KRF, []).filter(r => !hit(r.person || {})));
      for (const a of gone) await this.delCv(a.id);
      return { apps: gone.length, cvs: nSp };
    },
    alerts: () => read(KAL, []),
    addAlert(a) { const l = read(KAL, []); l.unshift(a); write(KAL, l); },
    updateAlert(id, patch) { const l = read(KAL, []); const a = l.find(x => x.id === id); if (a) { Object.assign(a, patch); write(KAL, l); } },
    removeAlert(id) { write(KAL, read(KAL, []).filter(x => x.id !== id)); write(KNT, read(KNT, []).filter(n => n.alertId !== id)); },
    notifs: () => read(KNT, []),
    addNotifs(list) { if (!list.length) return; write(KNT, [...list, ...read(KNT, [])]); },
    notifSeenAt: () => read(KNS, ''),
    markNotifsSeen() { write(KNS, new Date().toISOString()); },
    // "Borrar todas": oculta los avisos hasta ahora (los nuevos siguen llegando)
    notifClearedAt: () => read(KNC, ''),
    clearNotifs() { write(KNC, new Date().toISOString()); write(KNS, new Date().toISOString()); },

    // Sesión de empresa (demo)
    company: () => read(K.company, null),
    setCompany: c => write(K.company, c),
    logoutCompany: () => localStorage.removeItem(K.company),

    // CVs
    async putCv(key, blob) { try { if (lf) { await lf.setItem('cv:' + key, blob); return; } } catch (e) { /* fallback */ } mem.set(key, blob); },
    async delCv(key) { mem.delete(key); try { if (lf) await lf.removeItem('cv:' + key); } catch (e) { /* nada */ } },
    async getCv(key) { if (mem.has(key)) return mem.get(key); try { return lf ? await lf.getItem('cv:' + key) : null; } catch (e) { return null; } },
    cvMeta: () => read(K.cvMeta, null),
    setCvMeta: m => write(K.cvMeta, m),

    async reset() {
      [...Object.values(K), 'emplea.seedrev', KP, KC, KT, KB, KPL, KCAND, KSEEN, KACC, KAL, KNT, KNS, KNC, KSP, 'emplea.featseed', 'emplea.ternabar.hidden', 'emplea.guide.hidden', 'emplea.ivseed', 'emplea.adminseed', KUL, KDR, KER, 'emplea.candlast', KPO, KHR, KRF, KEQ, KES].forEach(k => localStorage.removeItem(k));
      Object.keys(localStorage).filter(k => (k.startsWith('emplea.repseed.') || k.startsWith('emplea.hubseed.'))).forEach(k => localStorage.removeItem(k));
      try { if (lf) await lf.clear(); } catch (e) { /* noop */ }
      location.hash = '#/';
      location.reload();
    }
  };
})();
