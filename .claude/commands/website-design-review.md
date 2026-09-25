---
description: Audit apps/website with the design skills and propose a prioritized improvement plan
---

Audit `apps/website` for design quality and produce a prioritized improvement plan. Do not edit any
file in this pass — the output is a report I approve before anything changes.

Use these skills, in this order, and say which one produced each finding:

1. `web-design-guidelines` — audit `apps/website/src/ui/**/*.tsx` and `src/layouts/BaseLayout.astro`
   against the Web Interface Guidelines. Report as `file:line`. This is the objective pass:
   accessibility, focus states, touch targets, semantics.
2. `ui-ux-pro-max` — run its searches for the actual stack (`--stack astro`, `--stack react`,
   `--stack html-tailwind`) against the site's real palette and type scale in
   `src/styles/tokens.css`. Judge hierarchy, spacing rhythm, density and typography.
3. `emil-design-eng` — the craft pass. Interaction feel, hover/focus/active states, motion that is
   missing, the unseen details. The site currently has almost no transitions by design.

Cover every route: home, docs index, a docs page, examples index, an example page, about,
easy-code-review, 404. Judge desktop (1280) and mobile (390).

Hard constraints — a proposal that breaks one of these is not acceptable:

- The palette in `apps/website/src/styles/tokens.css` is contract. `src/lib/contrast.test.ts` parses
  its `--color-*` hex literals and asserts the pairs. Propose palette changes only as an explicit,
  separate item that names the test impact.
- Tailwind v4, no Preflight (`src/styles/app.css` says why). Utilities only in `src/ui/**`; variants
  go through `tv()` from tailwind-variants. `eslint-plugin-better-tailwindcss` fails the build on any
  class that is not a real utility, so no invented class names.
- The page shell class is `page-shell`, never `container` — `container` collides with a Tailwind
  utility.
- A `text-*` utility also sets line-height; a sized heading needs `leading-heading` with it.
- Do not touch `apps/website/src/examples/**`. Those files' source is rendered verbatim as page
  content through `?raw` imports in the MDX, so editing them rewrites the docs.
- Keep the classes the tests select: `search-open`, `search-dialog`, `minime`, `minime-show`,
  `install`, `site-footer`, `hero-videos`, `hero-videos__count`, `hero-videos__nav`, `code-block`,
  `prose`.

About the visual baselines: `apps/website/visual/__screenshots__` holds 74 screenshots that
currently pass at zero pixel tolerance. A design improvement is expected to change them. That is the
one case where re-recording is correct — but per change, reviewed, never as a bulk
`--update-snapshots`. For each proposed change say which routes it moves and roughly how much.

Deliver a single table ordered by impact-to-effort: finding, where (`file:line`), which skill found
it, why it matters, the concrete fix, and the baseline impact. Put anything that needs my decision
(palette, type scale, layout structure) in a separate short list at the end.

Then stop and wait.
