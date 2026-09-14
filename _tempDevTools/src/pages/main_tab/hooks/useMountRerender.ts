import useForceRerender from './useForceRerender';
import useMountEffect from './useMountEffect';

const useMountRerender = () => {
  useMountEffect(useForceRerender());
};

export default useMountRerender;
