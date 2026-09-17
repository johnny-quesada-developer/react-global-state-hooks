import { Annotation, END, START, StateGraph } from '@langchain/langgraph';

export interface ConcurrentLoop<TItem, TOutput> {
  run: (items: TItem[]) => Promise<TOutput[]>;
}

interface Slot<TItem> {
  index: number;
  item: TItem;
}

export function pickWave<TItem>({
  pending,
  concurrency,
  canRunTogether,
}: {
  pending: Slot<TItem>[];
  concurrency: number;
  canRunTogether: (left: TItem, right: TItem) => boolean;
}): { wave: Slot<TItem>[]; remaining: Slot<TItem>[] } {
  const wave: Slot<TItem>[] = [];
  const remaining: Slot<TItem>[] = [];
  pending.forEach((slot) => {
    const hasRoom = wave.length < concurrency;
    const isCompatible = wave.every((member) => canRunTogether(member.item, slot.item));
    if (hasRoom && isCompatible) wave.push(slot);
    else remaining.push(slot);
  });
  return { wave, remaining };
}

export function createConcurrentLoop<TItem, TOutput>({
  name,
  concurrency,
  canRunTogether = () => true,
  processItem,
}: {
  name: string;
  concurrency: number;
  canRunTogether?: (left: TItem, right: TItem) => boolean;
  processItem: (item: TItem, position: { index: number; total: number }) => Promise<TOutput>;
}): ConcurrentLoop<TItem, TOutput> {
  const LoopState = Annotation.Root({
    pending: Annotation<Slot<TItem>[]>(),
    total: Annotation<number>(),
    completed: Annotation<Record<number, TOutput>>({
      reducer: (current, next) => ({ ...current, ...next }),
      default: () => ({}),
    }),
  });
  type State = typeof LoopState.State;

  const processWave = async ({ pending, total }: State) => {
    const { wave, remaining } = pickWave({ pending, concurrency, canRunTogether });
    const outputs = await Promise.all(wave.map(({ item, index }) => processItem(item, { index, total })));
    const completed = Object.fromEntries(wave.map(({ index }, position) => [index, outputs[position]]));
    return { pending: remaining, completed };
  };

  const hasPendingItems = ({ pending }: State) => (pending.length > 0 ? 'processWave' : END);

  const graph = new StateGraph(LoopState)
    .addNode('processWave', processWave)
    .addConditionalEdges(START, hasPendingItems, ['processWave', END])
    .addConditionalEdges('processWave', hasPendingItems, ['processWave', END])
    .compile({ name });

  return {
    async run(items) {
      const finalState = await graph.invoke(
        { pending: items.map((item, index) => ({ item, index })), total: items.length },
        { recursionLimit: items.length * 2 + 10 },
      );
      return items.map((_, index) => finalState.completed[index]);
    },
  };
}
