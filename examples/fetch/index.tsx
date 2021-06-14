import * as React from 'react';
import * as ReactDOM from 'react-dom';
import useStateMachine from '@cassiozen/usestatemachine';
import './index.css';
import Cup from './Cup';

/*
 * In this example we're fetching some data with included retry logic (Will retry 2 times before giving up)
 */

type Coffee = {
  id: number;
  title: string;
  description: string;
  ingredients: string[];
};

function App() {
  const [machine, send] = useStateMachine<{ retryCount: number; data?: Coffee[]; error?: string }>({ retryCount: 0 })({
    initial: 'loading',
    verbose: true,
    states: {
      loading: {
        on: {
          SUCCESS: 'loaded',
          FAILURE: 'error',
        },
        effect({ setContext }) {
          const fetchCoffees = async () => {
            let response: Response;
            try {
              response = await fetch('https://api.sampleapis.com/coffee/hot');
              if (!response.ok) {
                throw new Error(`An error has occured: ${response.status}`);
              }
              const coffees = await response.json();
              setContext(context => ({ data: coffees, ...context })).send('SUCCESS');
            } catch (error) {
              setContext(context => ({ error: error.message, ...context })).send('FAILURE');
            }
          };
          fetchCoffees();
        },
      },
      loaded: {},
      error: {
        on: {
          RETRY: {
            target: 'loading',
            guard: ({ context }) => context.retryCount < 3,
          },
        },
        effect({ setContext }) {
          setContext(context => ({ ...context, retryCount: context.retryCount + 1 })).send('RETRY');
        },
      },
    },
  });

  return (
    <div className="coffees">
      <Cup />
      {machine.value === 'loading' && <p>Loading</p>}
      {machine.value === 'error' && <p>{machine.context.error}</p>}
      {machine.value === 'loaded' && (
        <ul>
          {machine.context.data?.map(coffee => (
            <li key={coffee.id}>
              <h2>{coffee.title}</h2>
              <p>{coffee.description}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

ReactDOM.render(<App />, document.getElementById('root'));
