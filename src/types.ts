import type  { Dispatch } from 'react';

export type Transition<C> =
  | string
  | {
      target: string;
      guard?: (context: C) => boolean;
    };

export type KeysOfTransition<Obj> = Obj extends { on: { [key: string]: Transition<any> } } ? keyof Obj['on'] : never;

export interface BaseStateConfig<C> {
  on?: {
    [key: string]: Transition<C>;
  };
}

export type ContextUpdater<C> = (updater: (context: C) => C) => void;

export interface MachineStateConfig<C> extends BaseStateConfig<C> {
  effect?: (
    send: Dispatch<string>,
    assign: ContextUpdater<C>
  ) => void | ((send: Dispatch<string>, assign: ContextUpdater<C>) => void);
}

export interface MachineConfig<C> {
  initial: string;
  debug?: boolean;
  states: {
    [key: string]: MachineStateConfig<C>;
  };
}


