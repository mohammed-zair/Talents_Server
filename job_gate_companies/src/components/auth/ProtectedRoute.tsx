import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { companyApi } from "../../services/api/api";

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [isCompany, setIsCompany] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await companyApi.getSession();
        if (active) setIsCompany(true);
      } catch {
        if (active) setIsCompany(false);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return null;
  }

  if (!isCompany) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
