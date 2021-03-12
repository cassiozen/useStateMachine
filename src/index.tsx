import { useState, useEffect, useCallback } from 'react';

interface MachineState {
  on?: Record<PropertyKey, string>;
  entry?: () => void;
  exit?: () => void;
}

interface MachineConfig {
  initial: string;
  states: Record<PropertyKey, MachineState>;
}

type KeysOf<Object> = Object extends Record<PropertyKey, string> ? keyof Object : never;
type TransitionEvents<T extends Record<PropertyKey, MachineState>> = T[keyof T]['on'];

export default function useMachine<
  Config extends MachineConfig,
  States extends keyof Config['states'],
  Events extends KeysOf<TransitionEvents<Config['states']>>
>(config: Config): [{ value: States; nextEvents: Events[] }, (event: Events) => void] {
  const [state, setState] = useState<{
    value: States;
    nextEvents: Events[];
  }>({
    value: config.initial as States,
    nextEvents: Object.keys(config.states[config.initial].on ?? []) as Events[],
  });

  useEffect(() => {
    config.states[state.value]?.entry?.();

    return () => {
      config.states[state.value]?.exit?.();
    };
    // I'm assuming config cannot be changed during renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const send = useCallback(
    (event: Events) => {
      const currentState = config.states[state.value];
      const nextState = currentState?.on?.[event];
      if (nextState) {
        setState({
          value: nextState as States,
          nextEvents: Object.keys(config.states[nextState].on ?? []) as Events[],
        });
      }
    },
    // I'm assuming config cannot be changed during renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state]
  );

  return [state, send];
}
