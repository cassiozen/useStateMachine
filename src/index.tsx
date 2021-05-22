import { useEffect, useReducer, useRef, Dispatch } from 'react';

type Transition =
  | string
  | {
      target: string;
      guard?: (state: string, event: string) => boolean;
    };

type KeysUnder<T, K extends PropertyKey> = T extends Record<string, unknown>
  ? {
      [P in keyof T]-?: (P extends K ? keyof T[P] : never) | KeysUnder<T[P], K>;
    }[keyof T]
  : never;

type StatesKeys<T> = T extends { states: infer S }
  ? {
      [K in Extract<keyof S, string>]: K | `${K}.${StatesKeys<S[K]>}`;
    }[Extract<keyof S, string>]
  : never;

type ContextMapper<C> = (context: C) => C;

type ContextUpdater<C> = (updater: ContextMapper<C>) => void;

interface MachineStateConfig<C> {
  effect?: (update: ContextUpdater<C>) => ((update: ContextUpdater<C>) => void) | void;
  on?: {
    [key: string]: Transition;
  };
  initial?: string;
  states?: {
    [key: string]: {
      effect?: (update: ContextUpdater<C>) => ((update: ContextUpdater<C>) => void) | void;
      on?: {
        [key: string]: Transition;
      };
      initial?: string;
      states?: {
        [key: string]: {
          effect?: (update: ContextUpdater<C>) => ((update: ContextUpdater<C>) => void) | void;
          on?: {
            [key: string]: Transition;
          };
          initial?: string;
          states?: {
            [key: string]: {
              effect?: (update: ContextUpdater<C>) => ((update: ContextUpdater<C>) => void) | void;
              on?: {
                [key: string]: Transition;
              };
            };
          };
        };
      };
    };
  };
}

interface MachineConfig<C> {
  initial: string;
  states: {
    [key: string]: MachineStateConfig<C>;
  };
}

const __contextKey = Symbol('CONTEXT');

type PathTuple = [Record<PropertyKey, MachineStateConfig<any>>[] | undefined, string | undefined];

// Traverses the config three (depth-first) looking for the given value as a key inside 'states':
function findPath(
  value: string | undefined,
  config: MachineConfig<any> | MachineStateConfig<any>,
  valueString = '',
  previousPath: Record<PropertyKey, MachineStateConfig<any>>[] = []
): PathTuple {
  if (value && config.states) {
    const keys = Object.keys(config.states);
    if (Object.keys(config.states).includes(value))
      return [previousPath.concat({ [value]: config.states[value] }), valueString + value];
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const path = findPath(value, config.states[key], `${key}.`, previousPath.concat({ [key]: config.states[key] }));
      if (path[0]) {
        return path;
      }
    }
    return [undefined, undefined];
  }
  return [undefined, undefined];
}

function followInitialStates([path, valueString]: PathTuple): PathTuple {
  if (!path) return [undefined, undefined];
  const node = path[path.length - 1];
  if (node.initial && node.states?.[node.initial]) {
    return followInitialStates([path.concat(node.states[node.initial]), `${valueString}.${node.initial}`]);
  }
  return [path, valueString];
}

function getStateNodeFromValue(
  valueStrings: string[],
  node?: MachineStateConfig<any>
): MachineStateConfig<any> | undefined {
  if (valueStrings.length === 0) return node;
  const currentStateKey = valueStrings.shift();
  if (!currentStateKey) return node;
  const currentNode = node?.states?.[currentStateKey];
  return getStateNodeFromValue(valueStrings, currentNode);
}

function difference<T>(arr1: T[], arr2: T[]): T[] {
  return arr1.filter((x) => !arr2.includes(x));
}

