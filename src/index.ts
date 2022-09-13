import { useEffect, useReducer } from "react";
import { UseStateMachine, Machine, $$t, O } from "./types";
import { assertNever, R, useConstant } from "./extras";


const useStateMachineImpl = (definition: Machine.Definition.Impl) => {
  const [machineInstant, dispatch] = useReducer(createReducer(definition), createInitialState(definition));

  const send = useConstant(() => (sendable: Machine.Sendable.Impl) => dispatch({ type: "SEND", sendable }));

  const setContext = (updater: Machine.ContextUpdater.Impl) => {
    dispatch({ type: "SET_CONTEXT", updater });
    return { send };
  };

  useEffect(() => {
    const entry = R.get(definition.states, machineInstant.state)!.effect;
    let exit = entry?.({
      send,
      setContext,
      event: machineInstant.event,
      context: machineInstant.context,
    });

    return typeof exit === "function"
      ? () => exit?.({ send, setContext, event: machineInstant.event, context: machineInstant.context })
      : undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [machineInstant.state, machineInstant.event]);

  return { ...machineInstant, send };
};

type MachineInstant =
  O.OmitKey<Machine.Impl, "send">

const createInitialState = (definition: Machine.Definition.Impl): MachineInstant => {
  let nextEvents = R.keys(R.concat(
    R.fromMaybe(R.get(definition.states, definition.initial)!.on),
    R.fromMaybe(definition.on)
  ))
  return {
    state: definition.initial,
    context: definition.context as Machine.Context.Impl,
    event: { type: "$$initial" } as Machine.Event.Impl,
    nextEvents: nextEvents,
    nextEventsT: nextEvents
  }
}

const createReducer = (definition: Machine.Definition.Impl) => {
  let log = createLogger(definition);
  return (machineInstant: MachineInstant, internalEvent: InternalEvent): MachineInstant => {
    if (internalEvent.type === "SET_CONTEXT") {
      let nextContext = internalEvent.updater(machineInstant.context);
      log("Context update", ["Previous Context", machineInstant.context], ["Next Context", nextContext]);

      return { ...machineInstant, context: nextContext };
    }

    if (internalEvent.type === "SEND") {
      let sendable = internalEvent.sendable;
      let event = typeof sendable === "string" ? { type: sendable } : sendable;
      let context = machineInstant.context;
      let stateNode = R.get(definition.states, machineInstant.state)!;
      let resolvedTransition =
        R.get(R.fromMaybe(stateNode.on), event.type) ?? R.get(R.fromMaybe(definition.on), event.type);

      if (!resolvedTransition) {
        log(
          `Current state doesn't listen to event type "${event.type}".`,
          ["Current State", machineInstant],
          ["Event", event]
        );
        return machineInstant;
      }

      let [nextState, didGuardDeny = false] = (() => {
        if (typeof resolvedTransition === "string") return [resolvedTransition];
        if (resolvedTransition.guard === undefined) return [resolvedTransition.target];
        if (resolvedTransition.guard({ context, event })) return [resolvedTransition.target];
        return [resolvedTransition.target, true]
      })() as [Machine.State.Impl, true?]

      if (didGuardDeny) {
        log(
          `Transition from "${machineInstant.state}" to "${nextState}" denied by guard`,
          ["Event", event],
          ["Context", context]
        );
        return machineInstant;
      }
      log(`Transition from "${machineInstant.state}" to "${nextState}"`, ["Event", event]);

      let resolvedStateNode = R.get(definition.states, nextState)!;

      let nextEvents = R.keys(R.concat(
        R.fromMaybe(resolvedStateNode.on),
        R.fromMaybe(definition.on)
      ));
      return {
        state: nextState,
        context,
        event,
        nextEvents,
        nextEventsT: nextEvents
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

const useStateMachine = useStateMachineImpl as unknown as UseStateMachine;
export default useStateMachine;

export const t = <T>() => ({ [$$t]: undefined as unknown as T })
