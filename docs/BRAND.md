# Identidad visual de Subte

<p align="center">
  <img src="../public/brand/subte-logo.png" alt="Logo de Subte" width="240" />
</p>

## Nombre y frase

- **Nombre:** Subte.
- **Frase:** "Cada charla, en tu idioma, en vivo."
- **Alternativa:** "Subite a cualquier charla."

## Concepto

Un mapa de red de subte:

- Cada **sala** es una **línea** con color propio.
- La **agenda** es el **mapa de la red**.
- Los **capítulos** de una charla son **estaciones**.
- Las **notas** de cada persona son **tus paradas**.

## Logo

Una "S" formada por tramos de línea de subte en 4 colores, con estaciones (círculos blancos con centro negro).

- **Archivo:** `public/brand/subte-logo.png`.
- **Versión en código:** `components/brand/subte-mark.tsx` (SVG, usada en el encabezado) y `public/icon.svg` (favicon).
- Usalo siempre sobre fondo oscuro, sin deformarlo ni cambiar sus colores.

## Paleta

Colores del **logo**:

| Uso | Color | Hex |
|---|---|---|
| Fondo | Negro subte | `#08070A` |
| Texto principal | Blanco | `#FFFFFF` |
| Línea 1 | Amarillo | `#FEC50C` |
| Línea 2 | Azul | `#0084FF` |
| Línea 3 | Rojo | `#FD3639` |
| Línea 4 | Verde | `#00BC68` |

Colores que usa la **aplicación** hoy (variables CSS en `app/globals.css`):

| Token | Hex | Uso |
|---|---|---|
| `--background` | `#0B0B0D` | Fondo |
| `--foreground` | `#FFFFFF` | Texto principal |
| `--card` | `#151518` | Tarjetas |
| `--muted` | `#1F1F23` | Superficies secundarias |
| `--muted-foreground` | `#A1A1AA` | Texto secundario |
| `--primary` | `#FFC72C` | Acción principal |
| `--line-a` | `#FFC72C` | Línea A (amarillo) |
| `--line-b` | `#0A84FF` | Línea B (azul) |
| `--line-c` | `#FF3B3F` | Línea C (rojo) |
| `--line-d` | `#00B85C` | Línea D (verde) |

Las salas toman una línea en orden (A, B, C, D) y se repiten si hay más de cuatro (`lib/lines.ts`).

## Tipografía

Definida en `app/layout.tsx`:

- **Atkinson Hyperlegible** (400, 700), en `font-sans`: texto de la interfaz. Diseñada por el Braille Institute para baja visión; es la recomendada para subtítulos.
- **Space Grotesk** (500, 600, 700), en `font-display`: títulos, etiquetas y letras de línea.

## Reglas de accesibilidad

- Subtítulos en **blanco o amarillo sobre negro**.
- Contraste **AA** como mínimo.
- Áreas táctiles de **44 px** como mínimo (`min-h-11`).

## Tono

Cercano, claro y directo. Español latinoamericano. Metáforas de subte con moderación: ayudan a orientarse, no deben volverse un chiste constante.
