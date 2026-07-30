import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";

// The app components are styled for dark mode (`.dark` ancestor sets the CSS
// variables). Apply it at the document root so all content inherits it.
if (typeof document !== "undefined") {
  document.documentElement.classList.add("dark");
}

registerRoot(RemotionRoot);
