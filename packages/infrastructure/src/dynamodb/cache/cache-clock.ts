export function nowEpochSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export function ttlEpochSeconds(ttlSeconds: number): number {
  return nowEpochSeconds() + ttlSeconds;
}
