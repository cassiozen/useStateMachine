import { createMachine } from "."

describe("createMachine", () => {
  it("works", () => {
    let machine = createMachine({
      initial: "b",
      states: {
        a: {
          initial: "a1",
          states: {
            a1: {},
            a2: {}
          }
        },
        b: {
          initial: "b1",
          states: {
            b1: {},
            b2: {}
          },
          on: {
            X: "a2"
          }
        }
      }
    } as any)

    expect(machine.state).toBe("b.b1")
    machine.send("X" as any);
    expect(machine.state).toBe("a.a2")
  })
})