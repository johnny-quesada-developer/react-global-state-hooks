#!/usr/bin/env python3
"""Render an SVG logo to PNG: transparent + composited on a list of backgrounds.

Usage:
  python3 render_variants.py --svg mark.svg --out-dir out/logo_primary \
      --name primary --size 1024 --bg "#FFFFFF:white" "#0B0B0F:dark" "#5B4CFF:brand"
"""
import argparse
import io
import os

import cairosvg
from PIL import Image


def render_transparent(svg_path: str, size: int) -> Image.Image:
    png_bytes = cairosvg.svg2png(url=svg_path, output_width=size, output_height=size)
    return Image.open(io.BytesIO(png_bytes)).convert("RGBA")


def composite_on_bg(logo: Image.Image, hex_color: str) -> Image.Image:
    hex_color = hex_color.lstrip("#")
    r, g, b = tuple(int(hex_color[i : i + 2], 16) for i in (0, 2, 4))
    bg = Image.new("RGBA", logo.size, (r, g, b, 255))
    bg.alpha_composite(logo)
    return bg.convert("RGB")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--svg", required=True)
    ap.add_argument("--out-dir", required=True)
    ap.add_argument("--name", required=True, help="base filename, e.g. logo-primary")
    ap.add_argument("--size", type=int, default=1024)
    ap.add_argument(
        "--bg",
        nargs="*",
        default=[],
        help='list of "#HEXCODE:label" backgrounds to composite onto',
    )
    args = ap.parse_args()

    os.makedirs(args.out_dir, exist_ok=True)
    logo = render_transparent(args.svg, args.size)
    logo.save(os.path.join(args.out_dir, f"{args.name}-transparent.png"))

    for spec in args.bg:
        hex_color, _, label = spec.partition(":")
        label = label or hex_color.lstrip("#")
        out_img = composite_on_bg(logo, hex_color)
        out_img.save(os.path.join(args.out_dir, f"{args.name}-on-{label}.png"))

    print(f"Rendered {1 + len(args.bg)} PNGs to {args.out_dir}")


if __name__ == "__main__":
    main()
