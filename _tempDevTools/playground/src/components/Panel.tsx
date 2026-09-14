import type { PropsWithChildren } from 'react';

export function Panel({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <section style={styles.panel}>
      <h2 style={styles.title}>{title}</h2>
      {children}
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    border: '1px solid #e0e0e0',
    borderRadius: 12,
    padding: 16,
    background: '#fff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  title: { marginTop: 0, fontSize: 16 },
};

// eslint-disable-next-line react-refresh/only-export-components
export const btn: React.CSSProperties = {
  padding: '6px 12px',
  borderRadius: 8,
  border: '1px solid #ccc',
  background: '#f7f7f7',
  cursor: 'pointer',
  marginRight: 8,
  marginTop: 8,
};

// eslint-disable-next-line react-refresh/only-export-components
export const input: React.CSSProperties = {
  padding: '6px 10px',
  borderRadius: 8,
  border: '1px solid #ccc',
  marginRight: 8,
  marginTop: 8,
};
