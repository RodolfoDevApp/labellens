export async function parseJsonResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  if (!response.ok) {
    const details = (await response.json().catch(() => null)) as {
      detail?: string;
    } | null;

    throw new Error(details?.detail ?? `${fallbackMessage} with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}
