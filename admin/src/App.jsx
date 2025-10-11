import { Suspense } from "react";
import { RouterProvider } from "react-router-dom";
import router from "./routes.jsx";

function App() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-slate-500">
          Loading admin panel...
        </div>
      }
    >
      <RouterProvider router={router} />
    </Suspense>
  );
}

export default App;
