import isNil from 'json-storage-formatter/isNil';
import { useActions, useSelectedActionKey } from '../context/actionsContext';

export const useSelectedActionJson = () => {
  const selectedActionKey = useSelectedActionKey();

  return useActions((actions) => (isNil(selectedActionKey) ? null : actions[selectedActionKey]), [selectedActionKey]);
};
