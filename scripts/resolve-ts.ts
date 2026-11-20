import { registerHooks } from "node:module";

// Server code imports siblings as "./x.js" because that is what runs on Vercel after compilation.
// Scripts run the .ts sources directly, so a relative .js that does not exist maps to its .ts twin.
registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (specifier.startsWith(".") && specifier.endsWith(".js")) {
        return nextResolve(`${specifier.slice(0, -3)}.ts`, context);
      }
      throw error;
    }
  },
});
