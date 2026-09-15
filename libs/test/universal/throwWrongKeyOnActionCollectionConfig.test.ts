import { throwWrongKeyOnActionCollectionConfig } from 'global-state-hooks-under-test';

describe('throwWrongKeyOnActionCollectionConfig', () => {
  it('should throw an error with the action key name', () => {
    expect(() => {
      throwWrongKeyOnActionCollectionConfig('myAction');
    }).toThrow('[WRONG CONFIGURATION!]');
  });
});
