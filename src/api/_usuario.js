'use strict';
/* ¿Quién hace la petición? Denegar por defecto: sin un token válido y un rol asignado, no pasa nada. */
const { llamar, db, ErrorHttp, ErrorServicio } = require('./_supa');

const CARGO = { supervisor: 'Supervisor', capataz: 'Capataz', programador: 'Programador', planificador: 'Planificador' };

function tokenDe(req) {
  const h = (req.headers && (req.headers.authorization || req.headers.Authorization)) || '';
  const m = /^Bearer\s+(\S+)$/i.exec(h);
  return m ? m[1] : null;
}

// Devuelve { id, rol, nombre, empresa, cargo, token } o lanza ErrorHttp 401/403.
async function usuarioDe(req) {
  const token = tokenDe(req);
  if (!token) throw new ErrorHttp(401, 'sin_sesion', 'Inicia sesión para continuar.');

  // Supabase confirma que el token es válido y de quién es.
  const r = await llamar('/auth/v1/user', { token });
  if (r.status === 401 || r.status === 403) throw new ErrorHttp(401, 'sesion_expirada', 'Tu sesión expiró. Vuelve a iniciar sesión.');
  // Si Supabase no responde bien, es un problema del sistema, no de la sesión de la persona.
  if (r.status !== 200) throw new ErrorServicio('Auth respondió ' + r.status);
  if (!r.datos || !r.datos.id) throw new ErrorHttp(401, 'sesion_expirada', 'Tu sesión no es válida. Vuelve a iniciar sesión.');

  const perfiles = await db('perfiles?select=id,nombre,rol,empresa&id=eq.' + encodeURIComponent(r.datos.id), { token });
  const p = Array.isArray(perfiles) && perfiles[0];
  if (!p || !CARGO[p.rol]) throw new ErrorHttp(403, 'sin_rol', 'Tu cuenta no tiene un rol asignado. Pide al administrador que te lo asigne.');

  return { id: p.id, rol: p.rol, nombre: p.nombre, empresa: p.empresa, cargo: CARGO[p.rol], token };
}

module.exports = { usuarioDe, tokenDe, CARGO };
