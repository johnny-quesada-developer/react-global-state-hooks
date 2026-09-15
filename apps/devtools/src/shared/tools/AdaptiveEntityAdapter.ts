import { EntityAdapter } from './EntityAdapter';

export type AdaptiveEntityAdapterOptions = {
  activationThreshold?: number;
  maxSize?: number;
};

// Sensible defaults for entity collection retention
const DEFAULT_ACTIVATION_THRESHOLD = 5000;
const DEFAULT_MAX_SIZE = 10000;

export type AdaptiveEntityAdapterSnapshot<Key extends string | number, Entity> = {
  entities?: Record<Key, Entity>;
  ids?: Key[];
  droppedCount?: number;
  retentionActive?: boolean;
};

export class AdaptiveEntityAdapter<Key extends string | number, Entity> extends EntityAdapter<Key, Entity> {
  public droppedCount: number;
  public retentionActive: boolean;

  private readonly activationThreshold: number;
  private readonly maxSize: number;

  constructor(
    entityWrapper: AdaptiveEntityAdapterSnapshot<Key, Entity> = {},
    options: AdaptiveEntityAdapterOptions = {}
  ) {
    super(entityWrapper);

    this.activationThreshold = options.activationThreshold ?? DEFAULT_ACTIVATION_THRESHOLD;
    this.maxSize = options.maxSize ?? DEFAULT_MAX_SIZE;
    this.droppedCount = entityWrapper.droppedCount ?? 0;
    this.retentionActive = entityWrapper.retentionActive ?? false;
  }

  append(key: Key, entity: Entity) {
    this.add(key, entity);

    const thresholdReached = !this.retentionActive && this.length >= this.activationThreshold;
    if (thresholdReached) {
      this.retentionActive = true;
    }

    const withinBounds = !this.retentionActive || this.length <= this.maxSize;
    if (withinBounds) {
      return this;
    }

    // Drop the oldest half in one shot: O(n) but amortized — only triggers once every maxSize/2 appends
    const dropCount = Math.floor(this.maxSize / 2);
    for (let index = 0; index < dropCount; index++) {
      delete this.entities[this.ids[index]];
    }
    this.ids = this.ids.slice(dropCount);
    this.droppedCount += dropCount;

    return this;
  }

  getBaseIndex() {
    return this.droppedCount;
  }
}

export default AdaptiveEntityAdapter;
