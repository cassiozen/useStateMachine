import { useEffect, useReducer, Dispatch, useRef } from 'react';
import log from './logger';

const enum DispatchType {
  'Update',
  'Transition',
}

type Transition<Context, Events, State extends string, EventString extends string> =
  | State
  | {
      target: State;
      guard?: (context: Context, event: Event<Events, EventString>) => boolean;
    };

type ContextUpdater<Context> = (context: Context) => Context;

interface MachineStateConfig<Context, Events, State extends string, EventString extends string> {
  on?: {
    [key in EventString]?: Transition<Context, Events, State, EventString>;
  };
  effect?: (
    send: Dispatch<SendEvent<Events, EventString>>,
    assign: (updater?: ContextUpdater<Context>) => { send: Dispatch<SendEvent<Events, EventString>> },
    event?: Event<Events, EventString>
  ) =>
    | void
    | ((
        send: Dispatch<SendEvent<Events, EventString>>,
        assign: (updater?: ContextUpdater<Context>) => { send: Dispatch<SendEvent<Events, EventString>> },
        event?: Event<Events, EventString>
      ) => void);
}

interface MachineConfig<Context, Events, State extends string, EventString extends string> {
  initial: State;
  verbose?: boolean;
  states: {
    [key in State]: MachineStateConfig<Context, Events, State, EventString>;
  };
}

interface MachineState<Context, Events, State extends string, EventString extends string> {
  value: State;
  context: Context;
  event?: Event<Events, EventString>;
  nextEvents: EventString[];
}

interface EventObject<EventString extends string> {
  type: EventString;
  [key: string]: any;
}

type InternalEvent<Context, Events, EventString extends string> =
  | {
      type: DispatchType.Update;
      updater: (context: Context) => Context;
    }
  | {
      type: DispatchType.Transition;
      next: SendEvent<Events, EventString>;
    };

type SendEvent<Events, EventString extends string> = Events extends undefined
  ? EventString | EventObject<EventString>
  : Events extends EventObject<EventString>
  ? Events
  : never;

type Event<Events, EventString extends string> = Events extends undefined
  ? EventObject<EventString>
  : Events extends EventObject<EventString>
  ? Events
  : never;

function getState<Context, Events, State extends string, EventString extends string>(
  context: Context,
  config: MachineConfig<Context, Events, State, EventString>,
  value: State,
  event?: Event<Events, EventString>
): MachineState<Context, Events, State, EventString> {
  const on = config.states[value].on;

  return {
    value,
    context,
    event,
    nextEvents: on ? (Object.keys(on) as EventString[]) : [],
  };
}

function getReducer<Context, Events, State extends string, EventString extends string>(
  config: MachineConfig<Context, Events, State, EventString>
) {
  return function reducer(
    state: MachineState<Context, Events, State, EventString>,
    event: InternalEvent<Context, Events, EventString>
  ): MachineState<Context, Events, State, EventString> {
    if (event.type === DispatchType.Update) {
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
      const eventObject = (typeof event.next === 'string' ? { type: event.next } : event.next) as Event<
        Events,
        EventString
      >;

      const nextState: Transition<Context, Events, State, EventString> | undefined =
        currentState.on?.[eventObject.type];

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
        if (nextState.guard && !nextState.guard(state.context, eventObject)) {
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

type UseStateMachineWithContext<Context, Events> = <State extends string, EventString extends string>(
  config: MachineConfig<Context, Events, State, EventString>
) => [MachineState<Context, Events, State, EventString>, Dispatch<SendEvent<Events, EventString>>];

function useStateMachineImpl<Context, Events>(context: Context): UseStateMachineWithContext<Context, Events> {
  return function useStateMachineWithContext<State extends string, EventString extends string>(
    config: MachineConfig<Context, Events, State, EventString>
  ) {
    const initialState = useConstant<MachineState<Context, Events, State, EventString>>(() =>
      getState(context, config, config.initial)
    );

    const reducer = useConstant(() => getReducer<Context, Events, State, EventString>(config));

    const [machine, dispatch] = useReducer(reducer, initialState);

    // The public dispatch/send function exposed to the user
    const send: Dispatch<SendEvent<Events, EventString>> = useConstant(() => next =>
      dispatch({
        type: DispatchType.Transition,
        next,
      })
    );

    // The updater function sends an internal event to the reducer to trigger the actual update
    const update = (updater?: ContextUpdater<Context>) => {
      if (updater) {
        dispatch({
          type: DispatchType.Update,
          updater,
        });
      }
      return { send };
    };

    useEffect(() => {
      const exit = config.states[machine.value]?.effect?.(send, update, machine.event);
      return typeof exit === 'function' ? () => exit(send, update, machine.event) : undefined;
      // We are bypassing the linter here because we deliberately want the effects to run on explicit machine state changes.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [machine.value]);

    return [machine, send];
  };
}

export default function useStateMachine(): UseStateMachineWithContext<undefined, undefined>;
export default function useStateMachine<Context>(context: Context): UseStateMachineWithContext<Context, undefined>;
export default function useStateMachine<Context, Events>(context: Context): UseStateMachineWithContext<Context, Events>;
export default function useStateMachine<Context>(
  context?: Context
): UseStateMachineWithContext<Context | undefined, undefined>;
export default function useStateMachine<Context, Events>(
  context?: Context
): UseStateMachineWithContext<Context | undefined, Events>;

export default function useStateMachine<Context, Events>(
  context?: Context
): UseStateMachineWithContext<Context | undefined, Events> {
  return useStateMachineImpl(context);
}
