/* eslint-disable react-hooks/rules-of-hooks */
import useStateMachine, { createSchema } from '../src';
import { A } from '../src/types';

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

    it.manual("shows child state identifiers as completions", () => {
      useStateMachine({
        // @ts-expect-error
        initial: "",
        //        ^|
        states: {
          a: {},
          b: {}
        }
      })

      expectCompletionsToBe(["a", "b"])
    })
  
    it.manual("shows custom error in case of no states", () => {
      useStateMachine({
        // @ts-expect-error
        initial: ""
        // ^?
      })
      expectQueryTextToInclude(`"Error: no states defined"`)

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
  
    it.manual("shows custom error in case of identifiers other than string", () => {
      useStateMachine({
        initial: 1,
        states: {
          // @ts-expect-error
          1: {}
      //  ^?
        }
      })
      expectQueryTextToInclude(`"Error: only string identifiers allowed"`)

      useStateMachine({
        initial: 1,
        states: {
          // @ts-expect-error
          1: "Error: only string identifiers allowed"
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

    describe("MachineDefinition['schema']['event']", () => {
      it("expects to extend { type: string }", () => {
        useStateMachine({
          schema: {
            event: createSchema<{ type: "FOO" } | { type: "BAR" }>()
          },
          initial: "a",
          states: { a: {} }
        })

        useStateMachine({
          schema: {
            // @ts-expect-error
            event: createSchema<{ type: 1 }>()
          }
        })

        useStateMachine({
          schema: {
            // @ts-expect-error
            event: createSchema<{}>()
          }
        })

        useStateMachine({
          schema: {
            // @ts-expect-error
            event: createSchema<"FOO">()
          }
        })
      })

      it("is optional", () => {
        useStateMachine({
          schema: {},
          initial: "a",
          states: { a: {} }
        })
      })

      it.manual("shows custom error in case of not extending { type: string }", () => {
        useStateMachine({
          schema: {
            // @ts-expect-error
            event: createSchema<"FOO">()
            // ^?
          }
        })
        expectQueryTextToInclude("Error: schema.event should extend { type: string }")

        useStateMachine({
          schema: {
            // @ts-expect-error
            event: createSchema<"Error: schema.event should extend { type: string }">()
          }
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
          schema: { context: createSchema<{ foo?: number }>() },
          context: { foo: 1 },
          initial: "a",
          states: { a: {} }
        })

        useStateMachine({
          schema: { context: createSchema<"foo">() },
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
          context: createSchema<{ foo: number }>()
        },
        initial: "a",
        states: { a: {} }
      })

      useStateMachine({
        schema: {
          context: createSchema<{ foo: number }>()
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
          context: createSchema<{ foo: number }>()
        },
        context: { foo: 1 },
        initial: "a",
        states: { a: {} }
      })

      useStateMachine({
        schema: {
          context: createSchema<undefined>()
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
      state.context.foo === "world"
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
  
    it.manual("shows custom error in case of identifiers other than string", () => {
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
      expectQueryTextToInclude(`"Error: only string types allowed"`)

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
      expectQueryTextToInclude(`"Error: only string types allowed"`)

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

    it("honours schema.event", () => {
      useStateMachine({
        schema: {
          event: createSchema<
            | { type: "X" }
            | { type: "Y" }
          >()
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
    })

    it.manual.todo.maybeTsBug("shows completions based on schema.event", () => {
      useStateMachine({
        schema: {
          event: createSchema<
            | { type: "X" }
            | { type: "Y" }
          >()
        },
        initial: "a",
        states: {
          a: {
            on: {
              
          //  ^|
            }
          }
        }
      })

      expectCompletionsToBe(["X", "Y"])

      useStateMachine({
        schema: {
          event: createSchema<
            | { type: "X" }
            | { type: "Y" }
          >()
        },
        initial: "a",
        states: {
          a: {}
        },
        on: {
          
      //  ^|
        }
      })

      expectCompletionsToBe(["X", "Y"])
    })

    it.manual("shows custom error in case of violation of schema.events", () => {
      useStateMachine({
        schema: {
          event: createSchema<
            | { type: "X" }
            | { type: "Y" }
          >()
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
      expectQueryTextToInclude("Error: Event type 'Z' is not found in schema.event")

      useStateMachine({
        schema: {
          event: createSchema<
            | { type: "X" }
            | { type: "Y" }
          >()
        },
        initial: "a",
        states: {
          a: {
            on: {
              X: "a",
              Y: "a",
              // @ts-expect-error
              Z: "Error: Event type 'Z' is not found in schema.event"
            }
          }
        }
      })

      useStateMachine({
        schema: {
          event: createSchema<
            | { type: "X" }
            | { type: "Y" }
          >()
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
      expectQueryTextToInclude("Error: Event type 'Z' is not found in schema.event")

      useStateMachine({
        schema: {
          event: createSchema<
            | { type: "X" }
            | { type: "Y" }
          >()
        },
        initial: "a",
        states: {
          a: {}
        },
        on: {
          X: "a",
          Y: "a",
          // @ts-expect-error
          Z: "Error: Event type 'Z' is not found in schema.event"
        }
      })
    })
  })

  describe("Machine.Definition.Effect", () => {
    useStateMachine({
      schema: {
        event: createSchema<
          | { type: "X", foo: number }
          | { type: "Y", bar?: number }
          | { type: "Z", baz: string }
        >(),
        context: createSchema<{ foo?: number }>()
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
                  { type: "Y", bar?: number }
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
          on: null,
          // @ts-expect-error
          effect: () => { return "foo" }
        }
      }
    })

    it.todo.maybeTsBug("effect alone as property works", () => {
      useStateMachine({
        // @ts-ignore
        initial: "a",
        states: {
          a: {
            effect: parameter => {
              // @ts-ignore
              A.test(A.areEqual<
                keyof typeof parameter,
                "event" | "send" | "context" | "setContext"
              >())
            }
          }
        }
      })
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
              X: ""
              //  ^|
            }
          },
          b: {},
          c: {}
        }
      })

      expectCompletionsToBe(["a", "b", "c"])
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
                  target: ""
                  //       ^|
                }
              }
            },
            b: {},
            c: {}
          }
        })
  
        expectCompletionsToBe(["a", "b", "c"])
      })
    })

    describe("Machine.Definition.Transition['guard']", () => {
      useStateMachine({
        schema: {
          event: createSchema<
            | { type: "X", foo: string }
            | { type: "Y" }
          >()
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
      event: createSchema<
        | { type: "X", foo: number }
        | { type: "Y", bar?: number }
      >(),
      context: createSchema<{ foo?: number }>()
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
    }
  })

  describe("Machine.State", () => {
    A.test(A.areEqual<
      typeof state,
      { value: "a" | "b"
      , context: { foo?: number }
      , event?:
        | { type: "X", foo: number }
        | { type: "Y", bar?: number }
      , nextEvents?: ("X" | "Y")[]
      }
    >())
  })

  describe("Machine.Send", () => {
    A.test(A.areEqual<
      typeof send,
      (sendable:
        | "Y"
        | { type: "X", foo: number }
        | { type: "Y", bar?: number }
      ) => void
    >())
  })
})


declare const describe: (label: string, f: () => void) => void
declare const it:
  & ((label: string, f: () => void) => void)
  & { todo: 
        & ((label: string, f: () => void) => void)
        & { maybeTsBug: (label: string, f: () => void) => void
          }
    , manual:
        & ((label: string, f: () => void) => void)
        & Omit<typeof it, "manual">
    }
declare const expectCompletionsToBe: (completions: string[]) => void
declare const expectQueryTextToInclude: (text: string) => void
