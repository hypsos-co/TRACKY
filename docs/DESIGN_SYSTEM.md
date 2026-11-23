# TRACKY · Design System

> Fuente de verdad del aspecto visual. Los tokens viven en `src/app/globals.css`;
> este documento explica **qué** son, **por qué** y **cómo** usarlos.

## 0. Estado: identidad **provisional**

La identidad visual definitiva está **pendiente de entrega** (paleta, tipografías, logotipo, iconografía, referencias, naming).

- Los valores actuales salen de los activos que compartiste el 22/11/2026 (paletas _Madison_ y _Neón Lux_, SF Pro / Baby Shower, logo estrella). Se tratan como **provisionales**: no se añaden colores ni fuentes nuevos fuera de los tokens.
- Toda la interfaz consume **tokens semánticos** (`--bg`, `--fg`, `--accent`, `--primary`…) definidos en un solo lugar (`src/app/globals.css`). Sustituir la marca = cambiar los valores de `--brand-*`, la pila tipográfica y `src/components/brand/*`; los componentes no cambian.
- Pendiente de definir: iconografía propia (hoy `lucide-react`), ilustraciones, naming definitivo, uso del wordmark.

## 1. Dirección y principios

Pulido con la skill **unslop** de Damir Sokolovsky ([@heydamir](https://x.com/heydamir), [repo](https://github.com/heydamir/unslop), licencia CC BY 4.0), instalada en el proyecto (`.claude/settings.json`). Dirección acordada con el propietario el 23/11/2026:

- **Producto:** un sistema personal donde organizas tareas y calendario y mides lo que te importa (peso, sueño, lecturas…) en un panel que montas tú.
- **Carácter:** preciso, constante, con un punto eléctrico.
- **Mundo:** un cuaderno de bitácora nocturno y un instrumento de medida. Tinta Ink, trazo Royal, el lima como marcador fosforito.
- **Momentos:** los gráficos de los trackers y la cifra del último valor. Ahí va el color; el resto, en calma.
- **Firma:** el punto de «TRACKY.». Un punto lima (`.now-dot`) marca «el ahora»: el último registro de cada gráfico, el día de hoy y la sección activa. Solo ahí.

Principios:

1. **Cromo en calma.** Fondo Ink plano, superficies sólidas con hairline; la profundidad sale de escalones de superficie, nunca de brillos, manchas de color ni vidrio.
2. **"Blue does the work, lime gets the click."** Royal para selección, enlaces, foco y datos; el lima es _la_ acción de cada pantalla y la firma. Si hay dos botones lima, sobra uno.
3. **Textos que dicen algo.** Títulos que nombran el contexto (la página o el día), sin saludos, sin exclamaciones, sin punto final en etiquetas y subtítulos; los cambios dicen respecto a qué («−2,9 kg desde el 26 oct»).
4. **Accesible siempre.** WCAG 2.1 AA verificado automáticamente (axe en E2E). Ningún color de texto por debajo de 4.5:1 en ninguna superficie.
5. **Movimiento que explica.** Una sola entrada por pantalla, sin rebotes ni bucles; todo se desactiva con `prefers-reduced-motion`.

Antes de dar por terminada una pantalla nueva, pásale el checklist de unslop (`/unslop` o `/unslop:unslop`).

## 2. Paleta

### 2.1 Colores de marca (suministrados)

| Token CSS        | HEX       | Origen                 | Rol                                            |
| ---------------- | --------- | ---------------------- | ---------------------------------------------- |
| `--brand-ink`    | `#0B0F14` | Paleta _Madison_ · Ink | Fondo (oscuro), texto (claro)                  |
| `--brand-navy`   | `#0B1A5C` | _Madison_ · Navy       | Reservado (sin uso tras unslop: no hay glows)  |
| `--brand-royal`  | `#2F5BFF` | _Madison_ · Royal      | Primario: selección, botones secundarios, foco |
| `--brand-lime`   | `#D4F53C` | _Madison_ · Lime       | Acento CTA en modo claro                       |
| `--brand-white`  | `#FFFFFF` | _Madison_ · White      | Texto sobre Royal, superficies claras          |
| `--brand-ice`    | `#EFF8FF` | _Neón Lux_             | Texto (oscuro), fondo (claro)                  |
| `--brand-neon`   | `#BBEF1F` | _Neón Lux_             | Acento CTA en modo oscuro (más luminoso)       |
| `--brand-void`   | `#0D0303` | _Neón Lux_             | Texto sobre lima y sobre signal                |
| `--brand-signal` | `#FF0055` | _Neón Lux_             | Destructivo, errores, alertas                  |

### 2.2 Valores derivados (solo para accesibilidad)

No son colores nuevos de marca: son tintes/sombras de los anteriores para alcanzar AA.

| Token            | Tema   | HEX       | Derivado de         | Contraste                                           |
| ---------------- | ------ | --------- | ------------------- | --------------------------------------------------- |
| `--fg-muted`     | oscuro | `#9DA4AA` | Ice 64 % sobre Ink  | 7.6:1 sobre Ink                                     |
| `--fg-subtle`    | oscuro | `#8A9197` | Ice sobre Ink       | 6.0:1 sobre Ink, ≥ 4.7:1 sobre superficies elevadas |
| `--danger-text`  | oscuro | `#FF5C87` | Signal + blanco     | ≥ 5.1:1 sobre cualquier superficie oscura           |
| `--primary-text` | oscuro | `#829DFF` | Royal 60 % + blanco | 7.5:1 sobre Ink                                     |
| `--fg-muted`     | claro  | `#4B5058` | Ink sobre Ice       | 7.6:1 sobre Ice                                     |
| `--fg-subtle`    | claro  | `#62676E` | Ink sobre Ice       | 5.3:1 sobre Ice                                     |
| `--primary-text` | claro  | `#2649CC` | Royal 80 % + negro  | 6.7:1 sobre Ice                                     |
| `--danger-text`  | claro  | `#CC0044` | Signal 80 % + negro | 5.4:1 sobre Ice                                     |
| `--success-text` | claro  | `#556218` | Lima 40 % + negro   | 6.2:1 sobre Ice                                     |

Combinaciones de relleno verificadas: blanco sobre Royal 5.2:1 · Void sobre Neón 15:1 · Ink sobre Lima 15.5:1 · Void sobre Signal 5.3:1 · Signal sobre Ink 4.9:1.

> Royal (`#2F5BFF`) **no** se usa como texto sobre Ink (3.7:1): para enlaces usa `text-primary-text`.

### 2.3 Tokens semánticos (úsalos siempre en lugar de los de marca)

| Utilidad Tailwind                                                              | Uso                                                    |
| ------------------------------------------------------------------------------ | ------------------------------------------------------ |
| `bg-bg`, `text-fg`                                                             | Fondo y texto base                                     |
| `text-fg-muted`, `text-fg-subtle`                                              | Texto secundario / terciario, placeholders             |
| `bg-bg-deep`, `bg-card`, `bg-surface`, `bg-surface-strong`, `bg-surface-solid` | Rampa Ink: sidebar, tarjeta, relleno, activo, flotante |
| `border-border`, `border-border-strong`                                        | Bordes hairline                                        |
| `bg-primary` + `text-primary-fg`                                               | Botón Royal                                            |
| `text-primary-text`                                                            | Enlaces y texto de acción                              |
| `bg-accent` + `text-accent-fg`                                                 | CTA lima                                               |
| `bg-danger` + `text-danger-fg`, `text-danger-text`, `bg-danger-surface`        | Destructivo / errores                                  |
| `text-success-text`, `bg-success-surface`                                      | Confirmaciones                                         |
| `outline-ring`                                                                 | Anillo de foco                                         |
| `--chart-1`, `--chart-grid` (SVG: `var(--chart-1)`)                            | Serie de gráficos y rejilla recesiva                   |

**Gráficos.** Una serie por gráfico (sin leyenda: el título la nombra), línea de 2 px, barras con extremo redondeado de 4 px anclado a la base, rejilla en `--chart-grid`, texto siempre en tokens de texto (nunca del color de la serie), cruceta + tooltip, flechas del teclado y «Ver como tabla». `--chart-1` es Royal `#2F5BFF` en claro y `#5C7DFF` en oscuro (validado contra cada superficie). Si algún día un gráfico necesita varias series, el orden de color se fija y se valida antes; no se generan colores sobre la marcha.

Los temas se cambian con `data-theme="light|dark"` en `<html>`. Un script inline (`src/components/theme/theme-script.tsx`) aplica la preferencia guardada **antes del primer pintado** (sin parpadeo). La preferencia (Oscuro/Claro/Sistema) se guarda por dispositivo en `localStorage`.

## 3. Tipografía

| Rol                      | Familia                                      | Notas                                                                                                    |
| ------------------------ | -------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| UI y titulares           | **SF Pro Display** (Regular 400, Medium 500) | Pila: `"SF Pro Display", "SF Pro Text", -apple-system, BlinkMacSystemFont, "Inter Variable", system-ui…` |
| Logotipo                 | **Baby Shower** (Perspectype Studio)         | Solo en el wordmark, convertido a contornos SVG                                                          |
| Código / cifras técnicas | SF Mono → `ui-monospace`                     | `font-mono`                                                                                              |

**Licencias — importante:**

- **SF Pro** es de Apple y su licencia solo permite usarla para maquetas de interfaces de plataformas Apple; **no permite incrustarla en una web**. Por eso **no** se sirve el archivo `.otf`: en iPhone/iPad/Mac el navegador ya usa SF Pro del sistema (`-apple-system`), y en Windows/Android/Linux se usa **Inter** (licencia OFL, métricas muy parecidas), autoalojada vía `@fontsource-variable/inter`.
- **Baby Shower** es "All Rights Reserved" de Perspectype Studio. El wordmark se ha convertido a trazos (uso como logotipo); el archivo de fuente **no** está en el repo ni se envía al navegador. Si quieres usar Baby Shower para titulares en la web necesitas una **licencia webfont**; con ella basta añadir un `@font-face` y un token `--font-display`.

Escala (px): 44/34 display (`tracking -0.03em`, Medium) · 26 título de tarjeta auth · 22/18 títulos de sección · 15 cuerpo · 13–14 secundario · 11–12 etiquetas. Interletraje negativo en tamaños grandes (estilo Apple).

## 4. Logo

| Archivo                                                                 | Contenido                                         |
| ----------------------------------------------------------------------- | ------------------------------------------------- |
| `docs/brand/logo-source.jpg`                                            | Imagen original suministrada                      |
| `src/components/brand/paths.ts`                                         | Trazados vectoriales generados (no editar a mano) |
| `src/components/brand/logo.tsx`                                         | `<LogoMark/>`, `<Wordmark/>`, `<Logo/>` (lock-up) |
| `public/brand/logo-mark.svg`, `public/brand/wordmark.svg`               | SVG sueltos para uso externo                      |
| `src/app/icon.svg`, `src/app/apple-icon.png`, `public/brand/icon-*.png` | Favicon e iconos PWA (incl. _maskable_)           |

- El **mark** (estrella doble) se vectorizó desde la imagen original con OpenCV (4 polígonos, fiel al original).
- El **wordmark** "TRACKY." usa `currentColor` para las letras y `var(--accent)` para el punto final (lima).
- Regenerar: `python3 -I scripts/brand/generate_brand_paths.py --logo docs/brand/logo-source.jpg --font /ruta/Baby_Shower.otf`.
- Área de respeto: ≥ 25 % del alto del mark alrededor. Tamaño mínimo del mark: 16 px.

## 5. Superficies, radios y sombras

Una rampa Ink: `--bg-deep` (sidebar) → `--bg` (página) → `--card` → `--surface` / `--surface-strong` (rellenos y estado activo) → `--surface-solid` (capas flotantes).

| Clase          | Uso                                                                                          |
| -------------- | -------------------------------------------------------------------------------------------- |
| `.card`        | Tarjetas y paneles: relleno sólido `--card` + hairline (en claro, sombra neutra mínima)      |
| `.panel-float` | Capas que flotan (diálogos, popovers, toasts): `--surface-solid` + la única sombra permitida |
| `.bar-float`   | Tab bar móvil sobre contenido que se desplaza                                                |
| `.now-dot`     | La firma: punto lima de 6 px (con anillo oscuro en tema claro para que se vea sobre blanco)  |

Estado activo (navegación, segmentados): `bg-surface-strong` + `shadow-[var(--highlight)]` (brillo superior de 1 px), nunca un relleno lima.

Radios por tamaño (radio anidado = exterior − padding, nunca < 4 px): etiquetas y teclas `--radius-sm` 6 px · campos, botones y filas `--radius-field` 10 px · tarjetas `--radius-card` 16 px · diálogos y paneles `--radius-panel` 20 px. Solo son círculos los avatares, las casillas de tarea y los puntos.

Iconos: un solo set (`lucide-react`), trazo 1.5 global (`:where(svg.lucide)`), 16 px en línea y 18 px en navegación, color del rol de texto. Los trackers usan iconos de línea (`src/lib/trackers/icons.ts`); los emojis antiguos se muestran con su equivalente.

## 6. Movimiento

| Token          | Valor                                                                  | Uso                                                                             |
| -------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `--ease-out`   | `cubic-bezier(0.22, 1, 0.36, 1)`                                       | La única curva de la app                                                        |
| `animate-rise` | 0.4 s: opacidad + `translateY(8px)`                                    | Una sola entrada por pantalla (el `<main>` del shell)                           |
| `animate-fade` | 0.2 s                                                                  | Diálogos                                                                        |
| Duraciones     | 150 ms feedback · 200 ms toasts · 300 ms barras de progreso (`scaleX`) | Solo color, fondo, borde, opacidad y `transform`; nunca `width/height/top/left` |

Botones: `active:scale-[0.98]`. Sin resortes con rebote, sin bucles (solo el spinner de carga), sin movimiento al pasar el ratón. Todo respeta `prefers-reduced-motion`.

## 7. Componentes (Fase 1)

| Componente                   | Ruta                                | Notas                                                                                                                         |
| ---------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `Button` / `buttonClasses()` | `components/ui/button.tsx`          | Variantes `accent · primary · secondary · ghost · danger`; tamaños `sm · md · lg · icon`. Usa `buttonClasses()` para `<Link>` |
| `SubmitButton`               | `components/ui/submit-button.tsx`   | Estado pendiente del `<form>` con spinner                                                                                     |
| `Field`                      | `components/ui/field.tsx`           | Label + input + hint + error enlazados con `aria-describedby`/`aria-invalid`                                                  |
| `PasswordField`              | `components/ui/password-field.tsx`  | Mostrar/ocultar accesible (`aria-pressed`)                                                                                    |
| `Alert`                      | `components/ui/alert.tsx`           | `role="alert"` para errores, `role="status"` para el resto                                                                    |
| `Card`                       | `components/ui/card.tsx`            | Superficie `.card`                                                                                                            |
| `ThemeToggle`                | `components/theme/theme-toggle.tsx` | `radiogroup` Oscuro / Claro / Sistema                                                                                         |
| `SidebarNav`, `TabBar`       | `components/app/sidebar-nav.tsx`    | Sidebar (≥ md) y tab bar inferior (móvil)                                                                                     |

## 8. Layout responsive

- **Móvil (vertical):** cabecera con logo + **tab bar inferior** flotante (alcance del pulgar), respeta `safe-area-inset-*`, contenido con `pb-32`.
- **Escritorio (≥ 768 px):** **sidebar fija** de 256 px (`--bg-deep` + hairline), filas de 36 px; contenido fluido hasta 1440 px.
- **Portada:** hero partido (texto + vista previa del producto dibujada en código con datos de ejemplo); en móvil se apila y la vista previa se simplifica.
- Objetivos táctiles ≥ 40 px.

## 9. Accesibilidad (checklist por componente)

- Contraste AA en ambos temas (tabla §2.2).
- Foco visible: `outline 2px var(--ring)` con `offset 3px`.
- Formularios: etiqueta visible, error textual (no solo color), `noValidate` + validación de servidor accesible.
- Enlace "Saltar al contenido" en el shell.
- El nombre accesible de un control contiene su texto visible (WCAG 2.5.3, verificado con axe).
