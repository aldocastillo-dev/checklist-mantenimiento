/* ReporteMtto · prototipo navegable
   Espejo digital del «Check list entrega trabajos de mantenimiento» autorizado por el mandante:
   cada recuadro de la hoja física tiene su equivalente en la pantalla.
   Todo corre en el navegador, sin servidor. Lo que se busca observar (navegación,
   validación de campos y estados de la interfaz) funciona de verdad; guardar, enviar
   y descargar se simulan con datos de ejemplo. Ver docs/prototipo.md. */
(function () {
  'use strict';

  /* ---------- Catálogos reales (entregados por el equipo) ---------- */
  var BASES_3_LINEAS = ['Chancador', 'Apron Primario', 'Correa de Finos', 'Apron Secundario', 'Correa Sacrificio', 'Correa Intermedia'];
  var EQ_CHANCADO = [];
  ['L1', 'L2', 'L3'].forEach(function (l) {
    BASES_3_LINEAS.forEach(function (b) { EQ_CHANCADO.push(b + ' ' + l); });
  });
  EQ_CHANCADO.push('Correa Colectora Norte', 'Correa Reversible');

  var EQ_TRANSPORTE_PRINCIPAL = [
    'Alimentador Norte', 'Alimentador Sur', 'Correa Nivel 1', 'Correa Transferencia',
    'Correa Principal 1', 'Correa Principal 2', 'Correa Overland', 'Alimentador 1',
    'Alimentador 2', 'Correa Pila Mina', 'Correa Complementaria', 'Correa 442'
  ];

  var AREAS = ['Superficie', 'Chancado', 'Transporte intermedio', 'Transporte principal'];
  // Superficie no tiene lista de equipos todavía: se escribe a mano.
  // La lista de Chancado y Transporte intermedio es la misma hasta definir qué equipo va en cada área.
  var EQUIPOS = {
    'Superficie': [],
    'Chancado': EQ_CHANCADO,
    'Transporte intermedio': EQ_CHANCADO,
    'Transporte principal': EQ_TRANSPORTE_PRINCIPAL
  };

  // Datos del usuario: en la app real vienen del perfil, no son fijos.
  var PERFIL = { nombre: 'Juan Pérez', empresa: 'Sigma S.A.' };
  var CARGOS = ['Supervisor', 'Capataz'];

  function semilla() {
    return [
      { id: 101, area: 'Transporte intermedio', equipo: 'Correa Intermedia L1', equipoAct: 'Polea de cola de Correa Intermedia L1',
        detalle: 'Se cambian 3 polines de carga en el tramo de descarga y se revisa la alineación de la correa.',
        obs: '', fecha: '2026-09-25', turno: 'noche', inicio: '20:15', termino: '22:40', n_ot: '111254880',
        traslado: 70, espera: 35, trab: 3, hh: 12.5, estado: 'enviado', cargo: 'Supervisor' },
      { id: 103, area: 'Transporte principal', equipo: 'Alimentador Norte', equipoAct: 'Buzón de carga de Alimentador Norte',
        detalle: 'Se reemplaza el faldón lateral del buzón de carga y se limpia el material acumulado.',
        obs: '', fecha: '2026-09-26', turno: 'día', inicio: '09:00', termino: '11:30', n_ot: '',
        traslado: 30, espera: 0, trab: 2, hh: 6.0, estado: 'enviado', cargo: 'Capataz' }
    ];
  }

  var S = {
    cargo: 'Supervisor',
    senal: true,
    draft: nuevoBorrador(),
    firmado: false,
    bandeja: semilla(),
    pendientes: [],
    last: null,
    siguienteId: 104,
    cargaP5: false,
    filtroTurno: 'todos',
    filtroEquipo: 'todos',
    editando: null,
    enviando: false
  };

  function nuevoBorrador() {
    return {
      area: '', areaOtra: '', equipo: '', equipoOtro: '', equipoAct: '',
      inicio: '', termino: '', n_ot: '',
      detalle: '', obs: '',
      n_trabajadores: 3, min_traslado: '0', min_espera_bloqueo: '0', fecha: hoy(), turno: turnoAhora(),
      p1Ok: false, p2Ok: false
    };
  }

  /* ---------- utilidades ---------- */
  var app = document.getElementById('app');
  var toastEl = document.getElementById('toast');
  var toastTimer = null;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function $(sel, root) { return (root || app).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || app).querySelectorAll(sel)); }
  function ctl(id) { return document.getElementById(id); }

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.className = 'on';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.className = ''; }, 3500);
  }

  function hoy() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function turnoAhora() {
    var h = new Date().getHours();
    return (h >= 8 && h < 20) ? 'día' : 'noche';
  }
  function horaAhora() {
    var d = new Date();
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  function aMin(hhmm) { var p = hhmm.split(':'); return parseInt(p[0], 10) * 60 + parseInt(p[1], 10); }
  function duracion(ini, fin) { return (aMin(fin) - aMin(ini) + 1440) % 1440; }
  function esEntero(v) { return /^\d+$/.test(String(v).trim()); }

  function minutos(d) { return (d.inicio && d.termino) ? duracion(d.inicio, d.termino) : null; }
  function horasHombre(d) {
    var dur = minutos(d);
    if (dur === null) return null;
    var mt = esEntero(d.min_traslado) ? parseInt(d.min_traslado, 10) : 0;
    var me = esEntero(d.min_espera_bloqueo) ? parseInt(d.min_espera_bloqueo, 10) : 0;
    var n = parseInt(d.n_trabajadores, 10) || 0;
    return Math.round((dur + mt + me) * n / 60 * 10) / 10;
  }
  function fmt(n) { return String(n.toFixed(1)).replace('.', ','); }

  function areaFinal(d) { return d.area === '__otro' ? d.areaOtra.trim() : d.area; }
  function equipoFinal(d) { return d.equipo === '__otro' ? d.equipoOtro.trim() : d.equipo; }

  /* ---------- navegación ---------- */
  var TITULOS = {
    p1: 'Nuevo checklist', p2: 'Detalle realizado y horas', p3: 'Firma',
    p4: 'Confirmación', p5: 'Bandeja'
  };

  function ruta() {
    var r = (location.hash || '').replace('#/', '');
    return TITULOS[r] ? r : (ctl('ctl-rol').value === 'programador' ? 'p5' : 'p1');
  }
  function go(r) {
    if (location.hash === '#/' + r) { render(); } else { location.hash = '#/' + r; }
  }

  function barra(volverTxt, volverRuta) {
    return '<header class="topbar">' +
      '<button type="button" class="back" data-go="' + volverRuta + '" aria-label="' + esc(volverTxt) + '">‹ ' + esc(volverTxt) + '</button>' +
      '<span class="marca">ReporteMtto</span></header>';
  }

  function render() {
    var r = ruta();
    if (r === 'p2' && !S.draft.p1Ok) { r = 'p1'; location.replace('#/p1'); }
    if (r === 'p3' && !S.draft.p2Ok) { r = S.draft.p1Ok ? 'p2' : 'p1'; location.replace('#/' + r); }
    if (r === 'p4' && !S.last) { r = 'p1'; location.replace('#/p1'); }

    ctl('ctl-rol').value = (r === 'p5') ? 'programador' : S.cargo.toLowerCase();

    ({ p1: vistaP1, p2: vistaP2, p3: vistaP3, p4: vistaP4, p5: vistaP5 })[r]();
    document.title = TITULOS[r] + ' · ReporteMtto';
    app.focus({ preventScroll: true });
    window.scrollTo(0, 0);
    reengancharIr();
  }

  function reengancharIr() {
    $$('[data-go]').forEach(function (b) {
      b.onclick = function () { go(b.getAttribute('data-go')); };
    });
  }

  /* ---------- helpers de formulario ---------- */
  function opciones(lista, actual, otro) {
    var h = '<option value="">Elige una opción</option>';
    lista.forEach(function (o) {
      h += '<option value="' + esc(o) + '"' + (o === actual ? ' selected' : '') + '>' + esc(o) + '</option>';
    });
    if (otro) h += '<option value="__otro"' + (actual === '__otro' ? ' selected' : '') + '>Otro (escribir)</option>';
    return h;
  }
  function campoErr(id) { return '<p class="err" id="err-' + id + '" role="alert"></p>'; }

  function mostrarErr(errId, msg, input) {
    var el = document.getElementById(errId);
    if (el) el.textContent = msg ? '⚠ ' + msg : '';
    if (input) {
      if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
    }
  }
  function aplicarErrores(ids, errs, foco) {
    var primero = null;
    ids.forEach(function (id) {
      var input = document.getElementById((foco && foco[id]) || id);
      mostrarErr('err-' + id, errs[id] || '', input);
      if (errs[id] && !primero) primero = input;
    });
    if (primero) { primero.focus(); return true; }
    return false;
  }

  // Al corregir un campo, su mensaje de error desaparece
  function limpiarErroresAlEscribir(form) {
    var mapa = { areaOtra: 'area', equipoOtro: 'equipo' };
    ['input', 'change'].forEach(function (ev) {
      form.addEventListener(ev, function (e) {
        var id = e.target.id;
        if (!id) return;
        var clave = mapa[id] || id;
        var el = document.getElementById('err-' + clave);
        if (el && el.textContent) mostrarErr('err-' + clave, '', document.getElementById(clave));
      });
    });
  }

  /* ---------- P1 · Nuevo checklist ---------- */
  function vistaP1() {
    var d = S.draft;
    var listaEq = (d.area && d.area !== '__otro') ? (EQUIPOS[d.area] || []) : [];
    var sinLista = d.area && listaEq.length === 0; // Superficie u «Otro»: solo escribir
    app.innerHTML =
      '<header class="topbar">' +
        '<button type="button" class="back" id="cancelar">‹ Cancelar</button>' +
        '<span class="marca">ReporteMtto</span></header>' +
      '<form class="screen" id="f1" novalidate>' +
        '<div><p class="paso">Paso 1 de 3</p><h1>Nuevo checklist</h1></div>' +
        '<p class="ayuda">Son los mismos recuadros de la hoja del check list. Los campos con * son obligatorios.</p>' +

        '<div class="campo"><label for="area">Área *</label>' +
          '<select id="area" aria-describedby="err-area">' + opciones(AREAS, d.area, true) + '</select>' +
          '<div class="campo" id="wrap-areaOtra"' + (d.area === '__otro' ? '' : ' hidden') + '><label for="areaOtra">Nombre del área *</label>' +
          '<input type="text" id="areaOtra" placeholder="Ej: Taller" value="' + esc(d.areaOtra) + '"></div>' +
          campoErr('area') + '</div>' +

        '<div class="campo"><label for="equipo">Equipo *</label>' +
          '<select id="equipo" aria-describedby="err-equipo"' + (d.area ? '' : ' disabled') + '>' +
            (d.area ? opciones(listaEq, d.equipo, true) : '<option value="">Primero elige el área</option>') + '</select>' +
          (sinLista ? '<p class="ayuda">Esta área no tiene lista de equipos: elige «Otro (escribir)».</p>' : '') +
          '<div class="campo" id="wrap-equipoOtro"' + (d.equipo === '__otro' ? '' : ' hidden') + '><label for="equipoOtro">Nombre del equipo *</label>' +
          '<input type="text" id="equipoOtro" placeholder="Ej: Correa Nueva" value="' + esc(d.equipoOtro) + '"></div>' +
          campoErr('equipo') + '</div>' +

        '<div class="fila-2">' +
          '<div class="campo"><label for="fecha">Fecha del turno *</label>' +
            '<input type="date" id="fecha" value="' + esc(d.fecha) + '"></div>' +
          '<div class="campo"><label for="turno">Turno *</label>' +
            '<select id="turno"><option value="día"' + (d.turno === 'día' ? ' selected' : '') + '>Día</option>' +
            '<option value="noche"' + (d.turno === 'noche' ? ' selected' : '') + '>Noche</option></select></div>' +
        '</div>' +
        '<p class="ayuda">Fecha y turno vienen preseleccionados según la hora del teléfono. Cámbialos si reportas otro turno.</p>' +

        '<div class="campo"><label for="equipoAct">Equipo de la actividad *</label>' +
          '<input type="text" id="equipoAct" aria-describedby="ayuda-eqact err-equipoAct" placeholder="Ej: Polea de cola de Correa Reversible" value="' + esc(d.equipoAct) + '">' +
          '<p class="ayuda" id="ayuda-eqact">Puede ser un sub equipo del equipo de arriba.</p>' + campoErr('equipoAct') + '</div>' +

        '<div class="campo"><label for="inicio">Hora inicio *</label>' +
          '<div class="fila"><input type="time" id="inicio" aria-describedby="err-inicio" value="' + esc(d.inicio) + '">' +
          '<button type="button" class="btn-sec" data-ahora="inicio">Ahora</button></div>' + campoErr('inicio') + '</div>' +

        '<div class="campo"><label for="termino">Hora término *</label>' +
          '<div class="fila"><input type="time" id="termino" aria-describedby="err-termino" value="' + esc(d.termino) + '">' +
          '<button type="button" class="btn-sec" data-ahora="termino">Ahora</button></div>' + campoErr('termino') + '</div>' +

        '<div class="campo"><label for="n_ot">N° OT SAP <span class="opc">(opcional)</span></label>' +
          '<input type="text" inputmode="numeric" id="n_ot" aria-describedby="ayuda-ot err-n_ot" placeholder="Ej: 111254880" value="' + esc(d.n_ot) + '">' +
          '<p class="ayuda" id="ayuda-ot">Si aún no lo tienes, déjalo vacío: el programador lo completa.</p>' + campoErr('n_ot') + '</div>' +

        '<div class="acciones"><button type="submit" class="btn-primario">Siguiente</button></div>' +
      '</form>';

    function guardar() {
      d.area = $('#area').value;
      d.areaOtra = $('#areaOtra').value;
      d.equipo = $('#equipo').value;
      d.equipoOtro = $('#equipoOtro').value;
      d.equipoAct = $('#equipoAct').value;
      d.fecha = $('#fecha').value || d.fecha;
      d.turno = $('#turno').value;
      d.inicio = $('#inicio').value;
      d.termino = $('#termino').value;
      d.n_ot = $('#n_ot').value.trim();
    }
    $('#area').addEventListener('change', function () {
      guardar(); d.equipo = ''; d.equipoOtro = '';
      var lista = (d.area && d.area !== '__otro') ? (EQUIPOS[d.area] || []) : [];
      if (d.area && lista.length === 0) d.equipo = '__otro'; // sin lista: se escribe
      vistaP1(); reengancharIr();
    });
    $('#equipo').addEventListener('change', function () {
      guardar(); $('#wrap-equipoOtro').hidden = (d.equipo !== '__otro');
      if (d.equipo === '__otro') $('#equipoOtro').focus();
    });
    $$('[data-ahora]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-ahora');
        $('#' + id).value = horaAhora(); guardar();
        mostrarErr('err-' + id, '', $('#' + id));
      });
    });
    $('#cancelar').addEventListener('click', function () {
      guardar();
      var hayDatos = d.area || d.equipoAct || d.inicio || d.termino || d.n_ot;
      if (!hayDatos) { toast('No hay nada que descartar.'); return; }
      abrirDialogo(
        '<h2 id="doc-title">¿Descartar el checklist?</h2>' +
        '<p>Se borrará lo que escribiste en este checklist.</p>' +
        '<div class="acciones">' +
          '<button type="button" class="btn-primario" id="dlg-si">Descartar</button>' +
          '<button type="button" class="btn-sec" id="dlg-no">Seguir editando</button></div>');
      $('#dlg-si', dlg).addEventListener('click', function () {
        S.draft = nuevoBorrador(); dlg.close(); toast('Checklist descartado.'); vistaP1(); reengancharIr();
      });
      $('#dlg-no', dlg).addEventListener('click', function () { dlg.close(); });
    });

    limpiarErroresAlEscribir($('#f1'));
    $('#f1').addEventListener('submit', function (e) {
      e.preventDefault(); guardar();
      var errs = {}, foco = {};
      if (!d.area) errs.area = 'Elige el área del trabajo.';
      else if (d.area === '__otro' && !d.areaOtra.trim()) { errs.area = 'Escribe el nombre del área.'; foco.area = 'areaOtra'; }
      if (!d.equipo) errs.equipo = 'Elige el equipo de la lista, o «Otro (escribir)» si no aparece.';
      else if (d.equipo === '__otro' && !d.equipoOtro.trim()) { errs.equipo = 'Escribe el nombre del equipo.'; foco.equipo = 'equipoOtro'; }
      if (!d.equipoAct.trim()) errs.equipoAct = 'Escribe el equipo de la actividad. Puede ser un sub equipo, por ejemplo «Polea de cola».';
      if (!d.inicio) errs.inicio = 'Toca «Ahora» o escribe la hora de inicio, por ejemplo 20:15.';
      if (!d.termino) errs.termino = 'Toca «Ahora» o escribe la hora de término, por ejemplo 22:40.';
      else if (d.inicio && d.inicio === d.termino) errs.termino = 'La hora de término no puede ser igual a la de inicio. Corrígela.';
      if (d.n_ot && !/^\d{9}$/.test(d.n_ot)) errs.n_ot = 'El N° de OT tiene 9 dígitos, por ejemplo 111254880. Corrígelo o déjalo vacío.';
      if (aplicarErrores(['area', 'equipo', 'equipoAct', 'inicio', 'termino', 'n_ot'], errs, foco)) return;
      d.p1Ok = true;
      go('p2');
    });
  }

  /* ---------- P2 · Detalle realizado y horas ---------- */
  function vistaP2() {
    var d = S.draft;
    var hh = horasHombre(d), dur = minutos(d);
    app.innerHTML =
      barra('Volver', 'p1') +
      '<form class="screen" id="f2" novalidate>' +
        '<div><p class="paso">Paso 2 de 3</p><h1>Detalle realizado y horas</h1></div>' +
        '<p class="ayuda">' + esc(areaFinal(d)) + ' · ' + esc(equipoFinal(d)) + '<br>Actividad en: ' + esc(d.equipoAct) + '</p>' +

        '<div class="campo"><label for="detalle">Detalle realizado *</label>' +
          '<textarea id="detalle" aria-describedby="ayuda-det err-detalle" placeholder="Escribe o pega aquí lo que se hizo">' + esc(d.detalle) + '</textarea>' +
          '<p class="ayuda" id="ayuda-det">Puedes pegar el reporte que ya tienes escrito en las notas de tu teléfono.</p>' + campoErr('detalle') + '</div>' +

        '<div class="campo"><label for="obs">Observaciones detectadas durante recepción de actividades <span class="opc">(opcional)</span></label>' +
          '<textarea id="obs" aria-describedby="ayuda-obs" placeholder="Escribe o pega aquí lo que se detectó">' + esc(d.obs) + '</textarea>' +
          '<p class="ayuda" id="ayuda-obs">Si necesitas indicar el N° SAP de un repuesto, anótalo aquí.</p></div>' +

        '<div class="tarjeta" aria-live="polite"><span>Duración actividad (calculada)</span>' +
          '<span class="cifra" id="dur">' + (dur === null ? '—' : dur + ' min') + '</span></div>' +

        '<div class="fila-2">' +
          '<div class="campo"><label for="min_traslado">Tiempo traslado (min)</label>' +
            '<input type="text" inputmode="numeric" id="min_traslado" aria-describedby="err-min_traslado" value="' + esc(d.min_traslado) + '">' + campoErr('min_traslado') + '</div>' +
          '<div class="campo"><label for="min_espera_bloqueo">Tiempo espera bloqueo (min)</label>' +
            '<input type="text" inputmode="numeric" id="min_espera_bloqueo" aria-describedby="err-min_espera_bloqueo" value="' + esc(d.min_espera_bloqueo) + '">' + campoErr('min_espera_bloqueo') + '</div>' +
        '</div>' +

        '<div class="campo"><span class="etiqueta" id="lbl-trab">N° trabajadores *</span>' +
          '<div class="stepper" role="group" aria-labelledby="lbl-trab">' +
            '<button type="button" id="menos" aria-label="Menos un trabajador">−</button>' +
            '<output id="n_trab" aria-live="polite">' + esc(d.n_trabajadores) + '</output>' +
            '<button type="button" id="mas" aria-label="Más un trabajador">+</button></div></div>' +

        '<div class="tarjeta" aria-live="polite"><span>Horas hombre (calculadas)</span><span class="cifra" id="hh">' + (hh === null ? '—' : fmt(hh)) + '</span></div>' +

        '<div class="acciones"><button type="submit" class="btn-primario">Firmar</button></div>' +
      '</form>';

    function leer() {
      d.detalle = $('#detalle').value;
      d.obs = $('#obs').value;
      d.min_traslado = $('#min_traslado').value.trim();
      d.min_espera_bloqueo = $('#min_espera_bloqueo').value.trim();
    }
    function refrescar() {
      leer();
      var h = horasHombre(d);
      $('#hh').textContent = h === null ? '—' : fmt(h);
      $('#n_trab').textContent = d.n_trabajadores;
    }
    $$('#f2 input, #f2 textarea').forEach(function (i) { i.addEventListener('input', refrescar); });
    $('#menos').addEventListener('click', function () { d.n_trabajadores = Math.max(1, d.n_trabajadores - 1); refrescar(); });
    $('#mas').addEventListener('click', function () { d.n_trabajadores = Math.min(20, d.n_trabajadores + 1); refrescar(); });

    limpiarErroresAlEscribir($('#f2'));
    $('#f2').addEventListener('submit', function (e) {
      e.preventDefault(); leer();
      var errs = {};
      if (!d.detalle.trim()) errs.detalle = 'Escribe lo que se hizo en la actividad, o pega tu reporte.';
      if (!esEntero(d.min_traslado)) errs.min_traslado = 'Escribe los minutos como número, por ejemplo 70. Si no hubo, deja 0.';
      if (!esEntero(d.min_espera_bloqueo)) errs.min_espera_bloqueo = 'Escribe los minutos como número, por ejemplo 35. Si no hubo, deja 0.';
      if (aplicarErrores(['detalle', 'min_traslado', 'min_espera_bloqueo'], errs)) return;
      d.p2Ok = true;
      S.firmado = false;
      go('p3');
    });
  }

  /* ---------- P3 · Firma ---------- */
  function vistaP3() {
    app.innerHTML =
      barra('Volver', 'p2') +
      '<div class="screen">' +
        '<div><p class="paso">Paso 3 de 3</p><h1>Firma</h1></div>' +
        '<div class="tarjeta"><span class="etiqueta">Quien entrega</span>' +
          '<p>Nombre: <strong>' + esc(PERFIL.nombre) + '</strong></p>' +
          '<p>Cargo: <strong>' + esc(S.cargo) + '</strong></p>' +
          '<p>Empresa: <strong>' + esc(PERFIL.empresa) + '</strong></p></div>' +
        '<div class="campo"><span class="etiqueta" id="lbl-firma">Firma con el dedo dentro del recuadro *</span>' +
          '<div class="firma-wrap" id="firma-wrap"><canvas id="firma" role="img" aria-labelledby="lbl-firma"></canvas><div class="firma-guia"></div></div>' +
          '<p class="err" id="err-firma" role="alert"></p>' +
          '<div><button type="button" class="btn-sec" id="limpiar">Limpiar</button></div>' +
        '</div>' +
        '<p class="ayuda">Quien recibe firma después, en el documento descargado.</p>' +
        '<div class="acciones"><button type="button" class="btn-primario" id="enviar">Guardar y enviar</button></div>' +
      '</div>';

    var cv = $('#firma');
    var ratio = window.devicePixelRatio || 1;
    var w = cv.clientWidth || 320, h = 224;
    cv.width = w * ratio; cv.height = h * ratio;
    var ctx = cv.getContext('2d');
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.strokeStyle = '#1A1A1A';
    var dibujando = false;
    function pos(e) { var r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    cv.addEventListener('pointerdown', function (e) {
      dibujando = true; cv.setPointerCapture(e.pointerId);
      var p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + 0.1, p.y + 0.1); ctx.stroke();
      S.firmado = true; mostrarFirmaErr('');
    });
    cv.addEventListener('pointermove', function (e) {
      if (!dibujando) return; var p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke();
    });
    ['pointerup', 'pointercancel'].forEach(function (ev) {
      cv.addEventListener(ev, function () { dibujando = false; });
    });
    $('#limpiar').addEventListener('click', function () {
      ctx.clearRect(0, 0, w, h); S.firmado = false; toast('Firma borrada. Puedes firmar de nuevo.');
    });
    function mostrarFirmaErr(msg) {
      $('#err-firma').textContent = msg ? '⚠ ' + msg : '';
      $('#firma-wrap').setAttribute('data-error', msg ? 'true' : 'false');
    }

    $('#enviar').addEventListener('click', function () {
      if (S.enviando) return;
      if (!S.firmado) { mostrarFirmaErr('Falta tu firma. Dibújala con el dedo dentro del recuadro.'); return; }
      S.enviando = true;
      var b = $('#enviar'); b.disabled = true; b.textContent = 'Enviando…'; b.setAttribute('aria-busy', 'true');
      setTimeout(function () {
        var d = S.draft;
        var reg = {
          id: S.siguienteId++, area: areaFinal(d), equipo: equipoFinal(d), equipoAct: d.equipoAct.trim(),
          detalle: d.detalle.trim(), obs: d.obs.trim(), fecha: d.fecha, turno: d.turno,
          inicio: d.inicio, termino: d.termino, n_ot: d.n_ot,
          traslado: parseInt(d.min_traslado, 10), espera: parseInt(d.min_espera_bloqueo, 10),
          trab: d.n_trabajadores, hh: horasHombre(d), cargo: S.cargo,
          estado: S.senal ? 'enviado' : 'pendiente'
        };
        if (S.senal) S.bandeja.unshift(reg); else S.pendientes.push(reg);
        S.last = reg; S.enviando = false;
        go('p4');
      }, 1200);
    });
  }

  /* ---------- P4 · Confirmación ---------- */
  function vistaP4() {
    var l = S.last;
    var ok = l.estado === 'enviado';
    app.innerHTML =
      barra('Inicio', 'p1') +
      '<div class="screen">' +
        '<div><p class="paso">Listo</p><h1>Confirmación</h1></div>' +
        (ok
          ? '<div class="tarjeta"><h2>Checklist enviado</h2>' +
              '<p>Estado: <span class="estado-ok">Enviado ✓</span></p>' +
              '<p>Horas hombre</p><p class="cifra">' + fmt(l.hh) + '</p>' +
              '<p>' + esc(l.equipo) + '</p></div>' +
            '<p class="ayuda">El programador ya lo ve en su bandeja.</p>'
          : '<div class="tarjeta alerta"><h2>Checklist guardado</h2>' +
              '<p>Estado: <span class="estado-pend">Pendiente de envío</span></p>' +
              '<p class="estado-pend">Se enviará al recuperar señal</p>' +
              '<p>Horas hombre</p><p class="cifra">' + fmt(l.hh) + '</p>' +
              '<p>' + esc(l.equipo) + '</p></div>' +
            '<p class="ayuda">Puedes abrir un checklist nuevo. Si hace falta avisar ya, usa la radio como siempre.</p>') +
        '<div class="acciones"><button type="button" class="btn-primario" id="nuevo">Nuevo checklist</button></div>' +
      '</div>';
    $('#nuevo').addEventListener('click', function () {
      S.draft = nuevoBorrador(); S.last = null; S.firmado = false; go('p1');
    });
  }

  /* ---------- P5 · Bandeja del programador ---------- */
  function vistaP5() {
    var cuerpo;
    if (S.cargaP5) {
      cuerpo = '<p class="cargando" role="status">Cargando bandeja…</p>';
    } else if (!S.senal) {
      cuerpo = '<div class="banner-error" role="alert"><strong>⚠ No se pudo actualizar la bandeja</strong>' +
        '<p>No hay conexión. Revisa tu señal y toca «Reintentar».</p>' +
        '<button type="button" class="btn-primario" id="reintentar">Reintentar</button></div>';
    } else {
      var lista = S.bandeja.filter(function (c) {
        return (S.filtroTurno === 'todos' || c.turno === S.filtroTurno) &&
               (S.filtroEquipo === 'todos' || c.equipo === S.filtroEquipo);
      });
      if (!S.bandeja.length) {
        cuerpo = '<div class="vacio"><h2>Aún no hay checklists</h2>' +
          '<p>Cuando un supervisor envíe uno, aparecerá aquí.</p></div>';
      } else if (!lista.length) {
        cuerpo = '<div class="vacio"><h2>Sin resultados</h2>' +
          '<p>No hay checklists con estos filtros.</p>' +
          '<button type="button" class="btn-sec" id="reset-filtros">Quitar filtros</button></div>';
      } else {
        cuerpo = '<ul class="lista">' + lista.map(tarjetaChecklist).join('') + '</ul>';
      }
    }

    var equipos = [];
    S.bandeja.forEach(function (c) { if (equipos.indexOf(c.equipo) < 0) equipos.push(c.equipo); });

    app.innerHTML =
      barra('Volver', 'p1') +
      '<div class="screen">' +
        '<div><p class="paso">Programador</p><h1>Bandeja</h1></div>' +
        '<div class="filtros">' +
          '<div class="campo"><label for="f-turno">Turno</label><select id="f-turno">' +
            ['todos', 'día', 'noche'].map(function (t) {
              return '<option value="' + t + '"' + (S.filtroTurno === t ? ' selected' : '') + '>' + (t === 'todos' ? 'Todos' : t) + '</option>';
            }).join('') + '</select></div>' +
          '<div class="campo"><label for="f-equipo">Equipo</label><select id="f-equipo"><option value="todos">Todos</option>' +
            equipos.map(function (q) { return '<option value="' + esc(q) + '"' + (S.filtroEquipo === q ? ' selected' : '') + '>' + esc(q) + '</option>'; }).join('') +
          '</select></div>' +
        '</div>' +
        cuerpo +
      '</div>';

    function redibujar() { vistaP5(); reengancharIr(); }
    $('#f-turno').addEventListener('change', function (e) { S.filtroTurno = e.target.value; redibujar(); });
    $('#f-equipo').addEventListener('change', function (e) { S.filtroEquipo = e.target.value; redibujar(); });
    var rf = $('#reset-filtros');
    if (rf) rf.addEventListener('click', function () { S.filtroTurno = 'todos'; S.filtroEquipo = 'todos'; redibujar(); });
    var rt = $('#reintentar');
    if (rt) rt.addEventListener('click', function () { cargarP5(); });

    $$('[data-edit]').forEach(function (b) {
      b.addEventListener('click', function () { S.editando = parseInt(b.getAttribute('data-edit'), 10); redibujar(); var i = $('#ot-input'); if (i) i.focus(); });
    });
    $$('[data-desc]').forEach(function (b) {
      b.addEventListener('click', function () { abrirDocumento(parseInt(b.getAttribute('data-desc'), 10)); });
    });
    var g = $('#ot-guardar');
    if (g) g.addEventListener('click', function () {
      var inp = $('#ot-input'); var v = inp.value.trim();
      if (!/^\d{9}$/.test(v)) { mostrarErr('err-ot-input', 'El N° de OT tiene 9 dígitos, por ejemplo 111254880. Corrígelo.', inp); inp.focus(); return; }
      S.bandeja.forEach(function (c) { if (c.id === S.editando) c.n_ot = v; });
      S.editando = null; toast('N° de OT actualizado.'); redibujar();
    });
    var c = $('#ot-cancelar');
    if (c) c.addEventListener('click', function () { S.editando = null; redibujar(); });
  }

  function tarjetaChecklist(c) {
    var edit = (S.editando === c.id);
    return '<li class="tarjeta"><h2>' + esc(c.equipo) + '</h2>' +
      '<p>' + esc(c.fecha) + ' · ' + esc(c.turno) + '</p>' +
      '<p>Estado: <span class="estado-ok">Enviado ✓</span></p>' +
      '<p>N° OT SAP: ' + (c.n_ot ? esc(c.n_ot) : '(vacío)') + '</p>' +
      '<p>Horas hombre: ' + fmt(c.hh) + '</p>' +
      (edit
        ? '<div class="edit-ot"><div class="campo"><label for="ot-input">N° OT SAP</label>' +
          '<input type="text" inputmode="numeric" id="ot-input" aria-describedby="err-ot-input" value="' + esc(c.n_ot) + '" placeholder="Ej: 111254880">' +
          '<p class="err" id="err-ot-input" role="alert"></p></div>' +
          '<div class="card-botones"><button type="button" class="btn-primario" id="ot-guardar">Guardar</button>' +
          '<button type="button" class="btn-sec" id="ot-cancelar">Cancelar</button></div></div>'
        : '<div class="card-botones"><button type="button" class="btn-sec" data-edit="' + c.id + '">Editar OT</button>' +
          '<button type="button" class="btn-primario" data-desc="' + c.id + '">Descargar</button></div>') +
      '</li>';
  }

  function cargarP5() {
    S.cargaP5 = true; vistaP5(); reengancharIr();
    setTimeout(function () {
      S.cargaP5 = false;
      if (ruta() === 'p5') { vistaP5(); reengancharIr(); }
    }, 900);
  }

  /* ---------- Diálogo y documento simulado (réplica de la hoja oficial) ---------- */
  var dlg = document.getElementById('doc-dialog');
  function abrirDialogo(html) {
    dlg.innerHTML = html;
    if (!dlg.open) dlg.showModal();
  }
  function abrirDocumento(id) {
    var c = S.bandeja.filter(function (x) { return x.id === id; })[0];
    if (!c) return;
    var dur = (c.inicio && c.termino) ? duracion(c.inicio, c.termino) + ' min' : '—';
    abrirDialogo(
      '<h2 id="doc-title">CHECK LIST ENTREGA TRABAJOS DE MANTENIMIENTO</h2>' +
      '<p>Vista previa simulada del documento en el formato oficial.</p>' +
      '<table class="doc-tabla"><tbody>' +
        '<tr><th scope="row">Área</th><td>' + esc(c.area) + '</td></tr>' +
        '<tr><th scope="row">Equipo</th><td>' + esc(c.equipo) + '</td></tr>' +
        '<tr><th scope="row">Fecha turno</th><td>' + esc(c.fecha) + ' · ' + esc(c.turno) + '</td></tr>' +
        '<tr><th scope="row">Nombre quien entrega</th><td>' + esc(PERFIL.nombre) + '</td></tr>' +
        '<tr><th scope="row">Cargo</th><td>' + esc(c.cargo) + '</td></tr>' +
        '<tr><th scope="row">Empresa</th><td>' + esc(PERFIL.empresa) + '</td></tr>' +
        '<tr><th scope="row">Firma</th><td>Firmado ✓</td></tr>' +
      '</tbody></table>' +
      '<p class="doc-sub">Evaluación de las actividades ejecutadas</p>' +
      '<table class="doc-tabla"><tbody>' +
        '<tr><th scope="row">N°</th><td>1</td></tr>' +
        '<tr><th scope="row">Equipo</th><td>' + esc(c.equipoAct) + '</td></tr>' +
        '<tr><th scope="row">Detalle realizado</th><td>' + esc(c.detalle) + '</td></tr>' +
        '<tr><th scope="row">Hora inicio</th><td>' + esc(c.inicio) + '</td></tr>' +
        '<tr><th scope="row">Hora término</th><td>' + esc(c.termino) + '</td></tr>' +
        '<tr><th scope="row">N° OT SAP</th><td>' + (c.n_ot ? esc(c.n_ot) : '(vacío)') + '</td></tr>' +
      '</tbody></table>' +
      '<p class="doc-sub">Observaciones detectadas durante recepción de actividades</p>' +
      '<p class="doc-caja">' + (c.obs ? esc(c.obs) : '&nbsp;') + '</p>' +
      '<p class="doc-sub">Registro de participantes y horas utilizadas en la actividad</p>' +
      '<table class="doc-tabla"><tbody>' +
        '<tr><th scope="row">Duración actividad</th><td>' + dur + '</td></tr>' +
        '<tr><th scope="row">Tiempo traslado</th><td>' + esc(c.traslado) + ' min</td></tr>' +
        '<tr><th scope="row">Tiempo espera bloqueo</th><td>' + esc(c.espera) + ' min</td></tr>' +
        '<tr><th scope="row">N° trabajadores</th><td>' + esc(c.trab) + '</td></tr>' +
      '</tbody></table>' +
      '<div class="doc-firmas"><div>Nombre, cargo, empresa y firma de quien recibe<br>(se completa en papel)</div></div>' +
      '<div class="acciones"><button type="button" class="btn-primario" id="dlg-cerrar">Cerrar</button></div>');
    $('#dlg-cerrar', dlg).addEventListener('click', function () { dlg.close(); });
  }

  /* ---------- Controles del prototipo ---------- */
  ctl('ctl-rol').addEventListener('change', function (e) {
    var v = e.target.value;
    if (v === 'programador') { go('p5'); cargarP5(); }
    else { S.cargo = (v === 'capataz') ? 'Capataz' : 'Supervisor'; go('p1'); }
  });
  ctl('ctl-senal').addEventListener('change', function (e) {
    S.senal = (e.target.value === 'con');
    if (S.senal && S.pendientes.length) {
      var n = S.pendientes.length;
      S.pendientes.forEach(function (c) { c.estado = 'enviado'; S.bandeja.unshift(c); });
      if (S.last && S.last.estado === 'pendiente') S.last.estado = 'enviado';
      S.pendientes = [];
      toast(n === 1 ? 'Volvió la señal: se envió 1 checklist pendiente.' : 'Volvió la señal: se enviaron ' + n + ' checklists pendientes.');
    }
    if (ruta() === 'p5') cargarP5(); else if (ruta() === 'p4') { vistaP4(); reengancharIr(); }
  });
  ctl('ctl-bandeja').addEventListener('change', function (e) {
    S.bandeja = (e.target.value === 'datos') ? semilla().concat(S.bandeja.filter(function (c) { return c.id >= 104; })) : [];
    S.filtroTurno = 'todos'; S.filtroEquipo = 'todos';
    if (ruta() === 'p5') cargarP5();
  });

  window.addEventListener('hashchange', function () {
    render();
    if (ruta() === 'p5') cargarP5();
  });

  render();
  if (ruta() === 'p5') cargarP5();
})();
