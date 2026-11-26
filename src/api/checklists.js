'use strict';
/* /api/checklists
   GET              → lista de checklists que la persona puede ver (RLS decide cuáles)
   GET   ?id=N      → un checklist (404 si no existe o no es de la persona)
   POST             → crea un checklist (solo supervisor o capataz)
   PATCH ?id=N      → recibir, editar el N° de OT o anular (baja lógica), según el rol
   Denegar por defecto: el servidor revisa la sesión y el rol antes de cada acción, y la base lo vuelve a revisar con RLS. */
const { validar, validarAccion } = require('./_validar');
const { db, ErrorHttp, ErrorServicio } = require('./_supa');
const { usuarioDe } = require('./_usuario');

const COLUMNAS_ALTA = ['area', 'equipo', 'equipo_actividad', 'fecha_turno', 'turno', 'hora_inicio', 'hora_termino', 'n_ot',
  'detalle_realizado', 'observaciones', 'n_trabajadores', 'min_traslado', 'min_espera_bloqueo', 'cargo', 'id_envio'];
const NO_ENCONTRADO = new ErrorHttp(404, 'no_encontrado', 'Ese checklist no existe o no tienes acceso a él.');

function cuerpo(req) {
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = null; } }
  return b;
}
function idDe(req) {
  const q = req.query && req.query.id !== undefined ? req.query.id : new URL(req.url, 'http://x').searchParams.get('id');
  if (q === null || q === undefined || q === '') return null;
  return /^\d{1,15}$/.test(String(q)) ? String(q) : 'invalido';
}
function esSupervisor(u) { return u.rol === 'supervisor' || u.rol === 'capataz'; }

async function conAutores(filas, token) {
  const ids = [...new Set(filas.map((f) => f.creado_por).filter(Boolean))];
  let nombres = {};
  if (ids.length) {
    const p = await db('perfiles?select=id,nombre,empresa&id=in.(' + ids.map(encodeURIComponent).join(',') + ')', { token });
    (p || []).forEach((x) => { nombres[x.id] = x; });
  }
  return filas.map((f) => { const p = f.creado_por && nombres[f.creado_por]; return Object.assign({}, f, { autor: p ? p.nombre : null, empresa: p ? p.empresa : null }); });
}

async function uno(id, token) {
  const filas = await db('checklists?select=*&id_checklist=eq.' + id, { token });
  if (!Array.isArray(filas) || !filas[0]) throw NO_ENCONTRADO;
  return filas[0];
}

async function listar(req, res, u) {
  const id = idDe(req);
  if (id === 'invalido') throw NO_ENCONTRADO;
  if (id) {
    const [f] = await conAutores([await uno(id, u.token)], u.token);
    return res.status(200).json({ checklist: f });
  }
  const filas = await db('checklists?select=*&order=creado_en.desc&limit=200', { token: u.token });
  return res.status(200).json({ checklists: await conAutores(filas || [], u.token) });
}

async function crear(req, res, u) {
  if (!esSupervisor(u)) throw new ErrorHttp(403, 'sin_permiso', 'Tu rol (' + u.cargo + ') no permite crear checklists. Solo el supervisor o el capataz los crean.');
  const b = cuerpo(req);
  if (!b || typeof b !== 'object') return res.status(400).json({ error: 'cuerpo_invalido', mensaje: 'El envío no trae datos válidos.', errores: {} });
  b.cargo = u.cargo;                       // el cargo sale de la cuenta, no de lo que mande el teléfono
  const { errores, datos } = validar(b);
  if (!datos) {
    return res.status(400).json({ error: 'validacion', mensaje: 'El servidor no guardó el checklist: ' + Object.values(errores).join(' '), errores });
  }
  const fila = {};
  COLUMNAS_ALTA.forEach((c) => { if (datos[c] !== undefined && datos[c] !== null) fila[c] = datos[c]; });

  let guardada, repetido = false;
  if (fila.id_envio) {
    const nuevas = await db('checklists?on_conflict=id_envio', { method: 'POST', body: fila, token: u.token, prefer: 'return=representation,resolution=ignore-duplicates' });
    if (Array.isArray(nuevas) && nuevas[0]) guardada = nuevas[0];
    else {
      const ya = await db('checklists?select=*&id_envio=eq.' + encodeURIComponent(fila.id_envio), { token: u.token });
      if (!Array.isArray(ya) || !ya[0]) throw new ErrorServicio('No se encontró el checklist repetido');
      guardada = ya[0]; repetido = true;
    }
  } else {
    const nuevas = await db('checklists', { method: 'POST', body: fila, token: u.token, prefer: 'return=representation' });
    if (!Array.isArray(nuevas) || !nuevas[0]) throw new ErrorServicio('Respuesta inesperada de la base de datos');
    guardada = nuevas[0];
  }
  // 201: fila nueva. 200: ese checklist ya estaba guardado y se devuelve el mismo folio.
  return res.status(repetido ? 200 : 201).json({
    folio: guardada.id_checklist, repetido,
    duracion_min: guardada.duracion_min, horas_hombre: Number(guardada.horas_hombre), estado: guardada.estado
  });
}

