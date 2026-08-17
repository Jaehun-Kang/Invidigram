import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./styles/index.css";
import App from "./App.jsx";

const navigationEntry = performance.getEntriesByType("navigation")[0];

if (navigationEntry?.type === "reload" && window.location.pathname === "/") {
  window.history.replaceState(window.history.state, "", "/profile-setting");
}

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);
