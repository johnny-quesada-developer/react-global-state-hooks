# Visual regression baselines

Screenshot baselines for every page of the site, plus the interactive states a fresh page load never
shows. They exist so a pure-styling change — the CSS-to-Tailwind migration in particular — can be
proven to leave the rendered site identical.

## Running

```bash
yarn test:visual          # build, then compare against the baselines
yarn test:visual:run      # compare without rebuilding (dist/ must be current)
yarn test:visual:update   # build, then rewrite the baselines
yarn test:visual:report   # open the HTML report of the last run
```

From the workspace root: `nx run website:test:visual`.

## What is covered

`site.spec.ts` reads `dist/` and takes a full-page screenshot of every built page, so a new page is
covered as soon as it builds. `404.html` is reached by requesting an unknown path.

`states.spec.ts` drives components into states the default render cannot show — search dialog with
results, a non-default package manager, mini-me hidden, the second hero video tab, async demo loaded
and failed, changed preferences, a completed task, an empty task filter, a third scoped note and an
updated selective demo — and compares that element only.

Each spec runs in two projects, `desktop` (1280×900) and `mobile` (390×844).

## Determinism

- The browser context sets `prefers-reduced-motion: reduce`. `styles/global.css` and `styles/site.css`
  stop every animation under it, and `HeroVideos` does not autoplay.
- `<video>` elements are masked. The mask covers the element's own box, so its size and position are
  still compared; only decoded frames are excluded.
- The suite serves the production build through `scripts/visual-server.mjs`. `astro preview` detaches
  into a background daemon, which Playwright's `webServer` cannot manage.
- `maxDiffPixelRatio` is `0.03`: up to 3% of a screenshot's pixels may differ before it fails.

## Local only

No CI job runs this suite, on purpose. `deploy-website.yml` runs `website:test`, `ts-check`, `lint`,
`build` and `check:links`; `test:visual` is a separate nx target it never invokes, and its
`yarn install --ignore-scripts` keeps Playwright from downloading browsers.

The baselines are macOS-rendered. The site uses the system font stack, which rasterizes differently
on Linux, so a Linux runner would need its own `--update-snapshots` in a pinned container before the
suite could ever move into CI.

## Migrating styles with this suite

1. `yarn test:visual` on a clean tree — confirm 74 passing.
2. Migrate one area's CSS.
3. `yarn test:visual:run` — every failure is a real visual change. `yarn test:visual:report` shows
   the expected/actual/diff triple.
4. Fix, or accept an intended change with `yarn test:visual:update` and review the PNG diff.
