import { Dispatch, useEffect, useReducer } from 'react';
import { __contextKey } from './constants';
import getReducer from './reducer';
import type { KeysOfTransition, MachineConfig } from './types';
import useConstant from './useConstant';

export default function useStateMachine<Context extends Record<PropertyKey, any>>(context?: Context) {
  return function useStateMachineWithContext<Config extends MachineConfig<Context>>(config: Config) {
    type IndexableState = keyof typeof config.states;
    type State = keyof Config['states'];
    type Event = KeysOfTransition<Config['states'][keyof Config['states']]>;


    const initialState = useConstant(() => ({
      value: config.initial as State,
      context: context ?? ({} as Context),
      nextEvents: Object.keys(config.states[config.initial].on ?? []) as Event[],
    }));

    const reducer = useConstant(() => getReducer<Context, Config, State, Event>(config));

    // The state machine is pretty much just a combination of useReducer and useEffect
    // This single reducer contains both the current machine state AND the context.
    const [machine, send] = useReducer(reducer, initialState);

    // The updater function sends an internal event to the reducer to trigger the actual context update
    // Since whe don't want to expose context updates via `send`, we're using an internal symbol as 
    // the action type.
    // When `send` is exposed to the user, it should just accept transition events.
    const update = (updater: (context: Context) => Context) =>
      send({
        type: __contextKey,
        updater,
      });

    // The effect runs every time a state transition happens.
    useEffect(() => {
      // Run the "entry" effect and store the returned value in "exit"
      const exit = config.states[machine.value as IndexableState]?.effect?.(send as Dispatch<string>, update);
      // If the returned value is a function, return it to useEffect (with correct parameter bindings) to be called on cleanup.
      return typeof exit === 'function' ? exit.bind(null, send as Dispatch<string>, update) : void 0;
    }, [machine.value]);

    return [machine, send] as [
      {
        value: State;
        context: Context;
        nextEvents: Event[];
      },
      Dispatch<Event>
    ];
  };
}
