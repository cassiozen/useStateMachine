export default function log(message: string, ...optionalParams: any[]) {
  if (process.env.NODE_ENV === 'development') {
    let logArguments = ['%cuseStateMachine ' + `%c${message}`, 'color: #888;', 'color: default;'];

    if (optionalParams !== undefined && optionalParams.length > 0) logArguments = [...logArguments, ...optionalParams];

    // Console.log clearly accepts parameters other than string, but TypeScript is complaining, so...
    // @ts-ignore
    console.log.apply(null, logArguments);
  }
}
