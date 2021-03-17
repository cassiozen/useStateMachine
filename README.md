# React State Machine

**The ½ kb _state machine_ hook for React:**

```typescript
const [state, send] = useStateMachine(/* Context */)(/* Configuration */);
```

## Features

- Effects (Entry/exit transition callbacks)
- Guarded transitions
- Extended State (Context)
- Heavy focus on type inference (auto completion for both TypeScript & JavaScript users)
- Idiomatic react patterns (Since it's built on top of React, might as well...)

## Basic Usage

```typescript
const [state, send] = useStateMachine()({
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

send('TOGGLE');

// Logs: Just entered the Active state

console.log(state); // { value: 'active', nextEvents: ['TOGGLE'] }
```

## What's up with the double parenthesis?

useStateMachine is a curried function because TypeScript doesn't yet support [partial gerenics type inference](https://github.com/microsoft/TypeScript/issues/14400).
This work around allows TypeScript developers to provide the extended state type while still having TypeScript infer the configuration types.

## Transition Syntax

Transitions can be configured using a shorthand syntax:

```js
on: {
  TOGGLE: 'active';
}
```

Or the extended, object syntax, which allows for more control over the transition (like adding guards):

```js
on: {
  TOGGLE: {
    target: 'active',
  },
};
```

## Guards

You can set up a guard per transition, using the transition object syntax. Guard run before actually running the transition: If the guard returns false the transition will be denied.

```js
const [state, send] = useStateMachine()({
  initial: 'inactive',
  states: {
    inactive: {
      on: {
        TOGGLE: {
          target: 'active',
          guard(stateName, eventName) {
            // Return a bollean to allow or block the transition
          },
        },
      },
    },
    active: {
      on: { TOGGLE: 'inactive' },
    },
  },
});
```

## Extended state (context)

Besides the finite number of states, the state machine can have extended state (known as context).

You can provide the initial context value as the first argument to the State Machine hook, and use the update function whithin your effects to change the context:

```js
const [state, send] = useStateMachine({ toggleCount: 0 })({
  initial: 'idle',
  states: {
    inactive: {
      on: { TOGGLE: 'active' },
    },
    active: {
      on: { TOGGLE: 'inactive' },
      effect(update) {
        update(context => ({ toggleCount: context.toggleCount + 1 }));
      },
    },
  },
});

console.log(state); // { context: { toggleCount: 0 }, value: 'inactive', nextEvents: ['TOGGLE'] }

send('TOGGLE');

console.log(state); // { context: { toggleCount: 1 }, value: 'active', nextEvents: ['TOGGLE'] }
```

The context is inferred automatically in TypeScript, but you can provide you own type if you want to be more specific:

```typescript
const [state, send] = useStateMachine<{ toggleCount: number }>({ toggleCount: 0 })({
  initial: 'idle',
  states: {
    inactive: {
      on: { TOGGLE: 'active' },
    },
    active: {
      on: { TOGGLE: 'inactive' },
      effect(update) {
        update(context => ({ toggleCount: context.toggleCount + 1 }));
      },
    },
  },
});
```
