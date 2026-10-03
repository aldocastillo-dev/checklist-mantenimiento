# Reporte digital del checklist de entrega de trabajos de mantenimiento

Equipo N°1 

## Qué es la solución

Es una aplicación móvil para que el supervisor de turno de mantenimiento mecánico registre el **checklist de entrega de trabajos** en el mismo punto de trabajo en interior mina. Hoy ese checklist se escribe a mano al final del turno, llega al programador con uno o dos días de atraso y pierde el detalle técnico que el mismo personal sí reporta por WhatsApp.

Con la aplicación, el supervisor:

- escribe el detalle técnico en campos cortos y guiados (causa de falla, repuestos, mediciones y pendientes), y puede dictarlo por voz o adjuntar fotografías;
- trabaja **sin señal**: el checklist se guarda en el teléfono y se envía solo al recuperar cobertura;
- obtiene calculadas la duración y las horas hombre, firma en pantalla junto a quien recibe el trabajo y genera el **PDF en el formato oficial**.

El programador recibe los checklist en una bandeja web, corrige el N° de OT si hace falta y descarga el documento.

**Fuera de alcance:** no se integra con SAP, no reemplaza la firma presencial del mandante y no planifica mantenimiento.

## Para quién es

| Rol | Relación con la solución |
|---|---|
| Supervisor de turno de mantenimiento mecánico | Usa la app: registra y firma el checklist desde el teléfono |
| Programador de mantenimiento mecánico | Usa la bandeja: revisa, corrige el N° de OT y descarga el PDF |
| Ingeniero de confiabilidad y administración de contrato | Se benefician de un registro completo y a tiempo |
| Administrador de contrato y supervisor de Codelco | Autorizan el uso y validan el formato del documento |

## Cómo se instala y se ejecuta

**Todavía no hay nada que ejecutar.** En la Semana 3 el repositorio contiene la documentación, la estructura de datos preliminar y la carpeta `src/`, donde irá el código.

Cuando exista código, los pasos serán:

```bash
git clone https://github.com/<organizacion>/checklist-mantencion.git
cd checklist-mantencion
git checkout dev
cp .env.example .env    # completar los valores en el computador de cada integrante; .env nunca se sube
```

Organización del repositorio:

```
checklist-mantencion/
├── src/                 código de la solución (por ahora solo README)
├── docs/
│   ├── unidad1/         Avances 1 y 2
│   ├── bitacora-ia/     registro de los encargos hechos a IA
│   └── datos/           estructura de datos preliminar y diagrama
├── .gitignore           archivos locales que no se suben
├── .env.example         nombres de las variables, sin valores
└── README.md            esta portada
```

## En qué estado está

| Entregable | Estado |
|---|---|
| Avance 1: propuesta de valor, alcance y usuarios | Entregado (`docs/unidad1/`) |
| Avance 2: solución, caso de uso, maqueta y roadmap | Entregado (`docs/unidad1/`) |
| Avance 3: repositorio, README, bitácora de IA y estructura de datos | En revisión |
| Base de datos en Supabase, app móvil y bandeja web | Por iniciar |

## Quiénes la desarrollan

Equipo N°1:

- Aldo Castillo
- Felipe
- Sebastián Narbona
- Bastián Garay
  
