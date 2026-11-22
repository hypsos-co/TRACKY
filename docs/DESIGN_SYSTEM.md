# TRACKY · Design System

> Fuente de verdad del aspecto visual. Los tokens viven en `src/app/globals.css`;
> este documento explica **qué** son, **por qué** y **cómo** usarlos.

## 1. Principios

1. **Oscuro por defecto, premium y sobrio** — inspirado en Linear (densidad, oscuridad profesional), Apple (vidrio líquido, tipografía SF, movimiento físico) y Notion (modularidad).
2. **"Blue does the work, lime gets the click."** El azul Royal hace el trabajo (selección, enlaces, foco); el lima es _la_ acción de cada pantalla. Si hay dos botones lima, sobra uno.
3. **Vidrio con propósito.** Superficies translúcidas sobre un fondo ambiental (glows navy/royal/lima). Nunca vidrio sobre vidrio sin necesidad.
4. **Accesible siempre.** WCAG 2.1 AA verificado automáticamente (axe en E2E). Ningún color de texto por debajo de 4.5:1.
5. **Movimiento que informa.** Entradas suaves y microinteracciones con resorte; todo se desactiva con `prefers-reduced-motion`.

## 2. Paleta

### 2.1 Colores de marca (suministrados)

| Token CSS        | HEX       | Origen                 | Rol                                            |
| ---------------- | --------- | ---------------------- | ---------------------------------------------- |
| `--brand-ink`    | `#0B0F14` | Paleta _Madison_ · Ink | Fondo (oscuro), texto (claro)                  |
| `--brand-navy`   | `#0B1A5C` | _Madison_ · Navy       | Profundidad: glow ambiental                    |
| `--brand-royal`  | `#2F5BFF` | _Madison_ · Royal      | Primario: selección, botones secundarios, foco |
| `--brand-lime`   | `#D4F53C` | _Madison_ · Lime       | Acento CTA en modo claro                       |
| `--brand-white`  | `#FFFFFF` | _Madison_ · White      | Texto sobre Royal, superficies claras          |
| `--brand-ice`    | `#EFF8FF` | _Neón Lux_             | Texto (oscuro), fondo (claro)                  |
| `--brand-neon`   | `#BBEF1F` | _Neón Lux_             | Acento CTA en modo oscuro (más luminoso)       |
| `--brand-void`   | `#0D0303` | _Neón Lux_             | Texto sobre lima y sobre signal                |
| `--brand-signal` | `#FF0055` | _Neón Lux_             | Destructivo, errores, alertas                  |

### 2.2 Valores derivados (solo para accesibilidad)

No son colores nuevos de marca: son tintes/sombras de los anteriores para alcanzar AA.

| Token            | Tema   | HEX       | Derivado de         | Contraste       |
| ---------------- | ------ | --------- | ------------------- | --------------- |
| `--fg-muted`     | oscuro | `#9DA4AA` | Ice 64 % sobre Ink  | 7.6:1 sobre Ink |
| `--fg-subtle`    | oscuro | `#7D848A` | Ice 50 % sobre Ink  | 5.1:1 sobre Ink |
| `--primary-text` | oscuro | `#829DFF` | Royal 60 % + blanco | 7.5:1 sobre Ink |
| `--fg-muted`     | claro  | `#4B5058` | Ink sobre Ice       | 7.6:1 sobre Ice |
| `--fg-subtle`    | claro  | `#62676E` | Ink sobre Ice       | 5.3:1 sobre Ice |
| `--primary-text` | claro  | `#2649CC` | Royal 80 % + negro  | 6.7:1 sobre Ice |
| `--danger-text`  | claro  | `#CC0044` | Signal 80 % + negro | 5.4:1 sobre Ice |
| `--success-text` | claro  | `#556218` | Lima 40 % + negro   | 6.2:1 sobre Ice |

Combinaciones de relleno verificadas: blanco sobre Royal 5.2:1 · Void sobre Neón 15:1 · Ink sobre Lima 15.5:1 · Void sobre Signal 5.3:1 · Signal sobre Ink 4.9:1.

> Royal (`#2F5BFF`) **no** se usa como texto sobre Ink (3.7:1): para enlaces usa `text-primary-text`.

### 2.3 Tokens semánticos (úsalos siempre en lugar de los de marca)

