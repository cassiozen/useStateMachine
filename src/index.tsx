import { useEffect, useReducer, Dispatch } from 'react';

type MachineTransition =
  | string
  | {
      target: string;
      guard?: (state: string, event: string) => boolean;
    };

type updater<T> = (updater: (context: T) => T) => void;

interface MachineConfigState<T> {
  on?: {
    [key: string]: MachineTransition;
  };
  effect?: (assign?: updater<T>) => void;
}

interface MachineConfig<T> {
  initial: string;
  states: {
    [key: string]: MachineConfigState<T>;
  };
}

type KeysOf<Obj> = Obj extends Record<PropertyKey, MachineTransition> ? keyof Obj : never;
type TransitionEvent<T extends Record<PropertyKey, MachineConfigState<any>>> = T[keyof T]['on'];

const _internalContextKey = Symbol('CONTEXT');

const getReducer = <
  Config extends MachineConfig<any>,
  State extends keyof Config['states'],
  Event extends KeysOf<TransitionEvent<Config['states']>>
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

    // @ts-ignore
    if (event.hasOwnProperty('type') && event.type === _internalContextKey) {
      return {
        ...state,
        // @ts-ignore
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

export function useMachine<
  Config extends MachineConfig<any>,
  State extends keyof Config['states'],
  Event extends KeysOf<TransitionEvent<Config['states']>>
>(
  config: Config
): [
  {
    value: State;
    nextEvents: Event[];
  },
  Dispatch<Event>
] {
  type IndexableState = keyof typeof config.states;

  const initialState = {
    value: config.initial as State,
    nextEvents: Object.keys(config.states[config.initial].on ?? []) as Event[],
  };

  const [machine, send] = useReducer(getReducer<Config, State, Event>(config), initialState);

  useEffect(
    () => config.states[machine.value as IndexableState]?.effect?.(),
    // I'm assuming config cannot be changed during renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [machine.value]
  );

  return [machine, send];
}

export const useChart = <C extends object>() => <
  Config extends MachineConfig<C>,
  State extends keyof Config['states'],
  Event extends KeysOf<TransitionEvent<Config['states']>>,
  Context extends C
>(
  config: Config,
  context: Context
) => {
  type IndexableState = keyof typeof config.states;

  const initialState = {
    value: config.initial as State,
    context,
    nextEvents: Object.keys(config.states[config.initial].on ?? []) as Event[],
  };

  const [machine, send] = useReducer(getReducer<Config, State, Event>(config), initialState);

  // @ts-ignore
  const assign = (updater: (context: Context) => Context) => send({ type: _internalContextUpdateKey, updater });

  useEffect(
    () => {
      return config.states[machine.value as IndexableState]?.effect?.((assign as unknown) as updater<C>);
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
