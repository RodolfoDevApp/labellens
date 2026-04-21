export function buildUpstreamUrl(apiInternalBaseUrl: string, path: string, queryString: string): string {
  const baseUrl = apiInternalBaseUrl.endsWith("/") ? apiInternalBaseUrl.slice(0, -1) : apiInternalBaseUrl;
  return queryString.length > 0 ? `${baseUrl}${path}?${queryString}` : `${baseUrl}${path}`;
}
