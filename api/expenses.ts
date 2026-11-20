import { withAuth } from "../server/auth.js";
import { createExpense, isMonth } from "../server/expense.js";
import { json, jsonError, readJson, withErrorHandling } from "../server/http.js";
import { appendExpense, findExpense, listExpenses } from "../server/sheets.js";

const GET = withErrorHandling(
  withAuth(async (request) => {
    const month = new URL(request.url).searchParams.get("month");
    if (!isMonth(month)) {
      return jsonError(400, "INVALID_MONTH");
    }
    return json(200, { expenses: await listExpenses(month) });
  }),
);

// Idempotent on the client-generated id, so a retried offline sync never writes a row twice.
const POST = withErrorHandling(
  withAuth(async (request) => {
    const result = createExpense(await readJson(request), new Date());
    if (!result.ok) {
      return jsonError(400, "INVALID_EXPENSE", { field: result.field });
    }
    const existing = await findExpense(result.value.id);
    if (existing) {
      return json(200, { expense: existing.expense });
    }
    await appendExpense(result.value);
    return json(201, { expense: result.value });
  }),
);

export { GET, POST };
