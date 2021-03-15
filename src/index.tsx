import { useEffect, useReducer, Dispatch } from 'react';

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
  entry?: () => void;
  exit?: () => void;
}

interface MachineConfig {
  initial: string;
  states: {
    [key: string]: MachineConfigState;
  };
}

type KeysOf<Obj> = Obj extends Record<PropertyKey, MachineTransition> ? keyof Obj : never;
type TransitionEvent<T extends Record<PropertyKey, MachineConfigState>> = T[keyof T]['on'];

export default function useMachine<
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

  function reducer(
    state: {
      value: State;
      nextEvents: Event[];
    },
    event: Event
  ) {
    const currentState = config.states[state.value as IndexableState];
    const nextState = currentState?.on?.[event as IndexableState];

    // If there is no defined next state, return early
    if (!nextState) return state;

    const nextStateValue = typeof nextState === 'string' ? nextState : nextState.target;

    // Check if there are guards
    if (typeof nextState === 'object' && nextState.guard && !nextState.guard(state.value as string, event as string)) {
      return state;
    }

    return {
      value: nextStateValue as State,
      nextEvents: Object.keys(config.states[nextStateValue].on ?? []) as Event[],
    };
  }
  const [machine, send] = useReducer(reducer, initialState);

  useEffect(() => {
    config.states[machine.value as IndexableState]?.entry?.();

    return () => {
      config.states[machine.value as IndexableState]?.exit?.();
    };
    // I'm assuming config cannot be changed during renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [machine.value]);

  return [machine, send];
}
