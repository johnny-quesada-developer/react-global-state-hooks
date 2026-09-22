import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  static OPEN = 1;
  readyState = 0;
  onopen: (() => void) | null = null;
  onclose: ((event: { code: number }) => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  constructor(public url: string) {
    FakeWebSocket.instances.push(this);
  }
  send = vi.fn();
  close = vi.fn();
  refuse() {
    this.onclose?.({ code: 1006 });
  }
  accept() {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.();
  }
  drop() {
    this.readyState = 3;
    this.onclose?.({ code: 1006 });
  }
}

const RETRY_MS = 100;

const load = async () => {
  vi.resetModules();
  const bridge = await import('../agentBridge');
  const { agentSettings$, agentStatus$ } = await import('../agentSettings');
  agentSettings$.setState({ enabled: true, port: 7787 });
  bridge.startAgentBridge({ retryMs: RETRY_MS });
  return { ...bridge, agentSettings$, agentStatus$ };
};

const dials = () => FakeWebSocket.instances.length;

describe('agent bridge dialing', () => {
  let warn: ReturnType<typeof vi.spyOn>;
  const added: Array<[EventTarget, string, EventListenerOrEventListenerObject]> = [];

  beforeEach(() => {
    for (const target of [window, document]) {
      const original = target.addEventListener.bind(target);
      vi.spyOn(target, 'addEventListener').mockImplementation((type, listener, options) => {
        added.push([target, type, listener]);
        original(type, listener, options);
      });
    }
    vi.useFakeTimers();
    FakeWebSocket.instances = [];
    vi.stubGlobal('WebSocket', FakeWebSocket);
    warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    for (const [target, type, listener] of added.splice(0)) target.removeEventListener(type, listener);
    vi.restoreAllMocks();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('gives up after two refused dials, goes idle and warns once', async () => {
    const { agentStatus$ } = await load();
    expect(dials()).toBe(1);

    FakeWebSocket.instances[0].refuse();
    expect(agentStatus$.getState()).toBe('waiting');
    await vi.advanceTimersByTimeAsync(RETRY_MS);
    expect(dials()).toBe(2);

    FakeWebSocket.instances[1].refuse();
    expect(agentStatus$.getState()).toBe('idle');
    expect(warn).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(60_000);
    expect(dials()).toBe(2);
  });

  it('dials once more when the panel regains focus while idle, without warning again', async () => {
    const { agentStatus$ } = await load();
    FakeWebSocket.instances[0].refuse();
    await vi.advanceTimersByTimeAsync(RETRY_MS);
    FakeWebSocket.instances[1].refuse();

    window.dispatchEvent(new Event('focus'));
    expect(dials()).toBe(3);

    FakeWebSocket.instances[2].refuse();
    expect(agentStatus$.getState()).toBe('idle');
    expect(warn).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new Event('focus'));
    FakeWebSocket.instances[3].accept();
    expect(agentStatus$.getState()).toBe('connected');
  });
});
