import { existsSync, readdirSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { join } from "node:path";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig, loadEnv, type Plugin } from "vite";

const API_PREFIX = "/api/";
const SEGMENT_PATTERN = /^[A-Za-z0-9][\w-]*$/;
const DYNAMIC_FILE_PATTERN = /^\[[\w-]+\]\.ts$/;
const BODYLESS_METHODS = new Set(["GET", "HEAD"]);

// Mirrors Vercel's routing for api/: exact file, then folder index, then a [param].ts file.
const resolveApiFile = (apiDir: string, pathname: string): string | undefined => {
  const segments = pathname.slice(API_PREFIX.length).split("/").filter(Boolean);
  if (segments.length === 0 || !segments.every((segment) => SEGMENT_PATTERN.test(segment))) {
    return undefined;
  }
  const exact = join(apiDir, ...segments);
  const found = [`${exact}.ts`, join(exact, "index.ts")].find((file) => existsSync(file));
  if (found) {
    return found;
  }
  const parent = join(apiDir, ...segments.slice(0, -1));
  const dynamic = existsSync(parent)
    ? readdirSync(parent).find((name) => DYNAMIC_FILE_PATTERN.test(name))
    : undefined;
  return dynamic ? join(parent, dynamic) : undefined;
};

const toRequest = async (req: IncomingMessage): Promise<Request> => {
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item !== undefined) {
        headers.append(name, item);
      }
    }
  }
  const method = req.method ?? "GET";
  const chunks: Buffer[] = [];
  if (!BODYLESS_METHODS.has(method)) {
    for await (const chunk of req) {
      chunks.push(chunk);
    }
  }
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;
  return new Request(url, { method, headers, body });
};

const sendResponse = async (res: ServerResponse, response: Response): Promise<void> => {
  res.statusCode = response.status;
  response.headers.forEach((value, name) => {
    res.setHeader(name, value);
  });
  res.end(Buffer.from(await response.arrayBuffer()));
};

// Runs api/*.ts inside the Vite dev server so local dev needs no Vercel CLI.
const devApi = (): Plugin => {
  return {
    name: "saving:dev-api",
    apply: "serve",
    configureServer(server) {
      const apiDir = join(server.config.root, "api");
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith(API_PREFIX)) {
          next();
          return;
        }
        try {
          const file = resolveApiFile(apiDir, new URL(req.url, "http://localhost").pathname);
          const apiModule: Record<string, unknown> = file ? await server.ssrLoadModule(file) : {};
          const handler = apiModule[req.method ?? "GET"];
          if (typeof handler !== "function") {
            res.statusCode = file ? 405 : 404;
            res.end();
            return;
          }
          await sendResponse(res, await handler(await toRequest(req)));
        } catch (error) {
          next(error);
        }
      });
    },
  };
};

const config = defineConfig(({ command, mode }) => {
  if (command === "serve") {
    // API handlers read process.env as they do on Vercel; only VITE_* keys ever reach the browser.
    Object.assign(process.env, loadEnv(mode, process.cwd(), ""));
  }
  return { plugins: [svelte(), devApi()], server: { port: 4000 } };
});

export default config;
