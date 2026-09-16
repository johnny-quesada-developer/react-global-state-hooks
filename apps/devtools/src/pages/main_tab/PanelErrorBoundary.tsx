import React from 'react';

type PanelErrorBoundaryState = { error: Error | null };

/**
 * Prevents a single render error from blanking the whole DevTools panel. Shows the error + stack
 * on-screen (the panel itself is hard to inspect), which is far more useful than an empty page.
 */
export class PanelErrorBoundary extends React.Component<React.PropsWithChildren, PanelErrorBoundaryState> {
  state: PanelErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): PanelErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[devtools-panel] render error', error, info);
  }

  render() {
    const { error } = this.state;

    if (!error) return this.props.children;

    return (
      <div style={{ padding: 16, fontFamily: 'monospace', color: '#b00020', whiteSpace: 'pre-wrap' }}>
        <h2 style={{ marginTop: 0 }}>DevTools panel crashed</h2>
        <div style={{ fontWeight: 'bold' }}>{error.message}</div>
        <pre style={{ fontSize: 11, overflow: 'auto' }}>{error.stack}</pre>
      </div>
    );
  }
}

export default PanelErrorBoundary;
