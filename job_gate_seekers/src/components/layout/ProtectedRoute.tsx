import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getToken } from "../../utils/auth";

const ProtectedRoute: React.FC<React.PropsWithChildren> = ({ children }) => {
  const token = getToken();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;