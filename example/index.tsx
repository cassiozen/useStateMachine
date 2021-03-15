import * as React from 'react';
import * as ReactDOM from 'react-dom';
import './index.css';
import formatTime from './formatTime';
import useMachine from '../.';

function App() {
  const [time, setTime] = React.useState(0);
  const [machine, send] = useMachine({
    initial: 'idle',
    states: {
      idle: {
        on: {
          START: {
            target: 'running',
          },
        },
        effect: () => {
          setTime(0);
        },
      },
      running: {
        on: {
          PAUSE: 'paused',
        },
        effect: () => {
          const intervalID = setInterval(() => {
            setTime(t => t + 1);
          }, 100);
          return () => clearInterval(intervalID);
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
      <div className="display">{formatTime(time)}</div>

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
