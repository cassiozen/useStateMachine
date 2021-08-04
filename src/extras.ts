import { useRef } from "react";

export const R = {
  get: <T extends R.Unknown>(r: T, k: R.Key<T>) =>
    (r as any)[k] as R.Value<T> | undefined,

  concat: <T extends R.Unknown, U extends R.Unknown>(r1: T, r2: U) =>
    (({ ...r1, ...r2 } as any) as R.Concat<T, U>),

  fromMaybe: <T extends R.Unknown>(r: T | undefined) =>
    r ?? ({} as T),

  keys: <T extends R.Unknown>(r: T) =>
    Object.keys(r) as R.Key<T>[],

  map: <T extends R.Unknown, Uv>(r: T, f: (v: R.Value<T>, k: R.Key<T>) => Uv) =>
    Object.fromEntries(Object.entries(r).map(([k, v]) => [k, f(v, k)])) as R.Of<R.Key<T>, Uv>,

  find: <T extends R.Unknown>(r: T, f: (v: R.Value<T>, k: R.Key<T>) => boolean) =>
    Object.entries(r).find(([k, v]) => f(v, k))?.[1] as R.Value<T> | undefined,

  reduce: <T extends R.Unknown, A>(r: T, f: (a: A, v: R.Value<T>, k: R.Key<T>) => A, seed: A) =>
    Object.entries(r).reduce((a, [k, v]) => f(a, v, k), seed) as A,

  isEmpty: (r: R.Unknown) => R.keys(r).length === 0
};

const $$K = Symbol("R.$$K");
const $$V = Symbol("R.$$V");
export namespace R {
  export type $$K = typeof $$K;
  export type $$V = typeof $$V;

  export type Of<K extends string, V> = { [$$K]: K, [$$V]: V };
  export type Unknown = Of<string, unknown>

  export type Key<R extends R.Unknown> = R[$$K]
  export type Value<R extends R.Unknown> = R[$$V];
  export type Concat<R1 extends R.Unknown, R2 extends R.Unknown> = R.Of<
    R.Key<R1> | R.Key<R2>,
    R.Value<R1> | R.Value<R2>
  >;
}

export const useConstant = <T>(compute: () => T): T => {
  const ref = useRef<T | null>(null);
  if (ref.current === null) ref.current = compute();
  return ref.current;
};

export const assertNever = (_value: never): never => {
  throw new Error("Invariant: assertNever was called");
};

// yes this codebase is written by a hipster-fp-wannabe, apologies.
export const use = <T>(t: T) => ({ as: <R>(f: (t: T) => R) => f(t) })
