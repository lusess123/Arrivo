export type Clock = {
  now(): Date;
};

export function createClock(): Clock {
  return {
    now: () => new Date()
  };
}
