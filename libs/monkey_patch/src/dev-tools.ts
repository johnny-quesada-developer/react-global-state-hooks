// Clean exports for DevTools consumption - NO side effects
// This entry point provides types, schemas, and utilities needed by the DevTools
// without triggering the monkey patching behavior

// Schema exports
export * from './schema/ActionJson';
export * from './schema/ActionLogJson';
export * from './schema/ActionTypeJson';
export * from './schema/SubActionJson';
export * from './schema/SetStateConfigJson';
export * from './schema/GlobalStateJson';
export * from './schema/ActionsCallbackJson';
export * from './schema/BuildTypeJson';
export * from './schema/MetadataJson';
export * from './schema/LocalStorageJson';
export * from './schema/CallbacksJson';
export * from './schema/ActionCallbackJson';
export * from './schema/MonkeyPathMessageJson';

// Tool exports
export * from './tools/EntityAdapter';
export * from './tools/softClone';
export { getReactBuildType, getGlobalThis, type GlobalStoreParameter } from './tools/react';

export type { MessageToContentScript } from './sendMessageFromMonkeyPath';

// Assert exports
export * from './asserts/asserts';
