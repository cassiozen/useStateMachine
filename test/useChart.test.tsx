import { renderHook, act } from '@testing-library/react-hooks';
import { useChart } from '../src';

describe('useChart', () => {
  it('should set initial context', () => {
    const { result } = renderHook(() =>
      useChart<{ foo: string }>()(
        {
          initial: 'inactive',
          states: {
            inactive: {
              on: { TOGGLE: 'active' },
            },
            active: {
              on: { TOGGLE: 'inactive' },
            },
          },
        },
        { foo: 'bar' }
      )
    );

    expect(result.current[0]).toStrictEqual({
      value: 'inactive',
      context: { foo: 'bar' },
      nextEvents: ['TOGGLE'],
    });
  });
  it('should update context on entry', () => {
    const { result } = renderHook(() =>
      useChart<{ toggleCount: number }>()(
        {
          initial: 'inactive',
          states: {
            inactive: {
              on: { TOGGLE: 'active' },
            },
            active: {
              on: { TOGGLE: 'inactive' },
              effect: assign => {
                assign(context => ({ toggleCount: context.toggleCount + 1 }));
              },
            },
          },
        },
        { toggleCount: 0 }
      )
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
      useChart<{ toggleCount: number }>()(
        {
          initial: 'inactive',
          states: {
            inactive: {
              on: { TOGGLE: 'active' },
              effect: assign => {
                return () => assign(context => ({ toggleCount: context.toggleCount + 1 }));
              },
            },
            active: {
              on: { TOGGLE: 'inactive' },
            },
          },
        },
        { toggleCount: 0 }
      )
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
