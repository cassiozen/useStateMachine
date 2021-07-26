import { Console } from "."
import { R } from "./extras"

export type UseStateMachine =
  <D extends Machine.Definition<D>>(definition: A.InferNarrowestObject<D>) =>
    [ state: Machine.State<Machine.Definition.FromTypeParamter<D>>
    , send: Machine.Send<Machine.Definition.FromTypeParamter<D>>
    , definition: D
    ]

export namespace Machine {
  export type Definition<
    Self,
    States = A.Get<Self, "states">,
    ContextSchema = A.Get<Self, ["schema", "context"]>,
    EventsSchema = A.Get<Self, ["schema", "events"]>,
    HasContextSchema = Self extends { schema: { context: unknown } } ? true : false
  > =
    & { initial:
        A.IsUnknown<States> extends true
          ? LS.ConcatAll<
              [ "Oops you have met a TypeScript limitation, "
              , "please add `on: {}` to state nodes that only have an `effect` property. "
              , "See the documentation to learn more."
              ]> :
        [keyof States] extends [never]
          ? A.CustomError<"Error: no states defined", A.Get<Self, "initial">>
          : keyof States
      , states:
          { [StateIdentifier in keyof States]:
              StateIdentifier extends A.String
                ? Definition.StateNode<Self, ["states", StateIdentifier]>
                : A.CustomError<"Error: Only string identifiers allowed", States[StateIdentifier]>
          }
      , on?: Definition.On<Self, ["on"]>
      , schema?:
          { context?: ContextSchema
          , events?:
              { [Type in keyof EventsSchema]:
                  Type extends Definition.ExhaustiveIdentifier ? boolean :
                  A.Get<EventsSchema, Type> extends infer Event
                    ? A.DoesExtend<Type, A.String> extends false
                        ? A.CustomError<
                            "Error: Only string types allowed",
                            A.Get<EventsSchema, Type>
                          > :
                      A.IsPlainObject<Event> extends false
                        ? A.CustomError<
                            "Error: An event payload should be an object, eg `t<{ foo: number }>()`",
                            A.Get<EventsSchema, Type>
                          > :
                      "type" extends keyof Event
                        ? A.CustomError<
                            LS.ConcatAll<
                              [ "Error: An event payload cannot have a property `type` as it's already defined. "
                              , `In this case as '${S.Assert<Type>}'`
                              ]>,
                            A.Get<EventsSchema, Type>
                          > :
                        
                      A.Get<EventsSchema, Type>
                    : never
              }
          }
      , verbose?: boolean
      , console?: Console
      , __internalIsConstraint?: never
      }
    & (
      ContextSchema extends undefined
        ? HasContextSchema extends true
            ? { context?: undefined }
            : { context?: unknown }
        : { context: ContextSchema }
    )

  interface DefinitionImp
    { initial: StateValue.Impl
    , states: R.Of<StateValue.Impl, Definition.StateNode.Impl>
    , on?: Definition.On.Impl
    , schema?: { context?: null, events?: R.Of<Event.Impl["type"], null> }
    , verbose?: boolean
    , console?: Console
    , context?: Context.Impl
    }
  export namespace Definition {
    export type Impl = DefinitionImp
    
    export type FromTypeParamter<D> =
      "__internalIsConstraint" extends keyof D
        ? D extends infer X ? X extends Definition<infer X> ? X : never : never
        : D

    export interface StateNode<D, P>
      { on?: On<D, L.Concat<P, ["on"]>>
      , effect?: Effect<D, L.Concat<P, ["effect"]>>
      }

    interface StateNodeImpl
      { on?: On.Impl
      , effect?: Effect.Impl
      }
    export namespace StateNode {
      export type Impl = StateNodeImpl
    }

    export type On<
      D, P, Self = A.Get<D, P>,
      EventsSchema = A.Get<D, ["schema", "events"], {}>,
      EventTypeConstraint =
        A.Get<EventsSchema, ExhaustiveIdentifier, false> extends true
          ? U.Exclude<keyof EventsSchema, ExhaustiveIdentifier>
          : A.String
    > =
      { [EventType in keyof Self]:
          EventType extends A.String
            ? EventType extends EventTypeConstraint
                ? EventType extends ExhaustiveIdentifier
                    ? A.CustomError<
                        "Error: '$$exhaustive' is a reversed name",
                        A.Get<Self, EventType>
                      >
                    : Transition<D, L.Concat<P, [EventType]>>
                : A.CustomError<
                    LS.ConcatAll<
                      [ `Error: Event type '${EventType}' is not found in schema.events `
                      , "which is marked as exhaustive"
                      ]>,
                    A.Get<Self, EventType>
                  >
            : A.CustomError<"Error: only string types allowed", A.Get<Self, EventType>>
      }
    
