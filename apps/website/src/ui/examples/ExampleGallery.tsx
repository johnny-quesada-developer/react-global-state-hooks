import { useMemo, useState } from 'react';
import { withBase } from '../../lib/site';
import { Badge } from '../Badge';
import { Eyebrow } from '../Eyebrow';
import { Icon } from '../Icon';
import { Button } from '../Button';

export interface GalleryExample {
  id: string;
  headline: string;
  description: string;
  category: string;
  thumb: 'shared' | 'todos' | 'async' | 'persist' | 'scoped';
  order: number;
}

const thumbUi = 'w-full max-w-[360px] rounded-control border border-[#dce3dd] dark:border-line bg-paper p-[17px] text-11 shadow-thumb';
const thumbRow = 'flex items-center justify-between gap-[15px] border-b border-[#eef1ed] dark:border-soft py-[9px] last:border-0';
const thumbLine = 'flex min-h-[27px] w-full items-center gap-2 py-1 text-11 leading-[1.5] text-muted';
const thumbCell = 'rounded-[5px] border border-line p-[13px]';

function Thumb({ kind }: { kind: GalleryExample['thumb'] }) {
  if (kind === 'shared' || kind === 'scoped') {
    const cells =
      kind === 'shared'
        ? [
            ['Name', 'Ada', '1 selected-value change', true],
            ['Role', 'Engineer', 'Unchanged', false],
          ]
        : [
            ['Provider A', 'Design', 'Own state', true],
            ['Provider B', 'Build', 'Own state', false],
          ];

    return (
      <div className="grid grid-cols-2 gap-[10px] text-14">
        {cells.map(([label, value, note, active]) => (
          <div className={`${thumbCell} ${active ? 'border-[#cdded1] bg-green-soft dark:border-line' : ''}`} key={String(label)}>
            <span>{label}</span>
            <strong className="mt-[6px] block text-18 font-medium">{value}</strong>
            <small className="text-13 text-muted">{note}</small>
          </div>
        ))}
      </div>
    );
  }

  if (kind === 'todos') {
    return (
      <div className={thumbUi}>
        <div className={thumbRow}>
          <strong>Today’s tasks</strong>
          <Badge tone="green">2 open</Badge>
        </div>
        <div className={thumbLine}>
          <Icon name="check" className="size-[13px]" /> Create a shared store
        </div>
        <div className={thumbLine}>
          <Icon name="plus" className="size-[13px]" /> Compose a selector
        </div>
        <div className={thumbLine}>
          <Icon name="plus" className="size-[13px]" /> Ship the feature
        </div>
      </div>
    );
  }

  if (kind === 'async') {
    return (
      <div className={thumbUi}>
        <div className={thumbRow}>
          <Badge tone="blue">Request state</Badge>
          <span className="font-mono text-11 text-muted">03 / 04</span>
        </div>
        <div className={thumbLine}>
          <Icon name="alert" className="size-[13px]" /> Network error
        </div>
        <span className="mt-2 inline-flex min-h-[34px] items-center gap-2 rounded-control border border-[#dbe1dc] px-3 text-12 font-[550] text-ink dark:border-line" aria-hidden="true">
          Retry request <Icon name="arrow" className="size-[14px]" />
        </span>
      </div>
    );
  }

  return (
    <div className={thumbUi}>
      <div className={thumbRow}>
        <strong>Preferences</strong>
        <Badge tone="green">Saved</Badge>
      </div>
      <div className={thumbLine}>
        <Icon name="sun" className="size-[13px]" /> Light appearance
      </div>
      <div className={thumbLine}>
        <Icon name="check" className="size-[13px]" /> Restore on reload
      </div>
    </div>
  );
}

