import { useEffect, useReducer, Dispatch } from 'react';
import { __assign } from 'tslib';

type MachineTransition =
  | string
  | {
      target: string;
      guard?: (state: string, event: string) => boolean;
    };

interface MachineConfigState {
  on?: {
    [key: string]: MachineTransition;
  };
  effect?: () => void;
}

interface MachineConfig {
  initial: string;
  states: {
    [key: string]: MachineConfigState;
  };
}

type KeysOf<Obj> = Obj extends Record<PropertyKey, MachineTransition> ? keyof Obj : never;
type TransitionEvent<T extends Record<PropertyKey, MachineConfigState>> = T[keyof T]['on'];

const _internalContextUpdateKey = Symbol('CONTEXT_UPDATE_KEY');

const getReducer = <
  Config extends MachineConfig,
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
    if (event.hasOwnProperty('type') && event.type === _internalContextUpdateKey) {
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
  Config extends MachineConfig,
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
  Config extends MachineConfig,
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
    () => config.states[machine.value as IndexableState]?.effect?.(),
    // I'm assuming config cannot be changed during renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [machine.value]
  );

  return [machine, send, assign] as [
    {
      value: State;
      context: Context;
      nextEvents: Event[];
    },
    Dispatch<Event>,
    typeof assign
  ];
};
