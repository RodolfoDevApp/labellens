const LOCAL_API_BASE_URL = "http://localhost:4000";
const RUNTIME_CONFIG_PATH = "/runtime-config.json";

type RuntimeConfig = {
  apiBaseUrl?: string;
};

let runtimeApiBaseUrlPromise: Promise<string> | null = null;

export async function createApiUrl(pathname: string): Promise<URL> {
  const apiBaseUrl = await getApiBaseUrl();
  return new URL(pathname, ensureTrailingSlash(apiBaseUrl));
}

export async function getApiBaseUrl(): Promise<string> {
  const envApiBaseUrl = normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL);
  if (envApiBaseUrl) {
    return envApiBaseUrl;
  }

  if (typeof window === "undefined") {
    return LOCAL_API_BASE_URL;
  }

  if (!runtimeApiBaseUrlPromise) {
    runtimeApiBaseUrlPromise = resolveBrowserApiBaseUrl();
  }

  return runtimeApiBaseUrlPromise;
}

async function resolveBrowserApiBaseUrl(): Promise<string> {
  const runtimeApiBaseUrl = await readRuntimeApiBaseUrl();
  if (runtimeApiBaseUrl) {
    return runtimeApiBaseUrl;
  }

  const hostname = window.location.hostname.trim().toLowerCase();
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return LOCAL_API_BASE_URL;
  }

  throw new Error(
    "Missing runtime-config.json apiBaseUrl for LabelLens web hosting. Deploy the frontend with Phase 8K assets.",
  );
}

async function readRuntimeApiBaseUrl(): Promise<string | undefined> {
  try {
    const response = await fetch(RUNTIME_CONFIG_PATH, { cache: "no-store" });

    if (!response.ok) {
      return undefined;
    }

    const runtimeConfig = (await response.json()) as RuntimeConfig;
    return normalizeApiBaseUrl(runtimeConfig.apiBaseUrl);
  } catch {
    return undefined;
  }
}

function normalizeApiBaseUrl(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  if (!normalized) {
    return undefined;
  }

  return normalized.replace(/\/+$/, "");
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}
