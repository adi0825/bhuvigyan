import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

console.log("main.tsx: Starting React app");

const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error("main.tsx: Root element not found!");
} else {
  console.log("main.tsx: Root element found", rootElement);
  try {
    const root = createRoot(rootElement);
    console.log("main.tsx: React root created");
    root.render(<App />);
    console.log("main.tsx: App rendered");
  } catch (error) {
    console.error("main.tsx: Error rendering app:", error);
  }
}
