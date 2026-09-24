import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/index.css";

const root = document.getElementById("root")!;

// شاشة الإقلاع الموسومة اللي في index.html — بنشيلها بإيدنا قبل ما
// React يركّب، عشان مايبقاش فيه إطار واحد فيه الاتنين فوق بعض.
document.getElementById("boot")?.remove();

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
