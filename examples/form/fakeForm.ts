export function checkUsernameAvailability(username: string) {
  console.log({ username });
  return new Promise((res, rej) => {
    setTimeout(() => {
      let sum = 0;
      for (let i = 0; i < username.length; i++) {
        sum += username.toLowerCase().charCodeAt(i);
      }
      console.log(sum);
      // Fake but consistently rejects some usernames as if they're already taken.
      res(sum > 300 && sum % 4 !== 0);
    }, Math.random() * 500);
  });
}
