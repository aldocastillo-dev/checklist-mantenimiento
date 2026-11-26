'use strict';
/* Validación en el servidor del checklist.
   Es la que manda: si un dato no cumple, no se guarda, aunque el formulario lo haya dejado pasar.
   Solo se leen los campos de la lista; cualquier otro campo que llegue se ignora. */

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const ID_ENVIO = /^[A-Za-z0-9-]{8,64}$/;

function texto(v) { return typeof v === 'string' ? v.trim() : ''; }

function entero(v) {
  if (typeof v === 'number' && Number.isInteger(v)) return v;
  if (typeof v === 'string' && /^\d+$/.test(v.trim())) return parseInt(v.trim(), 10);
  return null;
}

function fechaValida(s) {
  if (!FECHA.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function aMin(hhmm) { const p = hhmm.split(':'); return parseInt(p[0], 10) * 60 + parseInt(p[1], 10); }

function validar(body) {
  const b = (body && typeof body === 'object' && !Array.isArray(body)) ? body : {};
  const errores = {};

  const area = texto(b.area);
  if (!area) errores.area = 'Falta el área del trabajo.';
  else if (area.length > 80) errores.area = 'El área puede tener hasta 80 caracteres.';

  const equipo = texto(b.equipo);
  if (!equipo) errores.equipo = 'Falta el equipo.';
  else if (equipo.length > 80) errores.equipo = 'El equipo puede tener hasta 80 caracteres.';

  const equipoActividad = texto(b.equipo_actividad);
  if (!equipoActividad) errores.equipo_actividad = 'Falta el equipo de la actividad.';
  else if (equipoActividad.length > 120) errores.equipo_actividad = 'El equipo de la actividad puede tener hasta 120 caracteres.';

  const fecha = texto(b.fecha_turno);
  if (!fechaValida(fecha)) errores.fecha_turno = 'La fecha del turno no es válida. Usa el formato AAAA-MM-DD, por ejemplo 2026-11-20.';

  const turno = texto(b.turno);
  if (turno !== 'día' && turno !== 'noche') errores.turno = 'El turno debe ser «día» o «noche».';

  const inicio = texto(b.hora_inicio);
  const termino = texto(b.hora_termino);
  if (!HORA.test(inicio)) errores.hora_inicio = 'La hora de inicio no es válida. Usa el formato HH:MM, por ejemplo 20:15.';
  if (!HORA.test(termino)) errores.hora_termino = 'La hora de término no es válida. Usa el formato HH:MM, por ejemplo 22:40.';
  else if (inicio && inicio === termino) errores.hora_termino = 'La hora de término no puede ser igual a la de inicio.';

  let nOt = null;
  if (b.n_ot !== undefined && b.n_ot !== null && texto(String(b.n_ot)) !== '') {
    nOt = texto(String(b.n_ot));
    if (!/^\d{9}$/.test(nOt)) errores.n_ot = 'El N° de OT tiene 9 dígitos, por ejemplo 111254880. Corrígelo o déjalo vacío.';
  }

  const detalle = texto(b.detalle_realizado);
  if (!detalle) errores.detalle_realizado = 'Falta el detalle realizado.';
  else if (detalle.length > 2000) errores.detalle_realizado = 'El detalle puede tener hasta 2000 caracteres.';

  const obs = texto(b.observaciones);
  if (obs.length > 2000) errores.observaciones = 'Las observaciones pueden tener hasta 2000 caracteres.';

  const trab = entero(b.n_trabajadores);
  if (trab === null || trab < 1 || trab > 50) errores.n_trabajadores = 'El N° de trabajadores es un número entero entre 1 y 50.';

  const traslado = b.min_traslado === undefined || b.min_traslado === '' ? 0 : entero(b.min_traslado);
  if (traslado === null || traslado < 0 || traslado > 600) errores.min_traslado = 'El tiempo de traslado son minutos enteros, entre 0 y 600.';

  const espera = b.min_espera_bloqueo === undefined || b.min_espera_bloqueo === '' ? 0 : entero(b.min_espera_bloqueo);
  if (espera === null || espera < 0 || espera > 600) errores.min_espera_bloqueo = 'El tiempo de espera de bloqueo son minutos enteros, entre 0 y 600.';

  const cargo = texto(b.cargo);
  if (cargo !== 'Supervisor' && cargo !== 'Capataz') errores.cargo = 'El cargo debe ser «Supervisor» o «Capataz».';

  // Código único que el teléfono le pone a cada checklist: si llega dos veces, se guarda una sola.
  const idEnvio = texto(b.id_envio);
  if (idEnvio && !ID_ENVIO.test(idEnvio)) errores.id_envio = 'El código del envío no es válido.';

  if (Object.keys(errores).length) return { errores, datos: null };

  // La duración y las horas hombre las calcula el servidor; no se confía en lo que calculó el teléfono.
  const duracion = (aMin(termino) - aMin(inicio) + 1440) % 1440;
  const horasHombre = Math.round(((duracion + traslado + espera) * trab) / 60 * 10) / 10;

  return {
    errores,
    datos: {
      area, equipo, equipo_actividad: equipoActividad,
      fecha_turno: fecha, turno, hora_inicio: inicio, hora_termino: termino,
      n_ot: nOt, detalle_realizado: detalle, observaciones: obs || null,
      n_trabajadores: trab, min_traslado: traslado, min_espera_bloqueo: espera,
      duracion_min: duracion, horas_hombre: horasHombre, cargo, estado: 'enviado',
      id_envio: idEnvio || null
    }
  };
}

// Cambios sobre un checklist ya guardado (PATCH): recibir, editar el N° de OT o anular.
function validarAccion(body) {
  const b = (body && typeof body === 'object' && !Array.isArray(body)) ? body : {};
  const errores = {};
  const accion = texto(b.accion);
  if (!['recibir', 'editar_ot', 'anular'].includes(accion)) {
    errores.accion = 'La acción debe ser «recibir», «editar_ot» o «anular».';
    return { errores, datos: null };
  }
  const datos = { accion };
  if (accion === 'recibir' || accion === 'editar_ot') {
    const nOt = b.n_ot === undefined || b.n_ot === null ? '' : texto(String(b.n_ot));
    if (accion === 'editar_ot' && !nOt) errores.n_ot = 'Escribe el N° de OT: tiene 9 dígitos, por ejemplo 111254880.';
    else if (nOt && !/^\d{9}$/.test(nOt)) errores.n_ot = 'El N° de OT tiene 9 dígitos, por ejemplo 111254880. Corrígelo.';
    if (nOt) datos.n_ot = nOt;
  }
  if (accion === 'anular') {
    const motivo = texto(b.motivo);
    if (motivo.length < 5) errores.motivo = 'Escribe el motivo de la anulación (al menos 5 caracteres), por ejemplo «Lo envié dos veces».';
    else if (motivo.length > 300) errores.motivo = 'El motivo puede tener hasta 300 caracteres.';
    datos.motivo = motivo;
  }
  if (Object.keys(errores).length) return { errores, datos: null };
  return { errores, datos };
}

module.exports = { validar, validarAccion };
