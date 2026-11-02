/* Conexión con Supabase (cuentas de empresas y consultoras).
   Si config.js no tiene URL y clave, Cloud.on es false y el sitio sigue en modo prototipo. */
const Cloud = (() => {
  const configured = typeof SUPABASE_URL === 'string' && /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(SUPABASE_URL) && typeof SUPABASE_KEY === 'string' && SUPABASE_KEY.length > 20;
  if (!configured) return { on: false, ready: Promise.resolve(), recovery: false };

  // La librería se carga solo si hay conexión configurada, con versión fija y huella SRI
  const LIB = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.3/dist/umd/supabase.js';
  const SRI = 'sha384-BWcjm9OdFth9TbhCxZPdm+gAOUMAzQy9nmTs12ioXdCcbVnJaPMn+fMUoQCLt60R';
  const loadLib = () => new Promise((ok, bad) => {
    if (window.supabase && window.supabase.createClient) return ok();
    const s = document.createElement('script');
    s.src = LIB; s.integrity = SRI; s.crossOrigin = 'anonymous';
    s.onload = ok; s.onerror = () => bad(new Error('No se pudo cargar la conexión con el servidor.'));
    document.head.appendChild(s);
  });

  const api = { on: true, recovery: false, client: null };
  const base = () => location.origin + location.pathname;
  const ERR = {
    invalid_credentials: 'El email o la contraseña no son correctos.',
    email_not_confirmed: 'Todavía no confirmaste tu email. Buscá el mail de +Humanos (revisá también spam).',
    user_already_exists: 'Ya hay una cuenta con ese email. Ingresá desde "Ingresar".',
    weak_password: 'La contraseña es muy débil. Usá al menos 8 caracteres, con letras y números.',
    over_email_send_rate_limit: 'Mandamos demasiados mails seguidos. Probá de nuevo en unos minutos.',
    over_request_rate_limit: 'Demasiados intentos. Esperá unos minutos y probá de nuevo.',
    same_password: 'La contraseña nueva tiene que ser distinta de la anterior.',
    '23505': 'Ya hay una empresa o consultora con ese nombre.'
  };
  const msg = e => {
    if (!e) return '';
    const c = e.code || (e.message && /invalid login/i.test(e.message) ? 'invalid_credentials' : '');
    if (ERR[c]) return ERR[c];
    if (/failed to fetch|network/i.test(e.message || '')) return 'No pudimos conectarnos. Revisá tu conexión y probá de nuevo.';
    return 'Algo salió mal. Probá de nuevo en unos minutos.';
  };
  api.msg = msg;

  // Trae la empresa de quien está conectado y la deja como sesión del sitio
  async function loadCompany(user) {
    const { data, error } = await api.client.rpc('my_company');
    if (error) throw error;
    const c = data && data[0];
    if (!c) { Store.logoutCompany(); return null; }
    const co = { id: c.id, name: c.name, type: c.type, role: c.role, email: user.email, cloud: true };
    Store.setCompany(co);
    return co;
  }

  api.ready = (async () => {
    try {
      await loadLib();
      api.client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'emplea.sb' }
      });
      api.client.auth.onAuthStateChange(ev => {
        if (ev === 'PASSWORD_RECOVERY') api.recovery = true;
        if (ev === 'SIGNED_OUT') Store.logoutCompany();
      });
      const { data: { session } } = await api.client.auth.getSession();
      // Con conexión, la sesión de empresa sale solo del servidor (no se puede inventar desde el navegador)
      if (session) await loadCompany(session.user); else if (Store.company()) Store.logoutCompany();
      // Limpia ?code= del link del mail (confirmación o contraseña nueva)
      const u = new URL(location.href);
      if (u.searchParams.has('code') || u.searchParams.has('error')) history.replaceState(null, '', base() + location.hash);
      if (/[?&]error_description=/.test(location.href)) api.linkError = true;
    } catch (e) {
      api.offline = true;
      if (Store.company()) Store.logoutCompany();
      console.warn('[+Humanos] Sin conexión con el servidor:', e && e.message);
    }
  })();

  api.nameAvailable = async name => {
    const { data, error } = await api.client.rpc('company_name_available', { p_name: name });
    if (error) throw error;
    return !!data;
  };

  // Registro: crea la cuenta; la empresa se arma sola en la base (trigger) con este nombre y tipo
  api.signUp = async ({ name, type, email, password }) => {
    if (!(await api.nameAvailable(name))) return { error: ERR['23505'] };
    const { data, error } = await api.client.auth.signUp({
      email, password,
      options: { data: { company_name: name, company_type: type }, emailRedirectTo: base() + '#/empresa' }
    });
    if (error) return { error: msg(error) };
    // Si el email ya existía, Supabase no avisa (para no revelar cuentas): devuelve un usuario sin identidades
    if (data.user && Array.isArray(data.user.identities) && !data.user.identities.length) return { error: ERR.user_already_exists };
    if (data.session) return { company: await loadCompany(data.user) };
    return { confirm: true };
  };

  api.signIn = async (email, password) => {
    const { data, error } = await api.client.auth.signInWithPassword({ email, password });
    if (error) return { error: msg(error) };
    const co = await loadCompany(data.user);
    if (!co) { await api.client.auth.signOut(); return { error: 'Esta cuenta no tiene una empresa asociada. Escribinos y lo revisamos.' }; }
    return { company: co };
  };

  api.resetPassword = async email => {
    const { error } = await api.client.auth.resetPasswordForEmail(email, { redirectTo: base() + '#/empresa' });
    return { error: error ? msg(error) : null };
  };

  api.updatePassword = async password => {
    const { error } = await api.client.auth.updateUser({ password });
    if (!error) api.recovery = false;
    return { error: error ? msg(error) : null };
  };

  api.updateCompany = async (id, fields) => {
    const { error } = await api.client.from('companies').update(fields).eq('id', id);
    if (!error) { const co = Store.company(); if (co && co.id === id) Store.setCompany({ ...co, ...fields }); }
    return { error: error ? msg(error) : null };
  };

  // Sin conexión (no cargó la librería o se cortó la red): los formularios muestran el error en vez de quedar trabados
  const OFF = 'No pudimos conectarnos con el servidor. Probá de nuevo en unos minutos.';
  ['signUp', 'signIn', 'resetPassword', 'updatePassword', 'updateCompany'].forEach(k => {
    const f = api[k];
    api[k] = async (...a) => { if (!api.client) return { error: OFF }; try { return await f(...a); } catch (e) { return { error: msg(e) }; } };
  });

  api.signOut = async () => { try { await api.client.auth.signOut(); } catch (e) { /* sin conexión: igual se cierra acá */ } Store.logoutCompany(); };

  return api;
})();
