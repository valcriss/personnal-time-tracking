export const apiGet = async <T>(path: string): Promise<T> => {
  const response = await fetch(path, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`API error ${response.status}`);
  }
  return (await response.json()) as T;
};

export const apiPut = async (path: string, body: unknown): Promise<void> => {
  const response = await fetch(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    throw new Error(`API error ${response.status}`);
  }
};
