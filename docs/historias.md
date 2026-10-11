# Historias de usuario · Reporte digital del checklist de entrega de trabajos de mantenimiento

Conversación: supervisor de mantenimiento con 3 años haciendo checklist de entrega, 11 de octubre de 2026. Nos contó que no tiene un programa digital para adjuntar la información de forma más rápida, que se le olvidan los números SAP de los repuestos para generar los pedidos, y que cuando las mantenciones son muy extensas "la documentación se procede a entregar al próximo día". Hoy reportar demora unas 2 horas antes de que termine el turno. Los avisos de SAP por hallazgos los genera presencialmente y, sin señal, reporta por radio al ingeniero de turno o al planificador.

Flujo principal: el supervisor de turno registra, firma y entrega el checklist de una actividad de mantenimiento antes de que termine su turno. Historia principal: HU-01

## HU-01 · Registrar el checklist con su detalle técnico
Como supervisor de turno de mantenimiento mecánico, quiero registrar en mi teléfono el área, el equipo, la actividad y el detalle técnico (causa de falla, repuesto, medición y pendiente), para entregar el checklist antes de que termine el turno y no al día siguiente.

- Escenario principal. Dado que terminé la actividad y tengo todos los campos obligatorios completos, cuando toco "Guardar y enviar", entonces veo el mensaje "Checklist enviado", el estado "enviado" y mis horas hombre ya calculadas.
- Escenario alternativo. Dado que estoy sin cobertura, cuando toco "Guardar y enviar", entonces veo el estado "pendiente" con el aviso "Se enviará al recuperar señal" y puedo abrir un checklist nuevo.

## HU-02 · Registrar el repuesto con su número SAP
Como supervisor de turno, quiero anotar el número SAP del repuesto cuando lo registro, para que el programador pueda generar el pedido sin que yo tenga que acordarme después.

## HU-03 · Dejar el checklist firmado
Como supervisor de turno, quiero firmar en la pantalla del teléfono, para dejar mi entrega firmada sin imprimir ni llevar el papel, y que el programador la lleve al mandante.

## HU-04 · Recibir el checklist, corregir el N° de OT y descargarlo
Como programador de mantenimiento, quiero recibir el checklist en mi bandeja, corregir el N° de OT y descargar el documento, para llevarlo al mandante y que lo firme sin pedirle datos al supervisor.

Mejora futura (fuera de este avance): que el mandante firme digitalmente. Hoy firma en el documento impreso que el programador le lleva, porque incorporarlo a la app implicaría registrarlo como usuario.

Wireframes: ver docs/wireframes/
Respuestas completas en docs/conversacion-supervisor.md.
