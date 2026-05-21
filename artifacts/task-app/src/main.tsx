import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setBaseUrl } from "@workspace/api-client-react";

// In dev, `dev.mjs` injects `VITE_API_BASE` so the client knows where the API server is running.
setBaseUrl(import.meta.env.VITE_API_BASE ?? null);

createRoot(document.getElementById("root")!).render(<App />);
