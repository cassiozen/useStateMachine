import { doThrow, R, use } from "../extras";
import { F, Machine as MachineT, U } from "../types";

const $$root = "$$root" as MachineT.StateIdentifier.Impl;
const $$initial = "$$initial" as MachineT.Event.Impl["type"];

export const createMachine = (definition: MachineT.Definition.Impl) => {
  let rootNode = Node.from(definition);
  let context = definition.context!;
  let lastEvent: MachineT.Event.Impl;
  let eventQueue = [{ type: $$initial }] as MachineT.Event.Impl[];
  let contextUpdaterQueue = [] as MachineT.ContextUpdater.Impl[]
  let effects = new Map(Node.effectEntries(rootNode, $$root))
  let effectCleanups = new Map<
    MachineT.StateIdentifier.Impl,
    (p: MachineT.EffectParameter.Cleanup.Impl) => void
  >();
  let isTransiting = false;
  let listeners = [] as (() => void)[];

  const send = (sendable: MachineT.Sendable.Impl) => {
    eventQueue.push(typeof sendable === "string" ? { type: sendable } : sendable);
    if (!isTransiting) transition();
  }
  
  const setContext = (updater: MachineT.ContextUpdater.Impl) => {
    contextUpdaterQueue.push(updater)
    return { send }
  }

  const pureParameter = () => ({ context, event: lastEvent });
  const effectParameter = () => ({ ...pureParameter(), setContext, send });

  const transition = () => {
    isTransiting = true;
    let event = eventQueue.shift();
    if (!event) throw new Error("Invariant: `transition` called with no events in queue");
    lastEvent = event;

    let [newRootNode, entries, exits] = Node.transition(rootNode, pureParameter())
    
    for (let identifier of exits.slice().reverse()) {
      let cleanup = effectCleanups.get(identifier);
      if (!cleanup) throw new Error(`Invariant: Expected a cleanup for "${identifier}", found none`);
      cleanup(effectParameter());
    }

    for (let identifier of entries) {
      let effect = effects.get(identifier)
      if (!effect) throw new Error(`Invariant: Expected an effect for "${identifier}", found none`);
      let cleanup = effect(effectParameter());
      effectCleanups.set(identifier, cleanup);
    }

    rootNode = newRootNode;
    context = contextUpdaterQueue.reduce((c, f) => f(c), context)
    if (eventQueue.length > 0) {
      transition();
    } else {
      isTransiting = false;
      for (let l of listeners) l();
    }
  }
  transition();

  return {
    get state() { return Node.state(rootNode).join(".") },
    get context() { return context },
    get event() { return lastEvent },
    send,
    subscribe: (f: () => void) => {
      listeners.push(f)
      return () => void listeners.splice(listeners.indexOf(f), 1);
    }
  }
}
type PureParameter =
  { context: MachineT.Context.Impl
  , event: MachineT.Event.Impl
  }

type Node =
  & ( { current: MachineT.StateIdentifier.Impl
      , initial: MachineT.StateIdentifier.Impl
      }
    | { current: undefined
      , initial: undefined
      }
    )
  & { children: R.Of<MachineT.StateIdentifier.Impl, Node>
    , definition: MachineT.Definition.StateNode.Impl
    }
type AtomicNode = Node & { current: undefined, initial: undefined }
type CompoundNode = U.Exclude<Node, AtomicNode>
namespace Node {
  export const from = (definition: MachineT.Definition.StateNode.Impl): Node =>
    ({
      ...(
        definition.initial === undefined
          ? { current: undefined, initial: undefined }
          : { current: definition.initial, initial: definition.initial }
      ),
      children: R.map(R.fromMaybe(definition.states), from),
      definition,
    })

  export const state = (node: Node): State =>
    isAtomic(node) ? [] :
    [node.current, ...state(currentChild(node))]

  export const initialState = (node: Node): State =>
    isAtomic(node) ? [] :
    [node.initial, ...state(initialChild(node))]

  export const transition = (node: Node, pureParameter: PureParameter): [Node, State, State] =>
    use(Node.entriesAndExits(node, pureParameter))
    .as(([entries, exits]) =>
      [Node.doEntries(Node.doExits(node), entries), entries, exits]
    )

