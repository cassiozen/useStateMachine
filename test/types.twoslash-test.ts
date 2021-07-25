/* eslint-disable react-hooks/rules-of-hooks */
import { A, LS, UseStateMachine } from "../src/types";

const useStateMachine = (() => []) as any as UseStateMachine;
const t = <T>() => null as any as T

const query = () => (global as any).twoSlashQueries.shift()

describe("Machine.Definition", () => {

  describe("Machine.Definition['initial']", () => {
    it("expects one of the child state identifiers", () => {
      useStateMachine({
        initial: "a",
        states: {
          a: {},
          b: {}
        }
      })

      useStateMachine({
        // @ts-expect-error
        initial: "",
        states: {
          a: {},
          b: {}
        }
      })
    })

    it("shows child state identifiers as completions", () => {
      useStateMachine({
        // @ts-expect-error
        initial: "  ",
        //         ^|
        states: {
          a: {},
          b: {}
        }
      })

      expect(query().completions).toStrictEqual(["a", "b"])
    })
  
    it("shows custom error in case of no states", () => {
      useStateMachine({
        // @ts-expect-error
        initial: ""
        // ^?
      })
      expect(query().text).toContain(`"Error: no states defined"`)

      useStateMachine({
        // @ts-expect-error
        initial: "Error: no states defined"
      })
    })
  }) 

  describe("Machine.Definition['states']", () => {
    it("expects only strings as key", () => {
      useStateMachine({
        initial: "a",
        states: {
          a: {}
        }
      })

      useStateMachine({
        initial: 1,
        states: {
          // @ts-expect-error
          1: {}
        }
      })
    })
  
    it("shows custom error in case of identifiers other than string", () => {
      useStateMachine({
        initial: 1,
        states: {
          // @ts-expect-error
          1: {}
      //  ^?
        }
      })
      expect(query().text).toContain(`"Error: Only string identifiers allowed"`)

      useStateMachine({
        initial: 1,
        states: {
          // @ts-expect-error
          1: "Error: Only string identifiers allowed"
        }
      })
    })
  })

  describe("Machine.Definition['schema']", () => {
    it("is optional", () => {
      useStateMachine({
        initial: "a",
        states: { a: {} }
      })
    })

    describe("MachineDefinition['schema']['events']", () => {
      it("is optional", () => {
        useStateMachine({
          schema: {},
          initial: "a",
          states: { a: {} }
        })
      })

      it("expects event payload to extend an object", () => {
        useStateMachine({
          schema: {
            events: {
              X: t<{ foo: number }>()
            }
          },
          initial: "a",
          states: { a: {} }
        })

        useStateMachine({
          schema: {
            events: {
              // @ts-expect-error
              X: t<1>()
            }
          }
        })

        useStateMachine({
          schema: {
            events: {
              // @ts-expect-error
              X: t<"FOO">()
            }
          }
        })
      })

      it("shows custom error in case of not extending an object", () => {
        useStateMachine({
          schema: {
            events: {
              // @ts-expect-error
              X: t<"FOO">()
          //  ^?
            }
          }
        })
        expect(query().text).toContain("Error: An event payload should be an object, eg `t<{ foo: number }>()`")

        useStateMachine({
          schema: {
            events: {
              // @ts-expect-error
              X: t<"Error: An event payload should be an object, eg `t<{ foo: number }>()`">()
            }
          }
        })
      })

      it("expects event payload to not have `type` property", () => {
        useStateMachine({
          schema: {
            events: {
              // @ts-expect-error
              X: t<{ type: number }>()
            }
          },
          initial: "a",
          states: { a: {} }
        })
      })

      it("shows custom error when event payload has a `type` property", () => {
        useStateMachine({
          schema: {
            events: {
              // @ts-expect-error
              X: t<{ type: number, foo: string }>()
          //  ^?
            }
          },
          initial: "a",
          states: { a: {} }
        })

        expect(query().text).toContain(
          "Error: An event payload cannot have a property `type` as it's already defined. In this case as 'X'"
        )

        useStateMachine({
          schema: {
            events: {
              // @ts-expect-error
              X: t<
                "Error: An event payload cannot have a property `type` as it's already defined. In this case as 'X'"
              >()
            }
          },
          initial: "a",
          states: { a: {} }
        })
      })

      it("expects $$exhaustive to be a boolean", () => {
        useStateMachine({
          schema: {
            events: {
              $$exhaustive: true
            }
          },
          initial: "a",
          states: { a: {} }
        })

        useStateMachine({
          schema: {
            events: {
              // @ts-expect-error
              $$exhaustive: 1
            }
          },
          initial: "a",
          states: { a: {} }
        })
      })
    })

    describe("MachineDefinition['schema']['context']", () => {
      it("is optional", () => {
        useStateMachine({
          schema: {},
          initial: "a",
          states: { a: {} }
        })
      })

      it("expects any type", () => {
        useStateMachine({
          schema: { context: t<{ foo?: number }>() },
          context: { foo: 1 },
          initial: "a",
          states: { a: {} }
        })

        useStateMachine({
          schema: { context: t<"foo">() },
          context: "foo",
          initial: "a",
          states: { a: {} }
        })
      })
    })
  })

  describe("Machine.Definition['context']", () => {
    it("honours schema.context", () => {
      // @ts-expect-error
      useStateMachine({
        schema: {
          context: t<{ foo: number }>()
        },
        initial: "a",
        states: { a: {} }
      })

      useStateMachine({
        schema: {
          context: t<{ foo: number }>()
        },
        context: {
          // @ts-expect-error
          foo: ""
        },
        initial: "a",
        states: { a: {} }
      })

      useStateMachine({
        schema: {
          context: t<{ foo: number }>()
        },
        context: { foo: 1 },
        initial: "a",
        states: { a: {} }
      })

      useStateMachine({
        schema: {
          context: t<undefined>()
        },
        // @ts-expect-error
        context: { foo: 1 },
        initial: "a",
        states: { a: {} }
      })

      useStateMachine({
        schema: {},
        context: { foo: 1 },
        initial: "a",
        states: { a: {} }
      })

      useStateMachine({
        context: { foo: 1 },
        initial: "a",
        states: { a: {} }
      })
    })

    it("doesn't infer narrowest", () => {
      let [state] = useStateMachine({
        schema: {},
        context: { foo: "hello" },
        initial: "a",
        states: { a: {} }
      })
      A.test(A.areEqual<typeof state.context.foo, string>())
    })
  })

  describe("Machine.Definition['verbose']", () => {
    it("expects boolean", () => {
      useStateMachine({
        initial: "a",
        states: { a: {} },
        verbose: true
      })

      useStateMachine({
        initial: "a",
        states: { a: {} },
        // @ts-expect-error
        verbose: 1
      })
    })
  })

  describe("Machine.Definition.On", () => {
    it("expects only strings as key", () => {
      useStateMachine({
        initial: "a",
        states: {
          a: {
            on: {
              X: "a"
            }
          }
        },
        on: {
          Y: "a"
        }
      })

      useStateMachine({
        initial: "a",
        states: {
          a: {
            on: {
              // @ts-expect-error
              1: "a"
            }
          }
        },
        on: {
          // @ts-expect-error
          2: "a"
        }
      })
    })
  
    it("shows custom error in case of identifiers other than string", () => {
      useStateMachine({
        initial: "a",
        states: {
          a: {
            on: {
              // @ts-expect-error
              1: "a"
          //  ^?
            }
          }
        }
      })
      expect(query().text).toContain(`"Error: only string types allowed"`)

      useStateMachine({
        initial: "a",
        states: {
          a: {
            on: {
              // @ts-expect-error
              1: "Error: only string types allowed"
            }
          }
        }
      })

      useStateMachine({
        initial: "a",
        states: {
          a: {}
        },
        on: {
          // @ts-expect-error
          1: "a"
      //  ^?
        }
      })
      expect(query().text).toContain(`"Error: only string types allowed"`)

      useStateMachine({
        initial: "a",
        states: {
          a: {}
        },
        on: {
          // @ts-expect-error
          1: "Error: only string types allowed"
        }
      })
    })

    it("expects $$exhaustive to not be a key", () => {
      useStateMachine({
        initial: "a",
        states: {
          a: {
            on: {
              //@ts-expect-error
              $$exhaustive: "a"
            }
          }
        },
        on: {
          //@ts-expect-error
          $$exhaustive: "a"
        }
      })
    })
    
    it("shows custom error in case of $$exhaustive as a key", () => {
      useStateMachine({
        initial: "a",
        states: {
          a: {
            on: {
              // @ts-expect-error
              $$exhaustive: "a"
              // ^?
            }
          }
        }
      })

      expect(query().text).toContain("Error: '$$exhaustive' is a reversed name")

      useStateMachine({
        initial: "a",
        states: {
          a: {
            on: {
              // @ts-expect-error
              $$exhaustive: "Error: '$$exhaustive' is a reversed name"
            }
          }
        }
      })

      useStateMachine({
        initial: "a",
        states: {
          a: {}
        },
        on: {
          // @ts-expect-error
          $$exhaustive: "a"
          // ^?
        }
      })

      expect(query().text).toContain("Error: '$$exhaustive' is a reversed name")

      useStateMachine({
        initial: "a",
        states: {
          a: {}
        },
        on: {
          // @ts-expect-error
          $$exhaustive: "Error: '$$exhaustive' is a reversed name"
        }
      })
    })

    it("honours schema.event", () => {
      useStateMachine({
        schema: {
          events: {
            $$exhaustive: true,
            X: {},
            Y: {}
          }
        },
        initial: "a",
        states: {
          a: {
            on: {
              X: "a",
              Y: "a",
              // @ts-expect-error
              Z: "a"
            }
          }
        },
        on: {
          X: "a",
          Y: "a",
          // @ts-expect-error
          Z: "a"
        }
      })
      
      useStateMachine({
        schema: {
          events: {
            $$exhaustive: false,
            X: {},
            Y: {}
          }
        },
        initial: "a",
        states: {
          a: {
            on: {
              Z: "a"
            }
          }
        },
        on: {
          Z: "a"
        }
      })

      useStateMachine({
        schema: {
          events: {
            X: {},
            Y: {}
          }
        },
        initial: "a",
        states: {
          a: {
            on: {
              Z: "a"
            }
          }
        },
        on: {
          Z: "a"
        }
      })
    })

    it("shows custom error in case of violation of schema.events", () => {
      useStateMachine({
        schema: {
          events: {
            $$exhaustive: true,
            X: {},
            Y: {}
          }
        },
        initial: "a",
        states: {
          a: {
            on: {
              X: "a",
              Y: "a",
              // @ts-expect-error
              Z: "a"
          //  ^?
            }
          }
        }
      })
      expect(query().text).toContain(
        "Error: Event type 'Z' is not found in schema.events which is marked as exhaustive"
      )

      useStateMachine({
        schema: {
          events: {
            $$exhaustive: true,
            X: {},
            Y: {}
          }
        },
        initial: "a",
        states: {
          a: {
            on: {
              X: "a",
              Y: "a",
              // @ts-expect-error
              Z: "Error: Event type 'Z' is not found in schema.events which is marked as exhaustive"
            }
          }
        }
      })

      useStateMachine({
        schema: {
          events: {
            $$exhaustive: true,
            X: {},
            Y: {}
          }
        },
        initial: "a",
        states: {
          a: {}
        },
        on: {
          X: "a",
          Y: "a",
          // @ts-expect-error
          Z: "a"
      //  ^?
        }
      })
      expect(query().text).toContain(
        "Error: Event type 'Z' is not found in schema.events which is marked as exhaustive"
      )

      useStateMachine({
        schema: {
          events: {
            $$exhaustive: true,
            X: {},
            Y: {}
          }
        },
        initial: "a",
        states: {
          a: {}
        },
        on: {
          X: "a",
          Y: "a",
          // @ts-expect-error
          Z: "Error: Event type 'Z' is not found in schema.events which is marked as exhaustive"
        }
      })
    })
  })

  describe("Machine.Definition.Effect", () => {
    useStateMachine({
      schema: {
        events: {
          X: t<{ foo: number }>(),
          Y: t<{ bar?: number }>(),
          Z: t<{ baz: string }>()
        },
        context: t<{ foo?: number }>()
      },
      context: {},
      initial: "a",
      on: {
        Z: "b"
      },
      states: {
        a: {
          on: {
            X: "b",
          }
        },
        b: {
          on: {
            Y: "a"
          },
          effect: effectParameter => {

            describe("Machine.EntryEventForStateValue", () => {
              A.test(A.areEqual<
                typeof effectParameter.event,
                | { type: "X", foo: number }
                | { type: "Z", baz: string }
              >())
            })
            
            A.test(A.areEqual<
              typeof effectParameter.send,
              (sendable:
                | "Y"
                | { type: "X", foo: number }
                | { type: "Y", bar?: number }
                | { type: "Z", baz: string }
              ) => void
            >())

            A.test(A.areEqual<
              typeof effectParameter.context,
              { foo?: number }  
            >())

            let { send } = effectParameter.setContext(context => {
              A.test(A.areEqual<typeof context, { foo?: number }>())
              return {}
            })

            // @ts-expect-error
            effectParameter.setContext(() => ({ foo: "" }))
            
            A.test(A.areEqual<
              typeof send,
              (sendable:
                | "Y"
                | { type: "X", foo: number }
                | { type: "Y", bar?: number }
                | { type: "Z", baz: string }
              ) => void
            >())

            return (cleanupParameter) => {

              describe("Machine.ExitEventForStateValue", () => {
                A.test(A.areEqual<
                  typeof cleanupParameter.event,
                  | { type: "Y", bar?: number }
                  | { type: "Z", baz: string }
                >())
              })
              
              A.test(A.areEqual<
                typeof cleanupParameter.send,
                (sendable:
                  | "Y"
                  | { type: "X", foo: number }
                  | { type: "Y", bar?: number }
                  | { type: "Z", baz: string }
                ) => void
              >())

              A.test(A.areEqual<
                typeof cleanupParameter.context,
                { foo?: number }  
              >())

              let { send } = cleanupParameter.setContext(context => {
                A.test(A.areEqual<typeof context, { foo?: number }>())
                return {}
              })

              // @ts-expect-error
              cleanupParameter.setContext(() => ({ foo: "" }))
              
              A.test(A.areEqual<
                typeof send,
                (sendable:
                  | "Y"
                  | { type: "X", foo: number }
                  | { type: "Y", bar?: number }
                  | { type: "Z", baz: string }
                ) => void
              >())
            }
          }
        },
        c: {
          on: {},
          // @ts-expect-error
          effect: () => { return "foo" }
        }
      }
    })
  })

  describe("single-functional-property bug", () => {
    useStateMachine({
      // @ts-ignore
      initial: "a",
      states: {
        a: {
          // @ts-ignore
          effect: p => {
          }
        }
      }
    })

    it("workaround works", () => {
      useStateMachine({
        initial: "a",
        states: {
          a: {
            on: {},
            effect: parameter => {
              A.test(A.areEqual<
                keyof typeof parameter,
                "event" | "send" | "context" | "setContext"
              >())
            }
          }
        }
      })
    })

    it("shows custom error instructing required change", () => {
      useStateMachine({
        // @ts-expect-error
        initial: "a",
        // ^?
        states: {
          a: {
            // @ts-ignore
            effect: p => {
            }
          }
        }
      })

      expect(query().text).toContain(
        "Oops you have met a TypeScript limitation, " +
        "please add `on: {}` to state nodes that only have an `effect` property. " +
        "See the documentation to learn more."
      )

      // @ts-expect-error
      useStateMachine({} as LS.ConcatAll<
        [ "Oops you have met a TypeScript limitation, "
        , "please add `on: {}` to state nodes that only have an `effect` property. "
        , "See the documentation to learn more."
        ]>)
    })
  })

  describe("Machine.Definition.Transition", () => {
    it("expects target string", () => {
      useStateMachine({
        initial: "a",
        states: {
          a: {
            on: {
              X: "b"
            }
          },
          b: {},
          c: {}
        }
      })

      useStateMachine({
        initial: "a",
        states: {
          a: {
            on: {
              // @ts-expect-error
              X: ""
            }
          },
          b: {},
          c: {}
        }
      })
    })

    it("shows completions for target string", () => {
      useStateMachine({
        initial: "a",
        states: {
          a: {
            on: {
              // @ts-expect-error
              X: "  "
              //   ^|
            }
          },
          b: {},
          c: {}
        }
      })

      expect(query().completions).toStrictEqual(["a", "b", "c"])
    })

    describe("Machine.Definition.Transition['target']", () => {
      it("expects target string", () => {
        useStateMachine({
          initial: "a",
          states: {
            a: {
              on: {
                X: {
                  target: "b"
                }
              }
            },
            b: {},
            c: {}
          }
        })
  
        useStateMachine({
          initial: "a",
          states: {
            a: {
              on: {
                X: {
                  // @ts-expect-error
                  target: ""
                }
              }
            },
            b: {},
            c: {}
          }
        })
      })
  
      it("shows completions for target string", () => {
        useStateMachine({
          initial: "a",
          states: {
            a: {
              on: {
                X: {
                  // @ts-expect-error
                  target: "  "
                  //        ^|
                }
              }
            },
            b: {},
            c: {}
          }
        })
  
        expect(query().completions).toStrictEqual(["a", "b", "c"])
      })
    })

    describe("Machine.Definition.Transition['guard']", () => {
      useStateMachine({
        schema: {
          events: {
            X: t<{ foo: string }>(),
            Y: t<{}>()
          }
        },
        initial: "a",
        context: { foo: 1 },
        states: {
          a: {
            on: {
              X: {
                target: "a",
                guard: parameter => {
                  A.test(A.areEqual<
                    typeof parameter,
                    { context: { foo: number }
                    , event?: { type: "X", foo: string }
                    }
                  >())

                  return true;
                }
              }
            }
          },
          b: {
            on: {
              Y: {
                target: "c",
                // @ts-expect-error
                guard: () => ""
              }
            }
          },
          c: {}
        }
      })
    })
  })
})

