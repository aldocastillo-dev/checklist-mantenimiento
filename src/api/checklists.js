'use strict';
/* POST /api/checklists: recibe un checklist, lo valida, lo guarda y responde con un folio. */
const { validar } = require('./_validar');
const { insertar } = require('./_db');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'metodo_no_permitido', mensaje: 'Este servicio solo recibe checklists con POST.' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = null; }
  }
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ error: 'cuerpo_invalido', mensaje: 'El envío no trae datos válidos.', errores: {} });
  }

  const { errores, datos } = validar(body);
  if (!datos) {
    return res.status(400).json({
      error: 'validacion',
      mensaje: 'El servidor no guardó el checklist: ' + Object.values(errores).join(' '),
      errores
    });
  }

  try {
    const { fila, repetido } = await insertar(datos);
    // 201: se guardó una fila nueva. 200: ese checklist ya estaba guardado y se devuelve el mismo folio.
    return res.status(repetido ? 200 : 201).json({
      folio: fila.id_checklist,
      repetido,
      duracion_min: datos.duracion_min,
      horas_hombre: datos.horas_hombre,
      estado: datos.estado
    });
  } catch (e) {
    console.error('[checklists] ' + e.message); // el mensaje no incluye claves
    return res.status(503).json({
      error: 'servicio_no_disponible',
      mensaje: 'No pudimos guardar el checklist ahora. Queda pendiente de envío.'
    });
  }
};
