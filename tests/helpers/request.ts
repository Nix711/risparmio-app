/** Una Request come quella che Next passa ai route handler, con il corpo in JSON se presente. */
export function jsonRequest(method: string, path: string, body?: unknown): Request {
  return new Request(new URL(path, "http://localhost"), {
    method,
    ...(body !== undefined && {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  });
}

/** Il secondo argomento dei route handler dinamici, come /api/expenses/[id]. */
export function routeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}
