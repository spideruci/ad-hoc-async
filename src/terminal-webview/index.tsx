import React from "react";
import ReactDOM from "react-dom/client";
import TerminalApp from "./TerminalApp";

// Wait for the DOM to fully load
window.addEventListener("DOMContentLoaded", () => {
  const rootElement = document.getElementById("terminal-root");

  if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(<TerminalApp />);
  } else {
    console.error("Error: #root element not found in the webview.");
  }
});