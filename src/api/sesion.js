'use strict';
/* POST /api/sesion: inicia sesión con correo y contraseña, o renueva la sesión con el refresh_token.
   Las contraseñas las revisa Supabase; este servidor no las guarda. */
const { llamar, db, ErrorServicio } = require('./_supa');
const { CARGO } = require('./_usuario');

function cuerpo(req) {
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = null; } }
  return b && typeof b === 'object' ? b : {};
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'metodo_no_permitido', mensaje: 'Este servicio solo recibe POST.' });
  }
  const b = cuerpo(req);
  try {
    let r;
    if (typeof b.refresh_token === 'string' && b.refresh_token) {
      r = await llamar('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: b.refresh_token } });
      if (r.status === 400 || r.status === 401 || r.status === 403) return res.status(401).json({ error: 'sesion_expirada', mensaje: 'Tu sesión expiró. Vuelve a iniciar sesión.' });
      if (r.status !== 200) throw new ErrorServicio('Auth respondió ' + r.status);
    } else {
      const email = typeof b.email === 'string' ? b.email.trim() : '';
      const password = typeof b.password === 'string' ? b.password : '';
      const errores = {};
      if (!email) errores.email = 'Escribe tu correo.';
      else if (email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errores.email = 'El correo no es válido. Revisa que tenga @ y un dominio, por ejemplo nombre@empresa.cl.';
      if (!password) errores.password = 'Escribe tu contraseña.';
      if (Object.keys(errores).length) return res.status(400).json({ error: 'validacion', mensaje: Object.values(errores).join(' '), errores });

      r = await llamar('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password } });
      if (r.status === 400 || r.status === 401) {
        return res.status(401).json({ error: 'credenciales', mensaje: 'El correo o la contraseña no coinciden. Revísalos e intenta de nuevo.' });
      }
      if (r.status === 429) return res.status(429).json({ error: 'demasiados_intentos', mensaje: 'Demasiados intentos seguidos. Espera un minuto y vuelve a intentar.' });
      if (r.status !== 200) throw new ErrorServicio('Auth respondió ' + r.status);
    }
    const s = r.datos || {};
    if (!s.access_token || !s.user || !s.user.id) throw new ErrorServicio('Respuesta de sesión incompleta');

    const perfiles = await db('perfiles?select=nombre,rol,empresa&id=eq.' + encodeURIComponent(s.user.id), { token: s.access_token });
    const p = Array.isArray(perfiles) && perfiles[0];
    if (!p || !CARGO[p.rol]) {
      return res.status(403).json({ error: 'sin_rol', mensaje: 'Tu cuenta no tiene un rol asignado. Pide al administrador que te lo asigne.' });
    }
    return res.status(200).json({
      access_token: s.access_token,
      refresh_token: s.refresh_token,
      expires_at: s.expires_at || Math.floor(Date.now() / 1000) + (s.expires_in || 3600),
      usuario: { id: s.user.id, nombre: p.nombre, rol: p.rol, cargo: CARGO[p.rol], empresa: p.empresa }
    });
  } catch (e) {
    console.error('[sesion] ' + e.message);
    return res.status(503).json({ error: 'servicio_no_disponible', mensaje: 'No pudimos conectar con el sistema para iniciar sesión. No es un error tuyo: reintenta en un momento.' });
  }
};
