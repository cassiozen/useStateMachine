export default function formatTime(time: number) {
  const mins = Math.floor(time / 600);
  const secs = Math.floor(time / 10) % 60;
  const ms = Math.floor(time % 10);

  if (secs < 10) return `${mins}:0${secs}.${ms}`;

  return `${mins}:${secs}.${ms}`;
}
