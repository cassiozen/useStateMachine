# React State Machine

0.5 kb State Machine hooks for React.

Inspired by XState, but with:

- Heavy focus on type inference (auto completion for both TypeScript & JavaScript users)
- Since it's built on top of React, might as well follow more idiomatic react patterns


## Basic Usage

```js
const [state, send] =  useStateMachine({
  initial: 'inactive',
  states: {
    inactive: {
      on: { TOGGLE: 'active' },
    },
    active: {
      on: { TOGGLE: 'inactive' },
    },
  },
})

console.log(state) // { value: 'inactive', nextEvents: ['TOGGLE'] }

send('TOGGLE')

console.log(state) // { value: 'active', nextEvents: ['TOGGLE'] }

```

## Effects

You can define effects to run when entering a particular state.
Effects follow the same pattern as `useEffect`: If you return a function from your effect, it will run when exiting this state.

```js
const [state, send] =  useStateMachine({
  initial: 'inactive',
  states: {
    inactive: {
      on: { TOGGLE: 'active' },
    },
    active: {
      on: { TOGGLE: 'inactive' },
      effect: () => {
        console.log("Just entered the Active state")
        return () => console.log("Just Left the Active state")
      }
    },
  },
})

```

## Guards

You can set up a guard per transition, using the transition object syntax (instead of the shorthand string syntax). Guard run before actually running the transition: If the guard returns false the transition will be denied.

```js
const [state, send] =  useStateMachine({
  initial: 'inactive',
  states: {
    inactive: {
      on: { 
        TOGGLE: {
          target: 'active',
          guard: (stateName, eventName) => {
            // Return a bollean to allow or block the transition
          }
        }
      },
    },
    active: {
      on: { TOGGLE: 'inactive' },
    },
  },
})

```

## Extended state (context)

Besides the finite number of states, state machines can have extended state (known as context).

useStateChart is a curried function, because of a [limitation on inference for generics in TypeScript](https://github.com/microsoft/TypeScript/issues/14400).

Notice that you can only update the context by using the update function provided as parameter to your effects:

```js
useStateChart<{ toggleCount: number }>({ toggleCount: 0 })({
  initial: 'inactive',
  states: {
    inactive: {
      on: { TOGGLE: 'active' },
    },
    active: {
      on: { TOGGLE: 'inactive' },
      effect: update => {
        update(context => ({ toggleCount: context.toggleCount + 1 }));
      },
    },
  },
})

```