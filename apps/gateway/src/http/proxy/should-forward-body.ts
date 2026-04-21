export function shouldForwardBody(method: string): boolean {
  return method !== "GET" && method !== "HEAD";
}
