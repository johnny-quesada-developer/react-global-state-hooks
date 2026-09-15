export const formatTimeToHHMMSS = (time: number) => {
  const date = new Date(time);
  const milliseconds = date.getMilliseconds().toString().padStart(3, '0');

  return `${date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })}.${milliseconds}`;
};
