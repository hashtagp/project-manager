import { useAuth } from "@/provider/auth-context";
import { useLocation, useNavigate } from "react-router";
import { useEffect } from "react";
import { publicRoutes } from "@/lib";

export const useAuthGuard = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const isPublicRoute = publicRoutes.includes(location.pathname);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated && !isPublicRoute) {
        navigate("/auth/sign-in", { replace: true });
      } else if (isAuthenticated && location.pathname === "/auth/sign-in") {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [isAuthenticated, isLoading, isPublicRoute, navigate, location.pathname]);

  return {
    isAuthenticated,
    isLoading,
    isPublicRoute,
  };
};
