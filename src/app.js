/* ReporteMtto
   Espejo digital del «Check list entrega trabajos de mantenimiento» autorizado por el mandante:
   cada recuadro de la hoja física tiene su equivalente en la pantalla.
   Avance 8: inicio de sesión con roles, lista de checklists, recibir, editar el N° de OT y anular (baja lógica).
   La pantalla solo acompaña: los permisos los deciden el servidor (src/api/) y la base de datos (RLS).
   Ver docs/robustecimiento.md y docs/permisos.md. */
(function () {
  'use strict';

  /* ---------- Catálogos reales (entregados por el equipo) ---------- */
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

  var CLAVE_SES = 'reportemtto.sesion';         // sesión iniciada en este navegador
  var CLAVE_PEND = 'reportemtto.pendientes';    // + id del usuario: pendientes de cada cuenta por separado
  var ESTADOS = { pendiente: 'Pendiente de envío', enviado: 'Enviado', recibido: 'Recibido ✓', anulado: 'Anulado' };

  var S = {
    sesion: leerSesion(),
    senal: true,
    draft: nuevoBorrador(),
    firmado: false,
    pendientes: [],
    last: null,
    siguienteId: 1,
    lista: { estado: 'cargando', datos: [], status: 0, mensaje: '' },
    filtroEstado: 'todos', filtroTurno: 'todos', filtroEquipo: 'todos',
    detalle: { estado: 'cargando', dato: null, status: 0, mensaje: '' },
    ocupado: false,
    enviando: false,
    reenviando: false,
    pocInvalido: false,
    avisoLogin: '',
    emailLogin: ''
  };

  /* ---------- Sesión ---------- */
  function leerSesion() {
    try {
      var s = JSON.parse(localStorage.getItem(CLAVE_SES) || 'null');
      return (s && s.access_token && s.usuario) ? s : null;
    } catch (e) { return null; }
  }
  function guardarSesion(s) {
    S.sesion = s;
    try { if (s) localStorage.setItem(CLAVE_SES, JSON.stringify(s)); else localStorage.removeItem(CLAVE_SES); } catch (e) { /* queda en memoria */ }
  }
  function U() { return (S.sesion && S.sesion.usuario) || { nombre: '', cargo: '', empresa: '', rol: '' }; }
  function esSupervisor() { return U().rol === 'supervisor' || U().rol === 'capataz'; }
  function inicio() { return esSupervisor() ? 'p1' : 'lista'; }

  // Llama al servidor con el token de la sesión. Si el token venció, intenta renovarlo una vez.
  function pedir(metodo, url, cuerpo, ya) {
    var ctrl = new AbortController();
    var t = setTimeout(function () { ctrl.abort(); }, 10000);
    var h = { 'Content-Type': 'application/json' };
    if (S.sesion) h.Authorization = 'Bearer ' + S.sesion.access_token;
    return fetch(url, { method: metodo, headers: h, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo), signal: ctrl.signal })
      .then(function (r) {
        clearTimeout(t);
        return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.status >= 200 && r.status < 300, status: r.status, datos: j || {} }; });
      })
      .catch(function () { clearTimeout(t); return { ok: false, status: 0, datos: { mensaje: 'No pudimos conectar con el sistema. Revisa tu señal y reintenta: no es un error tuyo.' } }; })
      .then(function (r) {
        if (r.status !== 401 || ya || !S.sesion || !S.sesion.refresh_token || url === '/api/sesion') return r;
        return renovar().then(function (bien) { return bien ? pedir(metodo, url, cuerpo, true) : r; });
      });
  }
  function renovar() {
    return pedir('POST', '/api/sesion', { refresh_token: S.sesion.refresh_token }, true).then(function (r) {
      if (r.ok && r.datos.access_token) { guardarSesion(r.datos); return true; }
      return false;
    });
  }
  function irALogin(mensaje) {
    guardarSesion(null);
    S.pendientes = [];
    S.avisoLogin = mensaje || '';
    go('login');
  }
  function mensajeDe(r, porDefecto) {
    if (r.status === 0 || r.status >= 500) return (r.datos && r.datos.mensaje) || 'No pudimos conectar con el sistema. No es un error tuyo: reintenta en un momento.';
    return (r.datos && r.datos.mensaje) || porDefecto;
  }

  /* ---------- Pendientes guardados en el teléfono ----------
     Se guardan en el navegador (localStorage), separados por cuenta, para que no se pierdan si se cierra la pestaña.
     Si el navegador no deja guardar (modo privado, almacenamiento bloqueado), siguen solo en memoria. */
  function clavePend() { return CLAVE_PEND + '.' + U().id; }
  function leerPendientes() {
    if (!S.sesion) return [];
    try {
      var v = JSON.parse(localStorage.getItem(clavePend()) || '[]');
      return Array.isArray(v) ? v : [];
    } catch (e) { return []; }
  }
  function guardarPendientes() {
    if (!S.sesion) return;
    try { localStorage.setItem(clavePend(), JSON.stringify(S.pendientes)); } catch (e) { /* sin almacenamiento: queda en memoria */ }
  }
  function agregarPendiente(reg) { S.pendientes.push(reg); guardarPendientes(); }
  // Código único de cada checklist: si se envía dos veces (dos pestañas, doble toque), el servidor guarda una sola fila.
  function nuevoIdEnvio() {
    try { if (window.crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (e) { /* sigue abajo */ }
    return 'e' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
  }
  function idDesdeDatos(c) {
    var t = [c.id, c.fecha, c.turno, c.inicio, c.termino, c.area, c.equipo, c.equipoAct, c.detalle, c.trab].join('|');
    var h1 = 5381, h2 = 52711;
    for (var i = 0; i < t.length; i++) { var k = t.charCodeAt(i); h1 = (h1 * 33) ^ k; h2 = (h2 * 31) ^ k; }
    return 'p-' + (h1 >>> 0).toString(36) + '-' + (h2 >>> 0).toString(36);
  }
  function cargarPendientes() {
    S.pendientes = leerPendientes();
    S.pendientes.forEach(function (c) {
      if (c.id >= S.siguienteId) S.siguienteId = c.id + 1;
      if (!c.idEnvio) c.idEnvio = idDesdeDatos(c);
    });
    guardarPendientes();
  }

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

  // Fila del servidor → datos para la pantalla
  function aVista(f) {
    return {
      id: f.id_checklist, area: f.area, equipo: f.equipo, equipoAct: f.equipo_actividad,
      detalle: f.detalle_realizado, obs: f.observaciones || '', fecha: f.fecha_turno, turno: f.turno,
      inicio: String(f.hora_inicio || '').slice(0, 5), termino: String(f.hora_termino || '').slice(0, 5), n_ot: f.n_ot || '',
      traslado: f.min_traslado, espera: f.min_espera_bloqueo, trab: f.n_trabajadores, hh: Number(f.horas_hombre),
      estado: f.estado, cargo: f.cargo, autor: f.autor, empresa: f.empresa, creadoPor: f.creado_por,
      creadoEn: f.creado_en, recibidoEn: f.recibido_en, anuladoEn: f.anulado_en, motivo: f.motivo_anulacion || ''
    };
  }
  function fechaHora(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    return d.toLocaleDateString('es-CL') + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  function etiquetaEstado(e) { return '<span class="estado estado-' + esc(e) + '">' + esc(ESTADOS[e] || e) + '</span>'; }

  /* ---------- navegación ---------- */
  var TITULOS = {
    login: 'Iniciar sesión', p1: 'Nuevo checklist', p2: 'Detalle realizado y horas', p3: 'Firma',
    p4: 'Confirmación', lista: 'Checklists', ver: 'Detalle del checklist'
  };
  // Pantallas de cada rol (solo para orientar: los permisos reales los revisa el servidor)
  var DE_SUPERVISOR = ['p1', 'p2', 'p3', 'p4', 'lista', 'ver'];
  var DE_OTROS = ['lista', 'ver'];

  function partes() { return (location.hash || '').replace(/^#\/?/, '').split('/'); }
  function ruta() { var r = partes()[0]; return TITULOS[r] ? r : ''; }
  function go(r) {
    if (location.hash === '#/' + r) { render(); } else { location.hash = '#/' + r; }
  }

  function barra(volverTxt, volverRuta) {
    return '<header class="topbar">' +
      '<button type="button" class="back" data-go="' + volverRuta + '" aria-label="' + esc(volverTxt) + '">‹ ' + esc(volverTxt) + '</button>' +
      '<span class="marca">ReporteMtto</span></header>';
  }

  function pintarSesion() {
    var el = ctl('sesion-bar');
    if (!S.sesion) { el.hidden = true; el.innerHTML = ''; return; }
    var u = U(), r = ruta();
    el.hidden = false;
    el.innerHTML =
      '<span class="sesion-quien"><strong>' + esc(u.nombre) + '</strong> · ' + esc(u.cargo) + '</span>' +
      '<nav class="sesion-nav" aria-label="Menú">' +
        (esSupervisor()
          ? '<a href="#/p1"' + (r === 'p1' ? ' aria-current="page"' : '') + '>Nuevo checklist</a>' +
            '<a href="#/lista"' + (r === 'lista' ? ' aria-current="page"' : '') + '>Mis checklists</a>'
          : '<a href="#/lista"' + (r === 'lista' ? ' aria-current="page"' : '') + '>Bandeja</a>') +
        '<button type="button" class="btn-link" id="salir">Salir</button>' +
      '</nav>';
    ctl('salir').onclick = function () {
      toast('Sesión cerrada.');
      irALogin('');
    };
  }

  function render() {
    var r = ruta();
    if (!S.sesion) { r = 'login'; if (location.hash !== '#/login') location.replace('#/login'); }
    else {
      var permitidas = esSupervisor() ? DE_SUPERVISOR : DE_OTROS;
      if (!r || r === 'login' || permitidas.indexOf(r) < 0) { r = inicio(); location.replace('#/' + r); }
      if (r === 'p2' && !S.draft.p1Ok) { r = 'p1'; location.replace('#/p1'); }
      if (r === 'p3' && !S.draft.p2Ok) { r = S.draft.p1Ok ? 'p2' : 'p1'; location.replace('#/' + r); }
      if (r === 'p4' && !S.last) { r = 'p1'; location.replace('#/p1'); }
    }
    pintarSesion();
    ({ login: vistaLogin, p1: vistaP1, p2: vistaP2, p3: vistaP3, p4: vistaP4, lista: vistaLista, ver: vistaVer })[r]();
    document.title = TITULOS[r] + ' · ReporteMtto';
    app.focus({ preventScroll: true });
    window.scrollTo(0, 0);
    reengancharIr();
    if (r === 'lista') cargarLista();
    if (r === 'ver') cargarDetalle();
  }

  function reengancharIr() {
    $$('[data-go]').forEach(function (b) {
      b.onclick = function () { go(b.getAttribute('data-go')); };
    });
  }

  /* ---------- Inicio de sesión ---------- */
  function vistaLogin() {
    app.innerHTML =
      '<header class="topbar"><span class="marca">ReporteMtto</span></header>' +
      '<form class="screen" id="f-login" novalidate>' +
        '<div><p class="paso">Bienvenido</p><h1>Iniciar sesión</h1></div>' +
        '<p class="ayuda">Entra con la cuenta que te entregó el administrador. Sin sesión no se puede ver ni enviar nada.</p>' +
        (S.avisoLogin ? '<div class="banner-error" role="alert"><strong>' + esc(S.avisoLogin) + '</strong></div>' : '') +
        '<div class="campo"><label for="email">Correo *</label>' +
          '<input type="email" id="email" autocomplete="username" maxlength="120" aria-describedby="err-email" value="' + esc(S.emailLogin) + '">' + campoErr('email') + '</div>' +
        '<div class="campo"><label for="password">Contraseña *</label>' +
          '<input type="password" id="password" autocomplete="current-password" maxlength="128" aria-describedby="err-password">' + campoErr('password') + '</div>' +
        '<p class="err" id="err-login" role="alert"></p>' +
        '<div class="acciones"><button type="submit" class="btn-primario" id="entrar">Entrar</button></div>' +
      '</form>';
    limpiarErroresAlEscribir($('#f-login'));
    $('#f-login').addEventListener('submit', function (e) {
      e.preventDefault();
      if (S.ocupado) return;
      var email = $('#email').value.trim(), pass = $('#password').value;
      S.emailLogin = email;
      var errs = {};
      if (!email) errs.email = 'Escribe tu correo.';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'El correo no es válido. Revisa que tenga @ y un dominio, por ejemplo nombre@empresa.cl.';
      if (!pass) errs.password = 'Escribe tu contraseña.';
      $('#err-login').textContent = '';
      if (aplicarErrores(['email', 'password'], errs)) return;
      if (!S.senal) { $('#err-login').textContent = '⚠ No hay señal. Para iniciar sesión necesitas conexión.'; return; }
      S.ocupado = true;
      var b = $('#entrar'); b.disabled = true; b.textContent = 'Entrando…'; b.setAttribute('aria-busy', 'true');
      pedir('POST', '/api/sesion', { email: email, password: pass }).then(function (r) {
        S.ocupado = false;
        if (r.ok && r.datos.access_token) {
          guardarSesion(r.datos); S.avisoLogin = ''; cargarPendientes();
          toast('Hola, ' + U().nombre + '.');
          go(inicio());
          if (S.senal && S.pendientes.length) reenviarPendientes();
          return;
        }
        b.disabled = false; b.textContent = 'Entrar'; b.removeAttribute('aria-busy');
        $('#err-login').textContent = '⚠ ' + mensajeDe(r, 'No pudimos iniciar sesión. Revisa el correo y la contraseña.');
        $('#password').focus();
      });
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
        '<div id="aviso-pend" role="status"></div>' +
        '<div><p class="paso">Paso 1 de 3</p><h1>Nuevo checklist</h1></div>' +
        '<p class="ayuda">Son los mismos recuadros de la hoja del check list. Los campos con * son obligatorios.</p>' +

        '<div class="campo"><label for="area">Área *</label>' +
          '<select id="area" aria-describedby="err-area">' + opciones(AREAS, d.area, true) + '</select>' +
          '<div class="campo" id="wrap-areaOtra"' + (d.area === '__otro' ? '' : ' hidden') + '><label for="areaOtra">Nombre del área *</label>' +
          '<input type="text" id="areaOtra" maxlength="80" placeholder="Ej: Taller" value="' + esc(d.areaOtra) + '"></div>' +
          campoErr('area') + '</div>' +

        '<div class="campo"><label for="equipo">Equipo *</label>' +
          '<select id="equipo" aria-describedby="err-equipo"' + (d.area ? '' : ' disabled') + '>' +
            (d.area ? opciones(listaEq, d.equipo, true) : '<option value="">Primero elige el área</option>') + '</select>' +
          (sinLista ? '<p class="ayuda">Esta área no tiene lista de equipos: elige «Otro (escribir)».</p>' : '') +
          '<div class="campo" id="wrap-equipoOtro"' + (d.equipo === '__otro' ? '' : ' hidden') + '><label for="equipoOtro">Nombre del equipo *</label>' +
          '<input type="text" id="equipoOtro" maxlength="80" placeholder="Ej: Correa Nueva" value="' + esc(d.equipoOtro) + '"></div>' +
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
          '<input type="text" id="equipoAct" maxlength="120" aria-describedby="ayuda-eqact err-equipoAct" placeholder="Ej: Polea de cola de Correa Reversible" value="' + esc(d.equipoAct) + '">' +
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
    pintarAvisoPendientes();
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
          '<textarea id="detalle" maxlength="2000" aria-describedby="ayuda-det err-detalle" placeholder="Escribe o pega aquí lo que se hizo">' + esc(d.detalle) + '</textarea>' +
          '<p class="ayuda" id="ayuda-det">Puedes pegar el reporte que ya tienes escrito en las notas de tu teléfono.</p>' + campoErr('detalle') + '</div>' +

        '<div class="campo"><label for="obs">Observaciones detectadas durante recepción de actividades <span class="opc">(opcional)</span></label>' +
          '<textarea id="obs" maxlength="2000" aria-describedby="ayuda-obs" placeholder="Escribe o pega aquí lo que se detectó">' + esc(d.obs) + '</textarea>' +
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
          '<p>Nombre: <strong>' + esc(U().nombre) + '</strong></p>' +
          '<p>Cargo: <strong>' + esc(U().cargo) + '</strong></p>' +
          '<p>Empresa: <strong>' + esc(U().empresa) + '</strong></p></div>' +
        '<div class="campo"><span class="etiqueta" id="lbl-firma">Firma con el dedo dentro del recuadro *</span>' +
          '<div class="firma-wrap" id="firma-wrap"><canvas id="firma" role="img" aria-labelledby="lbl-firma"></canvas><div class="firma-guia"></div></div>' +
          '<p class="err" id="err-firma" role="alert"></p>' +
          '<div><button type="button" class="btn-sec" id="limpiar">Limpiar</button></div>' +
        '</div>' +
        '<p class="ayuda">Quien recibe firma después, en el documento descargado.</p>' +
        '<p class="err" id="err-servidor" role="alert"></p>' +
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
      $('#err-servidor').textContent = '';
      S.enviando = true;
      var b = $('#enviar'); b.disabled = true; b.textContent = 'Enviando…'; b.setAttribute('aria-busy', 'true');
      var d = S.draft;
      var reg = {
        id: S.siguienteId++, area: areaFinal(d), equipo: equipoFinal(d), equipoAct: d.equipoAct.trim(),
        detalle: d.detalle.trim(), obs: d.obs.trim(), fecha: d.fecha, turno: d.turno,
        inicio: d.inicio, termino: d.termino, n_ot: d.n_ot,
        traslado: parseInt(d.min_traslado, 10), espera: parseInt(d.min_espera_bloqueo, 10),
        trab: d.n_trabajadores, hh: horasHombre(d), cargo: U().cargo, estado: 'pendiente',
        idEnvio: nuevoIdEnvio()
      };
      function terminar() { S.last = reg; S.enviando = false; go('p4'); }

      if (!S.senal) {            // sin señal: el teléfono ni siquiera intenta enviar
        setTimeout(function () { agregarPendiente(reg); terminar(); }, 1200);
        return;
      }
      enviarAlServidor(reg).then(function (r) {
        if (r.ok) {              // el servidor lo guardó y devolvió un folio
          reg.estado = 'enviado'; reg.folio = r.datos.folio; reg.hh = r.datos.horas_hombre;
          terminar();
        } else if (r.status === 400 || r.status === 403) {   // rechazado por un dato o por el rol: no se guardó nada
          S.enviando = false; b.disabled = false; b.textContent = 'Guardar y enviar'; b.removeAttribute('aria-busy');
          $('#err-servidor').textContent = '⚠ ' + (r.datos.mensaje || 'El servidor no aceptó el checklist. Revisa los datos.') + ' Lo que escribiste sigue aquí.';
        } else if (r.status === 401) {   // la sesión expiró: se guarda en el teléfono y se envía al volver a entrar
          agregarPendiente(reg); S.enviando = false; S.draft = nuevoBorrador(); S.firmado = false;
          irALogin('Tu sesión expiró. El checklist quedó guardado en este teléfono y se enviará cuando vuelvas a entrar.');
        } else {                 // el sistema no responde: queda pendiente en el teléfono
          reg.aviso = 'No pudimos conectar con el servidor (no es un error tuyo).';
          agregarPendiente(reg); terminar();
        }
      });
    });
  }

  /* ---------- Aviso de checklists sin enviar (P1) ---------- */
  function pintarAvisoPendientes() {
    var cont = document.getElementById('aviso-pend');
    if (!cont) return;
    var n = S.pendientes.length;
    if (!n) { cont.innerHTML = ''; return; }
    cont.innerHTML =
      '<div class="banner-error"><strong>' + (n === 1 ? 'Tienes 1 checklist sin enviar' : 'Tienes ' + n + ' checklists sin enviar') + '</strong>' +
      '<p>' + (S.senal ? 'Hay señal: puedes enviarlo ahora.' : 'Está guardado en este teléfono y se enviará al recuperar señal.') + '</p>' +
      (S.senal ? '<button type="button" class="btn-sec" id="reenviar-ahora">' + (S.reenviando ? 'Enviando…' : 'Enviar ahora') + '</button>' : '') +
      '</div>';
    var b = document.getElementById('reenviar-ahora');
    if (b) b.addEventListener('click', function () { b.disabled = true; b.textContent = 'Enviando…'; reenviarPendientes(); });
  }

  /* ---------- Envío al servidor ---------- */
  function cargaUtil(c) {
    var p = {
      area: c.area, equipo: c.equipo, equipo_actividad: c.equipoAct, fecha_turno: c.fecha, turno: c.turno,
      hora_inicio: c.inicio, hora_termino: c.termino, n_ot: c.n_ot, detalle_realizado: c.detalle,
      observaciones: c.obs, n_trabajadores: c.trab, min_traslado: c.traslado, min_espera_bloqueo: c.espera,
      id_envio: c.idEnvio
    };
    if (S.pocInvalido) p.n_ot = '123';   // prueba: manda un dato que el formulario no dejaría pasar
    return p;
  }
  function enviarAlServidor(c) { return pedir('POST', '/api/checklists', cargaUtil(c)); }

  function reenviarPendientes() {
    if (S.reenviando || !S.sesion) return;
    S.reenviando = true;
    var lista = S.pendientes.slice(); S.pendientes = []; var enviados = 0, sinSesion = false;
    var refrescar = function () {
      var r = ruta();
      if (r === 'lista') cargarLista();
      else if (r === 'p4') { vistaP4(); reengancharIr(); }
      else if (r === 'p1') pintarAvisoPendientes();
    };
    (function siguiente(i) {
      if (i >= lista.length) {
        S.reenviando = false;
        if (sinSesion) { irALogin('Tu sesión expiró. Tus checklists pendientes siguen guardados y se enviarán cuando vuelvas a entrar.'); return; }
        if (enviados) toast(enviados === 1 ? 'Volvió la señal: se envió 1 checklist pendiente.' : 'Volvió la señal: se enviaron ' + enviados + ' checklists pendientes.');
        else toast('No se pudo enviar. Los checklists siguen pendientes.');
        guardarPendientes(); refrescar();
        return;
      }
      var c = lista[i];
      if (sinSesion) { S.pendientes.push(c); guardarPendientes(); siguiente(i + 1); return; }
      enviarAlServidor(c).then(function (r) {
        if (r.ok) { c.estado = 'enviado'; c.folio = r.datos.folio; c.hh = r.datos.horas_hombre; delete c.aviso; enviados++; if (S.last && S.last.id === c.id) S.last = c; }
        else {
          if (r.status === 401) sinSesion = true;
          else if (r.status === 400 || r.status === 403) c.aviso = 'El servidor no lo aceptó: ' + (r.datos.mensaje || 'revisa los datos') + '.';
          S.pendientes.push(c);
        }
        guardarPendientes();
        siguiente(i + 1);
      });
    })(0);
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
              '<p>Folio: <strong>' + esc(l.folio) + '</strong></p>' +
              '<p>Horas hombre</p><p class="cifra">' + fmt(l.hh) + '</p>' +
              '<p>' + esc(l.equipo) + '</p></div>' +
            '<p class="ayuda">El programador ya lo ve en su bandeja.</p>'
          : '<div class="tarjeta alerta"><h2>Checklist guardado</h2>' +
              '<p>Estado: <span class="estado-pend">Pendiente de envío</span></p>' +
              '<p class="estado-pend">Se enviará al recuperar señal</p>' +
              '<p>Quedó guardado en este teléfono: no se pierde si cierras la aplicación.</p>' +
              (l.aviso ? '<p>' + esc(l.aviso) + ' Se reintentará cuando haya conexión.</p>' : '') +
              '<p>Horas hombre</p><p class="cifra">' + fmt(l.hh) + '</p>' +
              '<p>' + esc(l.equipo) + '</p></div>' +
            '<p class="ayuda">Puedes abrir un checklist nuevo. Si hace falta avisar ya, usa la radio como siempre.</p>') +
        '<div class="acciones"><button type="button" class="btn-primario" id="nuevo">Nuevo checklist</button>' +
          '<button type="button" class="btn-sec" data-go="lista">Ver mis checklists</button></div>' +
      '</div>';
    $('#nuevo').addEventListener('click', function () {
      S.draft = nuevoBorrador(); S.last = null; S.firmado = false; go('p1');
    });
  }

  /* ---------- Lista: «Mis checklists» (supervisor) o «Bandeja» (programador y planificador) ---------- */
  function cargarLista() {
    S.lista = { estado: 'cargando', datos: [], status: 0, mensaje: '' };
    vistaLista(); reengancharIr();
    if (!S.senal) {
      S.lista = { estado: 'error', datos: [], status: 0, mensaje: 'No hay señal. Cuando vuelva, toca «Reintentar».' };
      vistaLista(); reengancharIr(); return;
    }
    pedir('GET', '/api/checklists').then(function (r) {
      if (ruta() !== 'lista') return;
      if (r.status === 401) { irALogin('Tu sesión expiró. Vuelve a iniciar sesión.'); return; }
      S.lista = r.ok
        ? { estado: 'ok', datos: (r.datos.checklists || []).map(aVista), status: r.status, mensaje: '' }
        : { estado: 'error', datos: [], status: r.status, mensaje: mensajeDe(r, 'No pudimos cargar la lista.') };
      vistaLista(); reengancharIr();
    });
  }

  function vistaLista() {
    var sup = esSupervisor(), L = S.lista, cuerpo;
    var titulo = sup ? 'Mis checklists' : 'Bandeja';
    if (L.estado === 'cargando') {
      cuerpo = '<p class="cargando" role="status" aria-busy="true">Cargando checklists…</p>';
    } else if (L.estado === 'error') {
      cuerpo = '<div class="banner-error" role="alert"><strong>⚠ No se pudo cargar la lista</strong>' +
        '<p>' + esc(L.mensaje) + '</p>' +
        '<button type="button" class="btn-primario" id="reintentar">Reintentar</button></div>';
    } else {
      var lista = L.datos.filter(function (c) {
        return (S.filtroEstado === 'todos' || c.estado === S.filtroEstado) &&
               (S.filtroTurno === 'todos' || c.turno === S.filtroTurno) &&
               (S.filtroEquipo === 'todos' || c.equipo === S.filtroEquipo);
      });
      if (!L.datos.length) {
        cuerpo = sup
          ? '<div class="vacio"><h2>Aún no has enviado checklists</h2><p>Cuando envíes uno, aparecerá aquí con su estado.</p>' +
              '<button type="button" class="btn-primario" data-go="p1">Crear un checklist</button></div>'
          : '<div class="vacio"><h2>Aún no hay checklists</h2><p>Cuando un supervisor envíe uno, aparecerá aquí.</p></div>';
      } else if (!lista.length) {
        cuerpo = '<div class="vacio"><h2>Sin resultados</h2><p>No hay checklists con estos filtros.</p>' +
          '<button type="button" class="btn-sec" id="reset-filtros">Quitar filtros</button></div>';
      } else {
        cuerpo = '<p class="ayuda">' + lista.length + (lista.length === 1 ? ' checklist' : ' checklists') + '</p>' +
          '<ul class="lista">' + lista.map(tarjetaChecklist).join('') + '</ul>';
      }
    }
    var equipos = [];
    L.datos.forEach(function (c) { if (equipos.indexOf(c.equipo) < 0) equipos.push(c.equipo); });
    function sel(id, etiqueta, valores, actual, nombres) {
      return '<div class="campo"><label for="' + id + '">' + etiqueta + '</label><select id="' + id + '">' +
        valores.map(function (v) { return '<option value="' + esc(v) + '"' + (actual === v ? ' selected' : '') + '>' + esc((nombres && nombres[v]) || v) + '</option>'; }).join('') +
        '</select></div>';
    }
    app.innerHTML =
      '<header class="topbar"><span class="marca">ReporteMtto</span></header>' +
      '<div class="screen">' +
        '<div><p class="paso">' + esc(U().cargo) + '</p><h1>' + titulo + '</h1></div>' +
        (sup ? '<p class="ayuda">Solo ves los checklists que enviaste tú.</p>' : '') +
        (S.pendientes.length ? '<div id="aviso-pend" role="status"></div>' : '') +
        '<div class="filtros">' +
          sel('f-estado', 'Estado', ['todos', 'enviado', 'recibido', 'anulado'], S.filtroEstado, { todos: 'Todos', enviado: 'Enviado', recibido: 'Recibido', anulado: 'Anulado' }) +
          sel('f-turno', 'Turno', ['todos', 'día', 'noche'], S.filtroTurno, { todos: 'Todos' }) +
          sel('f-equipo', 'Equipo', ['todos'].concat(equipos), S.filtroEquipo, { todos: 'Todos' }) +
        '</div>' +
        cuerpo +
      '</div>';
    function redibujar() { vistaLista(); reengancharIr(); }
    $('#f-estado').addEventListener('change', function (e) { S.filtroEstado = e.target.value; redibujar(); });
    $('#f-turno').addEventListener('change', function (e) { S.filtroTurno = e.target.value; redibujar(); });
    $('#f-equipo').addEventListener('change', function (e) { S.filtroEquipo = e.target.value; redibujar(); });
    var rf = $('#reset-filtros');
    if (rf) rf.addEventListener('click', function () { S.filtroEstado = 'todos'; S.filtroTurno = 'todos'; S.filtroEquipo = 'todos'; redibujar(); });
    var rt = $('#reintentar');
    if (rt) rt.addEventListener('click', function () { cargarLista(); });
    pintarAvisoPendientes();
  }

  function tarjetaChecklist(c) {
    return '<li class="tarjeta' + (c.estado === 'anulado' ? ' anulado' : '') + '">' +
      '<h2>Folio ' + esc(c.id) + ' · ' + esc(c.equipo) + '</h2>' +
      '<p>' + esc(c.fecha) + ' · turno ' + esc(c.turno) + (esSupervisor() ? '' : ' · ' + esc(c.autor || 'sin autor (prueba anterior)')) + '</p>' +
      '<p>Estado: ' + etiquetaEstado(c.estado) + '</p>' +
      '<p>N° OT SAP: ' + (c.n_ot ? esc(c.n_ot) : '(vacío)') + ' · Horas hombre: ' + fmt(c.hh) + '</p>' +
      '<div class="card-botones"><a class="btn-sec" href="#/ver/' + esc(c.id) + '">Ver detalle</a></div>' +
      '</li>';
  }

  /* ---------- Detalle de un checklist (#/ver/N): consultar, recibir, editar OT y anular ---------- */
  function cargarDetalle() {
    var id = partes()[1] || '';
    S.detalle = { estado: 'cargando', dato: null, status: 0, mensaje: '' };
    vistaVer(); reengancharIr();
    if (!S.senal) {
      S.detalle = { estado: 'error', dato: null, status: 0, mensaje: 'No hay señal. Cuando vuelva, toca «Reintentar».' };
      vistaVer(); reengancharIr(); return;
    }
    pedir('GET', '/api/checklists?id=' + encodeURIComponent(id)).then(function (r) {
      if (ruta() !== 'ver' || (partes()[1] || '') !== id) return;
      if (r.status === 401) { irALogin('Tu sesión expiró. Vuelve a iniciar sesión.'); return; }
      if (r.ok) S.detalle = { estado: 'ok', dato: aVista(r.datos.checklist), status: 200, mensaje: '' };
      else if (r.status === 404) S.detalle = { estado: 'no', dato: null, status: 404, mensaje: mensajeDe(r, 'Ese checklist no existe o no tienes acceso a él.') };
      else S.detalle = { estado: 'error', dato: null, status: r.status, mensaje: mensajeDe(r, 'No pudimos cargar el checklist.') };
      vistaVer(); reengancharIr();
    });
  }

  function vistaVer() {
    var D = S.detalle, cuerpo;
    if (D.estado === 'cargando') {
      cuerpo = '<p class="cargando" role="status" aria-busy="true">Cargando checklist…</p>';
    } else if (D.estado === 'no') {
      cuerpo = '<div class="vacio" role="alert"><h2>No encontrado</h2><p>' + esc(D.mensaje) + '</p>' +
        '<p class="ayuda">Revisa el número del folio o vuelve a la lista.</p>' +
        '<button type="button" class="btn-primario" data-go="lista">Volver a la lista</button></div>';
    } else if (D.estado === 'error') {
      cuerpo = '<div class="banner-error" role="alert"><strong>⚠ No se pudo cargar el checklist</strong><p>' + esc(D.mensaje) + '</p>' +
        '<button type="button" class="btn-primario" id="reintentar">Reintentar</button></div>';
    } else {
      cuerpo = fichaDetalle(D.dato) + accionesDetalle(D.dato);
    }
    app.innerHTML = barra('Volver', 'lista') +
      '<div class="screen"><div><p class="paso">Checklist</p><h1>' + (D.dato ? 'Folio ' + esc(D.dato.id) : 'Detalle') + '</h1></div>' + cuerpo + '</div>';
    var rt = $('#reintentar');
    if (rt) rt.addEventListener('click', function () { cargarDetalle(); });
    if (D.estado === 'ok') engancharAcciones(D.dato);
  }

  function fichaDetalle(c) {
    function fila(k, v) { return '<tr><th scope="row">' + k + '</th><td>' + v + '</td></tr>'; }
    return '<div class="tarjeta' + (c.estado === 'anulado' ? ' anulado' : '') + '">' +
      '<p>Estado: ' + etiquetaEstado(c.estado) + '</p>' +
      (c.estado === 'recibido' ? '<p>Recibido el ' + esc(fechaHora(c.recibidoEn)) + '</p>' : '') +
      (c.estado === 'anulado' ? '<p><strong>Anulado</strong> el ' + esc(fechaHora(c.anuladoEn)) + '. Motivo: «' + esc(c.motivo) + '»</p>' +
        '<p class="ayuda">No se borró: queda guardado para saber qué se anuló y por qué.</p>' : '') +
      '</div>' +
      '<table class="doc-tabla"><tbody>' +
        fila('Área', esc(c.area)) + fila('Equipo', esc(c.equipo)) + fila('Equipo de la actividad', esc(c.equipoAct)) +
        fila('Fecha turno', esc(c.fecha) + ' · ' + esc(c.turno)) + fila('Hora inicio y término', esc(c.inicio) + ' a ' + esc(c.termino)) +
        fila('Detalle realizado', esc(c.detalle)) + fila('Observaciones', c.obs ? esc(c.obs) : '—') +
        fila('N° OT SAP', c.n_ot ? esc(c.n_ot) : '(vacío)') +
        fila('Trabajadores · traslado · espera', esc(c.trab) + ' · ' + esc(c.traslado) + ' min · ' + esc(c.espera) + ' min') +
        fila('Horas hombre', fmt(c.hh)) +
        fila('Quien entrega', esc(c.autor || 'sin autor (prueba anterior)') + ' · ' + esc(c.cargo)) +
        fila('Enviado', esc(fechaHora(c.creadoEn))) +
      '</tbody></table>';
  }

  // Botones según el rol. Ocultarlos no es el permiso: si alguien manda la acción igual, el servidor y la base la rechazan.
  function accionesDetalle(c) {
    var u = U(), h = '<p class="err" id="err-accion" role="alert"></p>';
    var prog = u.rol === 'programador';
    var supPropio = esSupervisor() && c.creadoPor === u.id;
    if (prog && c.estado === 'enviado') {
      h += '<div class="tarjeta"><h2>Recibir</h2>' +
        '<div class="campo"><label for="ot-input">N° OT SAP <span class="opc">(complétalo si falta)</span></label>' +
        '<input type="text" inputmode="numeric" maxlength="9" id="ot-input" aria-describedby="err-ot" value="' + esc(c.n_ot) + '" placeholder="Ej: 111254880">' + campoErr('ot') + '</div>' +
        '<button type="button" class="btn-primario" id="recibir">Marcar como recibido</button></div>';
    }
    if (prog && c.estado === 'recibido') {
      h += '<div class="tarjeta"><h2>N° OT SAP</h2>' +
        '<div class="campo"><label for="ot-input">N° OT SAP</label>' +
        '<input type="text" inputmode="numeric" maxlength="9" id="ot-input" aria-describedby="err-ot" value="' + esc(c.n_ot) + '" placeholder="Ej: 111254880">' + campoErr('ot') + '</div>' +
        '<button type="button" class="btn-sec" id="guardar-ot">Guardar N° de OT</button></div>';
    }
    if ((prog && c.estado !== 'anulado') || (supPropio && c.estado === 'enviado')) {
      h += '<details class="tarjeta" id="caja-anular"><summary>Anular este checklist</summary>' +
        '<p class="ayuda">No se borra: queda marcado como anulado, con el motivo, quién y cuándo.</p>' +
        '<div class="campo"><label for="motivo">Motivo de la anulación *</label>' +
        '<textarea id="motivo" maxlength="300" aria-describedby="err-motivo" placeholder="Ej: Lo envié dos veces">' + '</textarea>' + campoErr('motivo') + '</div>' +
        '<button type="button" class="btn-sec peligro" id="anular">Anular</button></details>';
    }
    if (supPropio && c.estado === 'recibido') h += '<p class="ayuda">El programador ya lo recibió. Si hay que anularlo, pídeselo a él.</p>';
    if (u.rol === 'planificador') h += '<p class="ayuda">Tu rol solo permite consultar.</p>';
    if (!esSupervisor()) h += '<div class="acciones"><button type="button" class="btn-sec" id="descargar">Ver documento</button></div>';
    return h;
  }

  function engancharAcciones(c) {
    function accion(boton, cuerpo, campoErrId, input, exito) {
      if (S.ocupado) return;
      $('#err-accion').textContent = '';
      if (!S.senal) { $('#err-accion').textContent = '⚠ No hay señal. Lo que escribiste sigue aquí: reintenta cuando vuelva.'; return; }
      S.ocupado = true;
      var txt = boton.textContent; boton.disabled = true; boton.textContent = 'Guardando…'; boton.setAttribute('aria-busy', 'true');
      pedir('PATCH', '/api/checklists?id=' + encodeURIComponent(c.id), cuerpo).then(function (r) {
        S.ocupado = false;
        if (r.ok) { toast(exito); S.detalle = { estado: 'ok', dato: aVista(r.datos.checklist), status: 200, mensaje: '' }; vistaVer(); reengancharIr(); return; }
        if (r.status === 401) { irALogin('Tu sesión expiró. Vuelve a iniciar sesión.'); return; }
        boton.disabled = false; boton.textContent = txt; boton.removeAttribute('aria-busy');
        var errores = (r.datos && r.datos.errores) || {};
        if (r.status === 400 && campoErrId && (errores.n_ot || errores.motivo)) {
          mostrarErr('err-' + campoErrId, errores.n_ot || errores.motivo, input); if (input) input.focus();
        } else {
          $('#err-accion').textContent = '⚠ ' + mensajeDe(r, 'No se pudo guardar el cambio.') + ' Lo que escribiste sigue aquí.';
        }
      });
    }
    var bRec = $('#recibir');
    if (bRec) bRec.addEventListener('click', function () {
      var inp = $('#ot-input'), v = inp.value.trim();
      if (v && !/^\d{9}$/.test(v)) { mostrarErr('err-ot', 'El N° de OT tiene 9 dígitos, por ejemplo 111254880. Corrígelo o déjalo vacío.', inp); inp.focus(); return; }
      accion(bRec, v ? { accion: 'recibir', n_ot: v } : { accion: 'recibir' }, 'ot', inp, 'Checklist recibido.');
    });
    var bOt = $('#guardar-ot');
    if (bOt) bOt.addEventListener('click', function () {
      var inp = $('#ot-input'), v = inp.value.trim();
      if (!/^\d{9}$/.test(v)) { mostrarErr('err-ot', 'El N° de OT tiene 9 dígitos, por ejemplo 111254880. Corrígelo.', inp); inp.focus(); return; }
      accion(bOt, { accion: 'editar_ot', n_ot: v }, 'ot', inp, 'N° de OT actualizado.');
    });
    var bAn = $('#anular');
    if (bAn) bAn.addEventListener('click', function () {
      var inp = $('#motivo'), v = inp.value.trim();
      if (v.length < 5) { mostrarErr('err-motivo', 'Escribe el motivo de la anulación (al menos 5 caracteres), por ejemplo «Lo envié dos veces».', inp); inp.focus(); return; }
      accion(bAn, { accion: 'anular', motivo: v }, 'motivo', inp, 'Checklist anulado.');
    });
    ['ot-input', 'motivo'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('input', function () { mostrarErr('err-' + (id === 'motivo' ? 'motivo' : 'ot'), '', el); });
    });
    var bDoc = $('#descargar');
    if (bDoc) bDoc.addEventListener('click', function () { abrirDocumento(c); });
  }

  /* ---------- Diálogo y documento simulado (réplica de la hoja oficial) ---------- */
  var dlg = document.getElementById('doc-dialog');
  function abrirDialogo(html) {
    dlg.innerHTML = html;
    if (!dlg.open) dlg.showModal();
  }
  function abrirDocumento(c) {
    var dur = (c.inicio && c.termino) ? duracion(c.inicio, c.termino) + ' min' : '—';
    abrirDialogo(
      '<h2 id="doc-title">CHECK LIST ENTREGA TRABAJOS DE MANTENIMIENTO</h2>' +
      '<p>Vista previa simulada del documento en el formato oficial.</p>' +
      '<table class="doc-tabla"><tbody>' +
        '<tr><th scope="row">Área</th><td>' + esc(c.area) + '</td></tr>' +
        '<tr><th scope="row">Equipo</th><td>' + esc(c.equipo) + '</td></tr>' +
        '<tr><th scope="row">Fecha turno</th><td>' + esc(c.fecha) + ' · ' + esc(c.turno) + '</td></tr>' +
        '<tr><th scope="row">Nombre quien entrega</th><td>' + esc(c.autor || '(sin autor: prueba anterior)') + '</td></tr>' +
        '<tr><th scope="row">Cargo</th><td>' + esc(c.cargo) + '</td></tr>' +
        '<tr><th scope="row">Empresa</th><td>' + esc(c.empresa || '—') + '</td></tr>' +
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

  /* ---------- Controles del prototipo (simulan la señal y un envío alterado) ---------- */
  ctl('ctl-senal').addEventListener('change', function (e) {
    S.senal = (e.target.value === 'con');
    var r = ruta();
    if (S.senal && S.pendientes.length) { reenviarPendientes(); return; }
    if (r === 'lista') cargarLista(); else if (r === 'ver') cargarDetalle();
    else if (r === 'p4') { vistaP4(); reengancharIr(); } else if (r === 'p1') pintarAvisoPendientes();
  });
  ctl('ctl-poc').addEventListener('change', function (e) { S.pocInvalido = (e.target.value === 'invalido'); });

  window.addEventListener('hashchange', render);

  // Otra pestaña cambió la sesión o los pendientes: esta se pone al día.
  window.addEventListener('storage', function (e) {
    if (e.key === CLAVE_SES) {
      var antes = S.sesion && S.sesion.usuario.id;
      S.sesion = leerSesion();
      if (!S.sesion) { S.pendientes = []; S.avisoLogin = 'Cerraste sesión en otra pestaña.'; render(); return; }
      if (S.sesion.usuario.id !== antes) { cargarPendientes(); render(); }
      return;
    }
    if (S.sesion && e.key === clavePend() && !S.reenviando) {
      S.pendientes = leerPendientes();
      if (ruta() === 'p1' || ruta() === 'lista') pintarAvisoPendientes();
    }
  });

  // Si el teléfono vuelve a tener conexión, se reintenta solo.
  window.addEventListener('online', function () { if (S.senal && S.pendientes.length) reenviarPendientes(); });

  // Al recargar, el navegador puede recordar lo elegido en los controles (por ejemplo «Sin señal»).
  // La app parte de lo que muestran, para que la pantalla y el comportamiento digan lo mismo.
  S.senal = ctl('ctl-senal').value !== 'sin';
  S.pocInvalido = ctl('ctl-poc').value === 'invalido';

  if (S.sesion) cargarPendientes();
  render();
  if (S.sesion && S.senal && S.pendientes.length) reenviarPendientes();   // pendientes de una visita anterior
})();
