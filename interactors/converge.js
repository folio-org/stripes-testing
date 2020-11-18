function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function converge(fn, timeout = 2000) {
  let startTime = performance.now();
  while(true) {
    try {
      return fn();
    } catch(e) {
      let diff = performance.now() - startTime;
      if(diff > timeout) {
        throw e;
      } else {
        await wait(1);
      }
    }
  }
}