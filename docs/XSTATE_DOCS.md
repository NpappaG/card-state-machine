# XSTATE_DOCS.md
## XState v5 — Single Reference (TypeScript • Next.js 16+ • Bun)

This file is a **compressed, engineer‑ready reference** derived from the official Stately/XState documentation.

---

## 1. What XState Is

XState models application logic using **state machines** and **statecharts**.
- **States** = finite modes
- **Events** = inputs
- **Transitions** = how events move states
- **Context** = extended data
- **Actions** = side effects
- **Guards** = conditions

XState v5 executes logic via the **Actor Model**.
- **Machine** = pure definition
- **Actor** = running instance
- **Snapshot** = immutable output of an actor

---

## 2. Install

```bash
bun add xstate
bun add @xstate/react
```

TypeScript 5+ recommended.

---

## 3. Core Imports

```ts
import { createMachine, createActor, assign, setup } from 'xstate';
```

---

## 4. Defining a Machine

```ts
export const toggleMachine = createMachine({
  id: 'toggle',
  initial: 'inactive',
  states: {
    inactive: { on: { TOGGLE: 'active' } },
    active: { on: { TOGGLE: 'inactive' } }
  }
});
```

---

## 5. Actors

```ts
const actor = createActor(toggleMachine).start();
actor.send({ type: 'TOGGLE' });
actor.subscribe(snap => console.log(snap.value));
```

- Always call `start()`
- `send()` dispatches events
- `subscribe()` receives snapshots

---

## 6. Events & Transitions

```ts
on: {
  SUBMIT: {
    target: 'loading',
    guard: 'isValid',
    actions: 'logSubmit'
  }
}
```

Multiple guards:
```ts
SUBMIT: [
  { guard: 'isValid', target: 'loading' },
  { target: 'editing' }
]
```

Internal transition (no state change):
```ts
UPDATE: { actions: 'updateContext' }
```

---

## 7. Context & assign

```ts
context: { count: 0 }

actions: assign({
  count: ({ context }) => context.count + 1
})
```

Rules:
- Context is immutable
- Update only via `assign`
- Use `input` to seed context at startup

---

## 8. Actions

### Entry / Exit
```ts
entry: 'start'
exit: 'stop'
```

### Built‑ins
- `assign`
- `raise`
- `sendTo`
- `stopChild`
- `cancel`
- `log`
- `enqueueActions`

⚠️ Built‑ins must be **returned**, not called inside custom actions.

---

## 9. Guards

```ts
guard: ({ context }) => context.count < 5
guard: 'isAuthorized'
```

Guards are:
- synchronous
- pure
- side‑effect free

---

## 10. Delays

```ts
after: { 2000: 'timeout' }
```

---

## 11. Hierarchical States

```ts
form: {
  initial: 'editing',
  states: {
    editing: {},
    submitting: {}
  }
}
```

- Child checked before parent
- Parent can handle shared transitions

---

## 12. Parallel States

```ts
type: 'parallel',
states: {
  auth: {...},
  theme: {...}
}
```

State value:
```ts
{ auth: 'loggedIn', theme: 'dark' }
```

---

## 13. Final States & onDone

```ts
done: { type: 'final' }
```

```ts
onDone: { target: 'next' }
```

Top‑level final state stops the actor.

---

## 14. History States

```ts
hist: { type: 'history' }
```

- Shallow: remembers direct child
- Deep: remembers full subtree

---

## 15. Async Logic (invoke)

```ts
invoke: {
  src: fetchUser,
  onDone: { target: 'success' },
  onError: { target: 'error' }
}
```

Supports:
- `fromPromise`
- `fromCallback`
- `fromObservable`
- child machines

---

## 16. Spawning Actors

```ts
actions: assign({
  worker: ({ spawn }) => spawn(workerLogic, { id: 'worker' })
})
```

Stop manually with:
```ts
stopChild('worker')
```

---

## 17. Actor Communication

```ts
sendTo('childId', { type: 'PING' })
sendTo(({ context }) => context.childRef, { type: 'PING' })
```

Prefer explicit refs over `sendParent`.

---

## Project Notes (Card Game)

- `canPlaySelectedCards` allows one or more selected cards as long as all match the top discard rank.

---

## 18. Tags & Meta

```ts
tags: ['loading']
meta: { description: 'Fetching data' }
```

```ts
snapshot.hasTag('loading')
snapshot.getMeta()
```

---

## 19. Snapshots

```ts
snapshot.value
snapshot.context
snapshot.matches('state')
snapshot.can({ type: 'EVENT' })
snapshot.hasTag('tag')
```

---

## 20. TypeScript (setup)

```ts
const machine = setup({
  types: {
    context: {} as { count: number },
    events: {} as { type: 'INC' } | { type: 'DEC' }
  },
  actions: {
    inc: assign({ count: ({ context }) => context.count + 1 })
  }
}).createMachine({
  context: { count: 0 },
  initial: 'active',
  states: {
    active: { on: { INC: { actions: 'inc' } } }
  }
});
```

Benefits:
- Typed `send()`
- Typed `context`
- Typed actions & guards

---

## 21. React / Next.js 16+

```tsx
'use client';
import { useMachine } from '@xstate/react';

const [snap, send] = useMachine(machine);
```

Guidelines:
- Client components only
- Machines defined outside components
- Use events (not input changes) for updates
- Persist snapshots for continuity

---

## 22. Persistence

```ts
const snapshot = actor.getPersistedSnapshot();
createActor(machine, { snapshot }).start();
```

Restores:
- state value
- context
- child actors

Entry actions do NOT re‑run.

---

## 23. Testing

Pure:
```ts
machine.transition('idle', { type: 'START' })
```

Actor:
```ts
actor.send({ type: 'INC' });
expect(actor.getSnapshot().context.count).toBe(1);
```

---

## 24. Best Practices

- States = modes, Context = data
- Prefer hierarchy over duplication
- Prefer invoke over async actions
- Use parallel states only for orthogonal concerns
- Type events early
- Keep actions small
- Visualize machines often

---

## 25. Cheatsheet

```ts
createMachine({...})
createActor(machine).start()
assign({...})
sendTo(actor, event)
invoke / spawn
type: 'parallel'
type: 'final'
after: { ms: 'state' }
```

---

END OF FILE
