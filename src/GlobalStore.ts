import ReactDOM from 'react-dom';

import {
  formatFromStore,
  formatToStore,
  GlobalStore as GlobalStoreBase,
} from 'react-native-global-state-hooks';

import {
  ActionCollectionConfig,
  ActionCollectionResult,
  GlobalStoreConfig,
  StateConfigCallbackParam,
  StateSetter,
} from './GlobalStore.types';

export class GlobalStore<
  TState,
  TMetadata = null,
  TStateSetter extends
    | ActionCollectionConfig<TState, TMetadata>
    | StateSetter<TState>
    | null = StateSetter<TState>
> extends GlobalStoreBase<TState, TMetadata, TStateSetter> {
  /**
   * Returns a custom hook that allows to handle a global state
   * @returns {[TState, TStateSetter, TMetadata]} - The state, the state setter or the actions map, the metadata
   * */
  public getHook: () => () => [
    TState,
    TStateSetter extends StateSetter<TState>
      ? StateSetter<TState>
      : ActionCollectionResult<TState, TMetadata, TStateSetter>,
    TMetadata
  ];

  /**
   * Returns an array with the a function to get the state, the state setter or the actions map, and a function to get the metadata
   * @returns {[() => TState, TStateSetter, () => TMetadata]} - The state getter, the state setter or the actions map, the metadata getter
   * */
  public getHookDecoupled: () => [
    () => TState,
    TStateSetter extends StateSetter<TState>
      ? StateSetter<TState>
      : ActionCollectionResult<TState, TMetadata, TStateSetter>,
    () => TMetadata
  ];

  /**
   * additional configuration for the store
   * @template {TState} TState - The type of the state object
   * @template {TMetadata} TMetadata - The type of the metadata object (optional) (default: null) no reactive information set to share with the subscribers
   * @template {TStateSetter} TStateSetter - The type of the setterConfig object (optional) (default: null) if a configuration is passed, the hook will return an object with the actions then all the store manipulation will be done through the actions
   * @property {GlobalStoreConfig<TState, TMetadata, TStateSetter>} config.metadata - The metadata to pass to the callbacks (optional) (default: null)
   * @property {GlobalStoreConfig<TState, TMetadata, TStateSetter>} config.onInit - The callback to execute when the store is initialized (optional) (default: null)
   * @property {GlobalStoreConfig<TState, TMetadata, TStateSetter>} config.onStateChanged - The callback to execute when the state is changed (optional) (default: null)
   * @property {GlobalStoreConfig<TState, TMetadata, TStateSetter>} config.onSubscribed - The callback to execute when a component is subscribed to the store (optional) (default: null)
   * @property {GlobalStoreConfig<TState, TMetadata, TStateSetter>} config.computePreventStateChange - The callback to execute when the state is changed to compute if the state change should be prevented (optional) (default: null)
   * @property {GlobalStoreConfig<TState, TMetadata, TStateSetter>} config.localStorageKey - The key to use to store the state in the localStorage (optional) (default: null) if not null the state will be stored in the localStorage
   */
  protected config: GlobalStoreConfig<TState, TMetadata, TStateSetter>;

  /**
   * Create a new instance of the GlobalStore
   * @param {TState} state - The initial state
   * @param {TStateSetter} setterConfig - The actions configuration object (optional) (default: null) if not null the store manipulation will be done through the actions
   * @param {GlobalStoreConfig<TState, TMetadata>} config - The configuration object (optional) (default: { metadata: null })
   * @param {StateConfigCallbackParam<TState, TMetadata>} config.metadata - The metadata to pass to the callbacks (optional) (default: null)
   * @param {StateConfigCallbackParam<TState, TMetadata>} config.onInit - The callback to execute when the store is initialized (optional) (default: null)
   * @param {StateConfigCallbackParam<TState, TMetadata>} config.onStateChanged - The callback to execute when the state is changed (optional) (default: null)
   * @param {StateConfigCallbackParam<TState, TMetadata>} config.onSubscribed - The callback to execute when a subscriber is added (optional) (default: null)
   * @param {StateConfigCallbackParam<TState, TMetadata>} config.computePreventStateChange - The callback to execute when the state is changed to compute if the state change should be prevented (optional) (default: null)
   * @param {StateConfigCallbackParam<TState, TMetadata>} config.localStorageKey - The key to use to store the state in the localStorage (optional) (default: null) if not null the state will be stored in the localStorage
   * */
  constructor(
    state: TState,
    {
      onInit: onInitConfig,
      ...config
    }: GlobalStoreConfig<TState, TMetadata, TStateSetter> = {},
    setterConfig: TStateSetter | null = null
  ) {
    const decrypt =
      config?.decrypt === undefined ? config?.encrypt ?? true : config?.decrypt;

    super(
      state,
      {
        metadata: null,
        encrypt: true,
        decrypt,
        ...(config ?? {}),
      },
      setterConfig as TStateSetter
    );

    const parameters = this.getConfigCallbackParam({});

    this.onInit(parameters);
    onInitConfig?.(parameters);
  }

  protected setLocalStorageValue = () => {
    const { localStorageKey } = this.config;

    let stateToStore = formatToStore(this.getStateClone(), {
      stringify: true,
    });

    const { encrypt } = this.config;

    if (encrypt) {
      const isEncryptCallback = typeof encrypt === 'function';

      const encryptCallback = (
        isEncryptCallback ? encrypt : (value: string) => btoa(value)
      ) as (value: string) => string;

      stateToStore = encryptCallback(stateToStore);
    }

    localStorage.setItem(localStorageKey, stateToStore);
  };

  protected getLocalStorageValue = () => {
    const { localStorageKey } = this.config;

    let storedState: string = localStorage.getItem(localStorageKey);

    const { decrypt } = this.config;

    if (decrypt && storedState) {
      const isDecryptCallback = typeof decrypt === 'function';

      const decryptCallback = (
        isDecryptCallback ? decrypt : (value: string) => atob(value)
      ) as (value: string) => string;

      storedState = decryptCallback(storedState);
    }

    return storedState;
  };

  /**
   * This method will be called once the store is created after the constructor,
   * this method is different from the onInit of the confg property and it won't be overriden
   */
  protected onInit = async ({
    setState,
  }: StateConfigCallbackParam<TState, TMetadata, TStateSetter>) => {
    const { localStorageKey } = this.config;
    if (!localStorageKey) return;

    const storedState: string = this.getLocalStorageValue();

    if (storedState === null) {
      this.setLocalStorageValue();

      return;
    }

    const jsonParsed = JSON.parse(storedState);
    const state = formatFromStore<TState>(jsonParsed);

    setState(state);
  };

  protected onStateChanged = () => {
    this.setLocalStorageValue();
  };

  /**
   * set the state and update all the subscribers,
   * In react web ReacDom allows to batch the state updates, this method will use the unstable_batchedUpdates method if it exists
   * @param {StateSetter<TState>} setter - The setter function or the value to set
   * @param {React.Dispatch<React.SetStateAction<TState>>} invokerSetState - The setState function of the component that invoked the state change (optional) (default: null) this is used to updated first the component that invoked the state change
   * */
  protected setState = ({
    invokerSetState,
    state,
  }: {
    state: TState;
    invokerSetState?: React.Dispatch<React.SetStateAction<TState>>;
  }) => {
    // update the state
    this.state = state;

    const unstable_batchedUpdates =
      ReactDOM.unstable_batchedUpdates ||
      ((callback: () => void) => callback());

    unstable_batchedUpdates(() => {
      // execute first the callback of the component that invoked the state change
      invokerSetState?.(state);

      // update all the subscribers
      this.subscribers.forEach((setState) => {
        if (setState === invokerSetState) return;

        setState(state);
      });
    });
  };
}
