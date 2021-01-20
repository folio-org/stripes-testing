function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function converge(fn, timeout = 2000) {
  const startTime = performance.now();
  for (;;) {
    try {
      return fn();
    } catch (e) {
      const diff = performance.now() - startTime;
      if (diff > timeout) {
        throw e;
      } else {
        await wait(1); // eslint-disable-line no-await-in-loop
      }
    }
  }
}
