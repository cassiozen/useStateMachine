import { renderHook, act } from '@testing-library/react-hooks';
import useStateMachine from '../src';

describe('useStateMachine', () => {
  xit('should set initial state', () => {
    const { result } = renderHook(() =>
      useStateMachine()({
        initial: 'inactive',
        states: {
          inactive: {
            on: { TOGGLE: 'active' },
          },
          active: {
            on: { TOGGLE: 'inactive' },
          },
        },
      })
    );

    expect(result.current[0]).toStrictEqual({
      context: {},
      value: 'inactive',
      nextEvents: ['TOGGLE'],
    });
  });

  xit('should transition', () => {
    const { result } = renderHook(() =>
      useStateMachine()({
        initial: 'inactive',
        states: {
          inactive: {
            on: { TOGGLE: 'active' },
          },
          active: {
            on: { TOGGLE: 'inactive' },
          },
        },
      })
    );

    act(() => {
      result.current[1]('TOGGLE');
    });

    expect(result.current[0]).toStrictEqual({
      context: {},
      value: 'active',
      nextEvents: ['TOGGLE'],
    });
  });

  xit('should ignore unexisting events', () => {
    const { result } = renderHook(() =>
      useStateMachine()({
        initial: 'inactive',
        states: {
          inactive: {
            on: { TOGGLE: 'active' },
          },
          active: {
            on: { TOGGLE: 'inactive' },
          },
        },
      })
    );

    act(() => {
      // @ts-expect-error TypeScript won't allow me to type "ON" because it knows it's not a valid event
      result.current[1]('ON');
    });

    expect(result.current[0]).toStrictEqual({
      context: {},
      value: 'inactive',
      nextEvents: ['TOGGLE'],
    });
  });

  xit('should transition with object syntax', () => {
    const { result } = renderHook(() =>
      useStateMachine()({
        initial: 'inactive',
        states: {
          inactive: {
            on: {
              TOGGLE: {
                target: 'active',
              },
            },
          },
          active: {
            on: {
              TOGGLE: {
                target: 'inactive',
              },
            },
          },
        },
      })
    );

    act(() => {
      result.current[1]('TOGGLE');
    });

    expect(result.current[0]).toStrictEqual({
      context: {},
      value: 'active',
      nextEvents: ['TOGGLE'],
    });
  });

  xit('should invoke effect callbacks', () => {
    const entry = jest.fn();
    const exit = jest.fn();
    const { result } = renderHook(() =>
      useStateMachine()({
        initial: 'inactive',
        states: {
          inactive: {
            on: { TOGGLE: 'active' },
            effect() {
              entry('inactive');
              return () => {
                exit('inactive');
              };
            },
          },
          active: {
            on: { TOGGLE: 'inactive' },
            effect() {
              entry('active');
              return () => {
                exit('active');
              };
            },
          },
        },
      })
    );

    act(() => {
      result.current[1]('TOGGLE');
    });

    expect(entry.mock.calls.length).toBe(2);
    expect(exit.mock.calls.length).toBe(1);

    expect(entry.mock.invocationCallOrder).toEqual([1, 3]);
    expect(exit.mock.invocationCallOrder).toEqual([2]);

    expect(entry.mock.calls[0][0]).toBe('inactive');
    expect(entry.mock.calls[1][0]).toBe('active');

    expect(exit.mock.calls[0][0]).toBe('inactive');
  });

  xdescribe('guarded transitions', () => {
    it('should block transitions with guard returning false', () => {
      const guard = jest.fn(() => false);

      const { result } = renderHook(() =>
        useStateMachine()({
          initial: 'inactive',
          states: {
            inactive: {
              on: {
                TOGGLE: {
                  target: 'active',
                  guard,
                },
              },
            },
            active: {
              on: { TOGGLE: 'inactive' },
            },
          },
        })
      );

      act(() => {
        result.current[1]('TOGGLE');
      });

      expect(guard).toHaveBeenCalled();
      expect(result.current[0]).toStrictEqual({
        context: {},
        value: 'inactive',
        nextEvents: ['TOGGLE'],
      });
    });

    it('should allow transitions with guard returning true', () => {
      const guard = jest.fn(() => true);

      const { result } = renderHook(() =>
        useStateMachine()({
          initial: 'inactive',
          states: {
            inactive: {
              on: {
                TOGGLE: {
                  target: 'active',
                  guard,
                },
              },
            },
            active: {
              on: { TOGGLE: 'inactive' },
            },
          },
        })
      );

      act(() => {
        result.current[1]('TOGGLE');
      });

      expect(guard).toHaveBeenCalled();
      expect(result.current[0]).toStrictEqual({
        context: {},
        value: 'active',
        nextEvents: ['TOGGLE'],
      });
    });
  });
  xdescribe('Extended State', () => {
    it('should set initial context', () => {
      const { result } = renderHook(() =>
        useStateMachine<{ foo: string }>({ foo: 'bar' })({
          initial: 'inactive',
          states: {
            inactive: {
              on: { TOGGLE: 'active' },
            },
            active: {
              on: { TOGGLE: 'inactive' },
            },
          },
        })
      );

      expect(result.current[0]).toStrictEqual({
        value: 'inactive',
        context: { foo: 'bar' },
        nextEvents: ['TOGGLE'],
      });
    });
    it('should update context on entry', () => {
      const { result } = renderHook(() =>
        useStateMachine<{ toggleCount: number }>({ toggleCount: 0 })({
          initial: 'inactive',
          states: {
            inactive: {
              on: { TOGGLE: 'active' },
            },
            active: {
              on: { TOGGLE: 'inactive' },
              effect(update) {
                update((context) => ({ toggleCount: context.toggleCount + 1 }));
              },
            },
          },
        })
      );

      act(() => {
        result.current[1]('TOGGLE');
      });

      expect(result.current[0]).toStrictEqual({
        value: 'active',
        context: { toggleCount: 1 },
        nextEvents: ['TOGGLE'],
      });
    });
    it('should update context on exit', () => {
      const { result } = renderHook(() =>
        useStateMachine<{ toggleCount: number }>({ toggleCount: 0 })({
          initial: 'inactive',
          states: {
            inactive: {
              on: { TOGGLE: 'active' },
              effect(update) {
                return () => update((context) => ({ toggleCount: context.toggleCount + 1 }));
              },
            },
            active: {
              on: { TOGGLE: 'inactive' },
            },
          },
        })
      );

      act(() => {
        result.current[1]('TOGGLE');
      });

      expect(result.current[0]).toStrictEqual({
        value: 'active',
        context: { toggleCount: 1 },
        nextEvents: ['TOGGLE'],
      });
    });
  });

  describe('Hierarchical State Machines', () => {
    xit('should set follow nested initial states', () => {
      const { result } = renderHook(() =>
        useStateMachine()({
          initial: 'idle',
          states: {
            {
  key: 'light',
  initial: 'green',
  states: {
    green: {
      on: {
        TIMER: { target: 'yellow' }
      }
    },
    yellow: {
      on: {
        TIMER: { target: 'red' }
      }
    },
    red: {
      on: {
        TIMER: { target: 'green' }
      },
      ...pedestrianStates
    }
  },
          },
        })
      );

      act(() => {
        result.current[1]('TOGGLE');
      });

      expect(result.current[0]).toStrictEqual({
        value: 'active.active1.active2',
        context: {},
        nextEvents: ['BACK'],
      });
    });
    xit('should traverse a three of states', () => {
      const { result } = renderHook(() =>
        useStateMachine()({
          initial: 'A',
          states: {
            A: {
              initial: 'A1',
              states: {
                A1: {
                  initial: 'A12',
                  states: {
                    A12: {
                      on: {
                        A2: 'A2',
                      },
                    },
                  },
                },
                A2: {},
              },
            },
            B: {},
          },
        })
      );

      expect(result.current[0]).toStrictEqual({
        value: 'A.A1.A12',
        context: {},
        nextEvents: ['A2'],
      });

      act(() => {
        result.current[1]('A2');
      });

      expect(result.current[0]).toStrictEqual({
        value: 'A.A2',
        context: {},
        nextEvents: [],
      });
    });
    it('should invoke effect callbacks', () => {
      const entry = jest.fn();
      const exit = jest.fn();
      const { result } = renderHook(() =>
        useStateMachine()({
          initial: 'A',
          states: {
            A: {
              initial: 'A1',
              effect() {
                entry('->A');
                return () => {
                  exit('<-A');
                };
              },
              states: {
                A1: {
                  initial: 'A12',
                  effect() {
                    entry('->A1');
                    return () => {
                      exit('<-A1');
                    };
                  },
                  states: {
                    A12: {
                      effect() {
                        entry('->A12');
                        return () => {
                          exit('<-A12');
                        };
                      },
                      on: {
                        A2: 'A2',
                      },
                    },
                  },
                },
                A2: {
                  effect() {
                    entry('->A2');
                    return () => {
                      exit('<-A2');
                    };
                  },
                },
              },
            },
            B: {},
          },
        })
      );

      act(() => {
        result.current[1]('A2');
      });
      console.log(JSON.stringify(entry.mock.calls, null, 2));
      // console.log(JSON.stringify(result.current[0]));
      expect(entry.mock.calls.length).toBe(4);
      //      expect(exit.mock.calls.length).toBe(1);

      // expect(entry.mock.invocationCallOrder).toEqual([1, 3]);
      // expect(exit.mock.invocationCallOrder).toEqual([2]);

      // expect(entry.mock.calls[0][0]).toBe('->A');
      // expect(entry.mock.calls[1][0]).toBe('->A1');
      // expect(entry.mock.calls[3][0]).toBe('->A12');
      // expect(entry.mock.calls[4][0]).toBe('->A2');

      // expect(exit.mock.calls[0][0]).toBe('<-A12');
    });
  });
});
