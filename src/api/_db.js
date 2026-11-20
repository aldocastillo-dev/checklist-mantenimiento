'use strict';
/* Acceso a la base de datos (Supabase, tabla "checklists").
   Las claves se leen de variables de entorno: nunca van escritas en el código. */

class ErrorServicio extends Error {}

// Las claves nuevas de Supabase (sb_secret_...) no son JWT: van solo en "apikey".
// Las claves antiguas (service_role, JWT) también se envían como Authorization.
function encabezados(clave) {
  const h = { apikey: clave, 'Content-Type': 'application/json', Prefer: 'return=representation' };
  if (!clave.startsWith('sb_')) h.Authorization = 'Bearer ' + clave;
  return h;
}

async function insertar(fila) {
  const url = process.env.SUPABASE_URL;
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !clave) throw new ErrorServicio('Faltan las variables SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');

  let r;
  try {
    r = await fetch(url.replace(/\/+$/, '') + '/rest/v1/checklists', {
      method: 'POST',
      headers: encabezados(clave),
      body: JSON.stringify(fila),
      signal: AbortSignal.timeout(8000)
    });
  } catch (e) {
    throw new ErrorServicio('La base de datos no respondió: ' + e.name);
  }
  if (!r.ok) throw new ErrorServicio('La base de datos respondió con el código ' + r.status);

  const filas = await r.json();
  if (!Array.isArray(filas) || !filas[0] || filas[0].id_checklist === undefined) {
    throw new ErrorServicio('Respuesta inesperada de la base de datos');
  }
  return filas[0];
}

module.exports = { insertar, ErrorServicio };
