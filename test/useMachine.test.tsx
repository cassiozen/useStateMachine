import { renderHook, act } from '@testing-library/react-hooks';
import useMachine from '../src';

describe('useMachine', () => {
  it('should set initial state', () => {
    const { result } = renderHook(() =>
      useMachine({
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
      useMachine({
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
      useMachine({
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
  it('should invoke enter & exit callbacks', () => {
    const entry = jest.fn();
    const exit = jest.fn();
    const { result } = renderHook(() =>
      useMachine({
        initial: 'inactive',
        states: {
          inactive: {
            on: { TOGGLE: 'active' },
            entry: entry.bind(null, 'inactive'),
            exit: exit.bind(null, 'inactive'),
          },
          active: {
            on: { TOGGLE: 'inactive' },
            entry: entry.bind(null, 'active'),
            exit: exit.bind(null, 'active'),
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

  it('should guard transitions', () => {
    const guard = jest.fn(() => false);

    const { result } = renderHook(() =>
      useMachine({
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

    expect(guard.mock.calls.length).toBe(1);
    expect(result.current[0]).toStrictEqual({
      value: 'inactive',
      nextEvents: ['TOGGLE'],
    });
  });
});
