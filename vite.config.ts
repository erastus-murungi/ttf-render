import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        curve: "curve.html",
      },
    },
  },
  test: {
    environment: "node",
  },
});
