import { useState } from 'react';
import '../shared/demo.css';
import './scoped.css';
import { RenderCount } from '../shared/RenderCount';
import { NoteContext, useWordCount } from './store';

function TitleField() {
  const [title, actions] = NoteContext.use((note) => note.title);

  return (
    <div className="scoped-field">
      <label>
        Title
        <input value={title} onChange={(event) => actions.setTitle(event.target.value)} />
      </label>
      <RenderCount />
    </div>
  );
}

function BodyField() {
  const [body, actions] = NoteContext.use((note) => note.body);

  return (
    <div className="scoped-field">
      <label>
        Body
        <textarea rows={3} value={body} maxLength={240} onChange={(event) => actions.setBody(event.target.value)} />
      </label>
      <button type="button" onClick={() => actions.clear()}>
        Clear body
      </button>
      <RenderCount />
    </div>
  );
}

function WordCount() {
  const words = useWordCount();

  return (
    <div className="scoped-field">
      <output>{words} words · own store</output>
      <RenderCount />
    </div>
  );
}

function NotePanel({ label }: { label: string }) {
  return (
    <section className="demo-card note-card" aria-label={label}>
      <div className="note-head">
        <span className="note-badge">{label}</span>
        <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="m12 2 10 6-10 6L2 8zm-10 11 10 6 10-6M2 18l10 6 10-6" />
        </svg>
      </div>
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
      <div className="scoped-notes">
        {panels.map((id) => (
          // Every Provider creates its own store. The second panel is seeded with `value`.
          <NoteContext.Provider key={id} {...(id === 2 ? { value: { title: 'Second note', body: '' } } : {})}>
            <NotePanel label={`Note ${id}`} />
          </NoteContext.Provider>
        ))}
      </div>
      <p className="demo-caption">Two instances of the same component. No shared edits.</p>
      <div className="scoped-actions">
        <button type="button" className="demo-button" onClick={() => setPanels((current) => [...current, nextId++])}>
          Add a note
        </button>
        <button
          type="button"
          className="demo-button"
          onClick={() => setPanels((current) => current.slice(0, -1))}
          disabled={panels.length === 0}
        >
          Remove last note
        </button>
      </div>
    </div>
  );
}
