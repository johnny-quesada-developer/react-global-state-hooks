import { createRoot, type Root } from 'react-dom/client';
import type { ReactNode } from 'react';

/**
 * React must own the container element it renders into, but the row components
 * render their own <li>. A `display: contents` wrapper keeps that container out
 * of layout so the inner <li> participates in the <ul> flex directly.
 */
export const createDisplayContentsMount = () => {
  const mount = document.createElement('div');
  mount.style.display = 'contents';
  return mount;
};

/** Tracks the per-row React roots so they can be torn down together. */
export class ItemRoots {
  private roots: Root[] = [];

  mount(parent: Node, node: ReactNode) {
    const container = createDisplayContentsMount();
    parent.appendChild(container);

    const root = createRoot(container);
    this.roots.push(root);
    root.render(node);
  }

  unmountAll() {
    const roots = this.roots.splice(0, this.roots.length);

    // React disallows unmounting a root synchronously from within its own render.
    queueMicrotask(() => {
      for (const root of roots) root.unmount();
    });
  }
}
