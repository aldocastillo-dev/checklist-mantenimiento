# Reporte digital del checklist de entrega de trabajos de mantenimiento

## Qué es la solución
App móvil y web para que el supervisor de turno registre en terreno el checklist de entrega de trabajos, con detalle técnico, firma en pantalla y envío automático al programador en el formato oficial.

**Principales características:**
* **Registro en terreno:** Smartphone con campos precargados y guiados según el tipo de actividad (mediciones, repuestos utilizados, causas de falla y pendientes).
* **Modo sin conexión (Offline):** Funciona en interior mina, almacena localmente y sincroniza de forma automática al recuperar señal.
* **Generación de documentos:** Crea automáticamente el PDF en formato oficial con firmas en pantalla listo para imprimir o adjuntar.
* **Bandeja web:** Permite al programador consultar, filtrar y descargar los checklists del turno.

---

## Para quién es
Supervisores de turno de mantenimiento mecánico (usuarios principales) y programadores de mantenimiento (reciben y revisan los checklist).

**Detalle de involucrados:**
| Rol | Relación con la solución |
|---|---|
| **Supervisores de turno (Mecánico):** | Registran en el punto de trabajo y gestionan las firmas de entrega y recepción.|
| **Programadores de mantenimiento:** | Reciben los documentos, verifican HH y N° OT SAP para realizar la carga correspondiente.|
| **Ingenieros de confiabilidad y Administración:** | Se benefician de contar con la información a tiempo y sin pérdida de detalle técnico.|
| **Supervisores Codelco (Mandante):** | Validan el formato digital y firman la recepción de los trabajos.|

---

## Cómo se instala y se ejecuta
Aún no hay nada que ejecutar. Esta sección se completará cuando exista una primera versión.

---

## En qué estado está
Etapa de diseño: propuesta de valor, caso de uso, maqueta, roadmap y estructura de datos preliminar. Pendiente de evaluar la viabilidad del modo sin conexión con sincronización.
| Entregable | Estado |
|---|---|
| Avance 1: propuesta de valor, alcance y usuarios | Entregado (`docs/unidad1/`) |
| Avance 2: solución, caso de uso, maqueta y roadmap | Entregado (`docs/unidad1/`) |
| Avance 3: repositorio, README, bitácora de IA y estructura de datos | En revisión |
| Base de datos en Supabase, app móvil y bandeja web | Por iniciar |

### Contexto y problemática detectada
* **Retraso en la entrega:** Por horario, la entrega debe hacerse a las 20:00 (turno día) y 08:00 (turno noche). Cuando el turno de noche no alcanza, la información se recibe 24 horas después debido a la transcripción manual y los traslados en mina.
* **Pérdida de detalle:** En papel se omite información técnica que sí se comparte por WhatsApp (mediciones, repuestos, condición del equipo).
* **Impacto:** Provoca retrasos en la notificación de HH, firmas de Codelco y cierre técnico en SAP.

### Alcance del proyecto

| Qué SÍ resolverá la solución | Qué NO resolverá la solución |
| :--- | :--- |
| Registro móvil del checklist (datos de turno, OT SAP, HH, observaciones y firmas). | **No se integra directo con SAP:** El programador sigue haciendo la carga manual de HH y OTs. |
| Campos guiados para capturar detalle técnico en terreno. | **No reemplaza la firma presencial:** No automatiza el flujo de aprobación presencial de Codelco. |
| Funcionamiento offline con sincronización automática. | **No planifica ni programa:** No crea órdenes de trabajo ni asigna recursos. |
| Generación de PDF en formato oficial y bandeja de consulta web. | **No cubre otras especialidades:** En esta etapa no abarca eléctrica ni instrumentación. |

---

## Quiénes la desarrollan
Equipo 1: Aldo Castillo, Felipe Narbona, Sebastián Narbona, Bastian Garay.
