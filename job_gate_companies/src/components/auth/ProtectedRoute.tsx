import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getToken, isCompanyToken } from "../../services/auth";

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const token = getToken();
  const isCompany = isCompanyToken(token);

  if (!token || !isCompany) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
