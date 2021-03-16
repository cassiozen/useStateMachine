import { renderHook, act } from '@testing-library/react-hooks';
import { useStateMachine } from '../src';

describe('useStateMachine', () => {
  it('should set initial state', () => {
    const { result } = renderHook(() =>
      useStateMachine({
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
      nextEvents: ['TOGGLE'],
    });
  });
  it('should transition', () => {
    const { result } = renderHook(() =>
      useStateMachine({
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
      value: 'active',
      nextEvents: ['TOGGLE'],
    });
  });
  it('should transition with object syntax', () => {
    const { result } = renderHook(() =>
      useStateMachine({
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
      value: 'active',
      nextEvents: ['TOGGLE'],
    });
  });
  it('should invoke effect callbacks', () => {
    const entry = jest.fn();
    const exit = jest.fn();
    const { result } = renderHook(() =>
      useStateMachine({
        initial: 'inactive',
        states: {
          inactive: {
            on: { TOGGLE: 'active' },
            effect: () => {
              entry('inactive');
              return exit.bind(null, 'inactive');
            },
          },
          active: {
            on: { TOGGLE: 'inactive' },
            effect: () => {
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

  describe('guarded transitions', () => {
    it('should block transitions with guard returning false', () => {
      const guard = jest.fn(() => false);

      const { result } = renderHook(() =>
        useStateMachine({
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
        value: 'inactive',
        nextEvents: ['TOGGLE'],
      });
    });

    it('should allow transitions with guard returning true', () => {
      const guard = jest.fn(() => true);

      const { result } = renderHook(() =>
        useStateMachine({
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
        value: 'active',
        nextEvents: ['TOGGLE'],
      });
    });
  });
});
