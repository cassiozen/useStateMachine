import { renderHook, act } from '@testing-library/react-hooks';
import useStateMachine from '../src';

describe('useStateMachine', () => {
  describe('States & Transitions', () => {
    it('should set initial state', () => {
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
        context: undefined,
        value: 'inactive',
        nextEvents: ['TOGGLE'],
      });
    });

    it('should transition', () => {
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
        context: undefined,
        value: 'active',
        nextEvents: ['TOGGLE'],
      });
    });

    it('should ignore unexisting events', () => {
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
        // TypeScript won't allow me to type "ON" because it knows it's not a valid event
        // @ts-expect-error
        result.current[1]('ON');
      });

      expect(result.current[0]).toStrictEqual({
        context: undefined,
        value: 'inactive',
        nextEvents: ['TOGGLE'],
      });
    });

    it('should transition with object syntax', () => {
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
        context: undefined,
        value: 'active',
        nextEvents: ['TOGGLE'],
      });
    });
    it('should invoke effect callbacks', () => {
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
                return exit.bind(null, 'inactive');
              },
            },
            active: {
              on: { TOGGLE: 'inactive' },
              effect() {
                entry('active');
                return exit.bind(null, 'active');
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

    it('should invoke effect with context as a parameter', () => {
      const finalEffect = jest.fn();
      const initialEffect = jest.fn((send, update, _) => {
        update((context: boolean) => !context);
        send('TOGGLE');
      });

      renderHook(() =>
        useStateMachine(false)({
          initial: 'inactive',
          states: {
            inactive: {
              on: { TOGGLE: 'active' },
              effect: initialEffect,
            },
            active: {
              effect: finalEffect,
            },
          },
        })
      );

      expect(initialEffect).toHaveBeenCalledTimes(1);
      expect(initialEffect.mock.calls[0][2]).toBe(false);

      expect(finalEffect).toHaveBeenCalledTimes(1);
      expect(finalEffect.mock.calls[0][2]).toBe(true);
    });
  });

  describe('guarded transitions', () => {
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
        context: undefined,
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
        context: undefined,
        value: 'active',
        nextEvents: ['TOGGLE'],
      });
    });
  });
  describe('Extended State', () => {
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
              effect(_, update) {
                update(context => ({ toggleCount: context.toggleCount + 1 }));
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
              effect(_, update) {
                return () => update(context => ({ toggleCount: context.toggleCount + 1 }));
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
  describe('React performance', () => {
    it('should provide a stable `send`', () => {
      const { result, rerender } = renderHook(() =>
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
        rerender();
      });

      if (result.all[0] instanceof Error) throw result.all[0];
      else if (result.all[1] instanceof Error) throw result.all[1];
      else expect(result.all[0][1]).toBe(result.all[1][1]);
    });
  });
});
