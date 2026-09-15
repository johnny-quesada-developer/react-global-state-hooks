import { useCallback, useState } from 'react';

const useForceRerender = () => {
  const [, setState] = useState({});

  return useCallback(() => setState({}), []);
};

export default useForceRerender;
