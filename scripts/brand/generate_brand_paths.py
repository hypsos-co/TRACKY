#!/usr/bin/env python3
"""
Regenerates src/components/brand/paths.ts from the brand sources.

  * Logo mark: traced from the raster logo (white mark on black) with OpenCV.
  * Wordmark:  "TRACKY." set in Baby Shower and converted to outlines, so the
               font file is never shipped to browsers (see docs/DESIGN_SYSTEM.md).

Usage (fonts are NOT in the repo — pass your licensed copy):
  pip install fonttools opencv-python-headless numpy
  python3 -I scripts/brand/generate_brand_paths.py \
      --logo docs/brand/logo-source.jpg --font /path/to/Baby_Shower.otf
"""
import argparse
import pathlib

import cv2
import numpy as np
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / "src/components/brand/paths.ts"


def trace_mark(logo_path: str) -> str:
    img = cv2.imread(logo_path, cv2.IMREAD_GRAYSCALE)
    _, th = cv2.threshold(img, 128, 255, cv2.THRESH_BINARY)
    contours, _ = cv2.findContours(th, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    polys = [cv2.approxPolyDP(c, 2.2, True).reshape(-1, 2) for c in contours if cv2.contourArea(c) >= 200]
    pts = np.vstack(polys)
    (x0, y0), (x1, y1) = pts.min(0), pts.max(0) + 1
    size = max(x1 - x0, y1 - y0)
    ox, oy = (size - (x1 - x0)) / 2, (size - (y1 - y0)) / 2
    s = 100 / size
    paths = []
    for poly in polys:
        coords = [((x - x0 + ox) * s, (y - y0 + oy) * s) for x, y in poly]
        paths.append("M" + " L".join(f"{x:.2f} {y:.2f}" for x, y in coords) + " Z")
    return " ".join(paths)


def outline_wordmark(font_path: str, text: str = "TRACKY."):
    font = TTFont(font_path)
    glyphs, cmap, hmtx = font.getGlyphSet(), font.getBestCmap(), font["hmtx"]
    asc = font["hhea"].ascent

    def fmt(v):
        r = round(v, 1)
        return str(int(r)) if r == int(r) else str(r)

    letters, dot, bounds = SVGPathPen(glyphs, ntos=fmt), SVGPathPen(glyphs, ntos=fmt), BoundsPen(glyphs)
    x = 0
    for ch in text:
        name = cmap[ord(ch)]
        pen = dot if ch == "." else letters
        glyphs[name].draw(TransformPen(pen, (1, 0, 0, -1, x, asc)))
        glyphs[name].draw(TransformPen(bounds, (1, 0, 0, -1, x, asc)))
        x += hmtx[name][0]
    xmin, ymin, xmax, ymax = bounds.bounds
    viewbox = f"{int(xmin)} {int(ymin)} {int(xmax - xmin) + 1} {int(ymax - ymin) + 1}"
    return viewbox, letters.getCommands(), dot.getCommands()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--logo", required=True)
    ap.add_argument("--font", required=True)
    args = ap.parse_args()

    mark = trace_mark(args.logo)
    viewbox, letters, dot = outline_wordmark(args.font)
    OUT.write_text(
        f'''/**
 * TRACKY brand geometry.
 *
 * - MARK_PATH: vector trace of the supplied logo mark (IMG_3993), normalised to a 100x100 box.
 * - WORDMARK_*: "TRACKY." set in Baby Shower (Perspectype Studio) and converted to outlines,
 *   so the typeface file itself is never shipped to the browser.
 *
 * Generated — do not hand-edit. See docs/DESIGN_SYSTEM.md › Logo.
 */
export const MARK_VIEWBOX = "0 0 100 100";
export const MARK_PATH =
  "{mark}";

export const WORDMARK_VIEWBOX = "{viewbox}";
export const WORDMARK_LETTERS_PATH =
  "{letters}";
export const WORDMARK_DOT_PATH =
  "{dot}";
'''
    )
    print(f"wrote {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
