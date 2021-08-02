---
sidebar_position: 3
title: Upgrading from 0.x.x
---


Version 1.0 introduces a few API changes:

- No more curried function: Extended state is now declared within the State Machine configuration object
- New signature for `effects` and `guards`

## New Context Configuration:

**Before**

```ts
const [state, send] = useStateMachine(/* Context */)(/* Configuration */);
```

**After**

```ts
const [state, send] = useStateMachine(/* Configuration (including context) */);
```



## `effects` and `guards`:

- Both functions receive a single object with multiple keys instead of multiple parameters.
- Effects now receive the context.
- The context updater function inside `effect` is now called `setContext` instead of `update`.

Here's a diff between the fetch example on versions 0.x.x and 1.0.0:

![Diff](https://user-images.githubusercontent.com/33676/121916961-3d768580-ccfa-11eb-9099-d6ba74fd6018.png)


