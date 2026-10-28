import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "@xyflow/react/dist/style.css";
import { ThemeProvider } from "./theme";
import "./styles.css";
import "./graph.css";
import "./workspace.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode><ThemeProvider><App /></ThemeProvider></React.StrictMode>,
);

