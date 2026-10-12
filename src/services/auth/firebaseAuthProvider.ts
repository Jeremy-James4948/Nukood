import { AuthProvider, AuthUser } from '../../types/auth';
import { auth, db } from '../../lib/firebase';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export class FirebaseAuthProvider implements AuthProvider {
  async signIn(identifier: string, password: string): Promise<AuthUser> {
    try {
      // For prototyping, if the account doesn't exist, we auto-create it in the emulator
      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(auth, identifier + '@nukood.local', password);
      } catch (err: any) {
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
          userCredential = await createUserWithEmailAndPassword(auth, identifier + '@nukood.local', password);
          
          // Create the public user profile document
          await setDoc(doc(db, 'users', userCredential.user.uid), {
            userId: userCredential.user.uid,
            username: identifier,
            createdAt: serverTimestamp()
          });
        } else {
          throw err;
        }
      }
      
      const user = userCredential.user;
      return {
        userId: user.uid,
        username: identifier // Using email prefix as username for now
      };
    } catch (e: any) {
      throw new Error(e.message || 'Failed to sign in');
    }
  }

  async signOut(): Promise<void> {
    await signOut(auth);
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe();
        if (user) {
          // Extract username from email (e.g. "jj@nukood.local" -> "jj")
          const username = user.email ? user.email.split('@')[0] : 'User';
          resolve({
            userId: user.uid,
            username
          });
        } else {
          resolve(null);
        }
      });
    });
  }

  subscribeToAuthState(callback: (user: AuthUser | null) => void): () => void {
    return onAuthStateChanged(auth, (user) => {
      if (user) {
        const username = user.email ? user.email.split('@')[0] : 'User';
        callback({
          userId: user.uid,
          username
        });
      } else {
        callback(null);
      }
    });
  }
}
