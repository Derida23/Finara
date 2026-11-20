import { withAuth } from "../server/auth.js";
import { json, withErrorHandling } from "../server/http.js";
import { listCategories } from "../server/sheets.js";

const GET = withErrorHandling(
  withAuth(async () => {
    return json(200, { categories: await listCategories() });
  }),
);

export { GET };
