import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import "./index.css";
import App from "./App.jsx";
import { AdminAuthProvider } from "./context/AdminAuthContext.jsx";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AdminAuthProvider>
        <App />
        <Toaster position="top-right" />
      </AdminAuthProvider>
    </QueryClientProvider>
  </StrictMode>
);
