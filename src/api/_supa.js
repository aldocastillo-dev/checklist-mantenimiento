'use strict';
/* Conexión con Supabase (autenticación y base de datos).
   El servidor entra a la base CON EL TOKEN DE LA PERSONA que hizo la petición, nunca con la clave secreta:
   así las políticas RLS de la base deciden qué puede ver y cambiar cada uno.
   Variables de entorno: SUPABASE_URL y SUPABASE_PUBLISHABLE_KEY (la clave pública, no la secreta). */

class ErrorServicio extends Error {}                      // la base o el servicio no respondió
class ErrorHttp extends Error {                           // respuesta con código que el servidor traduce
  constructor(estado, codigo, mensaje) { super(mensaje); this.estado = estado; this.codigo = codigo; }
}

function config() {
  const url = process.env.SUPABASE_URL;
  const clave = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !clave) throw new ErrorServicio('Faltan las variables SUPABASE_URL o SUPABASE_PUBLISHABLE_KEY');
  return { url: url.replace(/\/+$/, ''), clave };
}

async function llamar(ruta, { method = 'GET', body, token, prefer } = {}) {
  const { url, clave } = config();
  const h = { apikey: clave, 'Content-Type': 'application/json' };
  if (token) h.Authorization = 'Bearer ' + token;
  if (prefer) h.Prefer = prefer;
  let r;
  try {
    r = await fetch(url + ruta, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(8000) });
  } catch (e) {
    throw new ErrorServicio('Supabase no respondió: ' + e.name);
  }
  const texto = await r.text();
  let datos = null;
  try { datos = texto ? JSON.parse(texto) : null; } catch (e) { datos = null; }
  return { status: r.status, datos };
}

// Base de datos (PostgREST) con el token de la persona.
async function db(ruta, opciones) {
  const r = await llamar('/rest/v1/' + ruta, opciones);
  if (r.status >= 200 && r.status < 300) return r.datos;
  const cod = r.datos && r.datos.code;
  if (r.status === 401 || cod === 'PGRST301' || cod === 'PGRST303') throw new ErrorHttp(401, 'sesion_expirada', 'Tu sesión expiró. Vuelve a iniciar sesión.');
  if (r.status === 403 || cod === '42501') throw new ErrorHttp(403, 'sin_permiso', 'Tu rol no permite hacer esto.');
  if (cod === '23514' || cod === '23502' || cod === '22P02') throw new ErrorHttp(400, 'validacion', 'La base de datos rechazó un dato que no cumple las reglas.');
  throw new ErrorServicio('La base de datos respondió con el código ' + r.status + (cod ? ' (' + cod + ')' : ''));
}

module.exports = { llamar, db, ErrorServicio, ErrorHttp };
