import { AuthProvider, AuthUser } from '../../types/auth';
import { FirebaseAuthProvider } from './firebaseAuthProvider';

// We instantiate the firebase provider here.
const provider: AuthProvider = new FirebaseAuthProvider();

export const AuthService = {
  signIn: (identifier: string, password: string) => provider.signIn(identifier, password),
  signOut: () => provider.signOut(),
  getCurrentUser: () => provider.getCurrentUser(),
  subscribeToAuthState: (callback: (user: AuthUser | null) => void) => provider.subscribeToAuthState(callback),
};