async function cambiar(req, res, u) {
  const id = idDe(req);
  if (!id || id === 'invalido') throw NO_ENCONTRADO;
  const { errores, datos } = validarAccion(cuerpo(req));
  if (!datos) return res.status(400).json({ error: 'validacion', mensaje: Object.values(errores).join(' '), errores });

  const actual = await uno(id, u.token);   // si no lo puede ver (no es suyo o no existe): 404
  const yaEsta = { recibido: 'Este checklist ya fue recibido.', anulado: 'Este checklist está anulado: ya no se puede cambiar.' };
  let cambios;

  if (datos.accion === 'recibir') {
    if (u.rol !== 'programador') throw new ErrorHttp(403, 'sin_permiso', 'Tu rol (' + u.cargo + ') no permite recibir checklists. Solo el programador los recibe.');
    if (actual.estado !== 'enviado') throw new ErrorHttp(409, 'estado', yaEsta[actual.estado] || 'Este checklist no se puede recibir.');
    cambios = { estado: 'recibido' };
    if (datos.n_ot) cambios.n_ot = datos.n_ot;
  } else if (datos.accion === 'editar_ot') {
    if (u.rol !== 'programador') throw new ErrorHttp(403, 'sin_permiso', 'Tu rol (' + u.cargo + ') no permite cambiar el N° de OT. Solo el programador lo completa.');
    if (actual.estado === 'anulado') throw new ErrorHttp(409, 'estado', yaEsta.anulado);
    cambios = { n_ot: datos.n_ot };
  } else {                                 // anular
    if (u.rol === 'programador') {
      if (actual.estado === 'anulado') throw new ErrorHttp(409, 'estado', yaEsta.anulado);
    } else if (esSupervisor(u)) {
      if (actual.creado_por !== u.id) throw NO_ENCONTRADO;
      if (actual.estado === 'recibido') throw new ErrorHttp(409, 'estado', 'El programador ya lo recibió. Si hay que anularlo, pídeselo a él.');
      if (actual.estado !== 'enviado') throw new ErrorHttp(409, 'estado', yaEsta[actual.estado] || 'Este checklist no se puede anular.');
    } else {
      throw new ErrorHttp(403, 'sin_permiso', 'Tu rol (' + u.cargo + ') solo permite consultar.');
    }
    cambios = { estado: 'anulado', motivo_anulacion: datos.motivo };
  }

  // Se exige que el estado no haya cambiado mientras tanto (si otra persona lo cambió, no se pisa).
  const filas = await db('checklists?id_checklist=eq.' + id + '&estado=eq.' + encodeURIComponent(actual.estado),
    { method: 'PATCH', body: cambios, token: u.token, prefer: 'return=representation' });
  if (!Array.isArray(filas) || !filas[0]) throw new ErrorHttp(409, 'estado', 'Otra persona cambió este checklist recién. Actualiza la lista y revisa su estado.');
  const [f] = await conAutores([filas[0]], u.token);
  return res.status(200).json({ checklist: f });
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (!['GET', 'POST', 'PATCH'].includes(req.method)) {
      res.setHeader('Allow', 'GET, POST, PATCH');
      return res.status(405).json({ error: 'metodo_no_permitido', mensaje: 'Método no permitido.' });
    }
    const u = await usuarioDe(req);        // sin sesión válida y rol, no sigue
    if (req.method === 'GET') return await listar(req, res, u);
    if (req.method === 'POST') return await crear(req, res, u);
    return await cambiar(req, res, u);
  } catch (e) {
    if (e instanceof ErrorHttp) return res.status(e.estado).json({ error: e.codigo, mensaje: e.message });
    console.error('[checklists] ' + e.message); // el mensaje no incluye claves ni tokens
    return res.status(503).json({ error: 'servicio_no_disponible', mensaje: 'No pudimos conectar con el sistema. No es un error tuyo: reintenta en un momento.' });
  }
};
