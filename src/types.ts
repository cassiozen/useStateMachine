import { Console } from "."
import { R } from "./extras"

export type UseStateMachine =
  <D extends Machine.Definition<D>>(definition: A.InferNarrowestObject<D>) =>
    [ state: A.Instantiated<Machine.State<Machine.Definition.FromTypeParamter<D>>>
    , send: A.Instantiated<Machine.Send<Machine.Definition.FromTypeParamter<D>>>
    ]

export const $$t = Symbol("$$t");
type $$t = typeof $$t;
export type CreateType = <T>() => { [$$t]: T }

export namespace Machine {
  export type Definition<
    Self,
    States = A.Get<Self, "states">,
    ContextSchema = A.Get<Self, ["schema", "context", $$t]>,
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
      , schema?: Definition.Schema<Self, ["schema"]>
      , verbose?: boolean
      , console?: Console
      , $$internalIsConstraint?:
          A.CustomError<
            "Error: Ignore, it's for internal types usage",
            A.Get<Self, "$$internalIsConstraint">
          >
      }
    & ( ContextSchema extends undefined
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
      "$$internalIsConstraint" extends keyof D
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
          A.DoesExtend<EventType, A.String> extends false
            ? A.CustomError<"Error: only string types allowed", A.Get<Self, EventType>> :
          EventType extends ExhaustiveIdentifier
            ? A.CustomError<
                `Error: '${ExhaustiveIdentifier}' is a reserved name`,
                A.Get<Self, EventType>
              > :
          EventType extends InitialEventType
            ? A.CustomError<
                `Error: '${InitialEventType}' is a reserved type`,
                A.Get<Self, EventType>
              > :
          A.DoesExtend<EventType, EventTypeConstraint> extends false
            ? A.CustomError<
                LS.ConcatAll<
                  [ `Error: Event type '${S.Assert<EventType>}' is not found in schema.events `
                  , "which is marked as exhaustive"
                  ]>,
                A.Get<Self, EventType>
              > :
          Transition<D, L.Concat<P, [EventType]>>
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
              A.Instantiated<
              { context: A.Uninstantiated<Machine.Context<D>>
              , event: A.Uninstantiated<U.Extract<Machine.Event<D>, Event>>
              }>
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
      (parameter: A.Instantiated<EffectParameterForStateValue<D, StateValue>>) =>
        | void
        | ((parameter: A.Instantiated<EffectCleanupParameterForStateValue<D, StateValue>>) => void)
    
    type EffectImpl =
      (parameter: EffectParameter.Impl) =>
          | void
          | ((parameter: EffectParameter.Cleanup.Impl) => void)
    export namespace Effect {
      export type Impl = EffectImpl;  
    }


    export type Schema<D, P, Self = A.Get<D, P>,
      ContextSchema = A.Get<Self, "context">,
      EventsSchema = A.Get<Self, "events">
    > =
      { context?:
          A.DoesExtend<ContextSchema, { [$$t]: unknown }> extends false
            ? A.CustomError<
              "Error: Use `t` to define type, eg `t<{ foo: number }>()`",
              ContextSchema
            > :
            ContextSchema
      , events?:
          { [Type in keyof EventsSchema]:
              Type extends Definition.ExhaustiveIdentifier
                ? boolean :
              Type extends Definition.InitialEventType
                ? A.CustomError<
                    `Error: '${Definition.InitialEventType}' is a reserved type`,
                    A.Get<EventsSchema, Type>
                  > :
              A.DoesExtend<Type, A.String> extends false
                ? A.CustomError<
                    "Error: Only string types allowed",
                    A.Get<EventsSchema, Type>
                  > :
              A.Get<EventsSchema, Type> extends infer PayloadWrapped
                ? A.DoesExtend<PayloadWrapped, { [$$t]: unknown }> extends false
                    ? A.CustomError<
                        "Error: Use `t` to define payload type, eg `t<{ foo: number }>()`",
                        A.Get<EventsSchema, Type>
                      > :
                  A.Get<PayloadWrapped, $$t> extends infer Payload
                    ? A.IsPlainObject<Payload> extends false
                        ? A.CustomError<
                            "Error: An event payload should be an object, eg `t<{ foo: number }>()`",
                            A.Get<EventsSchema, Type>
                          > :
                      "type" extends keyof Payload
                        ? A.CustomError<
                            LS.ConcatAll<
                              [ "Error: An event payload cannot have a property `type` as it's already defined. "
                              , `In this case as '${S.Assert<Type>}'`
                              ]>,
                            A.Get<EventsSchema, Type>
                          > :
                        A.Get<EventsSchema, Type>
                    : never
                : never
          }
      }

    export type ExhaustiveIdentifier = "$$exhaustive"
    export type InitialEventType = "$$initial";
  }

  export type StateValue<D> =
    keyof A.Get<D, "states">

  export type InitialStateValue<D> =
    A.Get<D, "initial">

  type StateValueImpl = string & A.Tag<"Machine.StateValue">
  export namespace StateValue {
    export type Impl = StateValueImpl;
  }
  
  export type Context<D> =
    A.Get<D, ["schema", "context", $$t], A.Get<D, "context">>

  type ContextImpl = {} & A.Tag<"Machine.Context">
  export namespace Context {
    export type Impl = ContextImpl;
  }

  export type Event<D, EventsSchema = A.Get<D, ["schema", "events"], {}>> = 
    | O.Value<{ [T in U.Exclude<keyof EventsSchema, Definition.ExhaustiveIdentifier>]:
        A.Get<EventsSchema, [T, $$t]> extends infer P
          ? P extends any ? O.ShallowMerge<{ type: T } & P> : never
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
                A.Get<InferredEvent, "type"> extends Definition.InitialEventType ? never :
                InferredEvent
              : never
          : never
      )
    
  type EventImpl = { type: string & A.Tag<"Machine.Event['type']"> }
  export namespace Event {
    export type Impl = EventImpl
  }

  export namespace EffectParameter {
    export namespace Cleanup {
      export type Impl = EffectParameter.Impl
    }

    export type Impl = EffectParameterImpl;
  }
  export interface EffectParameterImpl
    { event: Event.Impl
    , send: Send.Impl
    , context: Context.Impl
    , setContext: SetContext.Impl
    }

  export interface EffectParameterForStateValue<D, StateValue>
    extends BaseEffectParameter<D>
    { event: A.Uninstantiated<Machine.EntryEventForStateValue<D, StateValue>>
    }

  export interface EffectCleanupParameterForStateValue<D, StateValue>
    extends BaseEffectParameter<D>
    { event: A.Uninstantiated<Machine.ExitEventForStateValue<D, StateValue>>
    }

  export interface BaseEffectParameter<D>
    { send: Machine.Send<D>
    , context: A.Uninstantiated<Machine.Context<D>>
    , setContext: Machine.SetContext<D>
    }

  export type EntryEventForStateValue<D, StateValue> =
  | ( StateValue extends InitialStateValue<D>
        ? { type: Definition.InitialEventType }
        : never
    )
  | U.Extract<
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
    { (sendable: A.Uninstantiated<U.Exclude<Sendable<D>, A.String>>): void
    , (sendable: A.Uninstantiated<U.Extract<Sendable<D>, A.String>>): void
    }

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

  export type ContextUpdater<D> =
    (context: A.Uninstantiated<Context<D>>) =>
      A.Uninstantiated<Context<D>>

  type ContextUpdaterImpl = (context: Context.Impl) => Context.Impl
  export namespace ContextUpdater {
    export type Impl = ContextUpdaterImpl;
  }

  export type State<D,
    Value = StateValue<D>,
    NextEvents =
      ( Value extends any
          ? A.Get<ExitEventForStateValue<D, Value>, "type">
          : never
      )[]
  > =
    Value extends any
      ? { value: Value
        , context: A.Uninstantiated<Context<D>>
        , event: A.Uninstantiated<EntryEventForStateValue<D, Value>>
        , nextEventsT: A.Get<ExitEventForStateValue<D, Value>, "type">[]
        , nextEvents: NextEvents
        }
      : never
    
  interface StateImpl
    { value: StateValue.Impl
    , context: Context.Impl
    , event: Event.Impl
    , nextEvents: Event.Impl["type"][]
    , nextEventsT: Event.Impl["type"][]
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

export namespace U {
  export type Extract<T, U> = T extends U ? T : never;
  export type Exclude<T, U> = T extends U ? never : T;
}

export namespace O {
  export type Value<T> = T[keyof T];
  export type ShallowMerge<T> = { [K in keyof T]: T[K] } & unknown
}

export namespace A {
  export type Cast<T, U> = T extends U ? T : U;
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
      F :
    never

  export type Get<T, P, F = undefined> =
    (P extends any[] ? _Get<T, P, F> : _Get<T, [P], F>) extends infer X
      ? A.Cast<X, any>
      : never

  export type CustomError<Error, Place> =
    Place extends (S.IsLiteral<Place> extends true ? Error : A.String)
      ? Place extends `${S.Assert<Error>} `
          ? Error
          : `${S.Assert<Error>} `
      : Error

  export type Instantiated<T> =
    T extends Uninstantiated<infer U> ? U : 
    T extends Builtin ? T :
    T extends any
      ? T extends A.Function
          ? T extends { (...a: infer A1): infer R1, (...a: infer A2): infer R2 }
              ? { (...a: Instantiated<A1>): Instantiated<R1>
                , (...a: Instantiated<A2>): Instantiated<R2>
                } :
            T extends (...a: infer A1) => infer R1
              ? (...a1: Instantiated<A1>) => Instantiated<R1> :
            never :
        T extends A.Object
          ? { [K in keyof T]: Instantiated<T[K]> } :
        T
      : never

  type Builtin =
    | { [Symbol.toStringTag]: string }
    | Error
    | Date
    | RegExp
    | Generator

  export type Uninstantiated<T> = T & { [$$uninstantiated]: true }
  declare const $$uninstantiated: unique symbol;

  export type Tag<N extends A.String> =
    { [_ in N]: void }

  export const test = (_o: true) => {};
  export const areEqual = <A, B>(_debug?: (value: A) => void) => undefined as any as A.AreEqual<A, B>
}
