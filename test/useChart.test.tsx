import { renderHook } from '@testing-library/react-hooks';
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
});
