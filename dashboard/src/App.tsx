import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { AdminProvider } from "@/context/AdminContext";
import { router } from "@/router";

export default function App() {
  return (
    <AuthProvider>
      <AdminProvider>
        <RouterProvider router={router} />
      </AdminProvider>
    </AuthProvider>
  );
}
