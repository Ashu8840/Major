import { createContext, useContext, useMemo } from "react";
import PropTypes from "prop-types";
import { useAdminAuth } from "../hooks/useAdminAuth";

const AdminAuthContext = createContext({
  loading: true,
  isAuthenticated: false,
  user: null,
  refresh: () => {},
});

export const AdminAuthProvider = ({ children }) => {
  const session = useAdminAuth();

  const value = useMemo(() => session, [session]);

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
};

AdminAuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export const useAdminSession = () => useContext(AdminAuthContext);
