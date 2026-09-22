import type { AgentStoreInfo } from '../agent/protocol';
import { storeTitle } from './format';

/** Result of the interactive pick: explicit selectors, or every store. */
export type Selection = { selectors: string[] } | { all: true } | null;

const ALL_ROW = 'All stores';

type ViewState = { cursor: number; marked: Set<number> };

/**
 * Pure render of the picker: the list, then the preview of the highlighted row. `rows` is the
 * terminal height: the list scrolls around the cursor and the preview is cut so the frame never
 * exceeds the screen (a taller frame cannot be redrawn in place).
 */
export const renderSelector = (stores: AgentStoreInfo[], { cursor, marked }: ViewState, rows?: number): string[] => {
  const rowTitles = [
    ...stores.map((store, index) => `${marked.has(index) ? '◉' : ' '} ${storeTitle(store)}`),
    `  ${ALL_ROW}`,
  ];

  const chrome = 4; // title, blank, blank after the list, and one spare line
  const visible = rows ? Math.max(3, Math.min(rowTitles.length, Math.floor((rows - chrome) / 2))) : rowTitles.length;
  const start = Math.min(Math.max(0, cursor - Math.floor(visible / 2)), rowTitles.length - visible);

  const lines = ['Select a store (↑/↓ move, space mark several, enter confirm, q quit):', ''];
  for (let index = start; index < start + visible; index++) {
    lines.push(`${index === cursor ? '❯' : ' '} ${rowTitles[index]}`);
  }
  lines.push('');

  const store = stores[cursor];
  if (!store) {
    lines.push('Listen to every store. This is slower and noisier than picking specific stores.');
    return lines;
  }

  const preview = [store.name ?? 'unnamed'];
  if (store.location) preview.push(store.location);
  preview.push('', 'State:', ...store.preview.split('\n'));
  if (store.actions.length) preview.push('', 'Actions:', ...store.actions);

  const room = rows ? Math.max(0, rows - chrome - visible) : preview.length;
  if (preview.length > room) return [...lines, ...preview.slice(0, Math.max(0, room - 1)), '…'];
  return [...lines, ...preview];
};

const KEYS = {
  up: '\u001b[A',
  down: '\u001b[B',
  ctrlC: '\u0003',
  enter: '\r',
  space: ' ',
} as const;

/** Arrow-key picker on stdin/stdout. Resolves `null` when the user quits. */
export const pickStores = (stores: AgentStoreInfo[]): Promise<Selection> =>
  new Promise((resolve) => {
    const { stdin, stdout } = process;
    const rowCount = stores.length + 1;
    const view: ViewState = { cursor: 0, marked: new Set() };

    // Alternate screen: a clean canvas that is fully restored on exit, so nothing printed before
    // the picker (package manager banners, warnings) is disturbed or in the way.
    const draw = () => {
      const lines = renderSelector(stores, view, stdout.rows);
      stdout.write(`\u001b[H${lines.map((line) => `\u001b[2K${line}`).join('\n')}\u001b[J`);
    };

    const finish = (selection: Selection) => {
      stdin.off('data', onData);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write('\u001b[?25h\u001b[?1049l');
      resolve(selection);
    };

    const onData = (chunk: Buffer) => {
      const key = chunk.toString();

      if (key === KEYS.ctrlC || key === 'q' || key === '\u001b') return finish(null);
      if (key === KEYS.up || key === 'k') view.cursor = (view.cursor + rowCount - 1) % rowCount;
      else if (key === KEYS.down || key === 'j') view.cursor = (view.cursor + 1) % rowCount;
      else if (key === KEYS.space && view.cursor < stores.length) {
        if (!view.marked.delete(view.cursor)) view.marked.add(view.cursor);
      } else if (key === KEYS.enter) {
        if (view.cursor === stores.length) return finish({ all: true });

        const picked = view.marked.size ? [...view.marked] : [view.cursor];
        return finish({ selectors: picked.map((index) => stores[index].selector) });
      }

      draw();
    };

    stdout.write('\u001b[?1049h\u001b[?25l');
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on('data', onData);
    draw();
  });
