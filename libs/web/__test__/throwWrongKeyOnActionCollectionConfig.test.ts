import { throwWrongKeyOnActionCollectionConfig } from 'react-global-state-hooks';

describe('throwWrongKeyOnActionCollectionConfig', () => {
  it('should throw an error with the action key name', () => {
    expect(() => {
      throwWrongKeyOnActionCollectionConfig('myAction');
    }).toThrow('[WRONG CONFIGURATION!]');
  });
});
