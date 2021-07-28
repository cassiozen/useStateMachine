import * as React from 'react';
import * as ReactDOM from 'react-dom';
import useStateMachine, {t} from '@cassiozen/usestatemachine';
import './index.css';
import formatTime from './formatTime';

/*
 * In this example we simulate a somewhat complicated UI:
 * there are multiple buttons but they can only appear when they can be used
 */

function App() {
  const [machine, send] = useStateMachine({
    schema: {
      context: t<{time: number}>(),
    },
    context: {time: 0},
    initial: 'idle',
    verbose: true,
    states: {
      idle: {
        on: {
          START: {
            target: 'running',
          },
        },
        effect({ setContext }) {
          setContext(() => ({ time: 0 }));
        },
      },
      running: {
        on: {
          PAUSE: 'paused',
        },
        effect({ setContext }) {
          const interval = setInterval(() => {
            setContext(context => ({ time: context.time + 1 }));
          }, 100);
          return () => clearInterval(interval);
        },
      },
      paused: {
        on: {
          RESET: 'idle',
          START: {
            target: 'running',
          },
        },
      },
    },
  });

  return (
    <div className="StopWatch">
      <div className="display">{formatTime(machine.context.time)}</div>

      <div className="controls">
        {machine.nextEvents?.includes('START') && (
          <button type="button" onClick={() => send('START') }>
            Start
          </button>
        )}

        {machine.nextEvents?.includes('PAUSE') && (
          <button type="button" onClick={() => send('PAUSE')}>
            Pause
          </button>
        )}

        {machine.nextEvents?.includes('RESET') && (
          <button type="button" onClick={() => send('RESET')}>
            Reset
          </button>
        )}
      </div>
    </div>
  );
}

ReactDOM.render(<App />, document.getElementById('root'));
