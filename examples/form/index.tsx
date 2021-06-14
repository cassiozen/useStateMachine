import * as React from 'react';
import * as ReactDOM from 'react-dom';
import useStateMachine from '../../dist';
import { checkUsernameAvailability } from './fakeForm';
import './index.css';

/*
 * In this example we simulate a somewhat complicated UI:
 * there are multiple buttons but they can only appear when they can be used
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
          console.log(context);
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
        <button type="submit" disabled={machine.value !== 'valid'}>
          Create User
        </button>
      </form>

      {machine.value === 'validating' && <div className="loader" />}
      {machine.value === 'valid' && '✔'}
      {machine.value === 'invalid' && '❌'}
    </div>
  );
}

ReactDOM.render(<App />, document.getElementById('root'));
