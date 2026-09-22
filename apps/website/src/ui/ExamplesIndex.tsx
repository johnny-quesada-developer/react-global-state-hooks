import { withBase } from '../lib/site';
import { TryDevTools } from './TryDevTools';

export interface ExampleCard {
  id: string;
  title: string;
  description: string;
}

export function ExamplesIndex({ examples }: { examples: ExampleCard[] }) {
  return (
    <div className="container docs-index">
      <h1>Examples</h1>
      <p className="lede">
        Working examples with live demos. Each one shows the exact source it runs, and the same files are
        tested.
      </p>

      <TryDevTools />

      <div className="docs-index__grid">
        {examples.map((example, index) => (
          <section className="docs-index__card" key={example.id}>
            <h2>
              {index + 1}. {example.title}
            </h2>
            <p>{example.description}</p>
            <a href={withBase(`examples/${example.id}/`)}>Open the example</a>
          </section>
        ))}
      </div>
    </div>
  );
}
