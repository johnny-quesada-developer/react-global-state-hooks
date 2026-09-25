---
name: brand-studio
description: Take a business brief and produce a complete brand in one fast, approval-gated session — name (optional), visual direction, logo marks, full color/type system, application previews on multiple backgrounds, PNG exports per logo variant, and a single polished brand guidelines PDF. Use when the user has a new venture/idea and wants a brand and logo fast, or says "brand studio", "make me a brand", "design a logo for X", "brand guidelines".
---

# Brand Studio

Turns a one-paragraph brief into a shippable brand kit: PDF guidelines + PNG logo
exports, arrived at through a short series of approval checkpoints (not one big
reveal). Optimized for speed — minimize round trips, maximize what the user can
react to at each step.

**Always produce a visual artifact at every checkpoint** (an HTML page published
via the Artifact tool, or images) — never describe a design in prose alone and
ask for approval. People approve what they can see.

## Companion skills

If these are installed, use them instead of freehanding the equivalent step —
they exist because they're better at their narrow job:

- **`brand-naming`** (from arnabbagxd/brand-building-skills) — invoke for Step 1
  when the brief has no name locked yet.
- **`SVG Logo Designer`** (from rknall/claude-skills) — invoke for Step 3 to
  generate the logo mark candidates as clean SVG.

If either is not installed, do that step yourself following the guidance below
— never block the pipeline waiting for a skill install.

## Working directory

Create `brand-studio/<slug>/` in the project (or in the user's scratchpad if no
project applies) for this run. Everything below reads/writes there:

```
brand-studio/<slug>/
  brief.md
  brand.json              # the spec build_guidelines_pdf.py consumes
  concepts/                # Step 2 direction boards
  logos/                   # Step 3 SVG candidates + rendered PNGs
  exports/
    png/<variant>/          # final PNG exports per logo variant × background
    <slug>_brand_guidelines.pdf
```

## The pipeline

Work through these steps in order. **Stop after each step and wait for
approval** (a clear "yes", a pick between options, or specific direction) before
moving to the next — do not chain steps without a checkpoint. Log each
approved decision into `brand.json` as you go so nothing is re-derived from
memory later.

### 1. Brief intake

Capture: business/product, audience, tone (3 adjectives is enough), anything to
explicitly avoid looking like, competitors if named, whether the name is locked.
Write it to `brief.md`. If critical info is missing, ask — but keep it to one
round of questions, not a form.

### 2. Naming (only if unlocked)

Invoke `brand-naming` if available. Otherwise generate 8-10 candidates yourself
(short, ownable domain-plausible, say-out-loud test) and present as a simple
ranked list with one-line rationale each. **Checkpoint: get a name pick.**

### 3. Visual direction (3 concepts)

Produce **3 distinct directions**, not 3 minor variations. Each direction =
a palette (4-6 colors with hex), a type pairing (heading + body, real font
names), and a mood description in one sentence. Publish as one Artifact
(HTML) showing all 3 side by side as mini moodboards — palette swatches, the
two font names set in their own faces (use Google Fonts via the artifact CDN
allowlist), and a 1-sentence rationale each. **Checkpoint: get a pick or a
blend direction** ("like #2's palette with #1's type").

### 4. Logo marks (3-4 candidates in the chosen direction)

Invoke `SVG Logo Designer` if available, briefed with the chosen direction
(palette + mood + name). Otherwise hand-build clean, simple SVGs yourself —
favor a single distinctive mark or wordmark treatment over anything literal or
clip-art-like; monoline or geometric constructions render best at small sizes.
Save each candidate as `logos/candidate-N.svg`. Render each at a consistent
size on a neutral background using `scripts/render_variants.py` and lay them
out in one Artifact for comparison. **Checkpoint: get a pick, refinement
notes, or a mix-and-match instruction.**

### 5. System build-out (only after logo is locked)

Now formalize the full system into `brand.json`:
- `name`, `tagline` (draft one if none given), `voice` (3-5 words), `voice_intro`
- `palette`: every color with `name`, `hex`, `role` (primary / accent / neutral / etc.)
- `fonts`: `heading` and `body`, each with `family`, `sample`, `usage` note
- `usage_rules` and `misuse`: 4-6 short bullets each (clear space, minimum size,
  don't recolor, don't stretch, don't place on low-contrast backgrounds, etc.)

Show the assembled system as one Artifact (palette + type specimen + the
locked logo together) as a final sanity check before rendering exports.
**Checkpoint: final go-ahead before generating deliverables.**

### 6. Render exports

For the locked logo SVG (and any lockup/mark-only variant worth shipping
separately), run for each variant:

```bash
python3 ~/.claude/skills/brand-studio/scripts/render_variants.py \
  --svg logos/final.svg \
  --out-dir exports/png/primary \
  --name logo-primary \
  --size 1024 \
  --bg "#FFFFFF:white" "#000000:black" "<primary-hex>:brand" "<neutral-hex>:neutral"
```

This produces a transparent PNG plus one composited PNG per listed
background — that's the "how it looks on different backgrounds" requirement.
Do this once per logo variant (primary mark, wordmark, icon-only) that got
approved in Step 4/5.

Populate `brand.json`'s `logo_variants` array with `{label, image}` pointing
at a representative rendered PNG per variant/background combo you want in the
PDF gallery (don't dump every single file into the PDF — pick the ones that
tell the story: on white, on dark, on brand color, icon-only).

### 7. Build the guidelines PDF

```bash
python3 ~/.claude/skills/brand-studio/scripts/build_guidelines_pdf.py \
  --spec brand.json \
  --out exports/<slug>_brand_guidelines.pdf
```

Read the resulting PDF's page count / open it to sanity-check before handing
off (a missing image path silently skips that grid cell — verify all
`logo_variants` paths existed).

### 8. Handoff

Report back:
- the PDF path
- the PNG export folder path (call out variant × background count)
- one line per approved decision (name, direction, logo pick) for the record

If your setup has a persistent asset registry or memory system, store the key
assets (logo PNGs, palette, fonts) there so later design work can reuse the
brand without re-deriving it.

## Speed notes

- Never present one option when the brief calls for a choice — always 3 for
  direction, 3-4 for logos. One-option "does this work?" turns are slower than
  giving a real choice up front.
- Keep artifacts lightweight (static HTML, no backend) — they're comparison
  boards, not the final deliverable. The PDF + PNGs are the deliverable.
- If the user says "just pick for me" at any checkpoint, make the call, state
  which one and why in one line, and keep moving — don't manufacture a fake
  approval question.
