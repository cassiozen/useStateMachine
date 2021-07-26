import { useEffect, useReducer } from "react";
import { UseStateMachine, Machine } from "./types";
import { assertNever, R, useConstant } from "./extras";

const useStateMachineImpl = (definition: Machine.Definition.Impl) => {
  const [state, dispatch] = useReducer(createReducer(definition), createInitialState(definition));

  const send = useConstant(() => (sendable: Machine.Sendable.Impl) => dispatch({ type: "SEND", sendable }));

  const setContext = (updater: Machine.ContextUpdater.Impl) => {
    dispatch({ type: "SET_CONTEXT", updater });
    return { send };
  };

  useEffect(() => {
    const entry = R.get(definition.states, state.value)!.effect;
    let exit = entry?.({
      send,
      setContext,
      event: state.event,
      context: state.context,
    });

    return typeof exit === "function"
      ? () => exit?.({ send, setContext, event: state.event, context: state.context })
      : undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.value, state.event]);

  return [state, send];
};

const createInitialState = (definition: Machine.Definition.Impl): Machine.State.Impl => ({
  value: definition.initial,
  context: definition.context as Machine.Context.Impl,
  event: { type: "$$initial" } as Machine.Event.Impl,
  nextEvents: R.keys(
    R.concat(R.fromMaybe(R.get(definition.states, definition.initial)!.on), R.fromMaybe(definition.on))
  ),
});

const createReducer = (definition: Machine.Definition.Impl) => {
  let log = createLogger(definition);
  return (machineState: Machine.State.Impl, internalEvent: InternalEvent): Machine.State.Impl => {
    if (internalEvent.type === "SET_CONTEXT") {
      let nextContext = internalEvent.updater(machineState.context);
      log("Context update", ["Previous Context", machineState.context], ["Next Context", nextContext]);

      return { ...machineState, context: nextContext };
    }

    if (internalEvent.type === "SEND") {
      let sendable = internalEvent.sendable;
      let event = typeof sendable === "string" ? { type: sendable } : sendable;
      let context = machineState.context;
      let stateNode = R.get(definition.states, machineState.value)!;
      let resolvedTransition =
        R.get(R.fromMaybe(stateNode.on), event.type) ?? R.get(R.fromMaybe(definition.on), event.type);

      if (!resolvedTransition) {
        log(
          `Current state doesn't listen to event type "${event.type}".`,
          ["Current State", machineState],
          ["Event", event]
        );
        return machineState;
      }

      let [nextStateValue, didGuardDeny = false] = (() => {
        if (typeof resolvedTransition === "string") return [resolvedTransition];
        if (resolvedTransition.guard === undefined) return [resolvedTransition.target];
        if (resolvedTransition.guard({ context, event })) return [resolvedTransition.target];
        return [resolvedTransition.target, true]
      })() as [Machine.StateValue.Impl, true?]

      if (didGuardDeny) {
        log(
          `Transition from "${machineState.value}" to "${nextStateValue}" denied by guard`,
          ["Event", event],
          ["Context", context]
        );
        return machineState;
      }
      log(`Transition from "${machineState.value}" to "${nextStateValue}"`, ["Event", event]);

      let resolvedStateNode = R.get(definition.states, nextStateValue)!;

      return {
        value: nextStateValue,
        context,
        event,
        nextEvents: R.keys(R.concat(R.fromMaybe(resolvedStateNode.on), R.fromMaybe(definition.on))),
      };
    }

    return assertNever(internalEvent);
  };
};

interface SetContextEvent {
  type: "SET_CONTEXT";
  updater: Machine.ContextUpdater.Impl;
}

interface SendEvent {
  type: "SEND";
  sendable: Machine.Sendable.Impl;
}

type InternalEvent = SetContextEvent | SendEvent;

export type Console =
  { log: (a: string, b: string | object) => void
  , groupCollapsed?: (...l: string[]) => void
  , groupEnd?: () => void
  }

// test sub-typing
const defaultConsole: Console = console

const createLogger = (definition: Machine.Definition.Impl) => (groupLabel: string, ...nested: [string, string | object][]) => {
  if (!definition.verbose) return;
  
  let console = definition.console || defaultConsole
  if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") {
    console.groupCollapsed?.("%cuseStateMachine", "color: #888; font-weight: lighter;", groupLabel);
    nested.forEach(message => {
      console.log(message[0], message[1]);
    });
    console.groupEnd?.();
  }
};

const useStateMachine = useStateMachineImpl as UseStateMachine;
export default useStateMachine;
export const t = <T extends unknown>() => null as T;
