import { withAuth } from "../../server/auth.js";
import { applyPatch, isExpenseId } from "../../server/expense.js";
import { json, jsonError, noContent, readJson, withErrorHandling } from "../../server/http.js";
import { deleteExpenseRow, findExpense, updateExpenseRow } from "../../server/sheets.js";

const readId = (request: Request): string | undefined => {
  return new URL(request.url).pathname.split("/").filter(Boolean).at(-1);
};

const PATCH = withErrorHandling(
  withAuth(async (request) => {
    const id = readId(request);
    if (!isExpenseId(id)) {
      return jsonError(400, "INVALID_ID");
    }
    const found = await findExpense(id);
    if (!found) {
      return jsonError(404, "NOT_FOUND");
    }
    const result = applyPatch(found.expense, await readJson(request), new Date());
    if (!result.ok) {
      return jsonError(400, "INVALID_EXPENSE", { field: result.field });
    }
    await updateExpenseRow(found.rowNumber, result.value);
    return json(200, { expense: result.value });
  }),
);

// Deleting an id that is already gone still answers 204, so a retried delete cannot get stuck.
const DELETE = withErrorHandling(
  withAuth(async (request) => {
    const id = readId(request);
    if (!isExpenseId(id)) {
      return jsonError(400, "INVALID_ID");
    }
    const found = await findExpense(id);
    if (found) {
      await deleteExpenseRow(found.rowNumber);
    }
    return noContent();
  }),
);

export { DELETE, PATCH };
