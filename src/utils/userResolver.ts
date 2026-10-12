import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { DEV_USERS } from '../services/auth/developmentAuthProvider';

// In-memory cache for resolved user display names
const userCache = new Map<string, string>();

// Seed with DEV_USERS
Object.values(DEV_USERS).forEach(u => {
  if (u.userId && u.username) {
    userCache.set(u.userId, u.username);
  }
});

/**
 * Resolves a userId to a friendly display name.
 * Uses cache first, then DEV_USERS, then Firestore users/{uid}.
 */
export async function getUserDisplayName(userId: string): Promise<string> {
  if (!userId) return '';

  if (userCache.has(userId)) {
    return userCache.get(userId)!;
  }

  // Check DEV_USERS by userId match
  const devUserMatch = Object.values(DEV_USERS).find(du => du.userId === userId);
  if (devUserMatch) {
    userCache.set(userId, devUserMatch.username);
    return devUserMatch.username;
  }

  try {
    const userDocSnap = await getDoc(doc(db, 'users', userId));
    if (userDocSnap.exists()) {
      const data = userDocSnap.data();
      const resolvedName = data.username || data.displayName || (data.email ? data.email.split('@')[0] : 'Member');
      userCache.set(userId, resolvedName);
      return resolvedName;
    }
  } catch (err) {
    console.warn(`Failed to resolve display name for user ${userId}`, err);
  }

  // Fallback if not found: generic friendly fallback or truncated identifier
  const fallback = 'Member';
  userCache.set(userId, fallback);
  return fallback;
}

/**
 * React hook to reactively resolve a single userId to a friendly name.
 */
export function useUserDisplayName(userId: string | undefined): { displayName: string; isLoading: boolean } {
  const [displayName, setDisplayName] = useState<string>(() => {
    if (!userId) return '';
    return userCache.get(userId) || '';
  });
  const [isLoading, setIsLoading] = useState<boolean>(() => !userCache.has(userId || ''));

  useEffect(() => {
    if (!userId) {
      setDisplayName('');
      setIsLoading(false);
      return;
    }

    if (userCache.has(userId)) {
      setDisplayName(userCache.get(userId)!);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    getUserDisplayName(userId).then(name => {
      if (isMounted) {
        setDisplayName(name);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [userId]);

  return { displayName, isLoading };
}
