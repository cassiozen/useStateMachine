import { useEffect, useReducer } from 'react';

interface MachineConfigState {
  on?: Record<PropertyKey, string>;
  entry?: () => void;
  exit?: () => void;
}

interface MachineConfig {
  initial: string;
  states: Record<PropertyKey, MachineConfigState>;
}

type KeysOf<Obj> = Obj extends Record<PropertyKey, string> ? keyof Obj : never;
type TransitionEvent<T extends Record<PropertyKey, MachineConfigState>> = T[keyof T]['on'];

export default function useMachine<
  Config extends MachineConfig,
  State extends keyof Config['states'],
  Event extends KeysOf<TransitionEvent<Config['states']>>
>(config: Config) {
  type MachineState = {
    value: State;
    nextEvents: Event[];
  };

  const [machine, send] = useReducer(
    (state: MachineState, event: Event) => {
      const currentState = config.states[state.value];
      const nextState = currentState?.on?.[event];
      if (nextState) {
        return {
          value: nextState as State,
          nextEvents: Object.keys(config.states[nextState].on ?? []) as Event[],
        };
      }
      return state;
    },
    {
      value: config.initial as State,
      nextEvents: Object.keys(config.states[config.initial].on ?? []) as Event[],
    }
  );

  useEffect(() => {
    config.states[machine.value]?.entry?.();

    return () => {
      config.states[machine.value]?.exit?.();
    };
    // I'm assuming config cannot be changed during renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [machine.value]);

  return [machine, send];
}
