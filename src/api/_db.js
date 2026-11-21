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

async function pedir(ruta, opciones) {
  const url = process.env.SUPABASE_URL;
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !clave) throw new ErrorServicio('Faltan las variables SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  const h = encabezados(clave);
  if (opciones.prefer) h.Prefer = opciones.prefer;
  let r;
  try {
    r = await fetch(url.replace(/\/+$/, '') + '/rest/v1/' + ruta, {
      method: opciones.method, headers: h, body: opciones.body, signal: AbortSignal.timeout(8000)
    });
  } catch (e) {
    throw new ErrorServicio('La base de datos no respondió: ' + e.name);
  }
  if (!r.ok) throw new ErrorServicio('La base de datos respondió con el código ' + r.status);
  const filas = await r.json();
  if (!Array.isArray(filas)) throw new ErrorServicio('Respuesta inesperada de la base de datos');
  return filas;
}

// Guarda el checklist. Si ya existe uno con el mismo id_envio (se envió dos veces),
// no crea otra fila: devuelve la que ya estaba, con su folio, y marca repetido = true.
async function insertar(fila) {
  if (!fila.id_envio) {
    const filas = await pedir('checklists', { method: 'POST', body: JSON.stringify(fila) });
    if (!filas[0] || filas[0].id_checklist === undefined) throw new ErrorServicio('Respuesta inesperada de la base de datos');
    return { fila: filas[0], repetido: false };
  }
  const nuevas = await pedir('checklists?on_conflict=id_envio', {
    method: 'POST', body: JSON.stringify(fila),
    prefer: 'return=representation,resolution=ignore-duplicates'
  });
  if (nuevas[0] && nuevas[0].id_checklist !== undefined) return { fila: nuevas[0], repetido: false };

  const existentes = await pedir('checklists?select=id_checklist&id_envio=eq.' + encodeURIComponent(fila.id_envio), { method: 'GET' });
  if (!existentes[0]) throw new ErrorServicio('No se encontró el checklist repetido');
  return { fila: existentes[0], repetido: true };
}

module.exports = { insertar, ErrorServicio };
