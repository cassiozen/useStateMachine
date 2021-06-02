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
        expectAssignable<Dispatch<'START' | 'PAUSE' | 'RESET' | { type: 'START' } | { type: 'PAUSE' } | { type: 'RESET' }>>(send);
        expectAssignable<(value: (context: { time: number }) => { time: number }) => void>(update);
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
          guard(context, event) {
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
}>(machine2[0]);
expectAssignable<Dispatch<'START' | 'PAUSE' | 'RESET' | { type: 'START' } | { type: 'PAUSE' } | { type: 'RESET' }>>(machine2[1]);
