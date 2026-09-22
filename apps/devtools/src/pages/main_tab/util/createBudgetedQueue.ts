/**
 * Time-budgeted work queue.
 *
 * A producer can push items faster than the main thread can process + render them (e.g. a page in a
 * tight setState loop flooding the panel). Draining everything synchronously starves the thread so
 * clicks/scroll feel frozen. This queue spends up to `budgetMs` processing per cycle, then takes an
 * equal break (via setTimeout) to let the thread render and handle input, resuming after. Items are
 * always processed in FIFO order.
 *
 * Under normal traffic the first push drains within the initial budget, so there is no added
 * latency; the break only kicks in when work exceeds the budget.
 */
export type BudgetedQueue<T> = {
  push: (item: T) => void;
  /** Pending (not-yet-processed) item count. Exposed for tests/introspection. */
  size: () => number;
};

const budgetMs = 8;
const breakMs = budgetMs;

export const createBudgetedQueue = <T>(process: (item: T) => void): BudgetedQueue<T> => {
  const items: T[] = [];
  let budgetEnd = 0;
  let cycleEnd = 0;
  let resumeTimer: ReturnType<typeof setTimeout> | undefined;

  const drain = () => {
    const now = performance.now();

    // Previous work + break cycle finished: start a new one (budget window, then equal break).
    if (now >= cycleEnd) {
      budgetEnd = now + budgetMs;
      cycleEnd = now + budgetMs + breakMs;
    }

    // Process everything we can within the current budget window.
    while (items.length && performance.now() < budgetEnd) {
      process(items.shift()!);
    }

    if (!items.length || resumeTimer !== undefined) return;

    // Still items left and we're past the budget: resume when the next cycle can start.
    resumeTimer = setTimeout(
      () => {
        resumeTimer = undefined;
        drain();
      },
      Math.max(0, cycleEnd - performance.now()),
    );
  };

  return {
    push: (item: T) => {
      items.push(item);
      drain();
    },
    size: () => items.length,
  };
};
