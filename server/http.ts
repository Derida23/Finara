type Handler = (request: Request) => Promise<Response>;

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const json = (status: number, body: unknown): Response => {
  return Response.json(body, { status, headers: NO_STORE_HEADERS });
};

const jsonError = (status: number, code: string, details: Record<string, string> = {}) => {
  return json(status, { error: code, ...details });
};

const noContent = (): Response => new Response(null, { status: 204, headers: NO_STORE_HEADERS });

const readJson = async (request: Request): Promise<unknown> => {
  try {
    return await request.json();
  } catch {
    return null;
  }
};

const withErrorHandling = (handler: Handler): Handler => {
  return async (request) => {
    try {
      return await handler(request);
    } catch (error) {
      console.error(error);
      return jsonError(500, "INTERNAL_ERROR");
    }
  };
};

export type { Handler };
export { isRecord, json, jsonError, noContent, readJson, withErrorHandling };
