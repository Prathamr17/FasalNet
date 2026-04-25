// src/index.js
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import "./i18n";          // initialise i18next before App
import App from "./App";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
