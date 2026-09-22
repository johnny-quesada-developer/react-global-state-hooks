export interface TestFileSignals {
  testCount: number;
  assertionCount: number;
  assertionsPerTest: number;
  ownCodeMocks: string[];
  externalMocks: string[];
  stubsGlobals: boolean;
  restoresGlobals: boolean;
  usesFakeTimers: boolean;
  restoresTimers: boolean;
  restoresMocks: boolean;
}

export interface SignalFlag {
  flag: string;
  isBlocking: boolean;
  explanation: string;
}

const MODULE_MOCK = /\b(?:vi|jest)\.mock\(\s*['"]([^'"]+)['"]/g;
const OWN_CODE_SPECIFIER = /^(\.{1,2}\/|@\/|@src\/|src\/)/;
const countMatches = (content: string, pattern: RegExp) => content.match(pattern)?.length ?? 0;

export function inspectTestFile(content: string): TestFileSignals {
  const mockedModules = [...content.matchAll(MODULE_MOCK)].map((match) => match[1]);
  const testCount = countMatches(content, /\b(?:it|test)(?:\.each\([^)]*\))?\(\s*['"`]/g);
  const assertionCount = countMatches(content, /\bexpect(?:\.soft)?\(/g);

  return {
    testCount,
    assertionCount,
    assertionsPerTest: testCount === 0 ? 0 : Number((assertionCount / testCount).toFixed(1)),
    ownCodeMocks: mockedModules.filter((specifier) => OWN_CODE_SPECIFIER.test(specifier)),
    externalMocks: mockedModules.filter((specifier) => !OWN_CODE_SPECIFIER.test(specifier)),
    stubsGlobals: /\b(?:vi\.stubGlobal|globalThis\.\w+\s*=|global\.\w+\s*=|window\.\w+\s*=)/.test(content),
    restoresGlobals: /\bvi\.unstubAllGlobals\(|delete\s+(?:globalThis|global|window)\./.test(content),
    usesFakeTimers: /\b(?:vi|jest)\.useFakeTimers\(/.test(content),
    restoresTimers: /\b(?:vi|jest)\.useRealTimers\(/.test(content),
    restoresMocks:
      /\b(?:vi|jest)\.(?:restoreAllMocks|resetAllMocks|clearAllMocks)\(|mockRestore\(|cleanup\(/.test(
        content,
      ),
  };
}

export function flagSignals(signals: TestFileSignals): SignalFlag[] {
  const flags: (SignalFlag | false)[] = [
    signals.testCount === 0 && {
      flag: 'noTests',
      isBlocking: true,
      explanation: 'the test file has no runnable tests',
    },
    signals.stubsGlobals &&
      !signals.restoresGlobals && {
        flag: 'globalsNotRestored',
        isBlocking: true,
        explanation: 'globals are stubbed or assigned but never restored',
      },
    signals.usesFakeTimers &&
      !signals.restoresTimers && {
        flag: 'fakeTimersNotRestored',
        isBlocking: true,
        explanation: 'fake timers are enabled but real timers are never restored',
      },
    signals.ownCodeMocks.length > 0 && {
      flag: 'mocksOwnCode',
      isBlocking: false,
      explanation: `mocks project modules: ${signals.ownCodeMocks.join(', ')}`,
    },
    signals.testCount > 0 &&
      signals.assertionsPerTest < 1.5 && {
        flag: 'sparseTests',
        isBlocking: false,
        explanation: `${signals.testCount} tests with ${signals.assertionsPerTest} assertions each`,
      },
  ];
  return flags.filter((flag): flag is SignalFlag => Boolean(flag));
}
