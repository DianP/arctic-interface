import { defineConfig } from "vite"
import solidPlugin from "vite-plugin-solid"
import { iconsSpritesheet } from "vite-plugin-icons-spritesheet"
import path from "path"

const isSettings = process.env.BUILD_TARGET === "settings"

export default defineConfig({
  plugins: [
    solidPlugin(),
    iconsSpritesheet([
      {
        withTypes: true,
        inputDir: "src/assets/icons/file-types",
        outputDir: "src/components/file-icons",
        formatter: "prettier",
      },
    ]),
  ],
  root: isSettings ? "src/settings" : undefined,
  server: { port: 3001 },
  build: {
    target: "esnext",
    outDir: isSettings ? path.resolve(__dirname, "../arctic/ui-dist/settings") : "dist",
    rollupOptions: isSettings
      ? {
          input: {
            main: path.resolve(__dirname, "src/settings/index.html"),
          },
        }
      : undefined,
  },
  worker: {
    format: "es",
  },
})
