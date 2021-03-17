import { useEffect, useReducer, Dispatch } from 'react';

type Transition =
  | string
  | {
      target: string;
      guard?: (state: string, event: string) => boolean;
    };

type KeysOfTransition<Obj> = Obj extends Record<PropertyKey, Transition> ? keyof Obj : never;

interface BaseStateConfig {
  on?: {
    [key: string]: Transition;
  };
}

interface BaseConfig {
  initial: string;
  states: {
    [key: string]: BaseStateConfig;
  };
}

type TransitionEvent<T extends Record<PropertyKey, BaseStateConfig>> = T[keyof T]['on'];

type ContextUpdater<C> = (updater: (context: C) => C) => void;

interface MachineStateConfig<C> extends BaseStateConfig {
  effect?: (assign: ContextUpdater<C>) => void | ((assign: ContextUpdater<C>) => void);
}

interface MachineConfig<C> {
  initial: string;
  states: {
    [key: string]: MachineStateConfig<C>;
  };
}

const __contextKey = Symbol('CONTEXT');

const getReducer = <
  Config extends BaseConfig,
  State extends keyof Config['states'],
  Event extends KeysOfTransition<TransitionEvent<Config['states']>>
>(
  config: Config
) =>
  function reducer(
    state: {
      value: State;
      nextEvents: Event[];
    },
    event: Event
  ) {
    type IndexableState = keyof typeof config.states;
    const currentState = config.states[state.value as IndexableState];
    const nextState = currentState?.on?.[event as IndexableState];

    // The context is updated by dispatching an internal action with shape:
    // { key: __contextKey, updater: fn }
    // We're hiding this event from TypeScript because it's not part of the public API
    // @ts-expect-error
    if (event.hasOwnProperty('type') && event.type === __contextKey) {
      return {
        ...state,
        // @ts-expect-error
        context: event.updater(state.context),
      };
    }

    if (!nextState)
      // If there is no defined next state, return early
      return state;

    const nextStateValue = typeof nextState === 'string' ? nextState : nextState.target;

    // If there are guards, invoke them and return early if the transition is denied
    if (typeof nextState === 'object' && nextState.guard && !nextState.guard(state.value as string, event as string)) {
      return state;
    }

    return {
      ...state,
      value: nextStateValue as State,
      nextEvents: Object.keys(config.states[nextStateValue].on ?? []) as Event[],
    };
  };

export default function useStateMachine<Context extends object>(context?: Context) {
  return function useStateMachineWithContext<
    Config extends MachineConfig<Context>,
    State extends keyof Config['states'],
    Event extends KeysOfTransition<TransitionEvent<Config['states']>>
  >(config: Config) {
    type IndexableState = keyof typeof config.states;

    const initialState = {
      value: config.initial as State,
      context,
      nextEvents: Object.keys(config.states[config.initial].on ?? []) as Event[],
    };

    const [machine, send] = useReducer(getReducer<Config, State, Event>(config), initialState);

    // The updater function sends an internal event to the reducer to trigger the actual update
    // We're hiding this from the public API
    // @ts-expect-error
    const update = (updater: (context: Context) => Context) => send({ type: __contextKey, updater });

    useEffect(
      () => {
        const exit = config.states[machine.value as IndexableState]?.effect?.(
          (update as unknown) as ContextUpdater<Context>
        );
        return typeof exit === 'function' ? exit.bind(null, (update as unknown) as ContextUpdater<Context>) : void 0;
      },
      // I'm assuming config cannot be changed during renders
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [machine.value]
    );

    return [machine, send] as [
      {
        value: State;
        context: Context;
        nextEvents: Event[];
      },
      Dispatch<Event>
    ];
  };
}
