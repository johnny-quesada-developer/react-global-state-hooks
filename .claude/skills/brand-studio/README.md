# Brand Studio — a Claude Code skill

Turn a one-paragraph business brief into a complete brand kit in a single,
approval-gated session: optional naming, three visual directions, logo mark
candidates, a full color and type system, PNG exports of every logo variant on
multiple backgrounds, and one polished brand guidelines PDF.

It is built for speed. Every step ends in a visual checkpoint you react to,
never a wall of prose asking "does this work?".

## What you get

```
brand-studio/<slug>/
  brief.md
  brand.json                       # the spec the PDF builder consumes
  concepts/                        # direction boards
  logos/                           # SVG candidates + rendered PNGs
  exports/
    png/<variant>/                 # transparent + one PNG per background
    <slug>_brand_guidelines.pdf
```

## Install

```bash
git clone https://github.com/giannistamb1/brand-studio-skill.git \
  ~/.claude/skills/brand-studio
pip install -r ~/.claude/skills/brand-studio/requirements.txt
```

`cairosvg` needs the Cairo native library. On macOS: `brew install cairo`.
On Debian/Ubuntu: `apt install libcairo2`.

Then in Claude Code, say "brand studio", "make me a brand", or
"design a logo for X". Claude picks up the skill automatically.

## The pipeline

1. **Brief intake** — product, audience, three tone adjectives, what to avoid.
2. **Naming** (only if the name isn't locked) — ranked candidates with rationale.
3. **Visual direction** — three genuinely different palette + type + mood boards.
4. **Logo marks** — three or four SVG candidates in the chosen direction.
5. **System build-out** — the full spec assembled into `brand.json`.
6. **Render exports** — `scripts/render_variants.py` produces PNGs per background.
7. **Guidelines PDF** — `scripts/build_guidelines_pdf.py` assembles the document.
8. **Handoff** — paths and a one-line record of every approved decision.

Each step stops for approval before the next begins.

## Optional companion skills

If installed, the skill delegates to them instead of freehanding:

- [`brand-naming`](https://github.com/arnabbagxd/brand-building-skills) for step 2
- [`SVG Logo Designer`](https://github.com/rknall/claude-skills) for step 4

Neither is required.

## Scripts

Both scripts work standalone, outside Claude.

```bash
# SVG -> transparent PNG + composited PNG per background
python3 scripts/render_variants.py --svg logo.svg --out-dir out/primary \
  --name logo-primary --size 1024 \
  --bg "#FFFFFF:white" "#0B0B0F:dark" "#5B4CFF:brand"

# brand.json -> guidelines PDF
python3 scripts/build_guidelines_pdf.py --spec brand.json --out guidelines.pdf
```

### `brand.json` shape

```json
{
  "name": "Acme",
  "tagline": "Tools for makers",
  "cover_logo": "exports/png/primary/logo-primary-on-white.png",
  "voice": ["direct", "warm", "precise"],
  "voice_intro": "How the brand sounds.",
  "palette": [
    {"name": "Ink", "hex": "#0B0B0F", "role": "primary"},
    {"name": "Signal", "hex": "#5B4CFF", "role": "accent"}
  ],
  "fonts": {
    "heading": {"family": "Sora", "sample": "Make it real", "usage": "Titles, 300 weight"},
    "body": {"family": "Inter", "sample": "The quick brown fox", "usage": "All running text"}
  },
  "logo_variants": [
    {"label": "Primary on white", "image": "exports/png/primary/logo-primary-on-white.png"}
  ],
  "usage_rules": ["Keep clear space equal to the mark's height."],
  "misuse": ["Don't stretch or recolor the mark."]
}
```

## License

MIT
