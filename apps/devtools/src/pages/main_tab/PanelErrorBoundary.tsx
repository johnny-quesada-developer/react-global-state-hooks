import React from 'react';

type PanelErrorBoundaryState = { error: Error | null };

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
