export interface AuthUser {
  userId: string;
  username: string;
}

export interface AuthProvider {
  signIn(identifier: string, password: string): Promise<AuthUser>;
  signOut(): Promise<void>;
  getCurrentUser(): Promise<AuthUser | null>;
  subscribeToAuthState(callback: (user: AuthUser | null) => void): () => void;
}
