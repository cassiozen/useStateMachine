import * as React from 'react';
import * as ReactDOM from 'react-dom';
import './index.css';
import formatTime from './formatTime';
import useMachine from '../.';

function App() {
  const [time, setTime] = React.useState(0);
  const intervalID = React.useRef<any>();
  const [machine, send] = useMachine({
    initial: 'idle',
    states: {
      idle: {
        on: {
          START: 'running',
        },
        entry: () => {
          setTime(0);
          clearInterval(intervalID.current);
        },
      },
      running: {
        on: {
          PAUSE: 'paused',
        },
        entry: () => {
          intervalID.current = setInterval(() => {
            setTime(t => t + 1);
          }, 100);
        },
      },
      paused: {
        on: {
          RESET: 'idle',
          START: 'running',
        },
        entry: () => {
          clearInterval(intervalID.current);
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