    type OnImpl = R.Of<Event.Impl["type"], Transition.Impl>
    export namespace On {
      export type Impl = OnImpl;
    }

    export type Transition<D, P,
      TargetString = Machine.StateValue<D>,
      Event = { type: L.Pop<P> }
    > =
      | TargetString
      | { target: TargetString
        , guard?:
            ( parameter:
              { context: Machine.Context<D>
              , event?: U.Extract<Machine.Event<D>, Event>
              }
            ) => boolean
        }

    type TransitionImpl =
        | State.Impl["value"]
        | { target: State.Impl["value"]
          , guard?:
              ( parameter:
                { context: State.Impl["context"]
                , event: State.Impl["event"]
                }
              ) => boolean
          }
    export namespace Transition {
      export type Impl = TransitionImpl
    }
        

    export type Effect<D, P, StateValue = L.Pop<L.Popped<P>>> = 
      (parameter: EffectParameterForStateValue<D, StateValue>) =>
        | void
        | ((parameter: EffectCleanupParameterForStateValue<D, StateValue>) => void)
    
    type EffectImpl =
      (parameter: EffectParameter.Impl) =>
          | void
          | ((parameter: EffectParameter.Cleanup.Impl) => void)
    export namespace Effect {
      export type Impl = EffectImpl;  
    }

    export type ExhaustiveIdentifier = "$$exhaustive"
  }

  export type StateValue<D> =
    keyof A.Get<D, "states">

  type StateValueImpl = string & A.Tag<"Machine.StateValue">
  export namespace StateValue {
    export type Impl = StateValueImpl;
  }
  
  export type Context<D> =
    A.Get<D, ["schema", "context"], A.Get<D, "context">>

  type ContextImpl = {} & A.Tag<"Machine.Context">
  export namespace Context {
    export type Impl = ContextImpl;
  }

  export type Event<D, EventsSchema = A.Get<D, ["schema", "events"], {}>> = 
    | O.Value<{ [T in U.Exclude<keyof EventsSchema, Definition.ExhaustiveIdentifier>]:
        A.Get<EventsSchema, T> extends infer E
          ? E extends any ? O.Mergify<{ type: T } & E> : never
          : never
      }>
    | ( A.Get<EventsSchema, Definition.ExhaustiveIdentifier, false> extends true ? never :
        ( ( O.Value<
            { [S in keyof A.Get<D, "states">]:
                keyof A.Get<D, ["states", S, "on"]>
            }> extends infer EventType
              ? EventType extends any ? { type: EventType } : never
            : never
          )
        | ( keyof A.Get<D, "on"> extends infer EventType
              ? EventType extends any ? { type: EventType } : never
              : never
          )
        ) extends infer InferredEvent
          ? InferredEvent extends any
              ? A.Get<InferredEvent, "type"> extends keyof EventsSchema ? never :
                A.Get<InferredEvent, "type"> extends Definition.ExhaustiveIdentifier ? never :
                InferredEvent
              : never
          : never
      )
    
  type EventImpl = { type: string & A.Tag<"Machine.Event['type']"> }
  export namespace Event {
    export type Impl = EventImpl
  }

  export namespace EffectParameter {
    export interface EffectParameterForStateValue<D, StateValue>
      extends Base<D>
      { event: Machine.EntryEventForStateValue<D, StateValue>
      }

    export namespace Cleanup {
      export interface ForStateValue<D, StateValue>
        extends Base<D>
        { event: Machine.ExitEventForStateValue<D, StateValue>
        }
      
      export type Impl = EffectParameter.Impl
    }

    export interface Base<D>
      { send: Machine.Send<D>
      , context: Machine.Context<D>
      , setContext: Machine.SetContext<D>
      }
  
