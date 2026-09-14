export class EntityAdapter<Key extends string | number, Entity> {
  public entities: Record<Key, Entity>;
  public ids: Key[];

  declare add: (key: Key, entity: Entity) => EntityAdapter<Key, Entity>;

  declare get: (key: Key) => Entity;

  declare set: (key: Key, entity: Entity) => EntityAdapter<Key, Entity>;

  declare partialUpdate: (key: Key, entity: Partial<Entity>) => EntityAdapter<Key, Entity>;

  declare clear: () => EntityAdapter<Key, Entity>;

  declare elementAt: (index: number) => Entity;

  declare last: () => Entity;

  declare first: () => Entity;

  declare values: () => Entity[];

  declare entries: () => [Key, Entity][];

  declare has: (key: Key) => boolean;

  declare delete: (key: Key) => EntityAdapter<Key, Entity>;

  declare pop: (key?: Key) => Entity;

  declare readonly length: number;

  constructor(entityWrapper: { entities?: Record<Key, Entity>; ids?: Key[] } = {}) {
    this.entities = {
      ...((entityWrapper?.entities ?? {}) as Record<Key, Entity>),
    };

    this.ids = [...(entityWrapper?.ids ?? [])];
  }
}

EntityAdapter.prototype.add = function <Key extends string | number, Entity>(
  this: EntityAdapter<Key, Entity>,
  key: Key,
  entity: Entity
) {
  this.entities[key] = entity;
  this.ids = [...this.ids, key];

  return this;
};

EntityAdapter.prototype.get = function <Key extends string | number, Entity>(
  this: EntityAdapter<Key, Entity>,
  key: Key
) {
  return this.entities[key];
};

EntityAdapter.prototype.partialUpdate = function <Key extends string | number, Entity>(
  this: EntityAdapter<Key, Entity>,
  key: Key,
  entity: Partial<Entity>
) {
  const current = this.entities[key];

  if (entity && current) Object.assign(current, entity);

  return this;
};

EntityAdapter.prototype.clear = function <Key extends string | number, Entity>(this: EntityAdapter<Key, Entity>) {
  this.entities = {} as Record<Key, Entity>;
  this.ids = [];

  return this;
};

EntityAdapter.prototype.elementAt = function <Key extends string | number, Entity>(
  this: EntityAdapter<Key, Entity>,
  index: number
) {
  return this.entities[this.ids[index]];
};

EntityAdapter.prototype.last = function <Key extends string | number, Entity>(this: EntityAdapter<Key, Entity>) {
  return this.entities[this.ids[this.ids.length - 1]];
};

EntityAdapter.prototype.first = function <Key extends string | number, Entity>(this: EntityAdapter<Key, Entity>) {
  return this.entities[this.ids[0]];
};

EntityAdapter.prototype.values = function <Key extends string | number, Entity>(this: EntityAdapter<Key, Entity>) {
  const values: Entity[] = [];

  for (let i = 0; i < this.ids.length; i++) {
    values.push(this.entities[this.ids[i]]);
  }

  return values;
};

EntityAdapter.prototype.entries = function <Key extends string | number, Entity>(this: EntityAdapter<Key, Entity>) {
  const entries: [Key, Entity][] = [];

  for (let i = 0; i < this.ids.length; i++) {
    entries.push([this.ids[i], this.entities[this.ids[i]]]);
  }

  return entries;
};

EntityAdapter.prototype.set = function <Key extends string | number, Entity>(
  this: EntityAdapter<Key, Entity>,
  key: Key,
  entity: Entity
) {
  this.entities[key] = entity;

  return this;
};

EntityAdapter.prototype.has = function <Key extends string | number, Entity>(
  this: EntityAdapter<Key, Entity>,
  key: Key
) {
  return this.ids.includes(key);
};

EntityAdapter.prototype.delete = function <Key extends string | number, Entity>(
  this: EntityAdapter<Key, Entity>,
  key: Key
) {
  delete this.entities[key];

  this.ids = this.ids.filter((id) => id !== key);

  return this;
};

EntityAdapter.prototype.pop = function <Key extends string | number, Entity>(
  this: EntityAdapter<Key, Entity>,
  key?: Key
): Entity | null {
  if (key) {
    const entity = this.last();

    this.delete(key);
    return entity;
  }

  const entity = this.last();
  if (!entity) return null;

  const lastKey = this.ids[this.ids.length - 1]!;
  this.delete(lastKey!);

  return entity;
};

Object.defineProperty(EntityAdapter.prototype, 'length', {
  get: function () {
    return this.ids.length;
  },
  set: function () {},
});
