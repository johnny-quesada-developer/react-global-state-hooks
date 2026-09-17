import { Annotation, END, START, StateGraph } from '@langchain/langgraph';

export interface SequentialLoop<TItem, TOutput> {
  run: (items: TItem[]) => Promise<TOutput[]>;
}

export function createSequentialLoop<TItem, TOutput>({
  name,
  processItem,
}: {
  name: string;
  processItem: (item: TItem, position: { index: number; total: number }) => Promise<TOutput>;
}): SequentialLoop<TItem, TOutput> {
  const LoopState = Annotation.Root({
    pending: Annotation<TItem[]>(),
    total: Annotation<number>(),
    completed: Annotation<TOutput[]>({ reducer: (current, next) => current.concat(next), default: () => [] }),
  });
  type State = typeof LoopState.State;

  const processNextItem = async ({ pending, total, completed }: State) => {
    const [nextItem, ...remaining] = pending;
    const output = await processItem(nextItem, { index: completed.length, total });
    return { pending: remaining, completed: [output] };
  };

  const hasPendingItems = ({ pending }: State) => (pending.length > 0 ? 'processNextItem' : END);

  const graph = new StateGraph(LoopState)
    .addNode('processNextItem', processNextItem)
    .addConditionalEdges(START, hasPendingItems, ['processNextItem', END])
    .addConditionalEdges('processNextItem', hasPendingItems, ['processNextItem', END])
    .compile({ name });

  return {
    async run(items) {
      const finalState = await graph.invoke(
        { pending: items, total: items.length },
        { recursionLimit: items.length * 2 + 10 },
      );
      return finalState.completed;
    },
  };
}
