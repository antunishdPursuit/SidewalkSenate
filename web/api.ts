export async function api(
  path: string,
  body?: unknown,
  fetcher: typeof fetch = fetch,
) {
  let response: Response;
  try {
    response = await fetcher("/api/" + path, {
      method: body ? "POST" : "GET",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(130000),
    });
  } catch {
    throw new Error(
      "The local app could not finish this request. Your words are still here. Check that it is running and try again.",
    );
  }
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(
      "The local app returned an unreadable response. Your words are still here. Try again when it is available.",
    );
  }
  if (!response.ok)
    throw new Error(
      data.error ||
        "This request could not finish. Your words are still here. Try again.",
    );
  return data;
}
