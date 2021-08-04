import { R, use } from "../extras";
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
  & ( { state: MachineT.StateIdentifier.Impl
      , initialState: MachineT.StateIdentifier.Impl
      }
    | { state: undefined
      , initialState: undefined
      }
    )
  & { children: R.Of<MachineT.StateIdentifier.Impl, Node>
    , definition: MachineT.Definition.StateNode.Impl
    }
type AtomicNode = Node & { state: undefined, initialState: undefined }
type CompoundNode = U.Exclude<Node, AtomicNode>
namespace Node {
  export const from = (definition: MachineT.Definition.StateNode.Impl): Node =>
    ({
      ...(
        definition.initial === undefined
          ? { state: undefined, initialState: undefined }
          : { state: definition.initial, initialState: definition.initial }
      ),
      children: R.map(R.fromMaybe(definition.states), from),
      definition,
    })

  export const state = (node: Node): State =>
    isAtomic(node) ? [] :
    [node.state, ...state(currentChild(node))]

  export const initialState = (node: Node): State =>
    isAtomic(node) ? [] :
    [node.initialState, ...state(initialChild(node))]

  export const transition = (node: Node, pureParameter: PureParameter): [Node, State, State] => {
    let [entries, exits] = Node.entriesAndExitsForEvent(node, pureParameter)
    return [Node.doEntries(Node.doExits(node), entries), entries, exits]
  }

  export const entriesAndExitsForEvent = (node: Node, pureParameter: PureParameter) => {
    let nextStateIdentifier = Node.nextStateIdentifier(node, $$root, pureParameter);
    if (!nextStateIdentifier) return [[], []];

    let nextState = Node.nextStateFromNextStateIdentifier(node, nextStateIdentifier);
    if (!nextState) throw new Error(`Invariant: Could not resolve path for ${nextStateIdentifier}`);
    let currentState = pureParameter.event.type === $$initial ? [] : state(node)
    
    return State.entriesAndExits(currentState, nextState);
  }

  export const nextStateFromNextStateIdentifier = (
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
          use(nextStateFromNextStateIdentifier(n, nextStateIdentifier))
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
      ? nextStateIdentifier(initialChild(node), node.initialState, pureParameter) :
    use(
      R.get(
        R.fromMaybe(node.definition.on),
        pureParameter.event.type
      )
    ).as(rootTransition =>
      !rootTransition ? nextStateIdentifier(currentChild(node), node.state, pureParameter) :
      typeof rootTransition === "string" ? rootTransition :
      !rootTransition.guard ? rootTransition.target :
      rootTransition.guard(pureParameter) ? rootTransition.target :
      undefined
    )

  export const doExits = (node: Node): Node =>
    isAtomic(node) ? node :
    ({
      ...node,
      state: node.initialState,
      children: R.map(node.children, (n, i) => i !== node.state ? n : doExits(n))
    })

  export const doEntries = (node: Node, entries: State): Node => {
    if (isAtomic(node)) {
      if (entries.length > 0) {
        throw new Error("Invariant: Attempt to enter states deeper than possible")
      }
      return node;
    }
    let [nextIdentifier, ...tailState] = entries as [
      MachineT.StateIdentifier.Impl?,
      ...MachineT.StateIdentifier.Impl[]
    ]
    if (!nextIdentifier) {
      throw new Error("Invariant: Attempt to enter states shallower than possible")
    }
    return {
      ...node,
      state: nextIdentifier,
      children: R.map(node.children, (n, i) => i !== nextIdentifier ? n : doEntries(n, tailState))
    }
  }
      
  export const currentChild = (compoundNode: CompoundNode) =>
    R.get(compoundNode.children, compoundNode.state)!

  export const initialChild = (compoundNode: CompoundNode) =>
    R.get(compoundNode.children, compoundNode.initialState)!

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