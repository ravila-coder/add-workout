# Workout Tracker · Addem Capital

Plataforma interna del comité de Workout para el seguimiento semanal de acreditadas (TGT, Verqor, Mattilda, Ozon, Aviva). Gestor de tareas tipo Asana: mobile-first, con dashboard de métricas, timeline de actividad, comentarios, adjuntos vinculados a Google Drive y exportación de la "Agenda de la semana" en PDF o Excel.

## Estructura

```
├── index.html        # Estructura de la app (login, vistas, modales)
├── css/styles.css    # Tokens del Addem Capital Design System (color, tipo, espaciado)
├── assets/logos/     # Símbolo y logotipo oficiales (colorways verde / mint / blanco)
└── js/
    ├── storage.js    # Capa de persistencia (window.storage / localStorage)
    ├── data.js       # Configuración, catálogos y semilla de la minuta 15-jul-2026
    ├── report.js     # Reporte "Agenda de la semana" (PDF y CSV/Excel)
    └── app.js        # Lógica de vistas, CRUD, filtros, comentarios y timeline
```

Sin frameworks ni build: es un sitio estático que puede desplegarse en cualquier hosting.

## Despliegue en Vercel

1. Crea un repositorio en GitHub y sube el contenido de esta carpeta.
2. En [vercel.com](https://vercel.com) → **Add New → Project** → importa el repositorio.
3. Framework preset: **Other** (sitio estático). No requiere comandos de build.
4. Deploy. Listo.

## Acceso

- Usuario: `Addem` · Contraseña: `Workout!`
- Tras iniciar sesión se elige a la persona que usa el sistema (Montse, Juan, Habid, Mauro, Oscar, Eduardo, Pablo, Alex, Daniela, Mónica, Pedro, Luis). Todas las acciones quedan registradas con ese nombre.

> ⚠️ La validación de acceso ocurre en el navegador (no hay backend); sirve como control ligero de uso interno, no como seguridad real. No almacenes información sensible.

## Persistencia de datos

Los datos se guardan en `localStorage` del navegador (o en `window.storage` cuando corre como artefacto de Claude). Cada navegador/dispositivo mantiene su propia copia. Para que todo el comité comparta la misma información en tiempo real, el siguiente paso natural es conectar `js/storage.js` a un backend (p. ej. Supabase, Firebase o Vercel KV): toda la persistencia está aislada en ese módulo precisamente para facilitar ese cambio.

## Adjuntos y Google Drive

Un sitio estático no puede subir archivos directamente a Drive (requiere OAuth de Google). El flujo implementado: el botón **Abrir carpeta de Drive** lleva a la carpeta compartida del comité; ahí se sube el archivo y se pega el enlace en la tarea, que queda guardado para consulta posterior. Si más adelante se desea subida directa, se puede integrar el Google Drive Picker/API con OAuth.

## Personalización

Catálogos (usuarios, acreditadas, estatus, prioridades), credenciales y la URL de la carpeta de Drive viven en `js/data.js` (`CONFIG`). Los tokens del branding (tomados del Addem Capital Design System: Verde Oscuro `#0D473D`, Verde Acento `#B0EBC2`, Carbón, Gris, Off-White; Inter Tight 300/600) están como variables CSS al inicio de `css/styles.css`. Por indicación del comité no se usa Cutive Mono: el rol mono (datos, eyebrows, etiquetas) lo cubre la pila monoespaciada del sistema.