describe("UseStateMachine", () => {
  let [state, send] = useStateMachine({
    schema: {
      events: {
        X: t<{ foo: number }>(),
        Y: t<{ bar?: number }>(),
        Z: t<{}>()
      },
      context: t<{ foo?: number }>()
    },
    context: {},
    initial: "a",
    states: {
      a: {
        on: {
          X: "b",
        }
      },
      b: {
        on: {
          Y: "a"
        }
      }
    },
    on: {
      Z: "a"
    }
  })

  describe("Machine.State", () => {
    A.test(A.areEqual<
      typeof state,
      | { value: "a"
        , context: { foo?: number }
        , event?:
            | { type: "Y", bar?: number }
            | { type: "Z" }
        , nextEvents?: ("X" | "Z")[]
        }
      | { value: "b"
        , context: { foo?: number }
        , event?: { type: "X", foo: number }
        , nextEvents?: ("Y" | "Z")[]
        }
    >())
  })

  describe("Machine.Send", () => {
    A.test(A.areEqual<
      typeof send,
      (sendable:
        | "Y"
        | "Z"
        | { type: "X", foo: number }
        | { type: "Y", bar?: number }
        | { type: "Z" }
      ) => void
    >())
  })
})

describe("Machine.Definition.FromTypeParamter", () => {
  let [state, send] = useStateMachine({
    context: { toggleCount: 0 },
    initial: "inactive",
    states: {
      inactive: {
        on: { TOGGLE: "active" },
      },
      active: {
        on: { TOGGLE: "inactive" },
        effect({ setContext }) {
          setContext(c => ({ toggleCount: c.toggleCount + 1 }));
        },
      },
    },
  })

  A.test(A.areEqual<
    typeof state,
    | { value: "inactive"
      , context: { toggleCount: number }
      , event?: { type: "TOGGLE" }
      , nextEvents?: "TOGGLE"[]
      }
    | { value: "active"
      , context: { toggleCount: number }
      , event?: { type: "TOGGLE" }
      , nextEvents?: "TOGGLE"[]
      }
  >())

  A.test(A.areEqual<
    typeof send,
    (sendable: "TOGGLE" | { type: "TOGGLE" }) => void
  >())
})