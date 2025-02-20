import React from "react";
import ReactDOM from "react-dom/client";
import CustomEditor from "./CustomEdtior";


import "./styles.css";
// import "@xyflow/react/dist/style.css";
import "@xyflow/react/dist/base.css";


window.addEventListener("DOMContentLoaded", () => {
  const rootElement = document.getElementById("root");

  if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(<CustomEditor />);
  } else {
    console.error("Error: #root element not found in the webview.");
  }
});