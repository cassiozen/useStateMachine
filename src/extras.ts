import { useRef } from "react";

export const R = {
  get: <R extends R.Unknown>(r: R, k: R.Key<R>) =>
    (r as any)[k] as R.Value<R> | undefined,
  concat: <R1 extends R.Unknown, R2 extends R.Unknown>(
    r1: R1,
    r2: R2
  ) =>
    ({ ...r1, ...r2 }) as any as R.Concat<R1, R2>,
  fromMaybe: <R extends R.Unknown>(r: R | undefined) => r ?? {} as R,
  keys: <R extends R.Unknown>(r: R) => Object.keys(r) as R.Key<R>[]
}
export namespace R {
  export type Of<K extends string, V> = { [$$K]: K, [$$V]: V }
  export declare const $$K: unique symbol;
  export declare const $$V: unique symbol;
  export type Unknown = Of<string, unknown>

  export type Key<R extends R.Unknown> = R[$$K]
  export type Value<R extends R.Unknown> = R[$$V]
  export type Concat<R1 extends R.Unknown, R2 extends R.Unknown> =
    R.Of<
      R.Key<R1> | R.Key<R2>,
      R.Value<R1> | R.Value<R2>
    >  
}

export const useConstant = <T>(compute: () => T): T => {
  const ref = useRef<T | null>(null);
  if (ref.current === null) ref.current = compute();
  return ref.current;
}

export const assertNever = (value: never): never => {
  throw new Error('Invariant: assertNever was called')
}
