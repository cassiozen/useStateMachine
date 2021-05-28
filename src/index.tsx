import { useEffect, useReducer, Dispatch, useRef } from 'react';
import log from './logger';

type Transition<Context, State extends string> =
  | State
  | {
      target: State;
      guard?: (context: Context) => boolean;
    };

type ContextUpdater<Context> = (context: Context) => Context;

interface MachineStateConfig<Context, State extends string, EventString extends string> {
  on?: {
    [key in EventString]?: Transition<Context, State>;
  };
  effect?: (
    assign: (updater: ContextUpdater<Context>) => Dispatch<EventString | EventObject<EventString>>,
    event?: EventObject<EventString>
  ) =>
    | void
    | ((
        assign: (updater: ContextUpdater<Context>) => Dispatch<EventString | EventObject<EventString>>,
        event?: EventObject<EventString>
      ) => void);
}

interface MachineConfig<Context, State extends string, EventString extends string> {
  initial: State;
  verbose?: boolean;
  states: {
    [key in State]: MachineStateConfig<Context, State, EventString>;
  };
}

interface MachineState<Context, State extends string, EventString extends string> {
  value: State;
  context: Context;
  event?: EventObject<EventString>;
  nextEvents: EventString[];
}

interface EventObject<EventString extends string> {
  type: EventString;
  [key: string]: any;
}

interface UpdateEvent<Context> {
  type: 'Update';
  updater: (context: Context) => Context;
}
interface TransitionEvent<EventString extends string> {
  type: 'Transition';
  next: EventString | EventObject<EventString>;
}
type Event<Context, EventString extends string> = UpdateEvent<Context> | TransitionEvent<EventString>;

function getState<Context, State extends string, EventString extends string>(
  context: Context,
  config: MachineConfig<Context, State, EventString>,
  value: State,
  event?: EventObject<EventString>
): MachineState<Context, State, EventString> {
  const on = config.states[value].on;

  return {
    value,
    context,
    event,
    nextEvents: on ? (Object.keys(on) as EventString[]) : [],
  };
}

function getReducer<Context, State extends string, EventString extends string>(
  config: MachineConfig<Context, State, EventString>
) {
  return function reducer(
    state: MachineState<Context, State, EventString>,
    event: Event<Context, EventString>
  ): MachineState<Context, State, EventString> {
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

      const nextState: Transition<Context, State> | undefined = currentState.on?.[eventObject.type];

      // If there is no defined next state, return early
      if (!nextState) {
        if (config.verbose) log(`Current state %o doesn't listen to event "${event.next}".`, state);
        return state;
      }

      let target: State;
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

type UseStateMachineWithContext<Context> = <State extends string, EventString extends string>(
  config: MachineConfig<Context, State, EventString>
) => [MachineState<Context, State, EventString>, Dispatch<EventString | EventObject<EventString>>];

function useStateMachineImpl<Context>(context: Context): UseStateMachineWithContext<Context> {
  return function useStateMachineWithContext<State extends string, EventString extends string>(
    config: MachineConfig<Context, State, EventString>
  ) {
    const initialState = useConstant<MachineState<Context, State, EventString>>(() =>
      getState(context, config, config.initial)
    );

    const reducer = useConstant(() => getReducer<Context, State, EventString>(config));

    const [machine, dispatch] = useReducer(reducer, initialState);

    // The public dispatch/send function exposed to the user
    const send: Dispatch<EventString | EventObject<EventString>> = useConstant(() => next =>
      dispatch({
        type: 'Transition',
        next,
      })
    );

    // The updater function sends an internal event to the reducer to trigger the actual update
    const update = (updater: ContextUpdater<Context>) => {
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
