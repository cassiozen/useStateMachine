/* eslint-disable react-hooks/rules-of-hooks */
import type { Dispatch } from 'react';
import useStateMachine from '../src';
import { expectType, expectError, expectAssignable } from 'tsd';

expectError(useStateMachine()({
  initial: '--nonexisting state---',
  states: {
    inactive: {
      on: { TOGGLE: 'active' },
    },
    active: {
      on: { TOGGLE: 'inactive' },
    },
  },
}));

expectError(useStateMachine()({
  initial: 'inactive',
  states: {
    inactive: {
      on: { TOGGLE: '--nonexisting transition--' },
    }
  },
}));

const machine1 = useStateMachine()({
  initial: 'inactive',
  states: {
    inactive: {
      on: { TOGGLE: 'active' },
    },
    active: {
      on: { TOGGLE: 'inactive' },
    },
  },
});

expectAssignable<{
  value: 'inactive' | 'active';
  context: undefined;
  event?: { type: 'TOGGLE' };
  nextEvents: 'TOGGLE'[];
}>(machine1[0]);
expectAssignable<Dispatch<'TOGGLE' | { type: 'TOGGLE' }>>(machine1[1]);

const machine2 = useStateMachine()({
  initial: 'inactive',
  states: {
    inactive: {
      on: { TOGGLE: 'active' },
    },
    active: {
      on: { TOGGLE: 'inactive' },
    },
  },
  on: {
    DEACTIVATE: 'inactive'
  }
});

expectAssignable<{
  value: 'inactive' | 'active';
  context: undefined;
  event?: { type: 'TOGGLE' } | { type: 'DEACTIVATE' };
  nextEvents: ('TOGGLE'|'DEACTIVATE')[];
}>(machine2[0]);

expectAssignable<Dispatch<'TOGGLE' | { type: 'TOGGLE' }>>(machine2[1]);
expectAssignable<Dispatch<'DEACTIVATE' | { type: 'DEACTIVATE' }>>(machine2[1]);


const machine3 = useStateMachine<{ time: number }>({ time: 0 })({
  initial: 'idle',
  verbose: true,
  states: {
    idle: {
      on: {
        START: {
          target: 'running',
        },
      },
      effect({send, setContext}) {
        expectAssignable<Dispatch<'START' | 'PAUSE' | 'RESET' | { type: 'START' } | { type: 'PAUSE' } | { type: 'RESET' }>>(send);
        expectAssignable<(value: (context: { time: number }) => { time: number }) => void>(setContext);
      },
    },
    running: {
      on: {
        PAUSE: 'paused',
      },
    },
    paused: {
      on: {
        RESET: 'idle',
        START: {
          target: 'running',
          guard({context, event}) {
            expectType<{ time: number }>(context)
            expectType<{ type: "START" | "PAUSE" | "RESET"; [key: string]: any; }>(event)
            return true;
          }
        },
      },
    },
  },
});
expectAssignable<{
  value: 'idle' | 'running' | 'paused';
  context: { time: number };
  nextEvents: ('START' | 'PAUSE' | 'RESET')[];
}>(machine3[0]);
expectAssignable<Dispatch<'START' | 'PAUSE' | 'RESET' | { type: 'START' } | { type: 'PAUSE' } | { type: 'RESET' }>>(machine3[1]);

const machine4 = useStateMachine<undefined, {}>()({
  initial: 'inactive',
  states: {
    inactive: {
      on: { TOGGLE: 'active' },
    },
    active: {
      on: { TOGGLE: 'inactive' },
    },
  },
});
expectType<Dispatch<never>>(machine4[1])

const machine5 = useStateMachine<undefined, { type: 'ACTIVATE', optionalKey: string } | { type: 'DEACTIVATE' }>()({
  initial: 'inactive',
  states: {
    inactive: {
      on: { ACTIVATE: 'active' },
    },
    active: {
      on: { DEACTIVATE: 'inactive' },
    },
  },
});
expectType<Dispatch<{ type: 'ACTIVATE'; optionalKey: string; } | { type: 'DEACTIVATE'; }>>(machine5[1])


let [flightMachine] = useStateMachine<FlightMachineContext>({ trip: 'oneWay' })({
  initial: 'editing',
  states: {
    editing: {
      on: {
        SUBMIT: {
          target: 'submitted',
          guard: (context): context is FlightMachineSubmittedContext => {
            if (context.trip === 'oneWay') {
              return !!context.startDate;
            } else {
              return (
                !!context.startDate &&
                !!context.returnDate &&
                context.returnDate > context.startDate
              );
            }
          }
        }
      }
    },
    submitted: {}
  }
})

type FlightMachineEditingContext =
  { trip: 'oneWay' | 'roundTrip'
  , startDate?: Date
  , returnDate?: Date
  }
type FlightMachineSubmittedContext =
  | { trip: 'oneWay'
    , startDate: Date
    }
  | { trip: 'roundTrip'
    , startDate: Date
    , returnDate: Date
    }

type FlightMachineContext =
  | FlightMachineEditingContext
  | FlightMachineSubmittedContext

expectType<FlightMachineContext>(flightMachine.context);
if (flightMachine.value === 'submitted') {
  expectType<FlightMachineSubmittedContext>(flightMachine.context);
  
  if (flightMachine.context.trip === 'oneWay') {
    expectError(flightMachine.context.returnDate)
  }
}
