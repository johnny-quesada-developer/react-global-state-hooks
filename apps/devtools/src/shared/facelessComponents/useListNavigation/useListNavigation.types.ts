export const DATA_PREFIX = 'data-navigation';
export const DATA_ITEM_ID = `${DATA_PREFIX}-item-id`;
export const DATA_SELECTED = `${DATA_PREFIX}-selected`;

export type NavItemProps = {
  tabIndex: number;
  [DATA_ITEM_ID]: string;
  [DATA_SELECTED]?: boolean;
};

export type NavItem<Item> = {
  value: Item;
  key: string;
  props: NavItemProps;
};
