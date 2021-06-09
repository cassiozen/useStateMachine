export default function log(groupLabel: string, ...nestedMessages: [string, any]) {
  if (process.env.NODE_ENV === 'development') {
    console.groupCollapsed('%cuseStateMachine', 'color: #888; font-weight: lighter;', groupLabel);
    nestedMessages.forEach(message => {
      console.log(message[0], message[1]);
    });
    console.groupEnd();
  }
}
