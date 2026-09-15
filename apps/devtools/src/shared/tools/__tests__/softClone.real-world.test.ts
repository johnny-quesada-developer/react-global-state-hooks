import { describe, it, expect } from 'vitest';
import { softClone } from '../softClone';

describe('softClone - real usage scenarios', () => {
  describe('deep cloning complex state objects', () => {
    it('should clone Redux-like state trees', () => {
      const state = {
        users: {
          byId: {
            '1': { id: '1', name: 'Alice', posts: ['p1', 'p2'] },
            '2': { id: '2', name: 'Bob', posts: ['p3'] },
          },
          allIds: ['1', '2'],
        },
        posts: {
          byId: {
            p1: { id: 'p1', title: 'First Post', content: 'Hello' },
            p2: { id: 'p2', title: 'Second Post', content: 'World' },
          },
          allIds: ['p1', 'p2'],
        },
        ui: {
          selectedUserId: '1',
          isLoading: false,
          timestamps: [1000, 2000, 3000],
        },
      };

      const cloned = softClone(state);

      // Verify structure is maintained
      expect(cloned.users.byId['1'].name).toBe('Alice');
      expect(cloned.posts.byId.p1.title).toBe('First Post');
      expect(cloned.ui.timestamps).toEqual([1000, 2000, 3000]);

      // Verify deep independence
      cloned.users.byId['1'].name = 'Alice Updated';
      cloned.ui.timestamps.push(4000);

      expect(state.users.byId['1'].name).toBe('Alice');
      expect(state.ui.timestamps).toEqual([1000, 2000, 3000]);
    });

    it('should handle Form state with mixed types', () => {
      const formState = {
        fields: {
          email: {
            value: 'test@example.com',
            touched: true,
            errors: ['Invalid format'],
          },
          password: {
            value: 'secret',
            touched: false,
            errors: [],
          },
        },
        submitCount: 1,
        isSubmitting: false,
        lastSubmitTime: null,
      };

      const cloned = softClone(formState);

      expect(cloned.fields.email.value).toBe('test@example.com');
      expect(cloned.fields.email.errors).toEqual(['Invalid format']);

      cloned.fields.email.errors.push('Duplicate');
      expect(formState.fields.email.errors).toHaveLength(1);
    });

    it('should handle Cart/Shopping state', () => {
      const cartState = {
        items: [
          { id: 'item1', quantity: 2, price: 29.99, metadata: { sku: 'ABC123', inStock: true } },
          { id: 'item2', quantity: 1, price: 49.99, metadata: { sku: 'DEF456', inStock: true } },
        ],
        totals: {
          subtotal: 109.97,
          tax: 8.8,
          shipping: 5.0,
          total: 123.77,
        },
        appliedCoupons: ['SAVE10', 'FREE_SHIP'],
      };

      const cloned = softClone(cartState);

      expect(cloned.items[0].metadata.sku).toBe('ABC123');
      expect(cloned.totals.total).toBe(123.77);
      expect(cloned.appliedCoupons).toEqual(['SAVE10', 'FREE_SHIP']);

      cloned.items[0].quantity = 5;
      expect(cartState.items[0].quantity).toBe(2);
    });

    it('should handle Tree/Hierarchical data structures', () => {
      const treeState = {
        nodes: {
          root: {
            id: 'root',
            label: 'Root',
            children: ['node1', 'node2'],
          },
          node1: {
            id: 'node1',
            label: 'Node 1',
            children: ['node1a', 'node1b'],
          },
          node1a: {
            id: 'node1a',
            label: 'Node 1A',
            children: [],
          },
        },
        expandedNodes: ['root', 'node1'],
        selectedNode: 'node1a',
      };

      const cloned = softClone(treeState);

      expect(cloned.nodes.node1.children).toEqual(['node1a', 'node1b']);
      expect(cloned.expandedNodes).toEqual(['root', 'node1']);

      cloned.expandedNodes.push('node2');
      expect(treeState.expandedNodes).toHaveLength(2);
    });

    it('should handle Pagination/List state', () => {
      const listState = {
        items: Array.from({ length: 3 }, (_, i) => ({
          id: `item${i}`,
          data: { value: i * 10, processed: false },
        })),
        pagination: {
          page: 1,
          pageSize: 10,
          total: 100,
        },
        filters: {
          search: 'test',
          tags: ['important', 'urgent'],
          dateRange: { from: 1000, to: 2000 },
        },
        sorting: {
          field: 'created',
          order: 'desc' as const,
        },
      };

      const cloned = softClone(listState);

      expect(cloned.items[0].id).toBe('item0');
      expect(cloned.filters.tags).toEqual(['important', 'urgent']);
      expect(cloned.sorting.field).toBe('created');

      cloned.filters.tags.push('new');
      expect(listState.filters.tags).toHaveLength(2);
    });
  });

  describe('performance with large objects', () => {
    it('should efficiently clone large state objects', () => {
      const largeState = {
        entities: Object.fromEntries(
          Array.from({ length: 100 }, (_, i) => [
            `entity${i}`,
            {
              id: `entity${i}`,
              data: {
                values: Array(50)
                  .fill(0)
                  .map((_, idx) => idx),
                nested: { deep: { value: i * 10 } },
              },
            },
          ])
        ),
      };

      const start = performance.now();
      const cloned = softClone(largeState);
      const duration = performance.now() - start;

      expect(Object.keys(cloned.entities)).toHaveLength(100);
      expect(duration).toBeLessThan(1000); // Should complete in less than 1 second
    });
  });

  describe('edge cases in real scenarios', () => {
    it('should handle null values in objects', () => {
      const state = {
        user: null,
        posts: [{ id: '1', author: null }],
        config: { theme: null },
      };

      const cloned = softClone(state);
      expect(cloned.user).toBeNull();
      expect(cloned.posts[0].author).toBeNull();
      expect(cloned.config.theme).toBeNull();
    });

    it('should preserve undefined values', () => {
      const state = {
        optional: undefined,
        data: { missing: undefined },
      };

      const cloned = softClone(state);
      expect(cloned.optional).toBeUndefined();
      expect(cloned.data.missing).toBeUndefined();
    });

    it('should handle mixed Date and primitive values', () => {
      const state = {
        timestamp: new Date('2026-04-18'),
        expires: new Date('2026-04-25'),
        count: 42,
        active: true,
      };

      const cloned = softClone(state);
      expect(cloned.timestamp).toEqual(new Date('2026-04-18'));
      expect(cloned.expires).toEqual(new Date('2026-04-25'));
      expect(cloned.count).toBe(42);
      expect(cloned.active).toBe(true);
    });
  });
});
