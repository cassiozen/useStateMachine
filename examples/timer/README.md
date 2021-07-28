# Example

To run this example:

- `npm install` or `yarn`
- `npm start` or `yarn start`

## Local Development

For local development, you'll have to update `package.json` and `tsconfig.json`:

**package.json**

1. Remove everything but "react-dom" from `dependencies`

2. Add an `alias` section pointing to usestatemachine in the dist folder and React from the main node_modules.

```json
  "alias": {
    "react": "../../node_modules/react",
    "scheduler/tracing": "../../node_modules/scheduler/tracing-profiling",
    "@cassiozen/usestatemachine": "../../dist"
  },
```

**tsconfig.json**

1. Add a `paths` section pointing to usestatemachine in the dist folder.

```json
    "paths": {
      "@cassiozen/usestatemachine": ["../../dist/index"],
    },
```


Finally, run `npm start` on both the root library and on this example folder.