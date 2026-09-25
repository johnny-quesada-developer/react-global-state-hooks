#!/usr/bin/env python3
"""Assemble a brand guidelines PDF from a JSON spec + rendered logo PNGs.

Usage:
  python3 build_guidelines_pdf.py --spec brand.json --out brand_guidelines.pdf
"""
import argparse
import json
import os

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    Image as RLImage,
    PageBreak,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from PIL import Image as PILImage


def fitted_image(path, max_w, max_h):
    """Build an RLImage scaled to fit within (max_w, max_h) preserving aspect ratio."""
    with PILImage.open(path) as im:
        iw, ih = im.size
    scale = min(max_w / iw, max_h / ih)
    return RLImage(path, width=iw * scale, height=ih * scale)

PAGE_W, PAGE_H = letter
MARGIN = 0.75 * inch


def hex_to_color(hexstr: str):
    hexstr = hexstr.lstrip("#")
    r, g, b = (int(hexstr[i : i + 2], 16) / 255 for i in (0, 2, 4))
    return colors.Color(r, g, b)


def build_styles():
    ss = getSampleStyleSheet()
    ss.add(
        ParagraphStyle(
            "BrandTitle",
            parent=ss["Title"],
            fontSize=36,
            leading=40,
            alignment=TA_CENTER,
        )
    )
    ss.add(
        ParagraphStyle(
            "BrandTagline",
            parent=ss["Normal"],
            fontSize=14,
            alignment=TA_CENTER,
            textColor=colors.HexColor("#666666"),
            spaceBefore=8,
        )
    )
    ss.add(ParagraphStyle("SectionHead", parent=ss["Heading1"], fontSize=20, spaceAfter=12))
    ss.add(ParagraphStyle("SubHead", parent=ss["Heading2"], fontSize=13, spaceAfter=6))
    ss.add(ParagraphStyle("Body", parent=ss["Normal"], fontSize=10.5, leading=15))
    return ss


def cover_page(spec, styles, story):
    story.append(Spacer(1, 2.2 * inch))
    logo_path = spec.get("cover_logo")
    if logo_path and os.path.exists(logo_path):
        img = fitted_image(logo_path, 2.2 * inch, 2.2 * inch)
        img.hAlign = "CENTER"
        story.append(img)
        story.append(Spacer(1, 0.4 * inch))
    story.append(Paragraph(spec.get("name", "Brand"), styles["BrandTitle"]))
    if spec.get("tagline"):
        story.append(Paragraph(spec["tagline"], styles["BrandTagline"]))
    story.append(Spacer(1, 0.3 * inch))
    story.append(Paragraph("Brand Guidelines", styles["BrandTagline"]))
    story.append(PageBreak())


def voice_section(spec, styles, story):
    if not spec.get("voice"):
        return
    story.append(Paragraph("Brand Voice", styles["SectionHead"]))
    story.append(Paragraph(spec.get("voice_intro", ""), styles["Body"]))
    story.append(Spacer(1, 0.15 * inch))
    words = "  ·  ".join(spec["voice"])
    story.append(Paragraph(f"<b>{words}</b>", styles["Body"]))
    story.append(Spacer(1, 0.3 * inch))


def palette_section(spec, styles, story):
    palette = spec.get("palette", [])
    if not palette:
        return
    story.append(Paragraph("Color Palette", styles["SectionHead"]))
    rows = []
    for i in range(0, len(palette), 3):
        row = palette[i : i + 3]
        swatches, labels = [], []
        for c in row:
            t = Table([[""]], colWidths=[1.7 * inch], rowHeights=[1.0 * inch])
            t.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, -1), hex_to_color(c["hex"])),
                        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#DDDDDD")),
                    ]
                )
            )
            swatches.append(t)
            labels.append(
                Paragraph(
                    f"<b>{c.get('name', '')}</b><br/>{c['hex'].upper()}<br/>"
                    f"<font color='#777777'>{c.get('role', '')}</font>",
                    styles["Body"],
                )
            )
        while len(swatches) < 3:
            swatches.append("")
            labels.append("")
        rows.append(swatches)
        rows.append(labels)
    table = Table(rows, colWidths=[1.7 * inch] * 3)
    table.setStyle(TableStyle([("BOTTOMPADDING", (0, 0), (-1, -1), 10)]))
    story.append(table)
    story.append(Spacer(1, 0.3 * inch))


def typography_section(spec, styles, story):
    fonts = spec.get("fonts", {})
    if not fonts:
        return
    story.append(Paragraph("Typography", styles["SectionHead"]))
    for role, f in fonts.items():
        story.append(
            Paragraph(f"<b>{role.title()}</b> — {f.get('family', '')}", styles["SubHead"])
        )
        story.append(
            Paragraph(f.get("sample", "The quick brown fox jumps over the lazy dog"), styles["Body"])
        )
        if f.get("usage"):
            story.append(Paragraph(f"<font color='#777777'>{f['usage']}</font>", styles["Body"]))
        story.append(Spacer(1, 0.15 * inch))
    story.append(Spacer(1, 0.15 * inch))


def logo_section(spec, styles, story):
    variants = spec.get("logo_variants", [])
    if not variants:
        return
    story.append(PageBreak())
    story.append(Paragraph("Logo", styles["SectionHead"]))
    cell_w = 1.9 * inch
    cell_h = 1.4 * inch
    row_imgs, row_labels, cells = [], [], []
    for v in variants:
        path = v.get("image")
        if not path or not os.path.exists(path):
            continue
        img = fitted_image(path, cell_w, cell_h)
        img.hAlign = "CENTER"
        cells.append(img)
        row_labels.append(Paragraph(v.get("label", ""), styles["Body"]))
        if len(cells) == 3:
            row_imgs.append(cells)
            row_imgs.append(row_labels)
            cells, row_labels = [], []
    if cells:
        while len(cells) < 3:
            cells.append("")
            row_labels.append("")
        row_imgs.append(cells)
        row_imgs.append(row_labels)
    table = Table(row_imgs, colWidths=[cell_w] * 3, rowHeights=None)
    table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(table)
    story.append(Spacer(1, 0.2 * inch))


def rules_section(spec, styles, story):
    rules = spec.get("usage_rules", [])
    misuse = spec.get("misuse", [])
    if rules:
        story.append(Paragraph("Usage Guidelines", styles["SectionHead"]))
        for r in rules:
            story.append(Paragraph(f"• {r}", styles["Body"]))
        story.append(Spacer(1, 0.25 * inch))
    if misuse:
        story.append(Paragraph("Don't", styles["SubHead"]))
        for m in misuse:
            story.append(Paragraph(f"• {m}", styles["Body"]))
        story.append(Spacer(1, 0.2 * inch))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--spec", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    with open(args.spec) as f:
        spec = json.load(f)

    styles = build_styles()
    doc = SimpleDocTemplate(
        args.out,
        pagesize=letter,
        leftMargin=MARGIN,
        rightMargin=MARGIN,
        topMargin=MARGIN,
        bottomMargin=MARGIN,
        title=f"{spec.get('name', 'Brand')} Guidelines",
    )
    story = []
    cover_page(spec, styles, story)
    voice_section(spec, styles, story)
    palette_section(spec, styles, story)
    typography_section(spec, styles, story)
    logo_section(spec, styles, story)
    rules_section(spec, styles, story)
    doc.build(story)
    print(f"Wrote {args.out}")


if __name__ == "__main__":
    main()
