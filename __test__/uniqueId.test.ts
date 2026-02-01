/* eslint-disable @typescript-eslint/no-unused-vars */
import { uniqueId } from '..';
// import { uniqueId } from '../src';

declare const ItemBrand1: unique symbol;
declare const ItemBrand2: unique symbol;

it('should correctly generated branded unique IDs', () => {
  const ids = new Set<string>();

  // 1) Uniqueness + prefix check for base uniqueId()
  for (let i = 0; i < 50000; i++) {
    const id = uniqueId('test:');
    expect(id.startsWith('test:')).toBe(true);
    expect(ids.has(id)).toBe(false);
    ids.add(id);
  }

  // 2) Strict brands with same prefix but different brand symbols

  const generateId = uniqueId.for('item:').strict<typeof ItemBrand1>();
  const generateId2 = uniqueId.for('item:').strict<typeof ItemBrand2>();

  type ItemId = ReturnType<typeof generateId>;
  type ItemId2 = ReturnType<typeof generateId2>;

  const id1: ItemId2 = generateId2();
  const id2: ItemId = generateId();

  // ts should detect an error even if the structure is the same
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  const notAnId: ItemId = 'item:12345';

  // ts should detect an error cause the brands are different
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  const notAnId2: ItemId = generateId2();

  // 3) Different prefixes via .for()

  const generateId3 = uniqueId.for('item2:');
  const generateId4 = uniqueId.for('item4:');

  type ItemId3 = ReturnType<typeof generateId3>;
  type ItemId4 = ReturnType<typeof generateId4>;

  // ts should detect an error cause the prefixes/brands are different
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  const id3: ItemId3 = generateId4();

  // ts should detect an error cause the prefixes/brands are different
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  const id4: ItemId4 = generateId3();

  const generateId5SameStructure = uniqueId.for('item4:');

  // unfortunately we cannot detect this error as the structure is the same
  const id5: ItemId4 = generateId5SameStructure();

  // 4) `.of` + `.strict` interplay

  const generateId6 = uniqueId.of<'item4:'>();
  const generateId7 = uniqueId.strict<typeof ItemBrand1>();

  type Item6Id = ReturnType<typeof generateId6>;
  type Item7Id = ReturnType<typeof generateId7>;

  // ts should detect an error cause the brands are different
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  const id6: ItemId4 = generateId6();

  // ts should detect an error cause the prefixes/brands are different
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  const id7: ItemId3 = generateId6();

  // ts should detect an error cause the brands are different
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  const id8: Item7Id = generateId6();

  // ts should detect an error cause the brands are different
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  const id9: Item6Id = generateId7();

  // runtime sanity: all of these values are distinct strings
  const uniqueIds = [id1, id2, notAnId, notAnId2, id3, id4, id5, id6, id7, id8, id9];
  expect(new Set(uniqueIds).size).toBe(uniqueIds.length);
});