| Utilidad Tailwind                                                       | Uso                                              |
| ----------------------------------------------------------------------- | ------------------------------------------------ |
| `bg-bg`, `text-fg`                                                      | Fondo y texto base                               |
| `text-fg-muted`, `text-fg-subtle`                                       | Texto secundario / terciario, placeholders       |
| `bg-surface`, `bg-surface-strong`, `bg-surface-solid`                   | Superficies de vidrio (y sólida para `<option>`) |
| `border-border`, `border-border-strong`                                 | Bordes hairline                                  |
| `bg-primary` + `text-primary-fg`                                        | Botón Royal                                      |
| `text-primary-text`                                                     | Enlaces y texto de acción                        |
| `bg-accent` + `text-accent-fg`                                          | CTA lima                                         |
| `bg-danger` + `text-danger-fg`, `text-danger-text`, `bg-danger-surface` | Destructivo / errores                            |
| `text-success-text`, `bg-success-surface`                               | Confirmaciones                                   |
| `outline-ring`                                                          | Anillo de foco                                   |

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

| Clase           | Uso                                                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `.glass`        | Tarjetas y paneles: relleno translúcido, `backdrop-filter: blur(24px) saturate(160%)`, borde hairline, brillo superior interior |
| `.glass-strong` | Elementos elevados (popovers, modales)                                                                                          |
| `.glass-bar`    | Barras flotantes sobre contenido que se desplaza (tab bar móvil): más opaca para legibilidad                                    |
| `.ambient`      | Fondo fijo con glows navy/royal/lima (z-index −1)                                                                               |

Radios: tarjetas `1.5rem` (`--radius-card`), campos `0.875rem` (`--radius-field`), botones y segmentados **píldora** (`rounded-full`), eco de las paletas de referencia.

## 6. Movimiento

| Token             | Valor                                                          | Uso                                                                     |
| ----------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `--ease-out`      | `cubic-bezier(0.22, 1, 0.36, 1)`                               | Entradas, transiciones de estado                                        |
| `--ease-spring`   | `cubic-bezier(0.34, 1.4, 0.64, 1)`                             | Rebotes suaves                                                          |
| `animate-rise`    | 0.6 s: opacidad + `translateY(12px)` + desenfoque 4px → nítido | Entrada de tarjetas/titulares (escalonar con `[animation-delay:80ms]`)  |
| `animate-fade`    | 0.4 s                                                          | Elementos secundarios                                                   |
| Resortes `motion` | `stiffness 500, damping 38–40`                                 | Indicadores activos con `layoutId` (sidebar, tab bar, selector de tema) |

Botones: `active:scale-[0.97]`. Todo respeta `prefers-reduced-motion`.

## 7. Componentes (Fase 1)

| Componente                   | Ruta                                | Notas                                                                                                                     |
| ---------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `Button` / `buttonClasses()` | `components/ui/button.tsx`          | Variantes `accent · primary · glass · ghost · danger`; tamaños `sm · md · lg · icon`. Usa `buttonClasses()` para `<Link>` |
| `SubmitButton`               | `components/ui/submit-button.tsx`   | Estado pendiente del `<form>` con spinner                                                                                 |
| `Field`                      | `components/ui/field.tsx`           | Label + input + hint + error enlazados con `aria-describedby`/`aria-invalid`                                              |
| `PasswordField`              | `components/ui/password-field.tsx`  | Mostrar/ocultar accesible (`aria-pressed`)                                                                                |
| `Alert`                      | `components/ui/alert.tsx`           | `role="alert"` para errores, `role="status"` para el resto                                                                |
| `Card`                       | `components/ui/card.tsx`            | Superficie `.glass`                                                                                                       |
| `ThemeToggle`                | `components/theme/theme-toggle.tsx` | `radiogroup` Oscuro / Claro / Sistema                                                                                     |
| `SidebarNav`, `TabBar`       | `components/app/sidebar-nav.tsx`    | Sidebar (≥ md) y tab bar inferior (móvil)                                                                                 |

## 8. Layout responsive

- **Móvil (vertical):** cabecera con logo + **tab bar inferior** flotante (alcance del pulgar), respeta `safe-area-inset-*`, contenido con `pb-32`.
- **Escritorio (≥ 768 px):** **sidebar fija** de 256 px con vidrio, navegación y usuario al pie; contenido centrado `max-w-5xl`.
- Objetivos táctiles ≥ 40 px.

## 9. Accesibilidad (checklist por componente)

- Contraste AA en ambos temas (tabla §2.2).
- Foco visible: `outline 2px var(--ring)` con `offset 3px`.
- Formularios: etiqueta visible, error textual (no solo color), `noValidate` + validación de servidor accesible.
- Enlace "Saltar al contenido" en el shell.
- El nombre accesible de un control contiene su texto visible (WCAG 2.5.3, verificado con axe).
