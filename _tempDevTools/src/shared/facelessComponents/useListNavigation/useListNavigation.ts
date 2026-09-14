import React, { useEffect } from 'react';
import { NavItem, DATA_SELECTED, DATA_ITEM_ID } from './useListNavigation.types';
import { buildNavigationItems, getNexIndex } from './useListNavigation.utils';
import isNil from 'json-storage-formatter/isNil';
import isNumber from 'json-storage-formatter/isNumber';
import isString from 'json-storage-formatter/isString';
import { isFunction, isNonNullable } from '../../asserts';
import { tryCatch } from 'easy-cancelable-promise/tryCatch';
import { debounce } from '../../tools/debounce';
import useStableRef from '@src/pages/main_tab/hooks/useStableRef';

type ListNavigationArgs<Item> = {
  name?: string;
  items: Item[];
  containerRef: React.RefObject<HTMLElement | null>;
  onSelect?: (item: NavItem<Item>, index: number) => void;
  filter?: (item: Item, index: number) => boolean;
};

interface SelectItem<Item> {
  (index: number): void;
  (navKey: string): void;
  (callback: (items: NavItem<Item>[]) => number | string): void;
}

export const useListNavigation = <Item>(args: ListNavigationArgs<Item>, dependencies: unknown[]) => {
  const { items, containerRef, onSelect, filter } = args;

  const navigationRef = useStableRef(() => {
    const navigationItems = buildNavigationItems<Item>(items, filter);

    let selectedIndex = navigationItems.length ? 0 : -1;

    const getSelectedIndex = () => selectedIndex;

    const onSelectDebounced = isNonNullable(onSelect) ? debounce(onSelect, 0) : null;

    const selectItem: SelectItem<Item> = (setter) => {
      if (isNil(containerRef.current)) return;

      const targetIdentifier = isFunction(setter) ? setter(navigationItems) : setter;

      const targetItem =
        (() => {
          if (isString(targetIdentifier)) {
            return navigationItems.find((item) => item.key === targetIdentifier);
          }

          return navigationItems[targetIdentifier];
        })() ?? null;

      if (isNil(targetItem)) {
        console.warn(`Target ${isNumber(targetIdentifier) ? 'index' : 'key'}: ${targetIdentifier} not found...`);
        return;
      }

      const previousElement = containerRef.current.querySelector(`[${DATA_SELECTED}]`) as HTMLElement;
      previousElement?.removeAttribute(DATA_SELECTED);

      const selectedElement = containerRef.current.querySelector(
        `[${DATA_ITEM_ID}="${targetItem.props[DATA_ITEM_ID]}"]`
      ) as HTMLElement;

      selectedIndex = targetItem.props.tabIndex;
      selectedElement.setAttribute(DATA_SELECTED, 'true');
      selectedElement.scrollIntoView({
        behavior: 'smooth',
        block: 'end',
        inline: 'end',
      });

      tryCatch(() => onSelectDebounced?.(targetItem, selectedIndex));
    };

    return { navigationItems, selectItem, getSelectedIndex };
  }, dependencies);

  useClickHandler(args, navigationRef);
  useKeydownHandler(args, navigationRef);

  return navigationRef.current;
};

type Navigation<Item> = {
  navigationItems: NavItem<Item>[];
  selectItem: SelectItem<Item>;
  getSelectedIndex: () => number;
};

export const useClickHandler = <Item>(
  args: ListNavigationArgs<Item>,
  navigationRef: React.RefObject<Navigation<Item>>
) => {
  useEffect(() => {
    const containerElement = args.containerRef.current;
    if (isNil(containerElement)) return;

    const clickHandler = (event: MouseEvent) => {
      const element = (event.target as HTMLElement).closest(`[${DATA_ITEM_ID}]`) as HTMLElement;
      if (isNil(element)) return;

      const tabIndex = Number(element.getAttribute('tabIndex'));

      navigationRef.current!.selectItem(tabIndex);
    };

    containerElement.addEventListener('click', clickHandler);

    return () => {
      containerElement.removeEventListener('click', clickHandler);
    };
  }, [args.containerRef, navigationRef]);
};

export const useKeydownHandler = <Item>(
  args: ListNavigationArgs<Item>,
  navigationRef: React.RefObject<Navigation<Item>> | null
) => {
  useEffect(() => {
    if (isNil(navigationRef)) return;

    const containerElement = args.containerRef.current;
    if (isNil(containerElement)) return;

    const keydownHandler = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;

      const keyDirection = event.key === 'ArrowDown' ? 1 : -1;

      const selectedIndex = getNexIndex({
        navigationItems: navigationRef.current!.navigationItems,
        selectedIndex: navigationRef.current!.getSelectedIndex(),
        keyDirection,
      });

      navigationRef.current!.selectItem(selectedIndex);

      (containerElement.querySelector(`[${DATA_SELECTED}]`) as HTMLElement)?.focus();
    };

    containerElement.addEventListener('keydown', keydownHandler);

    return () => {
      containerElement.removeEventListener('keydown', keydownHandler);
    };
  }, [args.containerRef, navigationRef]);
};
