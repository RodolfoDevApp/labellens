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

  if (!runtimeApiBaseUrlPromise) {
    runtimeApiBaseUrlPromise = resolveRuntimeApiBaseUrl().catch((error) => {
      runtimeApiBaseUrlPromise = null;
      throw error;
    });
  }

  return runtimeApiBaseUrlPromise;
}

async function resolveRuntimeApiBaseUrl(): Promise<string> {
  const runtimeApiBaseUrl = await readRuntimeApiBaseUrl();
  if (runtimeApiBaseUrl) {
    return runtimeApiBaseUrl;
  }

  throw new Error("LabelLens API base URL is not configured for this deployment. Refresh the page after the deployment finishes publishing runtime-config.json.");
}

async function readRuntimeApiBaseUrl(): Promise<string | undefined> {
  try {
    const runtimeConfigUrl = `${RUNTIME_CONFIG_PATH}?t=${Date.now()}`;
    const response = await fetch(runtimeConfigUrl, {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache",
      },
    });

    if (!response.ok) {
      return undefined;
    }

    const runtimeConfigText = removeJsonByteOrderMark(await response.text());
    const runtimeConfig = JSON.parse(runtimeConfigText) as RuntimeConfig;
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

function removeJsonByteOrderMark(value: string): string {
  return value.replace(/^\uFEFF/, "").replace(/^ï»¿/, "");
}
