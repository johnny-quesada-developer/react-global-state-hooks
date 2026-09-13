import { throwWrongKeyOnActionCollectionConfig } from '@react-hooks-global-states';

describe('throwWrongKeyOnActionCollectionConfig', () => {
  it('should throw an error with the action key name', () => {
    expect(() => {
      throwWrongKeyOnActionCollectionConfig('myAction');
    }).toThrow('[WRONG CONFIGURATION!]');
  });
});
