# TRACKY · Trackers (Fase 3)

Un tracker es una base de datos propia, al estilo de Notion: tú decides qué propiedades tiene cada registro y cómo verlos.

## 1. Modelo

| Tabla                 | Qué guarda                                                                                                                                          |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `trackers`            | Nombre, icono de línea (clave de `src/lib/trackers/icons.ts`), descripción, plantilla de origen y la propiedad que hace de **fecha** (eje temporal) |
| `tracker_properties`  | Propiedades tipadas (`tracker_property_type`), configuración JSON acotada, orden, una sola de **título**                                            |
| `tracker_entries`     | Registros: `values` es un objeto JSON indexado por **id de propiedad** (≤ 32 KB)                                                                    |
| `tracker_entry_links` | Relaciones entre registros (propiedad `relation`), con FK reales y trigger de mismo workspace                                                       |
| `tracker_views`       | Vistas guardadas: `table`, `list`, `cards`, `kanban`, `calendar`, `chart` + su configuración (filtros, etc.)                                        |

RLS: los miembros del workspace leen; `owner/admin/member` escriben (`private.tracker_role_ok`). Detalle en `DATABASE.md`; pruebas en `supabase/tests/database/trackers.test.sql`.

Los valores se validan dos veces: en el cliente (vista previa e importación) y en la Server Action (`validateEntry`, Zod para todo lo demás) antes de escribir.

## 2. Tipos de propiedad

Texto, texto largo, número entero, decimal (unidad opcional), porcentaje, moneda, duración (minutos), valoración (1–N), escala (mín–máx), fecha, fecha y hora, casilla, selección, selección múltiple, estado, enlace (solo `http/https`), fórmula y relación.

- El tipo **no se puede cambiar** una vez creada la propiedad (evita convertir datos en silencio). Se crea otra y se borra la vieja.
- Borrar una propiedad elimina sus valores de todos los registros (se pide confirmación).
- Los números aceptan formato español (`81,5`), y las duraciones `90`, `1:30`, `1h 30m` o `45m`.

## 3. Fórmulas

Motor propio (`src/lib/trackers/formula.ts`), sin `eval` ni acceso a nada fuera del registro:

- Referencias por nombre: `{Peso}`, `{Horas de sueño}` (sin distinguir mayúsculas).
- Operadores: `+ - * / %`, comparaciones, `and/or/not` (`y/o/no`), cadenas entre comillas.
- Funciones: `round`, `abs`, `floor`, `ceil`, `sqrt`, `min`, `max`, `sum`, `avg`, `if`, `empty`, `concat`, `length`, `lower`, `upper`, `percent`, `progress`, `datediff`, `today`, `year`, `month`. Alias en español: `redondear`, `suma`, `promedio`/`media`, `minimo`, `maximo`, `si`, `vacio`, `concatenar`, `longitud`, `porcentaje`, `progreso`, `diasentre`, `hoy`.
- Una fórmula puede usar fórmulas situadas antes que ella. Referirse a sí misma o a una propiedad inexistente se rechaza al guardar, así que no puede haber ciclos.
- Límites: 1000 caracteres, 300 nodos, profundidad 40 y 5000 pasos de evaluación. Un error se muestra como `⚠︎` en la celda, nunca rompe la vista.

Ejemplo: `round({Peso} / ({Altura} / 100) ^ 2, 1)` → IMC.

## 4. Vistas

| Vista      | Uso                                                                                                                  |
| ---------- | -------------------------------------------------------------------------------------------------------------------- |
| Tabla      | Edición rápida, orden y filtros                                                                                      |
| Lista      | Título + fecha + propiedades clave                                                                                   |
| Tarjetas   | Galería                                                                                                              |
| Kanban     | Agrupado por una propiedad de selección/estado; mover arrastrando **o** con el selector de cada tarjeta (accesible)  |
| Calendario | Registros por su fecha, mes a mes                                                                                    |
| Gráfico    | Línea o barras de una propiedad numérica con agregación (media, suma, mín, máx, último, recuento) por día/semana/mes |

El gráfico sigue las reglas de visualización del proyecto: una serie, sin leyenda (el título la nombra), línea de 2 px, barras con extremo redondeado, rejilla discreta, cruceta con tooltip, navegación con flechas y **«Ver como tabla»** como alternativa accesible. Muestra estadísticas (último, media, mínimo, máximo, cambio, tendencia) y, con 5 puntos o más, una **estimación lineal** etiquetada como tal (no es una medición).

## 5. Plantillas

Peso corporal, Agua, Sueño, Gastos, Lecturas, Entrenamientos, Estudio y Contenido (`src/lib/trackers/templates.ts`). Crean propiedades y vistas reales; no insertan registros de ejemplo. También se puede empezar en blanco o duplicar la estructura de un tracker existente (propiedades y vistas, sin registros).

## 6. Importación CSV / Excel

1. Elegir un `.csv` (separador `;` o `,` detectado solo) o `.xlsx` — máximo 5 MB y 5000 filas.
2. Las columnas se emparejan con propiedades por nombre (ignorando acentos y mayúsculas); se puede cambiar.
3. Revisión fila a fila: errores de validación y **duplicados** (mismos valores en las columnas emparejadas, contra lo existente y dentro del archivo).
4. Confirmar. El servidor vuelve a validar cada fila antes de insertar.

## 7. En el panel de inicio

Dos widgets eligen un tracker al añadirlos (`dashboard_widgets.config.trackerId`, validado contra RLS):

- **Gráfico de tracker**: la primera vista de gráfico del tracker o, si no hay, su primera propiedad numérica (media por día).
- **Último valor**: el último valor registrado y su cambio respecto al anterior; si el tracker no tiene números, el recuento y el último registro.

Si el tracker se borra, el widget lo indica y puede quitarse desde «Personalizar».
