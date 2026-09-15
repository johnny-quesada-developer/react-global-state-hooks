import { transformEntities, normalizeExampleLogs } from './useGlobalStates.mocks.tools';

const devToolsExampleRaw = {
  entities: {
    m1fjn9anwy6hn: {
      globalStateId: 'm1fjn9anwy6hn',
      actions: {
        'content_script/DEV_TOOLS/CLEAR_GLOBAL_STATES': { length: 1 },
        'content_script/DEV_TOOLS/ADD_GLOBAL_STATE': { length: 1 },
        'content_script/DEV_TOOLS/START_ACTION': { length: 1 },
        'content_script/DEV_TOOLS/UPDATE_ACTION': { length: 1 },
        'content_script/DEV_TOOLS/ADD_ACTION_LOG': { length: 1 },
        'content_script/DEV_TOOLS/DELETE_GLOBAL_STATE': { length: 1 },
      },
      name: 'globalStates',
      metadata: { name: 'globalStates' },
      callbacks: { onStateChanged: { __non_serializable__: 'function' } },
      initialState: {
        entities: {
          '0': {
            globalStateId: '0',
            name: 'some state',
            metadata: { isLoading: false },
            localStorage: { key: 'some-key' },
            actions: { someMethod: { length: 1 }, someMethod2: { length: 2 } },
            config: {},
            initialState: 0,
            currentState: 0,
            hooks: { entities: {}, ids: [] },
            groupedByActionStateLogs: {
              entities: {
                '6': {
                  actionId: '8',
                  globalStateId: '1',
                  action: '__setState',
                  async: false,
                  start: 1631525890000,
                  timing: 0,
                  logs: [
                    {
                      logId: '9',
                      actionId: '8',
                      globalStateId: '0',
                      payload: 2,
                      case: 'resolved',
                      action: '__setState',
                    },
                  ],
                },
                '7': {
                  actionId: '0',
                  globalStateId: '1',
                  action: '__initialize',
                  async: false,
                  start: 1631525890000,
                  timing: 0,
                  logs: [
                    { logId: '2', actionId: '0', globalStateId: '1', payload: 1, case: 'resolved' },
                    { logId: '3', actionId: '0', globalStateId: '1', payload: 2, case: 'resolved' },
                  ],
                },
              },
              ids: ['6', '7'],
            },
          },
          '1': {
            globalStateId: '1',
            name: 'Contacts',
            metadata: { name: 'Contacts' },
            localStorage: null,
            actions: {
              addContact: { length: 1 },
              removeContact: { length: 1 },
              updateContact: { length: 1 },
              clean: { length: 0 },
            },
            config: {},
            initialState: {},
            currentState: {
              filter: '',
              contacts: [
                { id: '0', name: 'Peter Parker', email: '' },
                { id: '1', name: 'Mary Jane', email: '' },
              ],
            },
            groupedByActionStateLogs: {
              entities: {
                '0': {
                  actionId: '0',
                  globalStateId: '1',
                  action: '__initialize',
                  async: false,
                  start: 1631525890000,
                  timing: 0,
                  logs: [
                    {
                      logId: '0',
                      actionId: '0',
                      globalStateId: '1',
                      payload: {
                        filter: '',
                        contacts: [
                          { id: '0', name: 'Peter Parker', email: '' },
                          { id: '1', name: 'Mary Jane', email: '' },
                        ],
                      },
                      case: 'resolved',
                    },
                  ],
                },
                '1': {
                  actionId: '0',
                  globalStateId: '1',
                  action: '__setState',
                  async: false,
                  start: 1631525890000,
                  timing: 0,
                  logs: [
                    {
                      logId: '2',
                      actionId: '0',
                      globalStateId: '1',
                      payload: {
                        filter: '',
                        contacts: [
                          { id: '0', name: 'John Doe', email: '' },
                          { id: '1', name: 'Jane Doe', email: '' },
                        ],
                      },
                      case: 'resolved',
                    },
                  ],
                },
              },
              ids: ['0', '1'],
            },
            hooks: { entities: {}, ids: [] },
          },
        },
        ids: ['0', '1'],
      },
      groupedByActionStateLogs: {
        entities: {
          m1fjnehb2sw30: {
            globalStateId: 'm1fjn9anwy6hn',
            actionId: 'm1fjnehb2sw30',
            action: '__initialize',
            async: false,
            start: 1727128389647,
            timing: 0,
            logs: [
              {
                logId: 'm1fjnehbpg7en',
                globalStateId: 'm1fjn9anwy6hn',
                actionId: 'm1fjnehb2sw30',
                payload: {
                  entities: {
                    '0': {
                      globalStateId: '0',
                      name: 'some state',
                      metadata: { isLoading: false },
                      localStorage: { key: 'some-key' },
                      actions: { someMethod: { length: 1 }, someMethod2: { length: 2 } },
                      config: {},
                      initialState: 0,
                      currentState: 0,
                      hooks: { entities: {}, ids: [] },
                      groupedByActionStateLogs: {
                        entities: {
                          '6': {
                            actionId: '8',
                            globalStateId: '1',
                            action: '__setState',
                            async: false,
                            start: 1631525890000,
                            timing: 0,
                            logs: [
                              {
                                logId: '9',
                                actionId: '8',
                                globalStateId: '0',
                                payload: 2,
                                case: 'resolved',
                                action: '__setState',
                              },
                            ],
                          },
                          '7': {
                            actionId: '0',
                            globalStateId: '1',
                            action: '__initialize',
                            async: false,
                            start: 1631525890000,
                            timing: 0,
                            logs: [
                              { logId: '2', actionId: '0', globalStateId: '1', payload: 1, case: 'resolved' },
                              { logId: '3', actionId: '0', globalStateId: '1', payload: 2, case: 'resolved' },
                            ],
                          },
                        },
                        ids: ['6', '7'],
                      },
                    },
                    '1': {
                      globalStateId: '1',
                      name: 'Contacts',
                      metadata: { name: 'Contacts' },
                      localStorage: null,
                      actions: {
                        addContact: { length: 1 },
                        removeContact: { length: 1 },
                        updateContact: { length: 1 },
                        clean: { length: 0 },
                      },
                      config: {},
                      initialState: {},
                      currentState: {
                        filter: '',
                        contacts: [
                          { id: '0', name: 'Peter Parker', email: '' },
                          { id: '1', name: 'Mary Jane', email: '' },
                        ],
                      },
                      groupedByActionStateLogs: {
                        entities: {
                          '0': {
                            actionId: '0',
                            globalStateId: '1',
                            action: '__initialize',
                            async: false,
                            start: 1631525890000,
                            timing: 0,
                            logs: [
                              {
                                logId: '0',
                                actionId: '0',
                                globalStateId: '1',
                                payload: {
                                  filter: '',
                                  contacts: [
                                    { id: '0', name: 'Peter Parker', email: '' },
                                    { id: '1', name: 'Mary Jane', email: '' },
                                  ],
                                },
                                case: 'resolved',
                              },
                            ],
                          },
                          '1': {
                            actionId: '0',
                            globalStateId: '1',
                            action: '__setState',
                            async: false,
                            start: 1631525890000,
                            timing: 0,
                            logs: [
                              {
                                logId: '2',
                                actionId: '0',
                                globalStateId: '1',
                                payload: {
                                  filter: '',
                                  contacts: [
                                    { id: '0', name: 'John Doe', email: '' },
                                    { id: '1', name: 'Jane Doe', email: '' },
                                  ],
                                },
                                case: 'resolved',
                              },
                            ],
                          },
                        },
                        ids: ['0', '1'],
                      },
                      hooks: { entities: {}, ids: [] },
                    },
                  },
                  ids: ['0', '1'],
                },
                case: 'resolved',
              },
            ],
          },
        },
        ids: ['m1fjnehb2sw30'],
      },
      hooks: { entities: {}, ids: [] },
      currentState: {
        entities: {
          '0': {
            globalStateId: '0',
            name: 'some state',
            metadata: { isLoading: false },
            localStorage: { key: 'some-key' },
            actions: { someMethod: { length: 1 }, someMethod2: { length: 2 } },
            config: {},
            initialState: 0,
            currentState: 0,
            hooks: { entities: {}, ids: [] },
            groupedByActionStateLogs: {
              entities: {
                '6': {
                  actionId: '8',
                  globalStateId: '1',
                  action: '__setState',
                  async: false,
                  start: 1631525890000,
                  timing: 0,
                  logs: [
                    {
                      logId: '9',
                      actionId: '8',
                      globalStateId: '0',
                      payload: 2,
                      case: 'resolved',
                      action: '__setState',
                    },
                  ],
                },
                '7': {
                  actionId: '0',
                  globalStateId: '1',
                  action: '__initialize',
                  async: false,
                  start: 1631525890000,
                  timing: 0,
                  logs: [
                    { logId: '2', actionId: '0', globalStateId: '1', payload: 1, case: 'resolved' },
                    { logId: '3', actionId: '0', globalStateId: '1', payload: 2, case: 'resolved' },
                  ],
                },
              },
              ids: ['6', '7'],
            },
          },
          '1': {
            globalStateId: '1',
            name: 'Contacts',
            metadata: { name: 'Contacts' },
            localStorage: null,
            actions: {
              addContact: { length: 1 },
              removeContact: { length: 1 },
              updateContact: { length: 1 },
              clean: { length: 0 },
            },
            config: {},
            initialState: {},
            currentState: {
              filter: '',
              contacts: [
                { id: '0', name: 'Peter Parker', email: '' },
                { id: '1', name: 'Mary Jane', email: '' },
              ],
            },
            groupedByActionStateLogs: {
              entities: {
                '0': {
                  actionId: '0',
                  globalStateId: '1',
                  action: '__initialize',
                  async: false,
                  start: 1631525890000,
                  timing: 0,
                  logs: [
                    {
                      logId: '0',
                      actionId: '0',
                      globalStateId: '1',
                      payload: {
                        filter: '',
                        contacts: [
                          { id: '0', name: 'Peter Parker', email: '' },
                          { id: '1', name: 'Mary Jane', email: '' },
                        ],
                      },
                      case: 'resolved',
                    },
                  ],
                },
                '1': {
                  actionId: '0',
                  globalStateId: '1',
                  action: '__setState',
                  async: false,
                  start: 1631525890000,
                  timing: 0,
                  logs: [
                    {
                      logId: '2',
                      actionId: '0',
                      globalStateId: '1',
                      payload: {
                        filter: '',
                        contacts: [
                          { id: '0', name: 'John Doe', email: '' },
                          { id: '1', name: 'Jane Doe', email: '' },
                        ],
                      },
                      case: 'resolved',
                    },
                  ],
                },
              },
              ids: ['0', '1'],
            },
            hooks: { entities: {}, ids: [] },
          },
        },
        ids: ['0', '1'],
      },
    },
    m1fjn9ayx8scl: {
      globalStateId: 'm1fjn9ayx8scl',
      actions: {},
      name: 'unknown',
      metadata: null,
      config: {},
      initialState: ['0', '1'],
      groupedByActionStateLogs: {
        entities: {
          m1fjnemsqzjm5: {
            globalStateId: 'm1fjn9ayx8scl',
            actionId: 'm1fjnemsqzjm5',
            action: '__initialize',
            async: false,
            start: 1727128389844,
            timing: 0,
            logs: [
              {
                logId: 'm1fjnems6y41n',
                globalStateId: 'm1fjn9ayx8scl',
                actionId: 'm1fjnemsqzjm5',
                payload: ['0', '1'],
                case: 'resolved',
              },
            ],
          },
        },
        ids: ['m1fjnemsqzjm5'],
      },
      hooks: { entities: {}, ids: [] },
      currentState: ['0', '1'],
    },
    m1fjn9azsbjf9: {
      globalStateId: 'm1fjn9azsbjf9',
      name: 'selectedState',
      metadata: { name: 'selectedState' },
      actions: {},
      config: { onInit: { __non_serializable__: 'function' } },
      initialState: null,
      hooks: { entities: {}, ids: [] },
      groupedByActionStateLogs: {
        entities: {
          m1fjnerqu5r3y: {
            globalStateId: 'm1fjn9azsbjf9',
            actionId: 'm1fjnerqu5r3y',
            action: '__initialize',
            async: false,
            start: 1727128390022,
            timing: 0,
            logs: [
              {
                logId: 'm1fjnerqm6vs8',
                globalStateId: 'm1fjn9azsbjf9',
                actionId: 'm1fjnerqu5r3y',
                payload: null,
                case: 'resolved',
              },
            ],
          },
          m1fjn9dawszu5: {
            actionId: 'm1fjn9dawszu5',
            globalStateId: 'm1fjn9azsbjf9',
            action: '__setState',
            async: false,
            start: 1727128383022,
            timing: 0,
            logs: [
              {
                logId: 'm1fjn9dacgapa',
                payload: '0',
                case: 'resolved',
                setStateConfig: {},
                actionId: 'm1fjn9dawszu5',
                globalStateId: 'm1fjn9azsbjf9',
              },
            ],
          },
          m1fjorjck1vj7: {
            actionId: 'm1fjorjck1vj7',
            globalStateId: 'm1fjn9azsbjf9',
            action: '__setState',
            async: false,
            start: 1727128453224,
            timing: 0,
            logs: [
              {
                logId: 'm1fjorjcp8xev',
                payload: '1',
                case: 'resolved',
                setStateConfig: {},
                actionId: 'm1fjorjck1vj7',
                globalStateId: 'm1fjn9azsbjf9',
              },
            ],
          },
          m1fjos5kt7sdy: {
            actionId: 'm1fjos5kt7sdy',
            globalStateId: 'm1fjn9azsbjf9',
            action: '__setState',
            async: false,
            start: 1727128454024,
            timing: 0,
            logs: [
              {
                logId: 'm1fjos5jbls8y',
                payload: '0',
                case: 'resolved',
                setStateConfig: {},
                actionId: 'm1fjos5kt7sdy',
                globalStateId: 'm1fjn9azsbjf9',
              },
            ],
          },
          m1fjoso26llb1: {
            actionId: 'm1fjoso26llb1',
            globalStateId: 'm1fjn9azsbjf9',
            action: '__setState',
            async: false,
            start: 1727128454690,
            timing: 0,
            logs: [
              {
                logId: 'm1fjoso21jcm2',
                payload: '1',
                case: 'resolved',
                setStateConfig: {},
                actionId: 'm1fjoso26llb1',
                globalStateId: 'm1fjn9azsbjf9',
              },
            ],
          },
          m1fjot9de6d26: {
            actionId: 'm1fjot9de6d26',
            globalStateId: 'm1fjn9azsbjf9',
            action: '__setState',
            async: false,
            start: 1727128455457,
            timing: 0,
            logs: [
              {
                logId: 'm1fjot9d92xm2',
                payload: '0',
                case: 'resolved',
                setStateConfig: {},
                actionId: 'm1fjot9de6d26',
                globalStateId: 'm1fjn9azsbjf9',
              },
            ],
          },
          m1fjotxyh3nmi: {
            actionId: 'm1fjotxyh3nmi',
            globalStateId: 'm1fjn9azsbjf9',
            action: '__setState',
            async: false,
            start: 1727128456342,
            timing: 0,
            logs: [
              {
                logId: 'm1fjotxyl05ld',
                payload: '1',
                case: 'resolved',
                setStateConfig: {},
                actionId: 'm1fjotxyh3nmi',
                globalStateId: 'm1fjn9azsbjf9',
              },
            ],
          },
          m1fjoujobkcrs: {
            actionId: 'm1fjoujobkcrs',
            globalStateId: 'm1fjn9azsbjf9',
            action: '__setState',
            async: false,
            start: 1727128457124,
            timing: 0,
            logs: [
              {
                logId: 'm1fjoujocqgrg',
                payload: '0',
                case: 'resolved',
                setStateConfig: {},
                actionId: 'm1fjoujobkcrs',
                globalStateId: 'm1fjn9azsbjf9',
              },
            ],
          },
        },
        ids: [
          'm1fjnerqu5r3y',
          'm1fjn9dawszu5',
          'm1fjorjck1vj7',
          'm1fjos5kt7sdy',
          'm1fjoso26llb1',
          'm1fjot9de6d26',
          'm1fjotxyh3nmi',
          'm1fjoujobkcrs',
        ],
      },
      currentState: '0',
    },
    m1fjn9azq0dm9: {
      globalStateId: 'm1fjn9azq0dm9',
      actions: {},
      name: 'selectedMainTab',
      metadata: { name: 'selectedMainTab' },
      callbacks: { onInit: { __non_serializable__: 'function' } },
      initialState: 'logs',
      groupedByActionStateLogs: {
        entities: {
          m1fjnewyztp8j: {
            globalStateId: 'm1fjn9azq0dm9',
            actionId: 'm1fjnewyztp8j',
            action: '__initialize',
            async: false,
            start: 1727128390210,
            timing: 0,
            logs: [
              {
                logId: 'm1fjnewylzy0l',
                globalStateId: 'm1fjn9azq0dm9',
                actionId: 'm1fjnewyztp8j',
                payload: 'logs',
                case: 'resolved',
              },
            ],
          },
        },
        ids: ['m1fjnewyztp8j'],
      },
      hooks: { entities: {}, ids: [] },
      currentState: 'logs',
    },
    m1fjn9b03rctx: {
      globalStateId: 'm1fjn9b03rctx',
      actions: {},
      name: 'logsFilter',
      metadata: { name: 'logsFilter' },
      callbacks: { onInit: { __non_serializable__: 'function' } },
      initialState: '',
      groupedByActionStateLogs: {
        entities: {
          m1fjnf31c8muq: {
            globalStateId: 'm1fjn9b03rctx',
            actionId: 'm1fjnf31c8muq',
            action: '__initialize',
            async: false,
            start: 1727128390429,
            timing: 0,
            logs: [
              {
                logId: 'm1fjnf314l81h',
                globalStateId: 'm1fjn9b03rctx',
                actionId: 'm1fjnf31c8muq',
                payload: '',
                case: 'resolved',
              },
            ],
          },
        },
        ids: ['m1fjnf31c8muq'],
      },
      hooks: { entities: {}, ids: [] },
      currentState: '',
    },
    m1fjn9b0fmgyc: {
      globalStateId: 'm1fjn9b0fmgyc',
      name: 'selectedLogs',
      metadata: { name: 'selectedLogs' },
      actions: {},
      callbacks: { onInit: { __non_serializable__: 'function' } },
      initialState: { previousLog: null, currentLog: null },
      hooks: { entities: {}, ids: [] },
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      groupedByActionStateLogs: {
        entities: {
          m1fjnf8mmpq4g: {
            globalStateId: 'm1fjn9b0fmgyc',
            actionId: 'm1fjnf8mmpq4g',
            action: '__initialize',
            async: false,
            start: 1727128390630,
            timing: 0,
            logs: [
              {
                logId: 'm1fjnf8mh053s',
                globalStateId: 'm1fjn9b0fmgyc',
                actionId: 'm1fjnf8mmpq4g',
                payload: { previousLog: null, currentLog: null },
                case: 'resolved',
              },
            ],
          },
          m1fjn9e2xz122: {
            actionId: 'm1fjn9e2xz122',
            globalStateId: 'm1fjn9b0fmgyc',
            action: '__setState',
            async: false,
            start: 1727128383050,
            timing: 0,
            logs: [
              {
                logId: 'm1fjn9e2li04y',
                payload: { previousLog: null, currentLog: null },
                case: 'resolved',
                setStateConfig: {},
                actionId: 'm1fjn9e2xz122',
                globalStateId: 'm1fjn9b0fmgyc',
              },
            ],
          },
          m1fjn9e2lmtui: {
            actionId: 'm1fjn9e2lmtui',
            globalStateId: 'm1fjn9b0fmgyc',
            action: '__setState',
            async: false,
            start: 1727128383050,
            timing: 0,
            logs: [
              {
                logId: 'm1fjn9e27sf56',
                payload: { previousLog: null, currentLog: null },
                case: 'resolved',
                setStateConfig: {},
                actionId: 'm1fjn9e2lmtui',
                globalStateId: 'm1fjn9b0fmgyc',
              },
            ],
          },
          m1fjn9gx5qg5u: {
            actionId: 'm1fjn9gx5qg5u',
            globalStateId: 'm1fjn9b0fmgyc',
            action: '__setState',
            async: false,
            start: 1727128383153,
            timing: 0,
            logs: [
              {
                logId: 'm1fjn9gxteh8w',
                payload: {
                  previousLog: {
                    logId: '2',
                    actionId: '0',
                    globalStateId: '1',
                    payload: 1,
                    case: 'resolved',
                    action: '__initialize',
                    state: 1,
                  },
                  currentLog: {
                    logId: '3',
                    actionId: '0',
                    globalStateId: '1',
                    payload: 2,
                    case: 'resolved',
                    action: '__initialize',
                    state: 2,
                  },
                },
                case: 'resolved',
                setStateConfig: {},
                actionId: 'm1fjn9gx5qg5u',
                globalStateId: 'm1fjn9b0fmgyc',
              },
            ],
          },
          m1fjork08ho6o: {
            actionId: 'm1fjork08ho6o',
            globalStateId: 'm1fjn9b0fmgyc',
            action: '__setState',
            async: false,
            start: 1727128453248,
            timing: 0,
            logs: [
              {
                logId: 'm1fjork0wyoxs',
                payload: { previousLog: null, currentLog: null },
                case: 'resolved',
                setStateConfig: {},
                actionId: 'm1fjork08ho6o',
                globalStateId: 'm1fjn9b0fmgyc',
              },
            ],
          },
          m1fjornf0kk23: {
            actionId: 'm1fjornf0kk23',
            globalStateId: 'm1fjn9b0fmgyc',
            action: '__setState',
            async: false,
            start: 1727128453371,
            timing: 0,
            logs: [
              {
                logId: 'm1fjorne0jmkg',
                case: 'resolved',
                setStateConfig: {},
                actionId: 'm1fjornf0kk23',
                globalStateId: 'm1fjn9b0fmgyc',
              },
            ],
          },
          m1fjos5sevfd1: {
            actionId: 'm1fjos5sevfd1',
            globalStateId: 'm1fjn9b0fmgyc',
            action: '__setState',
            async: false,
            start: 1727128454032,
            timing: 0,
            logs: [
              {
                logId: 'm1fjos5rdtd9a',
                payload: { previousLog: null, currentLog: null },
                case: 'resolved',
                setStateConfig: {},
                actionId: 'm1fjos5sevfd1',
                globalStateId: 'm1fjn9b0fmgyc',
              },
            ],
          },
          m1fjos8rj67cf: {
            actionId: 'm1fjos8rj67cf',
            globalStateId: 'm1fjn9b0fmgyc',
            action: '__setState',
            async: false,
            start: 1727128454139,
            timing: 0,
            logs: [
              {
                logId: 'm1fjos8rbvke9',
                payload: {
                  previousLog: {
                    logId: '2',
                    actionId: '0',
                    globalStateId: '1',
                    payload: 1,
                    case: 'resolved',
                    action: '__initialize',
                    state: 1,
                  },
                  currentLog: {
                    logId: '3',
                    actionId: '0',
                    globalStateId: '1',
                    payload: 2,
                    case: 'resolved',
                    action: '__initialize',
                    state: 2,
                  },
                },
                case: 'resolved',
                setStateConfig: {},
                actionId: 'm1fjos8rj67cf',
                globalStateId: 'm1fjn9b0fmgyc',
              },
            ],
          },
          m1fjosoflqi9y: {
            actionId: 'm1fjosoflqi9y',
            globalStateId: 'm1fjn9b0fmgyc',
            action: '__setState',
            async: false,
            start: 1727128454703,
            timing: 0,
            logs: [
              {
                logId: 'm1fjosofg0jva',
                payload: { previousLog: null, currentLog: null },
                case: 'resolved',
                setStateConfig: {},
                actionId: 'm1fjosoflqi9y',
                globalStateId: 'm1fjn9b0fmgyc',
              },
            ],
          },
          m1fjosrgwt08r: {
            actionId: 'm1fjosrgwt08r',
            globalStateId: 'm1fjn9b0fmgyc',
            action: '__setState',
            async: false,
            start: 1727128454812,
            timing: 0,
            logs: [
              {
                logId: 'm1fjosrg9l3vl',
                case: 'resolved',
                setStateConfig: {},
                actionId: 'm1fjosrgwt08r',
                globalStateId: 'm1fjn9b0fmgyc',
              },
            ],
          },
          m1fjot9k8dxr4: {
            actionId: 'm1fjot9k8dxr4',
            globalStateId: 'm1fjn9b0fmgyc',
            action: '__setState',
            async: false,
            start: 1727128455464,
            timing: 0,
            logs: [
              {
                logId: 'm1fjot9kipuqd',
                payload: { previousLog: null, currentLog: null },
                case: 'resolved',
                setStateConfig: {},
                actionId: 'm1fjot9k8dxr4',
                globalStateId: 'm1fjn9b0fmgyc',
              },
            ],
          },
          m1fjotcj0fdju: {
            actionId: 'm1fjotcj0fdju',
            globalStateId: 'm1fjn9b0fmgyc',
            action: '__setState',
            async: false,
            start: 1727128455571,
            timing: 0,
            logs: [
              {
                logId: 'm1fjotcjwhx3k',
                payload: {
                  previousLog: {
                    logId: '2',
                    actionId: '0',
                    globalStateId: '1',
                    payload: 1,
                    case: 'resolved',
                    action: '__initialize',
                    state: 1,
                  },
                  currentLog: {
                    logId: '3',
                    actionId: '0',
                    globalStateId: '1',
                    payload: 2,
                    case: 'resolved',
                    action: '__initialize',
                    state: 2,
                  },
                },
                case: 'resolved',
                setStateConfig: {},
                actionId: 'm1fjotcj0fdju',
                globalStateId: 'm1fjn9b0fmgyc',
              },
            ],
          },
          m1fjotyez2s8o: {
            actionId: 'm1fjotyez2s8o',
            globalStateId: 'm1fjn9b0fmgyc',
            action: '__setState',
            async: false,
            start: 1727128456358,
            timing: 0,
            logs: [
              {
                logId: 'm1fjotye5sd8t',
                payload: { previousLog: null, currentLog: null },
                case: 'resolved',
                setStateConfig: {},
                actionId: 'm1fjotyez2s8o',
                globalStateId: 'm1fjn9b0fmgyc',
              },
            ],
          },
          m1fjou27zirqv: {
            actionId: 'm1fjou27zirqv',
            globalStateId: 'm1fjn9b0fmgyc',
            action: '__setState',
            async: false,
            start: 1727128456495,
            timing: 0,
            logs: [
              {
                logId: 'm1fjou278tgr1',
                case: 'resolved',
                setStateConfig: {},
                actionId: 'm1fjou27zirqv',
                globalStateId: 'm1fjn9b0fmgyc',
              },
            ],
          },
          m1fjoujvnnn6h: {
            actionId: 'm1fjoujvnnn6h',
            globalStateId: 'm1fjn9b0fmgyc',
            action: '__setState',
            async: false,
            start: 1727128457131,
            timing: 0,
            logs: [
              {
                logId: 'm1fjoujvyt3wa',
                payload: { previousLog: null, currentLog: null },
                case: 'resolved',
                setStateConfig: {},
                actionId: 'm1fjoujvnnn6h',
                globalStateId: 'm1fjn9b0fmgyc',
              },
            ],
          },
          m1fjoumv65u2o: {
            actionId: 'm1fjoumv65u2o',
            globalStateId: 'm1fjn9b0fmgyc',
            action: '__setState',
            async: false,
            start: 1727128457239,
            timing: 0,
            logs: [
              {
                logId: 'm1fjoumvjz0gr',
                payload: {
                  previousLog: {
                    logId: '2',
                    actionId: '0',
                    globalStateId: '1',
                    payload: 1,
                    case: 'resolved',
                    action: '__initialize',
                    state: 1,
                  },
                  currentLog: {
                    logId: '3',
                    actionId: '0',
                    globalStateId: '1',
                    payload: 2,
                    case: 'resolved',
                    action: '__initialize',
                    state: 2,
                  },
                },
                case: 'resolved',
                setStateConfig: {},
                actionId: 'm1fjoumv65u2o',
                globalStateId: 'm1fjn9b0fmgyc',
              },
            ],
          },
        },
        ids: [
          'm1fjnf8mmpq4g',
          'm1fjn9e2xz122',
          'm1fjn9e2lmtui',
          'm1fjn9gx5qg5u',
          'm1fjork08ho6o',
          'm1fjornf0kk23',
          'm1fjos5sevfd1',
          'm1fjos8rj67cf',
          'm1fjosoflqi9y',
          'm1fjosrgwt08r',
          'm1fjot9k8dxr4',
          'm1fjotcj0fdju',
          'm1fjotyez2s8o',
          'm1fjou27zirqv',
          'm1fjoujvnnn6h',
          'm1fjoumv65u2o',
        ],
      },
      currentState: {
        previousLog: {
          logId: '2',
          actionId: '0',
          globalStateId: '1',
          payload: 1,
          case: 'resolved',
          action: '__initialize',
          state: 1,
        },
        currentLog: {
          logId: '3',
          actionId: '0',
          globalStateId: '1',
          payload: 2,
          case: 'resolved',
          action: '__initialize',
          state: 2,
        },
      },
    },
    m1fjn9bzazlri: {
      globalStateId: 'm1fjn9bzazlri',
      actions: {},
      name: 'mainTabContext',
      metadata: { name: 'mainTabContext' },
      config: { onInit: { __non_serializable__: 'function' } },
      initialState: { buildType: 'production' },
      groupedByActionStateLogs: {
        entities: {
          m1fjnfevq70gi: {
            globalStateId: 'm1fjn9bzazlri',
            actionId: 'm1fjnfevq70gi',
            action: '__initialize',
            async: false,
            start: 1727128390855,
            timing: 0,
            logs: [
              {
                logId: 'm1fjnfev1xt50',
                globalStateId: 'm1fjn9bzazlri',
                actionId: 'm1fjnfevq70gi',
                payload: { buildType: 'production' },
                case: 'resolved',
              },
            ],
          },
        },
        ids: ['m1fjnfevq70gi'],
      },
      hooks: { entities: {}, ids: [] },
      currentState: { buildType: 'production' },
    },
  },
  ids: [
    'm1fjn9anwy6hn',
    'm1fjn9ayx8scl',
    'm1fjn9azsbjf9',
    'm1fjn9azq0dm9',
    'm1fjn9b03rctx',
    'm1fjn9b0fmgyc',
    'm1fjn9bzazlri',
  ],
};

