export const throwWrongKeyOnActionCollectionConfig = (action_key: string) => {
  throw new Error(`[WRONG CONFIGURATION!]: Every key inside the storeActionsConfig must be a higher order function that returns a function \n[${action_key}]: key is not a valid function, try something like this: \n{\n
    ${action_key}: (param) => ({ setState, getState, setMetadata, getMetadata, actions }) => {\n
      setState((state) => ({ ...state, ...param }))\n
    }\n
}\n`);
};

export default throwWrongKeyOnActionCollectionConfig;
