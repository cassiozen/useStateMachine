export type UseStateMachine =
  <D extends Machine.Definition<D>>(definition: A.InferNarrowest<D>) =>
    [ state: Machine.State<D>
    , send: Machine.Send<D>
    ]




namespace Machine {

  export type Definition<
    D,
    States = A.Get<D, "states">,
    EventSchema = A.Get<D, ["schema", "event"]>,
    ContextSchema = A.Get<D, ["schema", "context"]>,
    HasContextSchema = D extends { schema: { context: unknown } } ? true : false
  > =
    & { initial:
          [keyof States] extends [never]
            ? A.CustomError<`Error: no states defined`, A.Get<D, "initial">>
            : keyof States
      , states:
          { [StateIdentifier in keyof States]:
              StateIdentifier extends A.String
                ? Definition.StateNode<D, ["states", StateIdentifier]>
                : A.CustomError<`Error: only string identifiers allowed`, States[StateIdentifier]>
          }
      , on?: Definition.On<D, ["on"]>
      , schema?:
          { event?:
              EventSchema extends { type: string }
                ? EventSchema
                : A.CustomError<
                    `Error: schema.event should extend { type: string }`,
                    EventSchema
                  >
          , context?: ContextSchema
          }
      , verbose?: boolean
      }
    & (
      ContextSchema extends undefined
        ? HasContextSchema extends true
            ? { context?: undefined }
            : { context?: A.Get<D, "context"> }
        : { context: ContextSchema }
    )

  namespace Definition {
    export interface StateNode<D, P>
      { on?: On<D, L.Concat<P, ["on"]>> | null
      , effect?: Effect<D, L.Concat<P, ["effect"]>>
      }

  export type On<D, P, On = A.Get<D, P>, EventTypeSchema = A.Get<D, ["schema", "event", "type"]>> =
    { [EventType in keyof On]:
        EventType extends A.String
          ? // `EventType extends A.Fallback<EventTypeSchema, A.String>` doesn't work apparently
            EventType extends (
              EventTypeSchema extends undefined
                ? A.String
                : U.Extract<EventTypeSchema, A.String>
            )
              ? Transition<D, L.Concat<P, ["on", EventType]>>
              : A.CustomError<`Error: Event type '${EventType}' is not found in schema.event`, A.Get<On, EventType>>
          : A.CustomError<`Error: only string types allowed`, A.Get<On, EventType>>
    }

  type Transition<D, P, S = A.Get<D, P>,
    Guard = A.Get<S, "guard">,
    TargetString = Machine.TargetString<D>,
    Event = { type: L.Pop<P> }
  > =
    | TargetString
    | { target: TargetString
      , guard?:
          [ A.DoesExtend<
              F.Parameters<Guard>[0], 
              { context: Machine.Context<D>
              , event?: U.Extract<Machine.Event<D>, Event>
              }
            >
          , A.DoesExtend<
              F.Call<Guard>,
              boolean
            >
          ] extends [true, true]
            ? Guard
            : ( parameter:
                { context: Machine.Context<D>
                , event?: U.Extract<Machine.Event<D>, Event>
                }
              ) => boolean
      }
      

    export type Effect<D, P, StateValue = L.Pop<L.Popped<P>>> = 
      (parameter: EffectParameterForStateValue<D, StateValue>) =>
        | void
        | ((parameter: EffectCleanupParameterForStateValue<D, StateValue>) => void)
  }



  export type TargetString<D> =
    keyof A.Get<D, "states">
  
  export type Context<D> =
    A.Get<D, ["schema", "context"], A.Get<D, "context">>

  export type Event<D, EventSchema = A.Get<D, ["schema", "event"]>> = 
    EventSchema extends undefined
      ? | ( { [S in keyof A.Get<D, "states">]:
                keyof A.Get<D, ["states", S, "on"]>
            }[keyof A.Get<D, "states">] extends infer EventType
              ? EventType extends any ? { type: EventType } : never
              : never
          )
        | ( keyof A.Get<D, "on"> extends infer EventType
              ? EventType extends any ? { type: EventType } : never
              : never
          )
      : EventSchema

  export interface EffectParameterForStateValue<D, StateValue>
    extends BaseEffectParameter<D>
    { event: Machine.EntryEventForStateValue<D, StateValue>
    }

  export interface EffectCleanupParameterForStateValue<D, StateValue>
    extends BaseEffectParameter<D>
    { event: Machine.ExitEventForStateValue<D, StateValue>
    }

  export interface BaseEffectParameter<D>
    { send: Machine.Send<D>
    , context: Machine.Context<D>
    , setContext: Machine.SetContext<D>
    }

