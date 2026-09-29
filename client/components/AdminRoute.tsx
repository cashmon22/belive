import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/lib/auth";

/** Must be nested inside ProtectedRoute. Admin role comes from server-set app_metadata; the API re-checks it on every request. */
export default function AdminRoute() {
  const { session } = useAuth();
  if (session?.user.app_metadata?.role !== "admin") return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
