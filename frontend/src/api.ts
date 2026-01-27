const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "";

const buildUrl = (path: string) => {
  if (!apiBaseUrl) return path;
  return new URL(path, apiBaseUrl).toString();
};

export const apiGet = async <T>(path: string): Promise<T> => {
  const response = await fetch(buildUrl(path), { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`API error ${response.status}`);
  }
  return (await response.json()) as T;
};

export const apiGetBlob = async (path: string): Promise<Blob> => {
  const response = await fetch(buildUrl(path), { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`API error ${response.status}`);
  }
  return await response.blob();
};

export const apiPut = async (path: string, body: unknown): Promise<void> => {
  const response = await fetch(buildUrl(path), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    throw new Error(`API error ${response.status}`);
  }
};

export const apiPost = async (path: string, body: unknown): Promise<void> => {
  const response = await fetch(buildUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    throw new Error(`API error ${response.status}`);
  }
};
