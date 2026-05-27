import React from "react";
import { createRoot } from "react-dom/client";
import { HeroUIProvider } from "@heroui/react";
import { ToastProvider } from "@heroui/toast";
import { App } from "./App.jsx";
import "./styles/global.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HeroUIProvider>
      <ToastProvider placement="top-center" />
      <App />
    </HeroUIProvider>
  </React.StrictMode>
);
