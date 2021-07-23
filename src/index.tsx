import { useEffect, useReducer } from "react";
import { UseStateMachine, Machine } from "./types";
import { assertNever, R, useConstant } from "./extras"

const useStateMachineImpl = (definition: Machine.Definition.Impl) => {
  const [state, dispatch] =
    useReducer(
      createReducer(definition),
      createInitialState(definition)
    )

  const send = useConstant(() =>
    (sendable: Machine.Sendable.Impl) => dispatch({type: "SEND", sendable })
  )

  const setContext = (updater: Machine.ContextUpdater.Impl) => {
    dispatch({ type: "SET_CONTEXT", updater });
    return { send };
  }

  useEffect(() => {
    const entry = R.get(definition.states, state.value)!.effect;
    let exit = entry?.({
      send,
      setContext,
      event: state.event,
      context: state.context,
    })

    return typeof exit === "function"
      ? () => exit?.({ send, setContext, event: state.event, context: state.context })
      : undefined;

  }, [state.value, state.event]); // eslint-disable react-hooks/exhaustive-deps

  return [state, send];
};

const createInitialState = (definition: Machine.Definition.Impl): Machine.State.Impl =>
  ({
    value: definition.initial,
    context: definition.context as Machine.Context.Impl,
    event: undefined,
    nextEvents:
      R.keys(R.concat(
        R.fromMaybe(R.get(definition.states, definition.initial)!.on),
        R.fromMaybe(definition.on)
      ))
  })

const createReducer = (definition: Machine.Definition.Impl) => {
  let log = createLogger(definition);
  return (
    machineState: Machine.State.Impl,
    internalEvent: InternalEvent
  ): Machine.State.Impl => {
    if (internalEvent.type === "SET_CONTEXT") {
      let nextContext = internalEvent.updater(machineState.context);
      log("Context update", ["Previous Context", machineState.context], ["Next Context", nextContext])

      return { ...machineState, context: nextContext }
    }

    if (internalEvent.type === "SEND") {
      let sendable = internalEvent.sendable;
      let event = typeof sendable === "string" ? { type: sendable } : sendable
      let context = machineState.context;
      let stateNode = R.get(definition.states, machineState.value)!;
      let resolvedTransition =
        R.get(R.fromMaybe(stateNode.on), event.type) ??
        R.get(R.fromMaybe(definition.on), event.type)


      if (!resolvedTransition) {
        log(
          `Current state doesn"t listen to event type "${event.type}".`,
          ["Current State", machineState],
          ["Event", event]
        );
        return machineState;
      }

      let selectedTransition =
        typeof resolvedTransition === "string" ? { target: resolvedTransition } :
        resolvedTransition.guard === undefined ? { target: resolvedTransition.target } :
        resolvedTransition.guard({ context, event }) ? { target: resolvedTransition.target } :
        { target: resolvedTransition.target, isDenied: true };

      if ("isDenied" in selectedTransition && selectedTransition.isDenied) {
        log(
          `Transition from "${machineState.value}" to "${selectedTransition}" denied by guard`,
          ["Event", event],
          ["Context", context]
        )
        return machineState;
      }
      
      return {
        value: nextStateValue,
        context,
        event,
        nextEvents:
          R.keys(R.concat(
            R.fromMaybe(stateNode.on),
            R.fromMaybe(definition.on)
          ))
      }
    }

    return assertNever(internalEvent)
  }
};

interface SetContextEvent
  { type: "SET_CONTEXT"
  , updater: Machine.ContextUpdater.Impl
  }

interface SendEvent
  { type: "SEND"
  , sendable: Machine.Sendable.Impl
  }

type InternalEvent =
  | SetContextEvent
  | SendEvent

const createLogger = (definition: Machine.Definition.Impl) =>
  (groupLabel: string, ...nested: [string, any][]) => {
    if (!definition.verbose) return;
    if (process.env.NODE_ENV === "development") {
      console.groupCollapsed("%cuseStateMachine", "color: #888; font-weight: lighter;", groupLabel);
      nested.forEach(message => {
        console.log(message[0], message[1]);
      });
      console.groupEnd();
    }
  }

const useStateMachine = useStateMachineImpl as UseStateMachine
export default useStateMachine;
export const t = <T extends unknown>() => null as T
