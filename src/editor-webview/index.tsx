import React from "react";
import ReactDOM from "react-dom";
import CustomEditor from "./CustomEdtior";
import "./styles.css";


window.addEventListener("DOMContentLoaded", () => {
  const rootElement = document.getElementById("root");
  if (rootElement) {
    ReactDOM.render(<CustomEditor />, rootElement);
  } else {
    console.error("Error: #root element not found in the webview.");
  }
});