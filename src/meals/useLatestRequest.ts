import { useCallback, useEffect, useRef } from "react";

/**
 * Hace que solo la última operación asíncrona de la consulta vigente pueda
 * actualizar el estado. Es estado de interfaz: no afecta a los datos Rust.
 */
export function useLatestRequest(key?: string) {
  const latestRequest = useRef(0);
  const currentKey = useRef(key);
  currentKey.current = key;

  useEffect(
    () => () => {
      latestRequest.current += 1;
    },
    [],
  );

  return useCallback(() => {
    if (currentKey.current !== key) return () => false;
    const request = ++latestRequest.current;
    return () =>
      request === latestRequest.current && currentKey.current === key;
  }, [key]);
}
