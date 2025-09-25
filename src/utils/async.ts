export function sleep(sleepMs: number) {
  return new Promise(resolve => setTimeout(resolve, sleepMs));
}

export const throttle = (windowMs: number) => {
  let throttleHandle: number | null = null;
  return (func: () => void) => {
    if (throttleHandle) {
      clearTimeout(throttleHandle);
    }
    throttleHandle = setTimeout(() => func(), windowMs);
  };
};
