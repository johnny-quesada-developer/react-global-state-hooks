import { CounterPanel } from './components/CounterPanel';
import { AuthPanel } from './components/AuthPanel';
import { TodosPanel } from './components/TodosPanel';
import { FormContextPanel } from './components/FormContextPanel';
import { ProgressPanel } from './components/ProgressPanel';
import { PipelinePanel } from './components/PipelinePanel';

export function App() {
  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={{ margin: 0 }}>React Hooks Global States — Debug Playground</h1>
        <p style={styles.subtitle}>
          Open the "🐵 React Hooks Global States Dev Tools" panel in Chrome DevTools, then interact
          with the widgets below. Every state change, action, and derived value should show up.
        </p>
      </header>

      <main style={styles.grid}>
        <CounterPanel />
        <AuthPanel />
        <TodosPanel />
        <FormContextPanel />
        <ProgressPanel />
        <PipelinePanel />
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    fontFamily: 'system-ui, sans-serif',
    maxWidth: 900,
    margin: '0 auto',
    padding: 24,
    color: '#1a1a1a',
  },
  header: { marginBottom: 24 },
  subtitle: { color: '#555', lineHeight: 1.5 },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
    gap: 16,
  },
};