  export const entriesAndExits = (node: Node, pureParameter: PureParameter): [State, State] =>
    use(Node.nextStateIdentifier(node, $$root, pureParameter))
    .as(nextStateIdentifier =>
      !nextStateIdentifier ? [[], []] :
      use(Node.nextState(node, nextStateIdentifier))
      .as(nextState =>
        !nextState
          ? doThrow(new Error(`Invariant: Could not resolve path for ${nextStateIdentifier}`))
          : State.entriesAndExits(
              pureParameter.event.type === $$initial ? [] : state(node),
              nextState
            )
      )
    )

  export const nextState = (
    node: Node,
    nextStateIdentifier: MachineT.StateIdentifier.Impl
  ): State | undefined =>
    isAtomic(node)
      ? undefined :
    use(R.find(node.children, (_, k) => k === nextStateIdentifier))
    .as(foundNode =>
      foundNode ? [nextStateIdentifier, ...initialState(foundNode)] :
      R.find(
        R.map(node.children, (n, k) =>
          use(nextState(n, nextStateIdentifier))
          .as(foundState =>
            !foundState ? undefined : [k, ...foundState]
          )
        ),
        Boolean
      )
    )

  export const nextStateIdentifier = (
    node: Node,
    identifier: MachineT.StateIdentifier.Impl,
    pureParameter: PureParameter
  ): MachineT.StateIdentifier.Impl | undefined =>
    isAtomic(node)
      ? identifier :
    pureParameter.event.type === $$initial
      ? nextStateIdentifier(initialChild(node), node.initial, pureParameter) :
    use(
      R.get(
        R.fromMaybe(node.definition.on),
        pureParameter.event.type
      )
    ).as(rootTransition =>
      !rootTransition ? nextStateIdentifier(currentChild(node), node.current, pureParameter) :
      typeof rootTransition === "string" ? rootTransition :
      !rootTransition.guard ? rootTransition.target :
      rootTransition.guard(pureParameter) ? rootTransition.target :
      undefined
    )

  export const doExits = (node: Node): Node =>
    isAtomic(node) ? node :
    ({
      ...node,
      current: node.initial,
      children: R.map(node.children, (n, i) => i !== node.current ? n : doExits(n))
    })

  export const doEntries = (node: Node, entries: State): Node =>
    isAtomic(node)
      ? entries.length > 0
        ? doThrow(new Error("Invariant: Attempt to enter states deeper than possible"))
        : node :
    use(entries as [
      MachineT.StateIdentifier.Impl?,
      ...MachineT.StateIdentifier.Impl[]
    ])
    .as(([nextIdentifier, ...tailState]) => 
      !nextIdentifier
        ? doThrow(new Error("Invariant: Attempt to enter states shallower than possible"))
        : ({
            ...node,
            current: nextIdentifier,
            children: R.map(node.children, (n, i) => i !== nextIdentifier ? n : doEntries(n, tailState))
          })
    )
      
  export const currentChild = (compoundNode: CompoundNode) =>
    R.get(compoundNode.children, compoundNode.current)!

  export const initialChild = (compoundNode: CompoundNode) =>
    R.get(compoundNode.children, compoundNode.initial)!

  export const isAtomic = (node: Node): node is AtomicNode =>
    R.isEmpty(node.children)


  export const effectEntries = (
    node: Node,
    identifier: MachineT.StateIdentifier.Impl
  ): [MachineT.StateIdentifier.Impl, Effect][] =>
    [
      [identifier, Effect.from(node.definition.effect)],
      ...(
        isAtomic(node) ? []:
        R.reduce(
          node.children,
            (es, v, k) => [...es, ...effectEntries(v, k)],
          [] as [MachineT.StateIdentifier.Impl, Effect][]
        )
      )
    ]
}

type State = MachineT.StateIdentifier.Impl[];
namespace State {
  export const entriesAndExits = (from: State, to: State): [State, State] =>
    from.length === 0 ? [to, []] :
    to.length === 0 ? [[], from] :
    from[1] === to[1] ? entriesAndExits(from.slice(1), to.slice(1)) :
    [to, from]
}

type Effect = F.Call<typeof Effect["from"]>
namespace Effect {
  export const from = (effect?: MachineT.Definition.Effect.Impl) =>
    (p: MachineT.EffectParameter.Impl) => {
      let cleanup = effect?.(p)

      return (p: MachineT.EffectParameter.Cleanup.Impl) => {
        cleanup?.(p);
      }
    }
}