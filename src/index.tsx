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
    assign: (updater: ContextUpdate<Context>) => Dispatch<T | EventObject<T>>,
    event?: EventObject<T>
  ) =>
    | void
    | ((assign: (updater: ContextUpdate<Context>) => Dispatch<T | EventObject<T>>, event?: EventObject<T>) => void);
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
  event?: EventObject<T>;
  nextEvents: T[];
}

interface EventObject<T extends string> {
  type: T;
  [key: string]: any;
}

interface UpdateEvent<Context> {
  type: 'Update';
  updater: (context: Context) => Context;
}
interface TransitionEvent<T extends string> {
  type: 'Transition';
  next: T | EventObject<T>;
}
type Event<Context, T extends string> = UpdateEvent<Context> | TransitionEvent<T>;

function getState<Context, S extends string, T extends string>(
  context: Context,
  config: MachineConfig<Context, S, T>,
  value: S,
  event?: EventObject<T>
): State<Context, S, T> {
  const on = config.states[value].on;

  return {
    value,
    context,
    event,
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
        ...state,
        context: nextContext,
      };
    } else {
      const currentState = config.states[state.value];

      // Events can have a shortcut string format. We want the full object notation here
      const eventObject = typeof event.next === 'string' ? { type: event.next } : event.next;

      const nextState: Transition<Context, S> | undefined = currentState.on?.[eventObject.type];

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

      return getState(state.context, config, target, eventObject);
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
) => [State<Context, S, T>, Dispatch<T | EventObject<T>>];

function useStateMachineImpl<Context>(context: Context): UseStateMachineWithContext<Context> {
  return function useStateMachineWithContext<S extends string, T extends string>(config: MachineConfig<Context, S, T>) {
    const initialState = useConstant<State<Context, S, T>>(() => getState(context, config, config.initial));

    const reducer = useConstant(() => getReducer<Context, S, T>(config));

    const [machine, dispatch] = useReducer(reducer, initialState);

    // The public dispatch/send function exposed to the user
    const send: Dispatch<T | EventObject<T>> = useConstant(() => next =>
      dispatch({
        type: 'Transition',
        next,
      })
    );

    // The updater function sends an internal event to the reducer to trigger the actual update
    const update = (updater: ContextUpdate<Context>) => {
      dispatch({
        type: 'Update',
        updater,
      });
      return send;
    };

    useEffect(() => {
      const exit = config.states[machine.value]?.effect?.(update, machine.event);
      return typeof exit === 'function' ? () => exit(update, machine.event) : undefined;
      // We are bypassing the linter here because we deliberately want the effects to run on explicit machine state changes.
      // eslint-disable-next-line react-hooks/exhaustive-deps
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
