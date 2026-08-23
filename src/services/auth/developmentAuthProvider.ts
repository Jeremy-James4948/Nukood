import { AuthProvider, AuthUser } from '../../types/auth';

const DEV_USERS: Record<string, AuthUser & { password: string }> = {
  'JJ': {
    userId: 'dev_jj',
    username: 'JJ',
    password: 'jj123'
  },
  'jeremy': {
    userId: 'dev_jeremy',
    username: 'jeremy',
    password: 'jeremy123'
  },
  'james': {
    userId: 'dev_james',
    username: 'james',
    password: 'james123'
  }
};

const SESSION_KEY = 'nukood_dev_auth_session';

export class DevelopmentAuthProvider implements AuthProvider {
  private subscribers: Set<(user: AuthUser | null) => void> = new Set();
  private currentUser: AuthUser | null = null;

  constructor() {
    this.restoreSession();
  }

  private restoreSession() {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        this.currentUser = JSON.parse(stored) as AuthUser;
      }
    } catch (e) {
      console.error('Failed to restore dev auth session', e);
    }
  }

  private notifySubscribers() {
    this.subscribers.forEach(callback => callback(this.currentUser));
  }

  async signIn(identifier: string, password: string): Promise<AuthUser> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));

    const userEntry = DEV_USERS[identifier];
    if (!userEntry || userEntry.password !== password) {
      throw new Error('Invalid username or password.');
    }

    const authUser: AuthUser = {
      userId: userEntry.userId,
      username: userEntry.username
    };

    this.currentUser = authUser;
    localStorage.setItem(SESSION_KEY, JSON.stringify(authUser));
    this.notifySubscribers();

    return authUser;
  }

  async signOut(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 400));
    this.currentUser = null;
    localStorage.removeItem(SESSION_KEY);
    this.notifySubscribers();
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    return this.currentUser;
  }

  subscribeToAuthState(callback: (user: AuthUser | null) => void): () => void {
    this.subscribers.add(callback);
    // Immediately invoke with current state
    callback(this.currentUser);
    
    return () => {
      this.subscribers.delete(callback);
    };
  }
}
