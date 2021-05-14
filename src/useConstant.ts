import { useRef } from 'react';

const useConstant = <T,>(init: () => T) => {
  const ref = useRef<T | null>(null);

  if (ref.current === null) {
    ref.current = init();
  }
  return ref.current;
};

export default useConstant;
