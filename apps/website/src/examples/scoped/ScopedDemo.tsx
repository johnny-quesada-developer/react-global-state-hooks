import { useState } from 'react';
import '../shared/demo.css';
import './scoped.css';
import { RenderCount } from '../shared/RenderCount';
import { NoteContext, useWordCount } from './store';

function TitleField() {
  const [title, actions] = NoteContext.use((note) => note.title);

  return (
    <div className="scoped-field">
      <RenderCount />
      <label>
        Title
        <input value={title} onChange={(event) => actions.setTitle(event.target.value)} />
      </label>
    </div>
  );
}

function BodyField() {
  const [body, actions] = NoteContext.use((note) => note.body);

  return (
    <div className="scoped-field">
      <RenderCount />
      <label>
        Body
        <textarea rows={3} value={body} onChange={(event) => actions.setBody(event.target.value)} />
      </label>
      <button type="button" onClick={() => actions.clear()}>
        Clear body
      </button>
    </div>
  );
}

function WordCount() {
  const words = useWordCount();

  return (
    <div className="scoped-field">
      <RenderCount />
      <output>{words} words</output>
    </div>
  );
}

function NotePanel({ label }: { label: string }) {
  return (
    <section className="demo-card" aria-label={label}>
      <TitleField />
      <BodyField />
      <WordCount />
    </section>
  );
}

let nextId = 3;

export function ScopedDemo() {
  const [panels, setPanels] = useState([1, 2]);

  return (
    <div className="demo">
      <div className="demo-grid demo-grid--wide">
        {panels.map((id) => (
          // Every Provider creates its own store. The second panel is seeded with `value`.
          <NoteContext.Provider key={id} {...(id === 2 ? { value: { title: 'Second note', body: '' } } : {})}>
            <NotePanel label={`Note ${id}`} />
          </NoteContext.Provider>
        ))}
      </div>
      <div className="scoped-actions">
        <button
          type="button"
          className="demo-reset"
          onClick={() => setPanels((current) => [...current, nextId++])}
        >
          Add a note
        </button>
        <button
          type="button"
          className="demo-reset"
          onClick={() => setPanels((current) => current.slice(0, -1))}
          disabled={panels.length === 0}
        >
          Remove last note
        </button>
      </div>
    </div>
  );
}
