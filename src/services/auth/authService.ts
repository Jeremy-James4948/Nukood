import { AuthProvider, AuthUser } from '../../types/auth';
import { DevelopmentAuthProvider } from './developmentAuthProvider';

// We instantiate the development provider here.
// In the future, this can be swapped with a FirebaseAuthProvider 
// without changing the rest of the application.
const provider: AuthProvider = new DevelopmentAuthProvider();

export const AuthService = {
  signIn: (identifier: string, password: string) => provider.signIn(identifier, password),
  signOut: () => provider.signOut(),
  getCurrentUser: () => provider.getCurrentUser(),
  subscribeToAuthState: (callback: (user: AuthUser | null) => void) => provider.subscribeToAuthState(callback),
};
