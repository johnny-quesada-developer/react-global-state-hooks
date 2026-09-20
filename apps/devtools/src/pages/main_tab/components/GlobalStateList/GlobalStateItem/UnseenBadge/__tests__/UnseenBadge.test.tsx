import React from 'react';
import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { GlobalStateId } from '@src/shared/schema/GlobalStateJson';
import { stateMetaDevTools$ } from '../../../../../hooks/globalStates';
import { UnseenBadge } from '../UnseenBadge';

const stateId = 'store-id:test' as GlobalStateId;

afterEach(() => {
  act(() => stateMetaDevTools$.setState(new Map()));
});

describe('UnseenBadge', () => {
  it('hides instead of throwing when its state meta is removed before the badge unmounts', () => {
    act(() => stateMetaDevTools$.setState(new Map([[stateId, { isPristine: false, unseenLength: 3 }]])));
    const badge = render(<UnseenBadge globalStateId={stateId} />).container.querySelector('span')!;

    act(() => stateMetaDevTools$.setState(new Map([[stateId, { isPristine: false, unseenLength: 5 }]])));
    expect(badge.style.display).toBe('');
    expect(badge.dataset.count).toBe('5');

    expect(() => act(() => stateMetaDevTools$.setState(new Map()))).not.toThrow();
    expect(badge.style.display).toBe('none');
  });
});
