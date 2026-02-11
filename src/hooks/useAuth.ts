import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

export function useAuth() {
  const context = useContext(AuthContext);
  return {
    ...context,
    role: context.profile?.role ?? null,
    isAdmin: context.profile?.role === 'admin',
    isManager: context.profile?.role === 'manager',
    isLogistics: context.profile?.role === 'logistics',
  };
}
