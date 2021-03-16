import * as React from 'react';
import * as ReactDOM from 'react-dom';
import './index.css';
import formatTime from './formatTime';
import { useStateChart } from '../.';

function App() {
  const [machine, send] = useStateChart<{ time: number }>()(
    {
      initial: 'idle',
      states: {
        idle: {
          on: {
            START: {
              target: 'running',
            },
          },
          effect: update => {
            update(() => ({ time: 0 }));
          },
        },
        running: {
          on: {
            PAUSE: 'paused',
          },
          effect: update => {
            const interval = setInterval(() => {
              update(context => ({ time: context.time + 1 }));
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
    },
    { time: 0 }
  );

  return (
    <div className="StopWatch">
      <div className="display">{formatTime(machine.context.time)}</div>

      <div className="controls">
        {machine.nextEvents.includes('START') && (
          <button type="button" onClick={() => send('START')}>
            Start
          </button>
        )}

        {machine.nextEvents.includes('PAUSE') && (
          <button type="button" onClick={() => send('PAUSE')}>
            Pause
          </button>
        )}

        {machine.nextEvents.includes('RESET') && (
          <button type="button" onClick={() => send('RESET')}>
            Reset
          </button>
        )}
      </div>
    </div>
  );
}

ReactDOM.render(<App />, document.getElementById('root'));
