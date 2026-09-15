import { NavItem, DATA_ITEM_ID } from './useListNavigation.types';
import { isNonNullable } from '../../asserts';
import { uniqueId } from 'react-global-state-hooks/uniqueId';

export const buildNavigationItems = <Item>(items: Item[], filter?: (item: Item, index: number) => boolean) => {
  const navigationItems: NavItem<Item>[] = [];

  let tabIndex = 0;

  for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
    const itemData = items[itemIndex];

    if (isNonNullable(filter) && filter(itemData, itemIndex) === true) {
      continue;
    }

    const itemId = uniqueId('nav-item:');

    navigationItems.push({
      value: itemData,
      key: itemId,
      props: {
        tabIndex,
        [DATA_ITEM_ID]: itemId,
      },
    });

    tabIndex += 1;
  }

  return navigationItems;
};

export const getNexIndex = <T>(args: {
  navigationItems: NavItem<T>[];
  selectedIndex: number;
  keyDirection: 1 | -1;
}): number => {
  const newIndex = args.selectedIndex + args.keyDirection;

  // if the direction is down and the index is the last one, return the first index
  if (newIndex >= args.navigationItems.length) return 0;

  // if the direction is up and the index is the first one, return the last index
  if (newIndex < 0) return args.navigationItems.length - 1;

  return newIndex;
};
