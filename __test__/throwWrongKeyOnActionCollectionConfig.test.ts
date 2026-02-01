import { throwWrongKeyOnActionCollectionConfig } from '..';
// import { throwWrongKeyOnActionCollectionConfig } from '../src';

describe('throwWrongKeyOnActionCollectionConfig', () => {
  it('should throw an error with the action key name', () => {
    expect(() => {
      throwWrongKeyOnActionCollectionConfig('myAction');
    }).toThrow('[WRONG CONFIGURATION!]');
  });
});
