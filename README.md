<p align="center">
<img src="https://user-images.githubusercontent.com/33676/111815108-4695b900-88a9-11eb-8b61-3c45b40d4df6.png" width="250" alt=""/>
</p>

**The ½ kb _state machine_ hook for React:**

- Feature complete (Entry/exit callbacks, Guarded transitions & Extended State - Context)
- Heavy focus on type inference (you get auto completion for both TypeScript & JavaScript users without having to manually define the typings)
- Idiomatic React patterns (Since it's built on top of React's useReducer & useEffect, might as well...)

<img width="400" alt="size_badge" src="https://user-images.githubusercontent.com/33676/120556214-ce2b9800-c3c1-11eb-9a55-f9fa4e1fbbe4.png">

**This docs are for the 1.0.0 version (currently in beta). [Older 0.x.x docs](https://github.com/cassiozen/useStateMachine/tree/b2eea57d877d3b379aa2b86c5301ebbad7515fd9#readme)**

## Examples

- Examples Walkthrough video: [YouTube](https://youtu.be/YjeKgDP4rpg)
- Complex UI (Hiding and showing UI Elements based on the state) - [CodeSandbox](https://codesandbox.io/s/github/cassiozen/usestatemachine/tree/main/examples/timer?file=/index.tsx) - [Source](./examples/timer)
- Async orchestration (Fetch data with limited retry) - [CodeSandbox](https://codesandbox.io/s/github/cassiozen/usestatemachine/tree/main/examples/fetch?file=/index.tsx) - [Source](./examples/fetch)
- Sending data with events (Form) - [CodeSandbox](https://codesandbox.io/s/github/cassiozen/usestatemachine/tree/main/examples/form?file=/index.tsx) - [Source](./examples/form)

## Installation

```bash
$ npm install @cassiozen/usestatemachine
```

## Sample Usage

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

// Refers to the TOGGLE event name for the state we are currently in.

send('TOGGLE');

// Logs: Just entered the Active state

console.log(state); // { value: 'active', nextEvents: ['TOGGLE'] }
```

## What's up with the double parenthesis?

useStateMachine is a curried function (Yummm tasty!) because TypeScript doesn't yet support [partial generics type inference](https://github.com/microsoft/TypeScript/issues/14400).
This workaround allows TypeScript developers to provide a custom type for the context while still having TypeScript infer all the types used in the configuration (Like the state & transitions names, etc...).

# API

## useStateMachine

```typescript
const [state, send] = useStateMachine(/* Optional Context */)(/* Configuration */);
```

`useStateMachine` takes a JavaScript object as context (optional, see below) and one as the state machine configuration. It returns an array consisting of a `current machine state` object and a `send` function to trigger transitions.

### Machine state

The `state` consists of 4 properties: `value`, `event`, `nextEvents` and `context`.

`value` (string): Returns the name of the current state.

`event` (eventObject: `{type: string}`; Optional): The name of the last sent event that led to this state.

`nextEvents` (`string[]`): An array with the names of available events to trigger transitions from this state.

`context`: The state machine extended state. See "Extended State" below.

### Send events

`send` takes an event as argument, provided in shorthand string format (e.g. "TOGGLE") or as an event object (e.g. `{ type: "TOGGLE" }`)

If the transition exists in the configuration object for that state, and is allowed (see guard), it will change the state machine state and execute effects.

## State Machine configuration

The configuration object should contain:

- initial: The initial state node this machine should be in
- verbose(optional): If true, will log every context & state changes. Log messages will be stripped out in the production build.
- states: Define each of the possible states:

```typescript
const [state, send] = useStateMachine()({
  initial: 'inactive',
  verbose: true,
  states: {
    inactive: {},
    active: {},
  },
});
```

### Events & Transition Syntax

A state transition defines what the next state is, given the current state and event. State transitions are defined on state nodes, in the `on` property:

```js
on: {
  TOGGLE: 'active';
}

// (Where TOGGLE stands for an event name that will trigger a transition.)
```

Or using the extended, object syntax, which allows for more control over the transition (like adding guards):

```js
on: {
  TOGGLE: {
    target: 'active',
  },
};
```

### Effects (entry/exit callbacks)

Effects are triggered when the state machine enters a given state. If you return a function from your effect, it will be invoked when leaving that state (similarly to how useEffect works in React).

```typescript
const [state, send] = useStateMachine()({
  initial: 'active',
  states: {
    active: {
      on: { TOGGLE: 'inactive' },
      effect({ send, setContext, event, context }) {
        console.log('Just entered the Active state');
        return () => console.log('Just Left the Active state');
      },
    },
  },
});
```

The effect function receives an object as parameter with four keys:

- `send`: Takes an event as argument, provided in shorthand string format (e.g. "TOGGLE") or as an event object (e.g. `{ type: "TOGGLE" }`)
- `setContext`: Takes an updater function as parameter to set a new context (more on context below). Returns an object with `send`, so you can set the context and send an event on a single line.
- `event`: The event that triggered a transition to this state. (The event parameter always uses the object format (e.g. `{ type: 'TOGGLE' }`).).
- `context` The context at the time the effect runs.

In this example, the state machine will always send the "RETRY" event when entering the error state:

```typescript
const [state, send] = useStateMachine()({
  initial: 'loading',
  states: {
    /* Other states here... */
    error: {
      on: {
        RETRY: 'load',
      },
      effect({ send }) {
        send('RETRY');
      },
    },
  },
});
```

### Guards

You can set up a guard per transition, using the transition object syntax. Guard run before actually running the transition: If the guard returns false the transition will be denied.

```js
const [state, send] = useStateMachine()({
  initial: 'inactive',
  states: {
    inactive: {
      on: {
        TOGGLE: {
          target: 'active',
          guard({ context, event }) {
            // Return a boolean to allow or block the transition
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

The guard function receives an object with the current context and the event. The event parameter always uses the object format (e.g. `{ type: 'TOGGLE' }`).

### Extended state (context)

Besides the finite number of states, the state machine can have extended state (known as context).

You can provide the initial context value as the first argument to the State Machine hook, and use the `setContext` function within your effects to change the context:

```js
const [state, send] = useStateMachine({ toggleCount: 0 })({
  initial: 'inactive',
  states: {
    inactive: {
      on: { TOGGLE: 'active' },
    },
    active: {
      on: { TOGGLE: 'inactive' },
      effect({ setContext }) {
        setContext(context => ({ toggleCount: context.toggleCount + 1 }));
      },
    },
  },
});

console.log(state); // { context: { toggleCount: 0 }, value: 'inactive', nextEvents: ['TOGGLE'] }

send('TOGGLE');

console.log(state); // { context: { toggleCount: 1 }, value: 'active', nextEvents: ['TOGGLE'] }
```

#### Context Typing

The context types are inferred automatically in TypeScript, but you can provide you own typing if you want to be more specific:

```typescript
const [state, send] = useStateMachine<{ toggleCount: number }>({ toggleCount: 0 })({
  initial: 'inactive',
  states: {
    inactive: {
      on: { TOGGLE: 'active' },
    },
    active: {
      on: { TOGGLE: 'inactive' },
      effect({ setContext }) {
        setContext(context => ({ toggleCount: context.toggleCount + 1 }));
      },
    },
  },
});
```

## Wiki

- [Sending data with events](https://github.com/cassiozen/useStateMachine/wiki/Sending-data-with-Events)
- [Updating from version 0.x.x to 1.0](https://github.com/cassiozen/useStateMachine/wiki/Updating-from-0.X.X-to-1.0.0)
- [Contributing](https://github.com/cassiozen/useStateMachine/wiki/Contributing-to-useStateMachine)
- [Comparison with XState](https://github.com/cassiozen/useStateMachine/wiki/XState-comparison)
- [Source code walkthrough video](https://github.com/cassiozen/useStateMachine/wiki/Source-code-walkthrough-video)
- [Usage with Preact](https://github.com/cassiozen/useStateMachine/wiki/Usage-with-Preact)

## Contributors ✨

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="http://YouTube.com/ReactCasts"><img src="https://avatars.githubusercontent.com/u/33676?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Cassio Zen</b></sub></a><br /><a href="https://github.com/cassiozen/useStateMachine/commits?author=cassiozen" title="Code">💻</a> <a href="https://github.com/cassiozen/useStateMachine/commits?author=cassiozen" title="Documentation">📖</a> <a href="https://github.com/cassiozen/useStateMachine/commits?author=cassiozen" title="Tests">⚠️</a> <a href="#ideas-cassiozen" title="Ideas, Planning, & Feedback">🤔</a> <a href="https://github.com/cassiozen/useStateMachine/issues?q=author%3Acassiozen" title="Bug reports">🐛</a></td>
    <td align="center"><a href="https://github.com/RunDevelopment"><img src="https://avatars.githubusercontent.com/u/20878432?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Michael Schmidt</b></sub></a><br /><a href="https://github.com/cassiozen/useStateMachine/commits?author=RunDevelopment" title="Code">💻</a> <a href="https://github.com/cassiozen/useStateMachine/commits?author=RunDevelopment" title="Tests">⚠️</a> <a href="#ideas-RunDevelopment" title="Ideas, Planning, & Feedback">🤔</a></td>
    <td align="center"><a href="https://icyjoseph.dev/"><img src="https://avatars.githubusercontent.com/u/21013447?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Joseph</b></sub></a><br /><a href="https://github.com/cassiozen/useStateMachine/commits?author=icyJoseph" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/mutewinter"><img src="https://avatars.githubusercontent.com/u/305901?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Jeremy Mack</b></sub></a><br /><a href="https://github.com/cassiozen/useStateMachine/commits?author=mutewinter" title="Documentation">📖</a></td>
    <td align="center"><a href="https://github.com/devronhansen"><img src="https://avatars.githubusercontent.com/u/20226404?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Ron</b></sub></a><br /><a href="https://github.com/cassiozen/useStateMachine/commits?author=devronhansen" title="Documentation">📖</a></td>
    <td align="center"><a href="https://v01.io"><img src="https://avatars.githubusercontent.com/u/32771?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Klaus Breyer</b></sub></a><br /><a href="https://github.com/cassiozen/useStateMachine/commits?author=klausbreyer" title="Documentation">📖</a></td>
    <td align="center"><a href="https://linktr.ee/arthurdenner"><img src="https://avatars.githubusercontent.com/u/13774309?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Arthur Denner</b></sub></a><br /><a href="https://github.com/cassiozen/useStateMachine/commits?author=arthurdenner" title="Code">💻</a> <a href="https://github.com/cassiozen/useStateMachine/issues?q=author%3Aarthurdenner" title="Bug reports">🐛</a> <a href="https://github.com/cassiozen/useStateMachine/commits?author=arthurdenner" title="Tests">⚠️</a> <a href="#ideas-arthurdenner" title="Ideas, Planning, & Feedback">🤔</a></td>
  </tr>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!
