import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/globals.css";

// Global handler for unhandled promise rejections (async errors outside React)
window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  if (!reason) return;
  const msg: string = reason?.message ?? String(reason);
  // Ignore aborted requests — the API layer already handles these
  if (
    msg.includes("AbortError") ||
    msg.includes("canceled") ||
    msg.includes("Network Error")
  ) return;

  console.error("[Pegasus] Unhandled rejection:", reason);

  // Show toast in dev so developers notice uncaught rejections immediately
  if (import.meta.env.DEV) {
    window.dispatchEvent(
      new CustomEvent("pegasus:toast", {
        detail: { message: `Erro não tratado: ${msg}`, type: "error" },
      }),
    );
  }
});

// Log uncaught global errors that occur outside the React tree
window.addEventListener("error", (event) => {
  if (event.filename?.includes("chrome-extension")) return;
  console.error("[Pegasus] Global error:", event.error ?? event.message);
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
