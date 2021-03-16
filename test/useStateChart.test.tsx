import { renderHook, act } from '@testing-library/react-hooks';
import { useStateChart } from '../src';

describe('useStateChart', () => {
  it('should set initial context', () => {
    const { result } = renderHook(() =>
      useStateChart<{ foo: string }>({ foo: 'bar' })({
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
      useStateChart<{ toggleCount: number }>({ toggleCount: 0 })({
        initial: 'inactive',
        states: {
          inactive: {
            on: { TOGGLE: 'active' },
          },
          active: {
            on: { TOGGLE: 'inactive' },
            effect: update => {
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
      useStateChart<{ toggleCount: number }>({ toggleCount: 0 })({
        initial: 'inactive',
        states: {
          inactive: {
            on: { TOGGLE: 'active' },
            effect: update => {
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
