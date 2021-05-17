import { useEffect, useReducer, Dispatch, useRef } from 'react';
import log from './logger';

type Transition<Context, S extends string> =
  | S
  | {
      target: S;
      guard?: (context: Context) => boolean;
    };

type ContextUpdate<Context> = (context: Context) => Context;

interface MachineStateConfig<Context, S extends string, T extends string> {
  on?: {
    [key in T]?: Transition<Context, S>;
  };
  effect?: (
    send: Dispatch<T>,
    assign: Dispatch<ContextUpdate<Context>>
  ) => void | ((send: Dispatch<T>, assign: Dispatch<ContextUpdate<Context>>) => void);
}

interface MachineConfig<Context, S extends string, T extends string> {
  initial: S;
  verbose?: boolean;
  states: {
    [key in S]: MachineStateConfig<Context, S, T>;
  };
}

interface State<Context, S extends string, T extends string> {
  value: S;
  context: Context;
  nextEvents: T[];
}

interface UpdateEvent<Context> {
  type: 'Update';
  updater: (context: Context) => Context;
}
interface TransitionEvent<T extends string> {
  type: 'Transition';
  next: T;
}
type Event<Context, T extends string> = UpdateEvent<Context> | TransitionEvent<T>;

function getState<Context, S extends string, T extends string>(
  context: Context,
  config: MachineConfig<Context, S, T>,
  value: S
): State<Context, S, T> {
  const on = config.states[value].on;

  return {
    value,
    context,
    nextEvents: on ? (Object.keys(on) as T[]) : [],
  };
}

function getReducer<Context, S extends string, T extends string>(config: MachineConfig<Context, S, T>) {
  return function reducer(state: State<Context, S, T>, event: Event<Context, T>): State<Context, S, T> {
    if (event.type === 'Update') {
      // Internal action to update context
      const nextContext = event.updater(state.context);
      if (config.verbose) log('Context update from %o to %o', state.context, nextContext);
      return {
        value: state.value,
        context: nextContext,
        nextEvents: state.nextEvents,
      };
    } else {
      const currentState = config.states[state.value];
      const nextState: Transition<Context, S> | undefined = currentState.on?.[event.next];

      // If there is no defined next state, return early
      if (!nextState) {
        if (config.verbose) log(`Current state %o doesn't listen to event "${event.next}".`, state);
        return state;
      }

      let target: S;
      if (typeof nextState === 'string') {
        target = nextState;
      } else {
        target = nextState.target;
        // If there are guards, invoke them and return early if the transition is denied
        if (nextState.guard && !nextState.guard(state.context)) {
          if (config.verbose) log(`Transition from "${state.value}" to "${target}" denied by guard`);
          return state;
        }
      }

      if (config.verbose) log(`Transition from "${state.value}" to "${target}"`);

      return getState(state.context, config, target);
    }
  };
}

function useConstant<T>(init: () => T): T {
  const ref = useRef<T | null>(null);

  if (ref.current === null) {
    ref.current = init();
  }
  return ref.current;
}

type UseStateMachineWithContext<Context> = <S extends string, T extends string>(
  config: MachineConfig<Context, S, T>
) => [State<Context, S, T>, Dispatch<T>];

function useStateMachineImpl<Context>(context: Context): UseStateMachineWithContext<Context> {
  return function useStateMachineWithContext<S extends string, T extends string>(config: MachineConfig<Context, S, T>) {
    const initialState = useConstant<State<Context, S, T>>(() => getState(context, config, config.initial));

    const reducer = useConstant(() => getReducer<Context, S, T>(config));

    const [machine, dispatch] = useReducer(reducer, initialState);
    // The updater function sends an internal event to the reducer to trigger the actual update
    const update: Dispatch<ContextUpdate<Context>> = updater => dispatch({ type: 'Update', updater });
    // The public dispatch/send function exposed to the user
    const send: Dispatch<T> = useConstant(() => next => dispatch({ type: 'Transition', next }));

    useEffect(() => {
      const exit = config.states[machine.value]?.effect?.(send, update);
      return typeof exit === 'function' ? () => exit(send, update) : undefined;
    }, [machine.value]);

    return [machine, send];
  };
}

export default function useStateMachine(): UseStateMachineWithContext<undefined>;
export default function useStateMachine<Context>(context: Context): UseStateMachineWithContext<Context>;
export default function useStateMachine<Context>(context?: Context): UseStateMachineWithContext<Context | undefined>;
export default function useStateMachine<Context>(context?: Context): UseStateMachineWithContext<Context | undefined> {
  return useStateMachineImpl(context);
}
