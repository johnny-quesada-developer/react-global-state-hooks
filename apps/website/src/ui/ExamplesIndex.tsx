import { withBase } from '../lib/site';
import { PageShell } from './PageShell';
import { TryDevTools } from './TryDevTools';

export interface ExampleCard {
  id: string;
  title: string;
  description: string;
}

export function ExamplesIndex({ examples }: { examples: ExampleCard[] }) {
  return (
    <PageShell className="py-8">
      <h1 className="text-3xl leading-heading">Examples</h1>
      <p className="mt-2 text-lg text-text-muted">
        Working examples with live demos. Each one shows the exact source it runs, and the same files are
        tested.
      </p>

      <TryDevTools />

      <div className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] gap-4">
        {examples.map((example, index) => (
          <section className="rounded-md bg-mint px-6 py-4" key={example.id}>
            <h2 className="mb-3 text-xl leading-heading">
              {index + 1}. {example.title}
            </h2>
            <p className="mt-0 mb-3 text-sm text-text-muted">{example.description}</p>
            <a className="font-bold" href={withBase(`examples/${example.id}/`)}>
              Open the example
            </a>
          </section>
        ))}
      </div>
    </PageShell>
  );
}
