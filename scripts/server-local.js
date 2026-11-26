'use strict';
/* Servidor local para probar la PoC sin Vercel: sirve la carpeta src/ y las funciones /api/checklists y /api/sesion.
   Uso: node --env-file=.env scripts/server-local.js   (abre http://localhost:3000) */
const http = require('http');
const fs = require('fs');
const path = require('path');
const FUNCIONES = { '/api/checklists': require('../src/api/checklists.js'), '/api/sesion': require('../src/api/sesion.js') };

const RAIZ = path.join(__dirname, '..', 'src');
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
const PUERTO = process.env.PORT || 3000;

http.createServer((req, res) => {
  const u = new URL(req.url, 'http://localhost');
  const ruta = u.pathname;
  const handler = FUNCIONES[ruta];

  if (handler) {
    req.query = Object.fromEntries(u.searchParams);
    let datos = '';
    req.on('data', (c) => { datos += c; if (datos.length > 100000) req.destroy(); });
    req.on('end', () => {
      try { req.body = datos ? JSON.parse(datos) : undefined; } catch (e) { req.body = undefined; }
      // Mismos métodos de ayuda que ofrece Vercel
      res.status = (codigo) => { res.statusCode = codigo; return res; };
      res.json = (obj) => { res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(obj)); };
      handler(req, res);
    });
    return;
  }

  const archivo = path.join(RAIZ, ruta === '/' ? 'index.html' : ruta);
  if (!archivo.startsWith(RAIZ) || ruta.startsWith('/api/')) { res.statusCode = 404; return res.end('No encontrado'); }
  fs.readFile(archivo, (err, contenido) => {
    if (err) { res.statusCode = 404; return res.end('No encontrado'); }
    res.setHeader('Content-Type', TIPOS[path.extname(archivo)] || 'application/octet-stream');
    res.end(contenido);
  });
}).listen(PUERTO, () => console.log('ReporteMtto PoC en http://localhost:' + PUERTO));
