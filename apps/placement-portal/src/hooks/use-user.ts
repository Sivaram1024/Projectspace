import { useAuth } from '@/context/auth-context';

export interface UserProfile {
  id: string;
  email: string;
  isEmailVerified: boolean;
}

export const useUser = () => {
  const { user, isEmailVerified } = useAuth();
  
  return {
    data: user
      ? {
          id: user.id,
          userPrincipalName: user.email || '',
          email: user.email || '',
          displayName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Student',
          isEmailVerified,
        }
      : undefined,
    isLoading: false,
  };
};