export default function useStateMachine<Context extends Record<PropertyKey, unknown>>(context?: Context) {
  return function useStateMachineWithContext<
    Config extends MachineConfig<Context>,
    StateKeys extends StatesKeys<Config>,
    Event extends KeysUnder<Config, 'on'>
  >(
    config: Config
  ): [
    {
      configNodes: {
        previous?: PathTuple;
        current: PathTuple;
      };
      value: StateKeys;
      context: Context;
      nextEvents: Event[];
    },
    Dispatch<Event>
  ] {
    // Lazilly follow the entry path of the initial State
    const initalStateEntryPath = useRef<PathTuple>();
    if (!initalStateEntryPath.current) {
      initalStateEntryPath.current = followInitialStates(findPath(config.initial, config));
    }

    const initialState = {
      configNodes: {
        current: initalStateEntryPath.current,
      },
      value: initalStateEntryPath.current[1] as StateKeys,
      context: context ?? ({} as Context),
      nextEvents: Object.keys(
        initalStateEntryPath.current[0]?.[initalStateEntryPath.current[0].length - 1]['on'] ?? []
      ),
    };

    const reducer = (
      state: {
        configNodes: {
          previous?: PathTuple;
          current: PathTuple;
        };

        value: StateKeys;
        context: Context;
        nextEvents: Event[];
      },
      event:
        | Event
        | {
            type: typeof __contextKey;
            updater: ContextMapper<Context>;
          }
    ) => {
      // Internal action to update context
      if (typeof event === 'object') {
        // @ts-expect-error TODO
        if (event.type === __contextKey) {
          return {
            ...state,
            // @ts-expect-error TODO
            context: event.updater(state.context),
          };
        }

        // If state is an object but not the ones we're expeting, just return the previous state
        return state;
      }

      const currentState =
        state.configNodes.current[0] && state.configNodes.current[0][state.configNodes.current[0].length - 1]; // getStateNodeFromValue(state.value.split('.'), config);
      const nextStateTransition: Transition | undefined = currentState?.on?.[(event as unknown) as string];

      // If there is no defined transition, return early
      if (!nextStateTransition) return state;

      const nextStateValue = typeof nextStateTransition === 'string' ? nextStateTransition : nextStateTransition.target;
      const newEntryPath = followInitialStates(findPath(nextStateValue, config));

      // If there is no entry path, return early
      if (!newEntryPath || !newEntryPath[0]) return state;

      // If there are guards, invoke them and return early if the transition is denied
      if (
        typeof nextStateTransition === 'object' &&
        nextStateTransition.guard &&
        !nextStateTransition.guard(state.value as string, (event as unknown) as string)
      ) {
        return state;
      }

      return {
        ...state,
        configNodes: {
          previous: state.configNodes.current,
          current: newEntryPath,
        },
        value: newEntryPath[1] as StateKeys,
        nextEvents: Object.keys(newEntryPath[0][newEntryPath[0].length - 1]['on'] ?? []),
      };
    };

    // @ts-expect-error TODO
    const [machine, send] = useReducer(reducer, initialState);

    // The updater function sends an internal event to the reducer to trigger the actual update
    const update = (updater: ContextMapper<Context>) =>
      // @ts-expect-error TODO
      send({
        type: __contextKey,
        updater,
      });

    useEffect(() => {
      let pathStateConfigs: MachineStateConfig<Context>[] = [];

      if (
        (machine.configNodes.current && !machine.configNodes.previous) ||
        (machine.configNodes.current[0] && !machine.configNodes.previous[0])
      ) {
        console.log('ID');
        pathStateConfigs = machine.configNodes.current[0];
      } else {
        console.log('ELDE', machine.configNodes.current[0].length, machine.configNodes.previous[0].length);
        pathStateConfigs = difference(machine.configNodes.current[0], machine.configNodes.previous[0]);
        console.log(JSON.stringify(machine.configNodes.previous[0], null, 2));
        console.log(JSON.stringify(machine.configNodes.current[0], null, 2));
        console.log(JSON.stringify(pathStateConfigs, null, 2));
        console.log(isEqual(machine.configNodes.previous[0][0].states, machine.configNodes.current[0][0].states));
      }

      const exitEffects: (void | ((update: ContextUpdater<Context>) => void))[] = [];
      pathStateConfigs.forEach((stateConfig) => {
        exitEffects.push(stateConfig?.effect?.(update));
      });

      return () => {
        exitEffects.forEach((exitEffect) => {
          if (exitEffect) exitEffect(update);
        });
      };
    }, [machine.value]);

    return [machine, send] as [
      {
        configNodes: {
          previous?: PathTuple;
          current: PathTuple;
        };
        value: StateKeys;
        context: Context;
        nextEvents: Event[];
      },
      Dispatch<Event>
    ];
  };
}

// // ///////////////////////////////////////////////

// function App() {
//   const [machine, send] = useStateMachine({ time: 0 })({
//     initial: 'idle',
//     states: {
//       idle: {
//         on: {
//           START: {
//             target: 'running',
//           },
//         },
//         effect(update) {
//           update(() => ({ time: 0 }));
//         },
//       },
//       running: {
//         on: {
//           PAUSE: 'paused',
//         },
//         effect(update) {
//           const interval = setInterval(() => {
//             update((context) => ({ time: context.time + 1 }));
//           }, 100);
//           return () => clearInterval(interval);
//         },
//       },
//       paused: {
//         initial: 'frozen',
//         states: {
//           frozen: {
//             on: {
//               HEAT: 'paused',
//             },
//           },
//         },
//         on: {
//           RESET: 'idle',
//           START: {
//             target: 'running',
//           },
//         },
//       },
//     },
//   });

//   return (
//     <div className="StopWatch">
//       <div className="display">{machine.context.time}</div>
//       {machine.value.match(/paused/)}
//       <div className="controls">
//         {machine.nextEvents.includes('START') && (
//           <button type="button" onClick={() => send('START')}>
//             Start
//           </button>
//         )}

//         {machine.nextEvents.includes('PAUSE') && (
//           <button type="button" onClick={() => send('PAUSE')}>
//             Pause
//           </button>
//         )}

//         {machine.nextEvents.includes('RESET') && (
//           <button type="button" onClick={() => send('RESET')}>
//             Reset
//           </button>
//         )}
//       </div>
//     </div>
//   );
// }
