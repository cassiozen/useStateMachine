/* eslint-disable react-hooks/rules-of-hooks */
import type { Dispatch } from 'react';
import useStateMachine from '../src';
import { expectType, expectError } from 'tsd';
 
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
expectType<{
  value: 'inactive' | 'active';
  context: undefined;
  nextEvents: 'TOGGLE'[];
}>(machine1[0]);
expectType<Dispatch<'TOGGLE'>>(machine1[1]);

const machine2 = useStateMachine<{ time: number }>({ time: 0 })({
  initial: 'idle',
  verbose: true,
  states: {
    idle: {
      on: {
        START: {
          target: 'running',
        },
      },
      effect(send, update) {
        expectType<Dispatch<'START' | 'PAUSE' | 'RESET'>>(send);
        expectType<(value: (context: { time: number }) => { time: number }) => void>(update);
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
        },
      },
    },
  },
});
expectType<{
  value: 'idle' | 'running' | 'paused';
  context: { time: number };
  nextEvents: ('START' | 'PAUSE' | 'RESET')[];
}>(machine2[0]);
expectType<Dispatch<'START' | 'PAUSE' | 'RESET'>>(machine2[1]);
