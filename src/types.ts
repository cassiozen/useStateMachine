export type UseStateMachine =
  <D extends MachineDefinition.Of<D>>(definition: A.InferNarrowest<D>) => "TODO"


namespace MachineDefinition {
  export type Of<D> = "TODO"
}


namespace O {
  export type Assert<T> = A.Cast<T, A.Object>;
  export type Values<O> = O[keyof O];
  export type Compute<T> =
    T extends any
      ? { [K in keyof T]: T[K] }
      : never

  type _Get<O, P, F> =
    P extends [] ?
      O extends undefined ? F : O :
    P extends [infer K1, ...infer Kr] ?
      K1 extends keyof O ? _Get<O[K1], Kr, F> : F :
    never

  export type Get<O, P, F = undefined> =
    (P extends any[] ? _Get<O, P, F> : _Get<O, [P], F>) extends infer X
      ? A.Cast<X, any>
      : never
}

export namespace L {
  export type Assert<T> = A.Cast<T, A.Tuple>;
  export type Concat<A, B> = [...L.Assert<A>, ...L.Assert<B>]
}

export namespace F {
  export type Call<F> = F extends (...args: any[]) => infer R ? R : never;
  export type Parameters<F> = F extends (...args: infer A) => any ? A : never;
}

namespace A {
  export type Cast<T, U> = T extends U ? T : U;
  export type Tuple<T = any> = T[] | [T];
  export type Object = object;
  export type String = string;
  export type Function = (...args: any[]) => any;
  export type IsUnknown<T> =
    [T] extends [never]
      ? false
      : T extends unknown ? unknown extends T
          ? true
          : false : false;

  export type InferNarrowest<T> =
    T extends any
      ? ( T extends A.Tuple ? readonly [...L.Assert<T>] :
          T extends A.Function ? T :
          T extends A.Object ? { readonly [K in keyof T]: InferNarrowest<T[K]> } :
          T
        )
      : never
}
