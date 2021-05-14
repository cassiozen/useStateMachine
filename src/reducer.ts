import { __contextKey } from './constants';
import log from './log';
import type { KeysOfTransition, MachineConfig } from './types';

const getReducer = <
  Context extends Record<PropertyKey, any>,
  Config extends MachineConfig<Context>,
  State extends keyof Config['states'],
  Event extends KeysOfTransition<Config['states'][keyof Config['states']]>
>(
  config: Config
) =>
  function reducer(
    state: {
      value: State;
      context: Context;
      nextEvents: Event[];
    },
    event: Event | { type: typeof __contextKey; updater: (context: Context) => Context }
  ) {
    type IndexableState = keyof typeof config.states;
    const currentState = config.states[state.value as IndexableState];
    const nextState = currentState?.on?.[event as IndexableState];

    // Internal action to update context
    if (typeof event === 'object' && event.type === __contextKey) {
      const nextContext = event.updater(state.context);
      if (config.debug) log('Context update from %o to %o', state.context, nextContext);
      return {
        ...state,
        context: nextContext,
      };
    }

    // If there is no defined next state, return early
    if (!nextState) {
      if (config.debug) log(`Current state %o doesn't listen to event ${event}.`, state);
      return state;
    }

    const nextStateValue = typeof nextState === 'string' ? nextState : nextState.target;

    // If there are guards, invoke them and return early if the transition is denied
    if (typeof nextState === 'object' && nextState.guard && !nextState.guard(state.context)) {
      if (config.debug) log(`Transition from ${state.value} to ${nextStateValue} denied by guard`);
      return state;
    }
    
    if (config.debug) log(`Transition from ${state.value} to ${nextStateValue}`);

    return {
      ...state,
      value: nextStateValue as State,
      nextEvents: Object.keys(config.states[nextStateValue].on ?? []) as Event[],
    };
  };

export default getReducer;