  export type EntryEventForStateValue<D, StateValue> =
    U.Extract<
      Event<D>,
      { type:
          | { [S in keyof A.Get<D, "states">]:
                { [E in keyof A.Get<D, ["states", S, "on"]>]:
                    A.Get<D, ["states", S, "on", E]> extends infer T
                      ? (T extends A.String ? T : A.Get<T, "target">) extends StateValue
                          ? E
                          : never
                      : never
                }[keyof A.Get<D, ["states", S, "on"]>]
            }[keyof A.Get<D, "states">]
          | { [E in keyof A.Get<D, ["on"]>]:
                A.Get<D, ["on", E]> extends infer T
                  ? (T extends A.String ? T : A.Get<T, "target">) extends StateValue
                      ? E
                      : never
                  : never
            }[keyof A.Get<D, ["on"]>]
      }
    >

  export type ExitEventForStateValue<D, StateValue> =
    U.Extract<
      Event<D>,
      { type: keyof A.Get<D, ["states", StateValue, "on"]> }
    >
    

  export type Sendable<D, E = Event<D>> =
    | ( E extends any
          ? { type: A.Get<E, "type"> } extends E
              ? A.Get<E, "type">
              : never
          : never
      )
    | E

  export type Send<D> =
    (sendable: Sendable<D>) => void

  export type SetContext<D> =
    (contextUpdater: ContextUpdater<D>) => ({ send: Send<D> })

  export type ContextUpdater<D> =
    (context: Context<D>) => Context<D>

  export interface State<D> // TODO: type-stated
    { value: keyof A.Get<D, "states">
    , context: Context<D>
    , event?: Event<D>
    , nextEvents?: A.Get<Event<D>, "type">[]
    }
}

export namespace L {
  export type Assert<T> = A.Cast<T, A.Tuple>;
  export type Concat<A, B> = [...L.Assert<A>, ...L.Assert<B>]
  export type Popped<A> = A extends [] ? [] : A extends [...infer X, any] ? X : never;
  export type Pop<A> = A extends [] ? undefined : A extends [...any[], infer X] ? X : never;
}


export namespace S {
  export type Assert<T> = A.Cast<T, A.String>;
  export type IsLiteral<T> =
    T extends A.String
      ? A.String extends T
          ? false
          : true
      : false;
}

export namespace F {
  export type Call<F> = F extends (...args: any[]) => infer R ? R : never;
  export type Parameters<F> = F extends (...args: infer A) => any ? A : never;
}

export namespace U {
  export type Extract<T, U> = T extends U ? T : never;
}

export namespace A {
  export type Cast<T, U> = T extends U ? T : U;
  export type Fallback<T, U> = T extends U ? T : U;
  export type Tuple<T = any> = T[] | [T];
  export type Object = object;
  export type String = string;
  export type Function = (...args: any[]) => any;

  export type InferNarrowest<T> =
    T extends any
      ? ( T extends A.Function ? T :
          T extends A.Object ? InferNarrowestObject<T> :
          T
        )
      : never
  
  export type InferNarrowestObject<T> =
    { readonly [K in keyof T]: InferNarrowest<T[K]> }

  export type AreEqual<A, B> =
    (<T>() => T extends B ? 1 : 0) extends (<T>() => T extends A ? 1 : 0)
      ? true
      : false;

  export type DoesExtend<A, B> =
    A extends B ? true : false;

  type _Get<T, P, F> =
    P extends [] ?
      T extends undefined ? F : T :
    P extends [infer K1, ...infer Kr] ?
      K1 extends keyof T ?
        _Get<T[K1], Kr, F> :
      K1 extends Get.Returned$$ ?
        _Get<T extends (...a: any[]) => infer R ? R : undefined, Kr, F> :
      K1 extends Get.Parameters$$ ?
        _Get<T extends (...a: infer A) => any ? A : undefined, Kr, F> :
      F :
    never

  export type Get<T, P, F = undefined> =
    (P extends any[] ? _Get<T, P, F> : _Get<T, [P], F>) extends infer X
      ? A.Cast<X, any>
      : never

  export namespace Get {
    const Returned$$ = Symbol("Returned$$");
    export type Returned$$ = typeof Returned$$;

    const Parameters$$ = Symbol("Parameters$$");
    export type Parameters$$ = typeof Parameters$$;
  }

  export type CustomError<Error, Place> =
    Place extends (S.IsLiteral<Place> extends true ? Error : A.String)
      ? Place extends `${S.Assert<Error>} `
          ? Error
          : `${S.Assert<Error>} `
      : Error

  export declare const test: (o: true) => void;
  export declare const areEqual: <A, B>(debug?: (value: A) => void) => A.AreEqual<A, B>
}
