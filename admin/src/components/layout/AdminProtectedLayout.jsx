import { Navigate } from "react-router-dom";
import AppLayout from "./AppLayout.jsx";
import Loader from "../loading/Loader.jsx";
import { useAdminSession } from "../../context/AdminAuthContext.jsx";

const AdminProtectedLayout = () => {
  const { loading, isAuthenticated } = useAdminSession();

  if (loading) {
    return <Loader label="Checking admin access" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <AppLayout />;
};

export default AdminProtectedLayout;