// Backfill subAction/timestamp/scope/actionType so the (older) devtools fixture
// renders follow-up states instead of pinning every log to the initial state.
export const devToolsExample = normalizeExampleLogs(devToolsExampleRaw);

export const todoListExample = {
  entities: {
    m1mkagw98kfas: {
      globalStateId: 'm1mkagw98kfas',
      name: 'todos',
      metadata: { isLoading: true, name: 'todos' },
      actions: { addOne: { length: 1 }, updateOne: { length: 1 }, remove: { length: 1 } },
      config: {
        actions: {
          addOne: { __non_serializable__: 'function' },
          updateOne: { __non_serializable__: 'function' },
          remove: { __non_serializable__: 'function' },
        },
        onInit: { __non_serializable__: 'function' },
      },
      initialState: { todos: { $t: 'map', $v: [] }, ui_sort: 0 },
      hooks: { entities: {}, ids: [] },
      groupedByActionStateLogs: {
        entities: {
          m1mkagwhpm5d3: {
            globalStateId: 'm1mkagw98kfas',
            actionId: 'm1mkagwhpm5d3',
            action: 'initialize',
            async: false,
            start: 1727552729105,
            timing: 0,
            logs: [
              {
                logId: 'm1mkagwh4s64k',
                globalStateId: 'm1mkagw98kfas',
                actionId: 'm1mkagwhpm5d3',
                payload: { todos: { $t: 'map', $v: [] }, ui_sort: 0 },
                case: 'resolved',
                timestamp: 1727552729105,
                subAction: 'setState',
              },
            ],
            actionType: 'LIFE_CYCLE',
          },
          m1mkagwrvmwkz: {
            actionId: 'm1mkagwrvmwkz',
            globalStateId: 'm1mkagw98kfas',
            action: 'onInit',
            async: false,
            start: 1727552729115,
            timing: 0,
            actionType: 'LIFE_CYCLE_PARAMETER',
            logs: [
              {
                logId: 'm1mkagwrtpjj9',
                payload: {
                  todos: {
                    $t: 'map',
                    $v: [
                      [
                        '1724021437374',
                        {
                          title: 'Finish project proposal',
                          description: 'Write a detailed project proposal including scope, objectives, and timeline.',
                          id: '1724021437374',
                          ui_sort: 1,
                        },
                      ],
                      [
                        '1724021459906',
                        {
                          title: 'Prepare presentation slides',
                          description:
                            'Create a visually appealing presentation with key points and supporting visuals.',
                          id: '1724021459906',
                          ui_sort: 2,
                        },
                      ],
                      [
                        '1724021479552',
                        {
                          title: 'Review code changes',
                          description:
                            'Carefully review and provide feedback on the latest code changes in the repository.',
                          id: '1724021479552',
                          ui_sort: 3,
                        },
                      ],
                      [
                        '1724021509876',
                        {
                          title: 'Optimize database queries',
                          description:
                            'Identify and optimize slow-performing database queries to improve application performance.',
                          id: '1724021509876',
                          ui_sort: 5,
                        },
                      ],
                      [
                        '1724021491234',
                        {
                          title: 'Fix bug in login functionality',
                          description: 'Investigate and resolve the issue causing login failures for some users.',
                          id: '1724021491234',
                          ui_sort: 4,
                        },
                      ],
                      [
                        '1724021523456',
                        {
                          title: 'Implement user authentication',
                          description: 'Develop a secure user authentication system using industry-standard practices.',
                          id: '1724021523456',
                          ui_sort: 6,
                        },
                      ],
                      [
                        '1724021534567',
                        {
                          title: 'Design responsive UI',
                          description:
                            'Create a responsive user interface that adapts to different screen sizes and devices.',
                          id: '1724021534567',
                          ui_sort: 7,
                        },
                      ],
                      [
                        '1724021545678',
                        {
                          title: 'Write unit tests',
                          description:
                            'Develop comprehensive unit tests to ensure code quality and prevent regressions.',
                          id: '1724021545678',
                          ui_sort: 8,
                        },
                      ],
                      [
                        '1724021556789',
                        {
                          title: 'Refactor legacy code',
                          description:
                            'Restructure and optimize existing codebase to improve maintainability and performance.',
                          id: '1724021556789',
                          ui_sort: 9,
                        },
                      ],
                      [
                        '1724021567890',
                        {
                          title: 'Create API documentation',
                          description: "Generate clear and concise documentation for the application's API endpoints.",
                          id: '1724021567890',
                          ui_sort: 10,
                        },
                      ],
                      [
                        '1724021578901',
                        {
                          title: 'Implement data caching',
                          description:
                            'Introduce caching mechanisms to reduce database load and improve response times.',
                          id: '1724021578901',
                          ui_sort: 11,
                        },
                      ],
                      [
                        '1724021589012',
                        {
                          title: 'Fix cross-browser compatibility issues',
                          description:
                            'Address and resolve issues related to inconsistent rendering across different web browsers.',
                          id: '1724021589012',
                          ui_sort: 12,
                        },
                      ],
                      [
                        '1724021590123',
                        {
                          title: 'Optimize image loading',
                          description:
                            'Implement techniques to efficiently load and display images in the application.',
                          id: '1724021590123',
                          ui_sort: 13,
                        },
                      ],
                      [
                        '1724021601234',
                        {
                          title: 'Implement user feedback feature',
                          description:
                            'Allow users to provide feedback and suggestions directly within the application.',
                          id: '1724021601234',
                          ui_sort: 14,
                        },
                      ],
                      [
                        '1724021612345',
                        {
                          title: 'Integrate third-party API',
                          description:
                            "Incorporate functionality from a third-party API to enhance the application's capabilities.",
                          id: '1724021612345',
                          ui_sort: 15,
                        },
                      ],
                      [
                        '1724021623456',
                        {
                          title: 'Improve error handling',
                          description:
                            "Enhance the application's error handling mechanism to provide better user experience.",
                          id: '1724021623456',
                          ui_sort: 16,
                        },
                      ],
                      [
                        '1724021634567',
                        {
                          title: 'Implement data encryption',
                          description:
                            'Secure sensitive data by implementing encryption techniques at rest and in transit.',
                          id: '1724021634567',
                          ui_sort: 17,
                        },
                      ],
                      [
                        '1724021645678',
                        {
                          title: 'Write integration tests',
                          description:
                            'Develop integration tests to verify the interaction between different components of the application.',
                          id: '1724021645678',
                          ui_sort: 18,
                        },
                      ],
                      [
                        '1724021656789',
                        {
                          title: 'Improve accessibility',
                          description:
                            'Ensure the application is accessible to users with disabilities by following WCAG guidelines.',
                          id: '1724021656789',
                          ui_sort: 19,
                        },
                      ],
                      [
                        '1724021667890',
                        {
                          title: 'Implement user roles and permissions',
                          description:
                            'Create a role-based access control system to manage user permissions and privileges.',
                          id: '1724021667890',
                          ui_sort: 20,
                        },
                      ],
                      [
                        '1724021678901',
                        {
                          title: 'Optimize database schema',
                          description:
                            'Analyze and optimize the database schema for better performance and scalability.',
                          id: '1724021678901',
                          ui_sort: 21,
                        },
                      ],
                      [
                        '1724021689012',
                        {
                          title: 'Implement real-time notifications',
                          description:
                            'Enable real-time notifications to keep users updated on important events and changes.',
                          id: '1724021689012',
                          ui_sort: 22,
                        },
                      ],
                      [
                        '1724021690123',
                        {
                          title: 'Improve search functionality',
                          description:
                            'Enhance the search feature to provide more accurate and relevant results to users.',
                          id: '1724021690123',
                          ui_sort: 23,
                        },
                      ],
                      [
                        '1724021701234',
                        {
                          title: 'Implement user onboarding',
                          description:
                            'Create a seamless onboarding experience for new users to quickly get started with the application.',
                          id: '1724021701234',
                          ui_sort: 24,
                        },
                      ],
                      [
                        '1724021712345',
                        {
                          title: 'Optimize API performance',
                          description:
                            "Identify and resolve bottlenecks to improve the performance of the application's API endpoints.",
                          id: '1724021712345',
                          ui_sort: 25,
                        },
                      ],
                    ],
                  },
                  ui_sort: 25,
                },
                case: 'resolved',
                subAction: 'setState',
                setStateConfig: {},
                timestamp: 1727552729115,
                actionId: 'm1mkagwrvmwkz',
                globalStateId: 'm1mkagw98kfas',
              },
            ],
          },
          m1mkau4zbbhop: {
            actionId: 'm1mkau4zbbhop',
            globalStateId: 'm1mkagw98kfas',
            action: 'remove',
            async: false,
            start: 1727552746259,
            timing: 0,
            actionType: 'CUSTOM_ACTION',
            logs: [
              {
                logId: 'm1mkau4zpkfxw',
                payload: [['1724021437374', '1724021459906', '1724021479552', '1724021491234']],
                case: 'pending',
                timestamp: 1727552746259,
                subAction: null,
                actionId: 'm1mkau4zbbhop',
                globalStateId: 'm1mkagw98kfas',
              },
              {
                logId: 'm1mkau508lhdy',
                globalStateId: 'm1mkagw98kfas',
                actionId: 'm1mkau4zbbhop',
                subAction: 'setState',
                payload: {
                  todos: {
                    $t: 'map',
                    $v: [
                      [
                        '1724021509876',
                        {
                          title: 'Optimize database queries',
                          description:
                            'Identify and optimize slow-performing database queries to improve application performance.',
                          id: '1724021509876',
                          ui_sort: 5,
                        },
                      ],
                      [
                        '1724021523456',
                        {
                          title: 'Implement user authentication',
                          description: 'Develop a secure user authentication system using industry-standard practices.',
                          id: '1724021523456',
                          ui_sort: 6,
                        },
                      ],
                      [
                        '1724021534567',
                        {
                          title: 'Design responsive UI',
                          description:
                            'Create a responsive user interface that adapts to different screen sizes and devices.',
                          id: '1724021534567',
                          ui_sort: 7,
                        },
                      ],
                      [
                        '1724021545678',
                        {
                          title: 'Write unit tests',
                          description:
                            'Develop comprehensive unit tests to ensure code quality and prevent regressions.',
                          id: '1724021545678',
                          ui_sort: 8,
                        },
                      ],
                      [
                        '1724021556789',
                        {
                          title: 'Refactor legacy code',
                          description:
                            'Restructure and optimize existing codebase to improve maintainability and performance.',
                          id: '1724021556789',
                          ui_sort: 9,
                        },
                      ],
                      [
                        '1724021567890',
                        {
                          title: 'Create API documentation',
                          description: "Generate clear and concise documentation for the application's API endpoints.",
                          id: '1724021567890',
                          ui_sort: 10,
                        },
                      ],
                      [
                        '1724021578901',
                        {
                          title: 'Implement data caching',
                          description:
                            'Introduce caching mechanisms to reduce database load and improve response times.',
                          id: '1724021578901',
                          ui_sort: 11,
                        },
                      ],
                      [
                        '1724021589012',
                        {
                          title: 'Fix cross-browser compatibility issues',
                          description:
                            'Address and resolve issues related to inconsistent rendering across different web browsers.',
                          id: '1724021589012',
                          ui_sort: 12,
                        },
                      ],
                      [
                        '1724021590123',
                        {
                          title: 'Optimize image loading',
                          description:
                            'Implement techniques to efficiently load and display images in the application.',
                          id: '1724021590123',
                          ui_sort: 13,
                        },
                      ],
                      [
                        '1724021601234',
                        {
                          title: 'Implement user feedback feature',
                          description:
                            'Allow users to provide feedback and suggestions directly within the application.',
                          id: '1724021601234',
                          ui_sort: 14,
                        },
                      ],
                      [
                        '1724021612345',
                        {
                          title: 'Integrate third-party API',
                          description:
                            "Incorporate functionality from a third-party API to enhance the application's capabilities.",
                          id: '1724021612345',
                          ui_sort: 15,
                        },
                      ],
                      [
                        '1724021623456',
                        {
                          title: 'Improve error handling',
                          description:
                            "Enhance the application's error handling mechanism to provide better user experience.",
                          id: '1724021623456',
                          ui_sort: 16,
                        },
                      ],
                      [
                        '1724021634567',
                        {
                          title: 'Implement data encryption',
                          description:
                            'Secure sensitive data by implementing encryption techniques at rest and in transit.',
                          id: '1724021634567',
                          ui_sort: 17,
                        },
                      ],
                      [
                        '1724021645678',
                        {
                          title: 'Write integration tests',
                          description:
                            'Develop integration tests to verify the interaction between different components of the application.',
                          id: '1724021645678',
                          ui_sort: 18,
                        },
                      ],
                      [
                        '1724021656789',
                        {
                          title: 'Improve accessibility',
                          description:
                            'Ensure the application is accessible to users with disabilities by following WCAG guidelines.',
                          id: '1724021656789',
                          ui_sort: 19,
                        },
                      ],
                      [
                        '1724021667890',
                        {
                          title: 'Implement user roles and permissions',
                          description:
                            'Create a role-based access control system to manage user permissions and privileges.',
                          id: '1724021667890',
                          ui_sort: 20,
                        },
                      ],
                      [
                        '1724021678901',
                        {
                          title: 'Optimize database schema',
                          description:
                            'Analyze and optimize the database schema for better performance and scalability.',
                          id: '1724021678901',
                          ui_sort: 21,
                        },
                      ],
                      [
                        '1724021689012',
                        {
                          title: 'Implement real-time notifications',
                          description:
                            'Enable real-time notifications to keep users updated on important events and changes.',
                          id: '1724021689012',
                          ui_sort: 22,
                        },
                      ],
                      [
                        '1724021690123',
                        {
                          title: 'Improve search functionality',
                          description:
                            'Enhance the search feature to provide more accurate and relevant results to users.',
                          id: '1724021690123',
                          ui_sort: 23,
                        },
                      ],
                      [
                        '1724021701234',
                        {
                          title: 'Implement user onboarding',
                          description:
                            'Create a seamless onboarding experience for new users to quickly get started with the application.',
                          id: '1724021701234',
                          ui_sort: 24,
                        },
                      ],
                      [
                        '1724021712345',
                        {
                          title: 'Optimize API performance',
                          description:
                            "Identify and resolve bottlenecks to improve the performance of the application's API endpoints.",
                          id: '1724021712345',
                          ui_sort: 25,
                        },
                      ],
                    ],
                  },
                  ui_sort: 25,
                },
                case: 'rejected',
                error: "Error: Cannot read property 'todos' of undefined",
                timestamp: 1727552746260,
              },
              {
                logId: 'm1mkau521c5pk',
                globalStateId: 'm1mkagw98kfas',
                actionId: 'm1mkau4zbbhop',
                case: 'resolved',
                payload: true,
                timestamp: 1727552746262,
                subAction: null,
              },
            ],
          },
          m1mkayaky24ks: {
            actionId: 'm1mkayaky24ks',
            globalStateId: 'm1mkagw98kfas',
            action: 'addOne',
            async: false,
            start: 1727552751644,
            timing: 0,
            actionType: 'CUSTOM_ACTION',
            logs: [
              {
                logId: 'm1mkayakbvq5m',
                //payload: [{ title: 'test', description: 'test' }],
                payload: {
                  title: 'Optimize database queries',
                  description:
                    'Identify and optimize slow-performing database queries to improve application performance.',
                  id: '1724021509876',
                  ui_sort: 5,
                },
                case: 'pending',
                timestamp: 1727552751644,
                subAction: null,
                actionId: 'm1mkayaky24ks',
                globalStateId: 'm1mkagw98kfas',
              },
              {
                logId: 'm1mkayaktmsmq',
                globalStateId: 'm1mkagw98kfas',
                actionId: 'm1mkayaky24ks',
                subAction: 'setState',
                payload: {
                  title: 'Optimize database queries',
                  description:
                    'Identify and optimize slow-performing database queries to improve application performance.',
                  id: '1724021509876',
                  ui_sort: 5,
                },
                case: 'pending',
                timestamp: 1727552751644,
              },
              {
                logId: 'm1mkayaljzldw',
                globalStateId: 'm1mkagw98kfas',
                actionId: 'm1mkayaky24ks',
                case: 'resolved',
                payload: { title: 'test', description: 'test', ui_sort: 26, id: '760' },
                timestamp: 1727552751645,
                subAction: null,
              },
            ],
          },
          m1mkayaky25ks: {
            actionId: 'm1mkayaky25ks',
            globalStateId: 'm1mkagw98kfas',
            action: 'addOne',
            async: false,
            start: 1727552751645,
            timing: 0,
            actionType: 'CUSTOM_ACTION',
            logs: [
              {
                logId: 'm1mkayakbvq6m',
                //payload: [{ title: 'test', description: 'test' }],
                payload: {
                  title: 'Implement user authentication',
                  description: 'Develop a secure user authentication system using industry-standard practices.',
                  id: '1724021523456',
                  ui_sort: 6,
                },
                case: 'pending',
                timestamp: 1727552751644,
                subAction: null,
                actionId: 'm1mkayaky25ks',
                globalStateId: 'm1mkagw98kfas',
              },
              {
                logId: 'm2mkayaktmsmq',
                globalStateId: 'm1mkagw98kfas',
                actionId: 'm2mkayaky25ks',
                subAction: 'setState',
                payload: {
                  title: 'Implement user authentication',
                  description: 'Develop a secure user authentication system using industry-standard practices.',
                  id: '1724021523456',
                  ui_sort: 6,
                },
                case: 'pending',
                timestamp: 1727552751644,
              },
              {
                logId: 'm2mkayaljzldw',
                globalStateId: 'm1mkagw98kfas',
                actionId: 'm1mkayaky25ks',
                case: 'resolved',
                payload: { title: 'test', description: 'test', ui_sort: 26, id: '760' },
                timestamp: 1727552751645,
                subAction: null,
              },
            ],
          },
        },
        ids: ['m1mkagwhpm5d3', 'm1mkagwrvmwkz', 'm1mkau4zbbhop', 'm1mkayaky24ks', 'm1mkayaky25ks'],
      },
      actionPerActionKey: {
        entities: {
          addOne: ['m1mkayaky24ks', 'm1mkayaky25ks'],
        },
        ids: ['addOne'],
      },
      currentState: {
        todos: {
          $t: 'map',
          $v: [
            [
              '1724021523456',
              {
                title: 'Implement user authentication',
                description: 'Develop a secure user authentication system using industry-standard practices.',
                id: '1724021523456',
                ui_sort: 6,
              },
            ],
            [
              '1724021509876',
              {
                title: 'Optimize database queries',
                description:
                  'Identify and optimize slow-performing database queries to improve application performance.',
                id: '1724021509876',
                ui_sort: 5,
              },
            ],
            [
              '1724021534567',
              {
                title: 'Design responsive UI',
                description: 'Create a responsive user interface that adapts to different screen sizes and devices.',
                id: '1724021534567',
                ui_sort: 7,
              },
            ],
            [
              '1724021545678',
              {
                title: 'Write unit tests',
                description: 'Develop comprehensive unit tests to ensure code quality and prevent regressions.',
                id: '1724021545678',
                ui_sort: 8,
              },
            ],
            [
              '1724021556789',
              {
                title: 'Refactor legacy code',
                description: 'Restructure and optimize existing codebase to improve maintainability and performance.',
                id: '1724021556789',
                ui_sort: 9,
              },
            ],
            [
              '1724021567890',
              {
                title: 'Create API documentation',
                description: "Generate clear and concise documentation for the application's API endpoints.",
                id: '1724021567890',
                ui_sort: 10,
              },
            ],
            [
              '1724021578901',
              {
                title: 'Implement data caching',
                description: 'Introduce caching mechanisms to reduce database load and improve response times.',
                id: '1724021578901',
                ui_sort: 11,
              },
            ],
            [
              '1724021589012',
              {
                title: 'Fix cross-browser compatibility issues',
                description:
                  'Address and resolve issues related to inconsistent rendering across different web browsers.',
                id: '1724021589012',
                ui_sort: 12,
              },
            ],
            [
              '1724021590123',
              {
                title: 'Optimize image loading',
                description: 'Implement techniques to efficiently load and display images in the application.',
                id: '1724021590123',
                ui_sort: 13,
              },
            ],
            [
              '1724021601234',
              {
                title: 'Implement user feedback feature',
                description: 'Allow users to provide feedback and suggestions directly within the application.',
                id: '1724021601234',
                ui_sort: 14,
              },
            ],
            [
              '1724021612345',
              {
                title: 'Integrate third-party API',
                description:
                  "Incorporate functionality from a third-party API to enhance the application's capabilities.",
                id: '1724021612345',
                ui_sort: 15,
              },
            ],
            [
              '1724021623456',
              {
                title: 'Improve error handling',
                description: "Enhance the application's error handling mechanism to provide better user experience.",
                id: '1724021623456',
                ui_sort: 16,
              },
            ],
            [
              '1724021634567',
              {
                title: 'Implement data encryption',
                description: 'Secure sensitive data by implementing encryption techniques at rest and in transit.',
                id: '1724021634567',
                ui_sort: 17,
              },
            ],
            [
              '1724021645678',
              {
                title: 'Write integration tests',
                description:
                  'Develop integration tests to verify the interaction between different components of the application.',
                id: '1724021645678',
                ui_sort: 18,
              },
            ],
            [
              '1724021656789',
              {
                title: 'Improve accessibility',
                description:
                  'Ensure the application is accessible to users with disabilities by following WCAG guidelines.',
                id: '1724021656789',
                ui_sort: 19,
              },
            ],
            [
              '1724021667890',
              {
                title: 'Implement user roles and permissions',
                description: 'Create a role-based access control system to manage user permissions and privileges.',
                id: '1724021667890',
                ui_sort: 20,
              },
            ],
            [
              '1724021678901',
              {
                title: 'Optimize database schema',
                description: 'Analyze and optimize the database schema for better performance and scalability.',
                id: '1724021678901',
                ui_sort: 21,
              },
            ],
            [
              '1724021689012',
              {
                title: 'Implement real-time notifications',
                description: 'Enable real-time notifications to keep users updated on important events and changes.',
                id: '1724021689012',
                ui_sort: 22,
              },
            ],
            [
              '1724021690123',
              {
                title: 'Improve search functionality',
                description: 'Enhance the search feature to provide more accurate and relevant results to users.',
                id: '1724021690123',
                ui_sort: 23,
              },
            ],
            [
              '1724021701234',
              {
                title: 'Implement user onboarding',
                description:
                  'Create a seamless onboarding experience for new users to quickly get started with the application.',
                id: '1724021701234',
                ui_sort: 24,
              },
            ],
            [
              '1724021712345',
              {
                title: 'Optimize API performance',
                description:
                  "Identify and resolve bottlenecks to improve the performance of the application's API endpoints.",
                id: '1724021712345',
                ui_sort: 25,
              },
            ],
            ['760', { title: 'test', description: 'test', ui_sort: 26, id: '760' }],
          ],
        },
        ui_sort: 26,
      },
    },
    m1mkagwabml8h: {
      globalStateId: 'm1mkagwabml8h',
      name: 'globalSelectedTodos',
      metadata: null,
      localStorage: { key: 'globalSelectedTodos' },
      actions: { toggle: { length: 1 }, clean: { length: 0 } },
      config: {
        actions: { toggle: { __non_serializable__: 'function' }, clean: { __non_serializable__: 'function' } },
        onInit: { __non_serializable__: 'function' },
      },
      initialState: { $t: 'set', $v: [] },
      hooks: { entities: {}, ids: [] },
      groupedByActionStateLogs: {
        entities: {
          m1mkagwihcqws: {
            globalStateId: 'm1mkagwabml8h',
            actionId: 'm1mkagwihcqws',
            action: 'initialize',
            async: false,
            start: 1727552729107,
            timing: 0,
            logs: [
              {
                logId: 'm1mkagwjhbmst',
                globalStateId: 'm1mkagwabml8h',
                actionId: 'm1mkagwihcqws',
                payload: { $t: 'set', $v: [] },
                case: 'resolved',
                timestamp: 1727552729107,
                subAction: 'setState',
              },
            ],
            actionType: 'LIFE_CYCLE',
          },
          m1mkagwai3n2f: {
            actionId: 'm1mkagwai3n2f',
            globalStateId: 'm1mkagwabml8h',
            action: 'localStorage',
            async: false,
            start: 1727552729098,
            timing: 0,
            actionType: 'LIFE_CYCLE',
            logs: [
              {
                logId: 'm1mkagwa9uh3k',
                payload: { localStorageKey: 'globalSelectedTodos' },
                case: 'pending',
                timestamp: 1727552729098,
                subAction: null,
                actionId: 'm1mkagwai3n2f',
                globalStateId: 'm1mkagwabml8h',
              },
              {
                logId: 'm1mkagwbba7ko',
                globalStateId: 'm1mkagwabml8h',
                actionId: 'm1mkagwai3n2f',
                case: 'pending',
                subAction: 'getLocalStorageItem',
                payload: '{"$t":"set","$v":["1724021437374","1724021459906"]}',
                timestamp: 1727552729099,
              },
              {
                logId: 'm1mkagwby2vy0',
                globalStateId: 'm1mkagwabml8h',
                actionId: 'm1mkagwai3n2f',
                payload: { $t: 'set', $v: ['1724021437374', '1724021459906'] },
                case: 'resolved',
                subAction: 'setState',
                setStateConfig: {},
                timestamp: 1727552729099,
              },
            ],
          },
          m1mkagwtad3aj: {
            actionId: 'm1mkagwtad3aj',
            globalStateId: 'm1mkagwabml8h',
            action: 'onInit',
            async: false,
            start: 1727552729117,
            timing: 0,
            actionType: 'LIFE_CYCLE_PARAMETER',
            logs: [
              {
                logId: 'm1mkagwt9d36m',
                payload: { $t: 'set', $v: ['1724021437374', '1724021459906'] },
                case: 'resolved',
                subAction: 'setState',
                setStateConfig: {},
                timestamp: 1727552729117,
                actionId: 'm1mkagwtad3aj',
                globalStateId: 'm1mkagwabml8h',
              },
            ],
          },
          m1mkarg9g0o48: {
            actionId: 'm1mkarg9g0o48',
            globalStateId: 'm1mkagwabml8h',
            action: 'toggle',
            async: false,
            start: 1727552742777,
            timing: 0,
            actionType: 'CUSTOM_ACTION',
            logs: [
              {
                logId: 'm1mkarg9kttke',
                payload: [['1724021479552']],
                case: 'pending',
                timestamp: 1727552742777,
                subAction: null,
                actionId: 'm1mkarg9g0o48',
                globalStateId: 'm1mkagwabml8h',
              },
              {
                logId: 'm1mkargaccdxw',
                globalStateId: 'm1mkagwabml8h',
                actionId: 'm1mkarg9g0o48',
                subAction: 'setState',
                payload: { $t: 'set', $v: ['1724021437374', '1724021459906', '1724021479552'] },
                case: 'pending',
                timestamp: 1727552742778,
              },
              {
                logId: 'm1mkargb69zej',
                globalStateId: 'm1mkagwabml8h',
                actionId: 'm1mkarg9g0o48',
                case: 'resolved',
                timestamp: 1727552742779,
                subAction: null,
              },
            ],
          },
          m1mkasfw4x3fa: {
            actionId: 'm1mkasfw4x3fa',
            globalStateId: 'm1mkagwabml8h',
            action: 'toggle',
            async: false,
            start: 1727552744060,
            timing: 0,
            actionType: 'CUSTOM_ACTION',
            logs: [
              {
                logId: 'm1mkasfv2t0h4',
                payload: [['1724021491234']],
                case: 'pending',
                timestamp: 1727552744060,
                subAction: null,
                actionId: 'm1mkasfw4x3fa',
                globalStateId: 'm1mkagwabml8h',
              },
              {
                logId: 'm1mkasfwa8qoa',
                globalStateId: 'm1mkagwabml8h',
                actionId: 'm1mkasfw4x3fa',
                subAction: 'setState',
                payload: { $t: 'set', $v: ['1724021437374', '1724021459906', '1724021479552', '1724021491234'] },
                case: 'pending',
                timestamp: 1727552744060,
              },
              {
                logId: 'm1mkasfwo1cpv',
                globalStateId: 'm1mkagwabml8h',
                actionId: 'm1mkasfw4x3fa',
                case: 'resolved',
                timestamp: 1727552744060,
                subAction: null,
              },
            ],
          },
          m1mkau51awzo0: {
            actionId: 'm1mkau51awzo0',
            globalStateId: 'm1mkagwabml8h',
            action: 'onInit',
            async: false,
            start: 1727552746261,
            timing: 0,
            actionType: 'LIFE_CYCLE_PARAMETER',
            logs: [
              {
                logId: 'm1mkau51ntl74',
                payload: { $t: 'set', $v: [] },
                case: 'resolved',
                subAction: 'setState',
                setStateConfig: {},
                timestamp: 1727552746261,
                actionId: 'm1mkau51awzo0',
                globalStateId: 'm1mkagwabml8h',
              },
            ],
          },
          m1mkayal6x3t5: {
            actionId: 'm1mkayal6x3t5',
            globalStateId: 'm1mkagwabml8h',
            action: 'onInit',
            async: false,
            start: 1727552751645,
            timing: 0,
            actionType: 'LIFE_CYCLE_PARAMETER',
            logs: [
              {
                logId: 'm1mkayaly0uws',
                payload: { $t: 'set', $v: [] },
                case: 'resolved',
                subAction: 'setState',
                setStateConfig: {},
                timestamp: 1727552751645,
                actionId: 'm1mkayal6x3t5',
                globalStateId: 'm1mkagwabml8h',
              },
            ],
          },
          m1mkb2ug1ntww: {
            actionId: 'm1mkb2ug1ntww',
            globalStateId: 'm1mkagwabml8h',
            action: 'toggle',
            async: false,
            start: 1727552757544,
            timing: 0,
            actionType: 'CUSTOM_ACTION',
            logs: [
              {
                logId: 'm1mkb2ugq72so',
                payload: [['760']],
                case: 'pending',
                timestamp: 1727552757544,
                subAction: null,
                actionId: 'm1mkb2ug1ntww',
                globalStateId: 'm1mkagwabml8h',
              },
              {
                logId: 'm1mkb2uhht155',
                globalStateId: 'm1mkagwabml8h',
                actionId: 'm1mkb2ug1ntww',
                subAction: 'setState',
                payload: { $t: 'set', $v: ['760'] },
                case: 'pending',
                timestamp: 1727552757545,
              },
              {
                logId: 'm1mkb2uhsjv6m',
                globalStateId: 'm1mkagwabml8h',
                actionId: 'm1mkb2ug1ntww',
                case: 'resolved',
                timestamp: 1727552757545,
                subAction: null,
              },
            ],
          },
        },
        ids: [
          'm1mkagwihcqws',
          'm1mkagwai3n2f',
          'm1mkagwtad3aj',
          'm1mkarg9g0o48',
          'm1mkasfw4x3fa',
          'm1mkau51awzo0',
          'm1mkayal6x3t5',
          'm1mkb2ug1ntww',
        ],
      },
      currentState: { $t: 'set', $v: ['760'] },
    },
  },
  ids: ['m1mkagw98kfas', 'm1mkagwabml8h'],
};

export const initialValueMock = transformEntities(devToolsExample);
//export const initialValueMock = transformEntities(devToolsExample);
