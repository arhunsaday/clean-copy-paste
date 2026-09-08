import { resolve } from "path";
import { defineConfig } from "vitest/config";

const root = resolve(__dirname, "src");

export default defineConfig({
  resolve: {
    alias: {
      "@src": root,
      "@assets": resolve(root, "assets"),
      "@pages": resolve(root, "pages"),
      "@components": resolve(root, "components"),
    },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts"],
  },
});
