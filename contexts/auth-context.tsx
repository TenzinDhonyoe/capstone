import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { mockUser, type MockUser } from '@/data/mock-user';

interface AuthContextType {
  user: MockUser | null;
  isAuthenticated: boolean;
  hasCompletedOnboarding: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  completeOnboarding: () => void;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Start authenticated – welcome screen is the entry point
  const [user, setUser] = useState<MockUser | null>(mockUser);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback(async (_email: string, _password: string) => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setUser(mockUser);
    setIsLoading(false);
  }, []);

  const signUp = useCallback(async (name: string, email: string, _password: string) => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setUser({
      ...mockUser,
      name,
      firstName: name.split(' ')[0],
      email,
      initials: name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2),
    });
    setHasCompletedOnboarding(false);
    setIsLoading(false);
  }, []);

  const logout = useCallback(() => {
    setUser(mockUser);
    setHasCompletedOnboarding(false);
  }, []);

  const completeOnboarding = useCallback(() => {
    setHasCompletedOnboarding(true);
  }, []);

  const resetPassword = useCallback(async (_email: string) => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setIsLoading(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        hasCompletedOnboarding,
        isLoading,
        login,
        signUp,
        logout,
        completeOnboarding,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
