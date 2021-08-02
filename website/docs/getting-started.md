---
sidebar_position: 1
title: Getting Started
---

# Getting Started

## install

```shell
npm install @cassiozen/usestatemachine
```

## Sample Usage

```ts twoslash
import useStateMachine from '@cassiozen/usestatemachine';
// ---cut---
const [state, send] = useStateMachine({
  initial: 'inactive',
  states: {
    inactive: {
      on: { TOGGLE: 'active' },
    },
    active: {
      on: { TOGGLE: 'inactive' },
      effect() {
        console.log('Just entered the Active state');
        // Same cleanup pattern as `useEffect`:
        // If you return a function, it will run when exiting the state.
        return () => console.log('Just Left the Active state');
      },
    },
  },
});

console.log(state); // { value: 'inactive', nextEvents: ['TOGGLE'] }

// Refers to the TOGGLE event name for the state we are currently in.

send('TOGGLE');

// Logs: Just entered the Active state

console.log(state); // { value: 'active', nextEvents: ['TOGGLE'] }
```
