import { useEffect, useReducer, Dispatch, useRef } from 'react';
import log from './logger';

const enum DispatchType {
  'Update',
  'Transition',
}

type Transition<Context, Events, State extends string, EventString extends string> =
  | State
  | {
      /**
       * The name of the state to transition to
       */
      target: State;
      /**
       * A guard function runs before the transition: If the guard returns false the transition will be denied.
       */
      guard?: (params: { context: Context; event: Event<Events, EventString> }) => boolean;
    };

type ContextUpdater<Context> = (context: Context) => Context;

interface MachineStateConfig<Context, Events, State extends string, EventString extends string> {
  /**
   * Defines what the next state is, given the current state and event.
   */
  on?: {
    [key in EventString]?: Transition<Context, Events, State, EventString>;
  };
  /**
   * Effects are triggered when the state machine enters a given state. If you return a function from your effect,
   * it will be invoked when leaving that state (similarly to how useEffect works in React).
   */
  effect?: (params: {
    send: Dispatch<SendEvent<Events, EventString>>;
    setContext: (updater?: ContextUpdater<Context>) => { send: Dispatch<SendEvent<Events, EventString>> };
    event?: Event<Events, EventString>;
    context: Context;
  }) =>
    | void
    | ((params: {
        send: Dispatch<SendEvent<Events, EventString>>;
        setContext: (updater?: ContextUpdater<Context>) => { send: Dispatch<SendEvent<Events, EventString>> };
        event?: Event<Events, EventString>;
        context: Context;
      }) => void);
}

interface MachineConfig<Context, Events, State extends string, EventString extends string> {
  /**
   * The initial state node this machine should be in.
   */
  initial: State;
  /**
   * If true, will log every context & state changes. Log messages will be stripped out in the production build.
   */
  verbose?: boolean;
  /**
   * Define each of the possible states the state machine can be in.
   */
  states: {
    [key in State]: MachineStateConfig<Context, Events, State, EventString>;
  };
}

interface MachineState<Context, Events, State extends string, EventString extends string> {
  /**
   * The name of the current state
   */
  value: State;
  /**
   * The current state machine context (Extended State)
   */
  context: Context;
  /**
   * The last sent event that led to this state
   */
  event?: Event<Events, EventString>;
  /**
   * An array with the names of available events to trigger transitions from this state.
   */
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
      if (config.verbose) log('Context update', ['Previous Context', state.context], ['Next Context', nextContext]);
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
        if (config.verbose)
          log(
            `Current state doesn't listen to event type "${eventObject.type}".`,
            ['Current State', state],
            ['Event', eventObject]
          );
        return state;
      }

      let target: State;
      if (typeof nextState === 'string') {
        target = nextState;
      } else {
        target = nextState.target;
        // If there are guards, invoke them and return early if the transition is denied
        if (nextState.guard && !nextState.guard({ context: state.context, event: eventObject })) {
          if (config.verbose)
            log(
              `Transition from "${state.value}" to "${target}" denied by guard`,
              ['Event', eventObject],
              ['Context', state.context]
            );
          return state;
        }
      }

      if (config.verbose) log(`Transition from "${state.value}" to "${target}"`, ['Event', eventObject]);

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
    const setContext = (updater?: ContextUpdater<Context>) => {
      if (updater) {
        dispatch({
          type: DispatchType.Update,
          updater,
        });
      }
      return { send };
    };

    useEffect(() => {
      const exit = config.states[machine.value]?.effect?.({
        send,
        setContext,
        event: machine.event,
        context: machine.context,
      });
      return typeof exit === 'function'
        ? () => exit({ send, setContext, event: machine.event, context: machine.context })
        : undefined;
      // We are bypassing the linter here because we deliberately want the effects to run:
      // - When the machine state changes or
      // - When a different event was sent (e.g. self-transition)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [machine.value, machine.event]);

    return [machine, send];
  };
}

/**
 * A finite state machine is always on one given state, and reacts to events by transitioning to a different state and triggering effects.
 *
 * @version 0.4.1
 * @see [github.com/cassiozen/useStateMachine](https://github.com/cassiozen/useStateMachine)
 */
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