/** Text and category filters work together; an empty result offers a reset. */
export function ExampleGallery({ examples }: { examples: GalleryExample[] }) {
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const categories = ['All', ...examples.map((example) => example.category)];

  const shown = useMemo(() => {
    const term = query.trim().toLowerCase();
    return examples.filter(
      (example) =>
        (category === 'All' || example.category === category) &&
        [example.headline, example.description, example.category].join(' ').toLowerCase().includes(term),
    );
  }, [examples, category, query]);

  const clear = () => {
    setCategory('All');
    setQuery('');
  };

  return (
    <>
      <div className="flex items-center justify-between gap-[15px] border-t border-line pt-4 pb-6 max-md:flex-col max-md:items-start max-md:pt-[15px]">
        <div className="flex flex-wrap gap-[6px] max-md:gap-px" role="group" aria-label="Filter examples">
          {categories.map((name) => (
            <button
              type="button"
              className="min-h-[34px] rounded-[5px] border border-transparent px-3 py-[7px] text-11 text-muted hover:bg-soft aria-pressed:bg-ink aria-pressed:text-on-ink max-md:px-[9px] max-md:text-10"
              aria-pressed={name === category}
              onClick={() => setCategory(name)}
              key={name}
            >
              {name}
            </button>
          ))}
        </div>
        <label className="flex w-full max-w-[460px] items-center gap-3 rounded-control border border-line bg-paper px-4 py-[13px] text-12 text-muted focus-within:border-green">
          <Icon name="search" />
          <input
            className="w-full min-w-0 border-0! bg-transparent! p-0! text-13 shadow-none! outline-none!"
            type="search"
            placeholder="Find an example"
            aria-label="Find an example"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query && (
            <button type="button" className="text-muted" aria-label="Clear search" onClick={() => setQuery('')}>
              <Icon name="close" className="size-[14px]" />
            </button>
          )}
        </label>
      </div>

      <div className="grid grid-cols-2 gap-6 max-md:grid-cols-1 max-md:gap-5" id="example-cards">
        {shown.length ? (
          shown.map((example) => (
            <a
              className="group flex min-w-0 flex-col overflow-hidden rounded-panel border border-line transition-[border-color,transform] duration-200 last:odd:col-span-full last:odd:grid last:odd:grid-cols-2 hover:-translate-y-[2px] hover:border-[#9eb2a4] max-md:last:odd:col-span-1 max-md:last:odd:flex dark:hover:border-line"
              href={withBase(`examples/${example.id}/`)}
              key={example.id}
            >
              <div className="pointer-events-none flex h-[215px] items-center justify-center overflow-hidden border-b border-line bg-soft px-[42px] py-[27px] group-last:group-odd:h-full group-last:group-odd:border-r group-last:group-odd:border-b-0 max-xl:px-[25px] max-xl:py-[23px] max-md:h-[210px] max-md:group-last:group-odd:h-[215px] max-md:group-last:group-odd:border-r-0 max-md:group-last:group-odd:border-b">
                <Thumb kind={example.thumb} />
              </div>
              <div className="px-[26px] py-6 max-md:p-[22px]">
                <div className="flex items-center justify-between gap-3">
                  <Eyebrow>{example.category}</Eyebrow>
                  <span className="font-mono text-11 text-muted">0{example.order}</span>
                </div>
                <h2 className="my-3 text-22">{example.headline}</h2>
                <p className="mb-5 max-w-[390px] text-13">{example.description}</p>
                <span className="inline-flex items-center gap-2 text-13 font-[550] text-green group-hover:underline group-hover:underline-offset-[5px]">
                  Open example
                  <Icon name="arrow" />
                </span>
              </div>
            </a>
          ))
        ) : (
          <div className="col-span-full rounded-[8px] border border-dashed border-[#c9d4cb] px-5 py-[60px] text-center dark:border-line">
            <Icon name="search" className="mx-auto size-[27px] text-muted" />
            <h3 className="mt-3 mb-2 text-22">No examples match.</h3>
            <p className="mb-5 text-13">Try “state”, “async”, or reset the filters.</p>
            <Button onClick={clear}>Show all examples</Button>
          </div>
        )}
      </div>
    </>
  );
}
