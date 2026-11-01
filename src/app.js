/* ReporteMtto · prototipo navegable
   Todo corre en el navegador, sin servidor. Lo que se busca observar (navegación,
   validación de campos y estados de la interfaz) funciona de verdad; guardar, enviar
   y descargar se simulan con datos de ejemplo. Ver docs/prototipo.md. */
(function () {
  'use strict';

  var EQUIPOS = {
    'Chancado': ['Correa CV-102', 'Chancador primario CH-01'],
    'Hidráulica': ['Unidad UH-04', 'Unidad UH-07'],
    'Molienda': ['Molino SAG-01', 'Bomba de pulpa BP-12']
  };
  var ACTIVIDADES = [
    'Cambio de polín de carga',
    'Cambio de filtro de retorno',
    'Cambio de rodamiento',
    'Inspección de rodamientos'
  ];
  var CAUSAS = ['Rodamiento trabado', 'Desgaste normal', 'Fuga de aceite', 'Desalineación'];
  var SUPERVISOR = 'Juan Pérez'; // dato de ejemplo (docs/datos/estructura_datos.md)

  function semilla() {
    return [
      { id: 101, equipo: 'Correa CV-102', fecha: '2026-09-25', turno: 'noche', estado: 'enviado', n_ot: '4500231987', hh: 12.5, actividad: 'Cambio de polín de carga' },
      { id: 103, equipo: 'Unidad UH-04', fecha: '2026-09-26', turno: 'día', estado: 'enviado', n_ot: '', hh: 6.0, actividad: 'Cambio de filtro de retorno' }
    ];
  }

  var S = {
    rol: 'supervisor',
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
      area: '', equipo: '', equipoOtro: '', actividad: '', actividadOtra: '',
      inicio: '', termino: '', n_ot: '',
      causa: '', repuesto: '', medicion: '', pendiente: '',
      n_trabajadores: 3, min_traslado: '0', min_espera_bloqueo: '0',
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

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.className = 'on';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.className = ''; }, 3500);
  }

  function hoy() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + dd;
  }
  function turnoAhora() {
    var h = new Date().getHours();
    return (h >= 8 && h < 20) ? 'día' : 'noche';
  }
  function horaAhora() {
    var d = new Date();
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  function aMin(hhmm) {
    var p = hhmm.split(':');
    return parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
  }
  function duracion(ini, fin) { return (aMin(fin) - aMin(ini) + 1440) % 1440; }
  function esEntero(v) { return /^\d+$/.test(String(v).trim()); }

  function horasHombre(d) {
    if (!d.inicio || !d.termino) return null;
    var mt = esEntero(d.min_traslado) ? parseInt(d.min_traslado, 10) : 0;
    var me = esEntero(d.min_espera_bloqueo) ? parseInt(d.min_espera_bloqueo, 10) : 0;
    var n = parseInt(d.n_trabajadores, 10) || 0;
    var hh = (duracion(d.inicio, d.termino) + mt + me) * n / 60;
    return Math.round(hh * 10) / 10;
  }
  function fmt(n) { return String(n.toFixed(1)).replace('.', ','); }

  function equipoFinal(d) { return d.equipo === '__otro' ? d.equipoOtro.trim() : d.equipo; }
  function actividadFinal(d) { return d.actividad === '__otro' ? d.actividadOtra.trim() : d.actividad; }

  /* ---------- navegación ---------- */
  var TITULOS = {
    p1: 'Nuevo checklist', p2: 'Detalle técnico y horas', p3: 'Firma',
    p4: 'Confirmación', p5: 'Bandeja'
  };

  function ruta() {
    var r = (location.hash || '').replace('#/', '');
    return TITULOS[r] ? r : (S.rol === 'programador' ? 'p5' : 'p1');
  }
  function go(r) {
    if (location.hash === '#/' + r) { render(); } else { location.hash = '#/' + r; }
  }

  function barra(volverTxt, volverRuta, pasoTxt) {
    return '<header class="topbar">' +
      '<button type="button" class="back" data-go="' + volverRuta + '" aria-label="' + esc(volverTxt) + '">‹ ' + esc(volverTxt) + '</button>' +
      '<span class="marca">ReporteMtto</span></header>' +
      (pasoTxt ? '' : '');
  }

  function render() {
    var r = ruta();
    // protecciones de flujo: no se puede saltar pasos
    if (r === 'p2' && !S.draft.p1Ok) { r = 'p1'; location.replace('#/p1'); }
    if (r === 'p3' && !S.draft.p2Ok) { r = S.draft.p1Ok ? 'p2' : 'p1'; location.replace('#/' + r); }
    if (r === 'p4' && !S.last) { r = 'p1'; location.replace('#/p1'); }

    // el rol sigue a la pantalla
    S.rol = (r === 'p5') ? 'programador' : 'supervisor';
    document.getElementById('ctl-rol').value = S.rol;

    ({ p1: vistaP1, p2: vistaP2, p3: vistaP3, p4: vistaP4, p5: vistaP5 })[r]();
    document.title = TITULOS[r] + ' · ReporteMtto';
    app.focus({ preventScroll: true });
    window.scrollTo(0, 0);

    // retornos y enlaces data-go
    $$('[data-go]').forEach(function (b) {
      b.addEventListener('click', function () { go(b.getAttribute('data-go')); });
    });
  }

  /* ---------- P1 · Nuevo checklist ---------- */
  function opciones(lista, actual, otro) {
    var h = '<option value="">Elige una opción</option>';
    lista.forEach(function (o) {
      h += '<option value="' + esc(o) + '"' + (o === actual ? ' selected' : '') + '>' + esc(o) + '</option>';
    });
    if (otro) h += '<option value="__otro"' + (actual === '__otro' ? ' selected' : '') + '>Otro (escribir)</option>';
    return h;
  }

  function campoErr(id) { return '<p class="err" id="err-' + id + '" role="alert"></p>'; }

  function vistaP1() {
    var d = S.draft;
    var equipos = d.area ? EQUIPOS[d.area] : [];
    app.innerHTML =
      '<header class="topbar">' +
        '<button type="button" class="back" id="cancelar">‹ Cancelar</button>' +
        '<span class="marca">ReporteMtto</span></header>' +
      '<form class="screen" id="f1" novalidate>' +
        '<div><p class="paso">Paso 1 de 3</p><h1>Nuevo checklist</h1></div>' +
        '<p class="ayuda">Los campos con * son obligatorios.</p>' +

        '<div class="campo"><label for="area">Área *</label>' +
          '<select id="area" aria-describedby="err-area">' + opciones(Object.keys(EQUIPOS), d.area, false) + '</select>' + campoErr('area') + '</div>' +

        '<div class="campo"><label for="equipo">Equipo *</label>' +
          '<select id="equipo" aria-describedby="err-equipo"' + (d.area ? '' : ' disabled') + '>' +
            (d.area ? opciones(equipos, d.equipo, true) : '<option value="">Primero elige el área</option>') + '</select>' +
          '<div class="campo" id="wrap-equipoOtro"' + (d.equipo === '__otro' ? '' : ' hidden') + '><label for="equipoOtro">Nombre del equipo *</label>' +
          '<input type="text" id="equipoOtro" placeholder="Ej: Correa CV-205" value="' + esc(d.equipoOtro) + '"></div>' +
          campoErr('equipo') + '</div>' +

        '<div class="campo"><label for="actividad">Actividad *</label>' +
          '<select id="actividad" aria-describedby="err-actividad">' + opciones(ACTIVIDADES, d.actividad, true) + '</select>' +
          '<div class="campo" id="wrap-actividadOtra"' + (d.actividad === '__otro' ? '' : ' hidden') + '><label for="actividadOtra">Nombre de la actividad *</label>' +
          '<input type="text" id="actividadOtra" placeholder="Ej: Cambio de rodillo" value="' + esc(d.actividadOtra) + '"></div>' +
          campoErr('actividad') + '</div>' +

        '<div class="campo"><span class="etiqueta">Fecha y turno (automático)</span>' +
          '<p class="fecha-auto">' + hoy() + ' · turno ' + turnoAhora() + '</p></div>' +

        '<div class="campo"><label for="inicio">Hora de inicio *</label>' +
          '<div class="fila"><input type="time" id="inicio" aria-describedby="err-inicio" value="' + esc(d.inicio) + '">' +
          '<button type="button" class="btn-sec" data-ahora="inicio">Ahora</button></div>' + campoErr('inicio') + '</div>' +

        '<div class="campo"><label for="termino">Hora de término *</label>' +
          '<div class="fila"><input type="time" id="termino" aria-describedby="err-termino" value="' + esc(d.termino) + '">' +
          '<button type="button" class="btn-sec" data-ahora="termino">Ahora</button></div>' + campoErr('termino') + '</div>' +

        '<div class="campo"><label for="n_ot">N° de OT <span class="opc">(opcional)</span></label>' +
          '<input type="text" inputmode="numeric" id="n_ot" aria-describedby="ayuda-ot err-n_ot" placeholder="Ej: 4500231987" value="' + esc(d.n_ot) + '">' +
          '<p class="ayuda" id="ayuda-ot">Si aún no lo tienes, déjalo vacío: el programador lo completa.</p>' + campoErr('n_ot') + '</div>' +

        '<div class="acciones"><button type="submit" class="btn-primario">Siguiente</button></div>' +
      '</form>';

    var f = $('#f1');
    function guardar() {
      d.area = $('#area').value;
      d.equipo = $('#equipo').value;
      d.equipoOtro = $('#equipoOtro').value;
      d.actividad = $('#actividad').value;
      d.actividadOtra = $('#actividadOtra').value;
      d.inicio = $('#inicio').value;
      d.termino = $('#termino').value;
      d.n_ot = $('#n_ot').value.trim();
    }
    $('#area').addEventListener('change', function () {
      guardar(); d.equipo = ''; d.equipoOtro = ''; vistaP1();
    });
    $('#equipo').addEventListener('change', function () {
      guardar(); $('#wrap-equipoOtro').hidden = (d.equipo !== '__otro');
      if (d.equipo === '__otro') $('#equipoOtro').focus();
    });
    $('#actividad').addEventListener('change', function () {
      guardar(); $('#wrap-actividadOtra').hidden = (d.actividad !== '__otro');
      if (d.actividad === '__otro') $('#actividadOtra').focus();
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
      var hayDatos = d.area || d.actividad || d.inicio || d.termino || d.n_ot;
      if (!hayDatos) { toast('No hay nada que descartar.'); return; }
      abrirDialogo(
        '<h2 id="doc-title">¿Descartar el checklist?</h2>' +
        '<p>Se borrará lo que escribiste en este checklist.</p>' +
        '<div class="acciones">' +
          '<button type="button" class="btn-primario" id="dlg-si">Descartar</button>' +
          '<button type="button" class="btn-sec" id="dlg-no">Seguir editando</button></div>');
      $('#dlg-si', dlg).addEventListener('click', function () {
        S.draft = nuevoBorrador(); dlg.close(); toast('Checklist descartado.'); vistaP1();
      });
      $('#dlg-no', dlg).addEventListener('click', function () { dlg.close(); });
    });

    f.addEventListener('submit', function (e) {
      e.preventDefault(); guardar();
      var errs = {};
      if (!d.area) errs.area = 'Elige el área del trabajo.';
      if (!d.equipo) errs.equipo = 'Elige el equipo de la lista.';
      else if (d.equipo === '__otro' && !d.equipoOtro.trim()) errs.equipo = 'Escribe el nombre del equipo.';
      if (!d.actividad) errs.actividad = 'Elige la actividad realizada.';
      else if (d.actividad === '__otro' && !d.actividadOtra.trim()) errs.actividad = 'Escribe la actividad realizada.';
      if (!d.inicio) errs.inicio = 'Toca «Ahora» o escribe la hora de inicio, por ejemplo 20:15.';
      if (!d.termino) errs.termino = 'Toca «Ahora» o escribe la hora de término, por ejemplo 22:40.';
      else if (d.inicio && d.inicio === d.termino) errs.termino = 'La hora de término no puede ser igual a la de inicio. Corrígela.';
      if (d.n_ot && !/^\d{10}$/.test(d.n_ot)) errs.n_ot = 'El N° de OT tiene 10 dígitos, por ejemplo 4500231987. Corrígelo o déjalo vacío.';
      if (aplicarErrores(['area', 'equipo', 'actividad', 'inicio', 'termino', 'n_ot'], errs)) return;
      d.p1Ok = true;
      go('p2');
    });
  }

  function mostrarErr(errId, msg, input) {
    var el = document.getElementById(errId);
    if (el) el.textContent = msg ? '⚠ ' + msg : '';
    if (input) {
      if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
    }
  }
  function aplicarErrores(ids, errs) {
    var primero = null;
    ids.forEach(function (id) {
      var input = document.getElementById(id);
      mostrarErr('err-' + id, errs[id] || '', input);
      if (errs[id] && !primero) primero = input;
    });
    if (primero) { primero.focus(); return true; }
    return false;
  }

  /* ---------- P2 · Detalle técnico y horas ---------- */
  function vistaP2() {
    var d = S.draft;
    var hh = horasHombre(d);
    app.innerHTML =
      barra('Volver', 'p1') +
      '<form class="screen" id="f2" novalidate>' +
        '<div><p class="paso">Paso 2 de 3</p><h1>Detalle técnico y horas</h1></div>' +
        '<p class="ayuda">' + esc(equipoFinal(d)) + ' · ' + esc(actividadFinal(d)) + '</p>' +

        '<div class="campo"><label for="causa">Causa de la falla *</label>' +
          '<div class="chips" role="group" aria-label="Sugerencias de causa">' +
            CAUSAS.map(function (c) { return '<button type="button" class="chip" data-causa="' + esc(c) + '">' + esc(c) + '</button>'; }).join('') +
          '</div>' +
          '<input type="text" id="causa" aria-describedby="err-causa" placeholder="Toca una sugerencia o escribe" value="' + esc(d.causa) + '">' + campoErr('causa') + '</div>' +

        '<div class="campo"><label for="repuesto">Repuesto y N° SAP <span class="opc">(si usaste uno)</span></label>' +
          '<input type="text" id="repuesto" aria-describedby="ayuda-rep" placeholder="Ej: Polín #152, N° SAP 10045872" value="' + esc(d.repuesto) + '">' +
          '<p class="ayuda" id="ayuda-rep">Anota el N° SAP de 8 dígitos para que el programador genere el pedido.</p>' +
          '<p class="aviso-campo" id="aviso-sap" role="status"></p></div>' +

        '<div class="campo"><label for="medicion">Medición <span class="opc">(opcional)</span></label>' +
          '<input type="text" id="medicion" placeholder="Ej: Holgura 2 mm" value="' + esc(d.medicion) + '"></div>' +

        '<div class="campo"><label for="pendiente">Pendiente <span class="opc">(opcional)</span></label>' +
          '<input type="text" id="pendiente" placeholder="Ej: Falta cambiar polín contiguo" value="' + esc(d.pendiente) + '"></div>' +

        '<div class="campo"><span class="etiqueta" id="lbl-trab">N° de trabajadores *</span>' +
          '<div class="stepper" role="group" aria-labelledby="lbl-trab">' +
            '<button type="button" id="menos" aria-label="Menos un trabajador">−</button>' +
            '<output id="n_trab" aria-live="polite">' + esc(d.n_trabajadores) + '</output>' +
            '<button type="button" id="mas" aria-label="Más un trabajador">+</button></div></div>' +

        '<div class="fila-2">' +
          '<div class="campo"><label for="min_traslado">Traslado (min)</label>' +
            '<input type="text" inputmode="numeric" id="min_traslado" aria-describedby="err-min_traslado" value="' + esc(d.min_traslado) + '">' + campoErr('min_traslado') + '</div>' +
          '<div class="campo"><label for="min_espera_bloqueo">Espera por bloqueo (min)</label>' +
            '<input type="text" inputmode="numeric" id="min_espera_bloqueo" aria-describedby="err-min_espera_bloqueo" value="' + esc(d.min_espera_bloqueo) + '">' + campoErr('min_espera_bloqueo') + '</div>' +
        '</div>' +

        '<div class="tarjeta" aria-live="polite"><span>Horas hombre (calculadas)</span><span class="cifra" id="hh">' + (hh === null ? '—' : fmt(hh)) + '</span></div>' +

        '<div class="acciones"><button type="submit" class="btn-primario">Firmar</button></div>' +
      '</form>';

    function leer() {
      d.causa = $('#causa').value;
      d.repuesto = $('#repuesto').value;
      d.medicion = $('#medicion').value;
      d.pendiente = $('#pendiente').value;
      d.min_traslado = $('#min_traslado').value.trim();
      d.min_espera_bloqueo = $('#min_espera_bloqueo').value.trim();
    }
    function refrescar() {
      leer();
      var h = horasHombre(d);
      $('#hh').textContent = h === null ? '—' : fmt(h);
      $('#n_trab').textContent = d.n_trabajadores;
      var rep = d.repuesto.trim();
      $('#aviso-sap').textContent = (rep && !/\d{8}/.test(rep))
        ? '⚠ Falta el N° SAP (8 dígitos). Puedes continuar, pero el programador lo necesita para el pedido.' : '';
    }
    $$('#f2 input').forEach(function (i) { i.addEventListener('input', refrescar); });
    $$('[data-causa]').forEach(function (b) {
      b.addEventListener('click', function () {
        $('#causa').value = b.getAttribute('data-causa'); refrescar();
        mostrarErr('err-causa', '', $('#causa'));
      });
    });
    $('#menos').addEventListener('click', function () { d.n_trabajadores = Math.max(1, d.n_trabajadores - 1); refrescar(); });
    $('#mas').addEventListener('click', function () { d.n_trabajadores = Math.min(20, d.n_trabajadores + 1); refrescar(); });
    refrescar();

    $('#f2').addEventListener('submit', function (e) {
      e.preventDefault(); leer();
      var errs = {};
      if (!d.causa.trim()) errs.causa = 'Escribe la causa de la falla o toca una de las sugerencias.';
      if (!esEntero(d.min_traslado)) errs.min_traslado = 'Escribe los minutos como número, por ejemplo 70. Si no hubo, deja 0.';
      if (!esEntero(d.min_espera_bloqueo)) errs.min_espera_bloqueo = 'Escribe los minutos como número, por ejemplo 35. Si no hubo, deja 0.';
      if (aplicarErrores(['causa', 'min_traslado', 'min_espera_bloqueo'], errs)) return;
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
        '<p class="ayuda">Firma del supervisor (entrega): <strong>' + esc(SUPERVISOR) + '</strong></p>' +
        '<div class="campo"><span class="etiqueta" id="lbl-firma">Firma con el dedo dentro del recuadro *</span>' +
          '<div class="firma-wrap" id="firma-wrap"><canvas id="firma" role="img" aria-labelledby="lbl-firma"></canvas><div class="firma-guia"></div></div>' +
          '<p class="err" id="err-firma" role="alert"></p>' +
          '<div><button type="button" class="btn-sec" id="limpiar">Limpiar</button></div>' +
        '</div>' +
        '<p class="ayuda">El mandante firma después, en el documento descargado.</p>' +
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
          id: S.siguienteId++, equipo: equipoFinal(d), actividad: actividadFinal(d),
          fecha: hoy(), turno: turnoAhora(), n_ot: d.n_ot, hh: horasHombre(d),
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
              '<p>' + esc(l.equipo) + ' · ' + esc(l.actividad) + '</p></div>' +
            '<p class="ayuda">El programador ya lo ve en su bandeja.</p>'
          : '<div class="tarjeta alerta"><h2>Checklist guardado</h2>' +
              '<p>Estado: <span class="estado-pend">Pendiente de envío</span></p>' +
              '<p class="estado-pend">Se enviará al recuperar señal</p>' +
              '<p>Horas hombre</p><p class="cifra">' + fmt(l.hh) + '</p>' +
              '<p>' + esc(l.equipo) + ' · ' + esc(l.actividad) + '</p></div>' +
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

    $('#f-turno').addEventListener('change', function (e) { S.filtroTurno = e.target.value; vistaP5(); reengancharIr(); });
    $('#f-equipo').addEventListener('change', function (e) { S.filtroEquipo = e.target.value; vistaP5(); reengancharIr(); });
    var rf = $('#reset-filtros');
    if (rf) rf.addEventListener('click', function () { S.filtroTurno = 'todos'; S.filtroEquipo = 'todos'; vistaP5(); reengancharIr(); });
    var rt = $('#reintentar');
    if (rt) rt.addEventListener('click', function () { cargarP5(); });

    $$('[data-edit]').forEach(function (b) {
      b.addEventListener('click', function () { S.editando = parseInt(b.getAttribute('data-edit'), 10); vistaP5(); reengancharIr(); var i = $('#ot-input'); if (i) i.focus(); });
    });
    $$('[data-desc]').forEach(function (b) {
      b.addEventListener('click', function () { abrirDocumento(parseInt(b.getAttribute('data-desc'), 10)); });
    });
    var g = $('#ot-guardar');
    if (g) g.addEventListener('click', function () {
      var inp = $('#ot-input'); var v = inp.value.trim();
      if (!/^\d{10}$/.test(v)) { mostrarErr('err-ot-input', 'El N° de OT tiene 10 dígitos, por ejemplo 4500231987. Corrígelo.', inp); inp.focus(); return; }
      S.bandeja.forEach(function (c) { if (c.id === S.editando) c.n_ot = v; });
      S.editando = null; toast('N° de OT actualizado.'); vistaP5(); reengancharIr();
    });
    var c = $('#ot-cancelar');
    if (c) c.addEventListener('click', function () { S.editando = null; vistaP5(); reengancharIr(); });
  }

  function reengancharIr() {
    $$('[data-go]').forEach(function (b) {
      b.addEventListener('click', function () { go(b.getAttribute('data-go')); });
    });
  }

  function tarjetaChecklist(c) {
    var edit = (S.editando === c.id);
    return '<li class="tarjeta"><h2>' + esc(c.equipo) + '</h2>' +
      '<p>' + esc(c.fecha) + ' · ' + esc(c.turno) + '</p>' +
      '<p>Estado: <span class="estado-ok">Enviado ✓</span></p>' +
      '<p>N° de OT: ' + (c.n_ot ? esc(c.n_ot) : '(vacío)') + '</p>' +
      '<p>Horas hombre: ' + fmt(c.hh) + '</p>' +
      (edit
        ? '<div class="edit-ot"><div class="campo"><label for="ot-input">N° de OT</label>' +
          '<input type="text" inputmode="numeric" id="ot-input" aria-describedby="err-ot-input" value="' + esc(c.n_ot) + '" placeholder="Ej: 4500231987">' +
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

  /* ---------- Diálogo y documento simulado ---------- */
  var dlg = document.getElementById('doc-dialog');
  function abrirDialogo(html) {
    dlg.innerHTML = html;
    if (!dlg.open) dlg.showModal();
  }
  function abrirDocumento(id) {
    var c = S.bandeja.filter(function (x) { return x.id === id; })[0];
    if (!c) return;
    abrirDialogo(
      '<h2 id="doc-title">Documento generado (simulado)</h2>' +
      '<p>Así se vería el PDF con el formato oficial.</p>' +
      '<table class="doc-tabla"><tbody>' +
        '<tr><th scope="row">Equipo</th><td>' + esc(c.equipo) + '</td></tr>' +
        '<tr><th scope="row">Actividad</th><td>' + esc(c.actividad || '—') + '</td></tr>' +
        '<tr><th scope="row">Fecha y turno</th><td>' + esc(c.fecha) + ' · ' + esc(c.turno) + '</td></tr>' +
        '<tr><th scope="row">N° de OT</th><td>' + (c.n_ot ? esc(c.n_ot) : '(vacío)') + '</td></tr>' +
        '<tr><th scope="row">Horas hombre</th><td>' + fmt(c.hh) + '</td></tr>' +
      '</tbody></table>' +
      '<div class="doc-firmas"><div>Firma del supervisor ✓<br>' + esc(SUPERVISOR) + '</div><div>Firma del mandante<br>(en papel)</div></div>' +
      '<div class="acciones"><button type="button" class="btn-primario" id="dlg-cerrar">Cerrar</button></div>');
    $('#dlg-cerrar', dlg).addEventListener('click', function () { dlg.close(); });
  }

  /* ---------- Controles del prototipo ---------- */
  document.getElementById('ctl-rol').addEventListener('change', function (e) {
    S.rol = e.target.value;
    if (S.rol === 'programador') { go('p5'); cargarP5(); } else { go('p1'); }
  });
  document.getElementById('ctl-senal').addEventListener('change', function (e) {
    S.senal = (e.target.value === 'con');
    if (S.senal && S.pendientes.length) {
      var n = S.pendientes.length;
      S.pendientes.forEach(function (c) { c.estado = 'enviado'; S.bandeja.unshift(c); });
      if (S.last && S.last.estado === 'pendiente') S.last.estado = 'enviado';
      S.pendientes = [];
      toast(n === 1 ? 'Volvió la señal: se envió 1 checklist pendiente.' : 'Volvió la señal: se enviaron ' + n + ' checklists pendientes.');
    }
    if (ruta() === 'p5') cargarP5(); else if (ruta() === 'p4') vistaP4();
  });
  document.getElementById('ctl-bandeja').addEventListener('change', function (e) {
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
