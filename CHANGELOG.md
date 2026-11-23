# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/).

## [Sin publicar]

### Cambiado

- **Diseño pulido con la skill [unslop](https://github.com/heydamir/unslop)** (Damir Sokolovsky, CC BY 4.0), instalada en el proyecto: fondo plano sin manchas de luz, tarjetas sólidas en lugar de vidrio, sin halos en los botones, esquinas por tamaño, etiquetas sin mayúsculas, títulos sin saludo (el panel se titula con el día), textos más cortos, una sola acción lima por pantalla y el **punto lima** como firma (último registro, día de hoy, sección activa). Iconos de línea para los trackers (los emojis existentes se muestran con su equivalente). Portada nueva con lo que la app hace hoy y una vista previa real del producto. Marca intacta: Royal, lima, Ink/Ice, SF Pro y logo.

### Añadido

- **Fase 3 · Trackers:** bases de datos propias con 18 tipos de propiedad, fórmulas seguras (con alias en español), relaciones, plantillas (peso, agua, sueño, gastos, lecturas, entrenamientos, estudio, contenido), vistas guardadas (tabla, lista, tarjetas, kanban, calendario, gráfico con estadísticas y tendencia), importación CSV/Excel con revisión de errores y duplicados, y widgets «Gráfico de tracker» y «Último valor» en el panel. Ver `docs/TRACKERS.md`.
- **Fase 2 · Núcleo:** workspaces (personal + adicionales), proyectos con progreso calculado, tareas con subtareas, estados, prioridades, etiquetas y alta en lenguaje natural, calendario (día/semana/mes/año, arrastrar eventos), dashboard de widgets con datos reales (añadir, quitar, tamaño, reordenar), búsqueda universal ⌘K.
- Componentes: Dialog/Sheet nativos, toasts accesibles, Select, Textarea, estados vacíos y esqueletos.
- Auditoría técnica (`docs/AUDIT.md`), roadmap por fases 0–10, `SECURITY.md`, `DEPLOYMENT.md`, `NOTIFICATIONS.md`.
- Mensaje claro cuando el proveedor de email rechaza una dirección no autorizada.

### Corregido

- Contraste AA del texto de error y del texto secundario sobre las superficies elevadas del tema oscuro.
- La barra de progreso animaba `width`; ahora usa `transform`.
- El gráfico no se adaptaba al ancho cuando un tracker pasaba de vacío a tener datos; en móvil alejaba el zoom de toda la página.
- Accesibilidad (WCAG 2.5.3, 1.4.3, 4.1.2) detectada por axe en el nuevo shell: nombres accesibles, filas de tarea sin controles anidados, contraste de etiquetas; widgets del dashboard que no se refrescaban tras crear una tarea.

## [0.1.0] — 2026-11-22

### Añadido

- Fase 1 · Fundación: Next.js 16 + Supabase, autenticación completa, rutas protegidas, perfil con RLS, design system con tokens, PWA manifest, CI, documentación.
- Producción en Netlify + Supabase Cloud.
