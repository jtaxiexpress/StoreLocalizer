/**
 * Remotion config — wires in the REAL app source so we can render the
 * project's actual React components (not screenshots) inside the video.
 */
import { Config } from "@remotion/cli/config";
import { enableTailwind } from "@remotion/tailwind-v4";
import path from "path";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);

const repoRoot = path.resolve(process.cwd(), "..");
// Single React instance for both Remotion and the imported app components.
const reactDir = path.join(process.cwd(), "node_modules/react");
const reactDomDir = path.join(process.cwd(), "node_modules/react-dom");

Config.overrideWebpackConfig((cfg) => {
  const withTw = enableTailwind(cfg);
  return {
    ...withTw,
    resolve: {
      ...withTw.resolve,
      alias: {
        ...(withTw.resolve?.alias ?? {}),
        // Real app components live here.
        "@": path.join(repoRoot, "src"),
        // Force a single React copy (avoids "Incompatible React versions").
        "react/jsx-runtime": path.join(reactDir, "jsx-runtime.js"),
        "react/jsx-dev-runtime": path.join(reactDir, "jsx-dev-runtime.js"),
        "react-dom/client": path.join(reactDomDir, "client.js"),
        react: reactDir,
        "react-dom": reactDomDir,
      },
      modules: [
        ...((withTw.resolve?.modules as string[]) ?? ["node_modules"]),
        // Let bare imports inside ../src (lucide-react, radix-ui, jose, …)
        // resolve against the app's installed dependencies.
        path.join(repoRoot, "node_modules"),
      ],
    },
  };
});
