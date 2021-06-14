import * as React from 'react';
import * as ReactDOM from 'react-dom';
import useStateMachine from '@cassiozen/usestatemachine';
import { checkUsernameAvailability } from './fakeForm';
import './index.css';

/*
 * In this example we use events with payload to send data from the form to the state machine
 */

function App() {
  const [machine, send] = useStateMachine({ input: '' })({
    initial: 'pristine',
    verbose: true,
    states: {
      pristine: {},
      editing: {
        on: {
          VALIDATE: 'validating',
        },
        effect({ send, setContext, event }) {
          setContext(c => ({ input: event?.value }));
          const timeout = setTimeout(() => {
            send({ type: 'VALIDATE' });
          }, 300);
          return () => clearTimeout(timeout);
        },
      },
      validating: {
        on: {
          VALID: 'valid',
          INVALID: 'invalid',
        },
        effect({ send, context }) {
          checkUsernameAvailability(context.input).then(usernameAvailable => {
            if (usernameAvailable) send('VALID');
            else send('INVALID');
          });
        },
      },
      valid: {},
      invalid: {},
    },
    on: {
      UPDATE: 'editing',
    },
  });

  return (
    <div className="usernameForm">
      <form>
        <input
          type="text"
          placeholder="Choose an username"
          aria-label="Choose an username"
          value={machine.context.input}
          onChange={e => send({ type: 'UPDATE', value: e.target.value })}
        />
        {machine.value === 'validating' && <div className="loader" />}
        {machine.value === 'valid' && '✔'}
        {machine.value === 'invalid' && '❌'}
        <button type="submit" disabled={machine.value !== 'valid'}>
          Create User
        </button>
      </form>
    </div>
  );
}

ReactDOM.render(<App />, document.getElementById('root'));
