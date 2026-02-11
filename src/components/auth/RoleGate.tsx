import type { AppRole } from '../../types';
import { useAuth } from '../../hooks/useAuth';

interface RoleGateProps {
  allowed: AppRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function RoleGate({ allowed, children, fallback = null }: RoleGateProps) {
  const { role } = useAuth();
  if (!role || !allowed.includes(role)) return <>{fallback}</>;
  return <>{children}</>;
}