    export type Impl = EffectParameterImpl;
  }
  export interface EffectParameterImpl
    { event?: Event.Impl
    , send: Send.Impl
    , context: Context.Impl
    , setContext: SetContext.Impl
    }

  export interface EffectParameterForStateValue<D, StateValue>
    extends BaseEffectParameter<D>
    { event?: Machine.EntryEventForStateValue<D, StateValue>
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
          | O.Value<{ [S in keyof A.Get<D, "states">]:
              O.Value<{ [E in keyof A.Get<D, ["states", S, "on"]>]:
                A.Get<D, ["states", S, "on", E]> extends infer T
                  ? (T extends A.String ? T : A.Get<T, "target">) extends StateValue
                      ? E
                      : never
                  : never
              }>
            }>
          | O.Value<{ [E in keyof A.Get<D, ["on"]>]:
              A.Get<D, ["on", E]> extends infer T
                ? (T extends A.String ? T : A.Get<T, "target">) extends StateValue
                    ? E
                    : never
                : never
            }>
      }
    >

  export type ExitEventForStateValue<D, StateValue> =
    U.Extract<
      Event<D>,
      { type:
          | keyof A.Get<D, ["states", StateValue, "on"], {}>
          | keyof A.Get<D, "on", {}>
      }
    >

  export type Sendable<D, E = Event<D>> =
    | ( E extends any
          ? { type: A.Get<E, "type"> } extends E
              ? A.Get<E, "type">
              : never
          : never
      )
    | E
  type SendableImpl = 
    | Event.Impl["type"]
    | Event.Impl
  export namespace Sendable {
    export type Impl = SendableImpl;  
  }

  export type Send<D> =
    (sendable: Sendable<D>) => void

  type SendImpl = (send: Sendable.Impl) => void
  export namespace Send {
    export type Impl = SendImpl;
  }

  export type SetContext<D> =
    (contextUpdater: ContextUpdater<D>) => { send: Send<D> }
  
  export type SetContextImpl =
    (context: ContextUpdater.Impl) => { send: Send.Impl }
  export namespace SetContext {
    export type Impl = SetContextImpl;
  }

  export type ContextUpdater<D> = (context: Context<D>) => Context<D>

  type ContextUpdaterImpl = (context: Context.Impl) => Context.Impl
  export namespace ContextUpdater {
    export type Impl = ContextUpdaterImpl;
  }

  export type State<D, Value = StateValue<D>> =
    Value extends any
      ? { value: Value
        , context: Context<D>
        , event?: EntryEventForStateValue<D, Value>
        , nextEvents?: A.Get<ExitEventForStateValue<D, Value>, "type">[]
        }
      : never
    
  interface StateImpl
    { value: StateValue.Impl
    , context: Context.Impl
    , event?: Event.Impl
    , nextEvents: Event.Impl["type"][]
    }
  export namespace State {
    export type Impl = StateImpl
  }
}

export namespace L {
  export type Assert<T> = A.Cast<T, A.Tuple>;
  export type Concat<A, B> = [...L.Assert<A>, ...L.Assert<B>]
  export type Popped<A> = A extends [] ? [] : A extends [...infer X, any] ? X : never;
  export type Pop<A> = A extends [] ? undefined : A extends [...any[], infer X] ? X : never; 
}
export namespace LS {
  export type ConcatAll<L> =
    L extends [] ? [] :
    L extends [infer H] ? H :
    L extends [infer H, ...infer T] ? `${S.Assert<H>}${S.Assert<ConcatAll<T>>}` :
    never
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
  export type Exclude<T, U> = T extends U ? never : T;
}

export namespace O {
  export type Value<T> = T[keyof T];
  export type Mergify<T> = { [K in keyof T]: T[K] }
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

  export type IsUnknown<T> =
    [T] extends [never]
      ? false
      : T extends unknown ? unknown extends T
          ? true
          : false : false;

  export type IsPlainObject<T> =
    T extends A.Object
      ? T extends A.Function ? false :
        T extends A.Tuple ? false :
        true
      : false

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

  export type Tag<N extends A.String> =
    { [_ in N]: void }

  export const test = (_o: true) => {};
  export const areEqual = <A, B>(_debug?: (value: A) => void) => undefined as any as A.AreEqual<A, B>
}
