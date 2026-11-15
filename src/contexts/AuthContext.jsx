import { createContext, useContext, useState, useEffect } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '../firebase';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

const DEFAULT_DEMO_USER = {
  uid: 'demo_user_snaplens_01',
  email: 'alex@snaplens.app',
  displayName: 'Alex Rivers',
  photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
  bio: 'Living in yellow & capturing moments 📸✨',
  handle: 'alexrivers',
  streakCount: 42,
  snapsCount: 128,
};

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Monitor live Firebase Auth or check local authenticated session
  useEffect(() => {
    if (isFirebaseConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          setCurrentUser(user);
          // Fetch additional profile data from Firestore
          if (db) {
            try {
              const docSnap = await getDoc(doc(db, 'users', user.uid));
              if (docSnap.exists()) {
                const existingData = docSnap.data();
                setUserProfile(existingData);
                // Backfill lowercase search keys if missing
                const rawName = existingData.displayName || user.displayName || user.email?.split('@')[0] || 'User';
                const rawHandle = existingData.handle || rawName.toLowerCase().replace(/[^a-z0-9_]/g, '') || `user_${user.uid.substring(0, 6)}`;
                if (!existingData.handleLower || !existingData.displayNameLower || !existingData.createdAtMs) {
                  const updates = {
                    handle: rawHandle,
                    handleLower: rawHandle.toLowerCase(),
                    displayNameLower: rawName.toLowerCase(),
                    createdAtMs: existingData.createdAtMs || Date.now(),
                  };
                  updateDoc(doc(db, 'users', user.uid), updates).catch(() => {});
                }
              } else {
                // Initialize default profile document for registered users without Firestore docs
                const rawName = user.displayName || user.email?.split('@')[0] || 'Snap User';
                const cleanHandle = rawName.toLowerCase().replace(/[^a-z0-9_]/g, '') || `user_${user.uid.substring(0, 6)}`;
                const now = Date.now();
                const newProfile = {
                  uid: user.uid,
                  displayName: rawName,
                  displayNameLower: rawName.toLowerCase(),
                  photoURL: user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`,
                  bio: 'SnapLens Creator ✨',
                  handle: cleanHandle,
                  handleLower: cleanHandle.toLowerCase(),
                  streakCount: 0,
                  snapsCount: 0,
                  createdAt: serverTimestamp(),
                  createdAtMs: now,
                };
                await setDoc(doc(db, 'users', user.uid), newProfile);
                setUserProfile(newProfile);
              }
            } catch (err) {
              console.warn('Firestore profile fetch error:', err);
            }
          }
        } else {
          setCurrentUser(null);
          setUserProfile(null);
        }
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      // Local session mode: only restore if user explicitly logged in previously
      const savedUser = localStorage.getItem('snaplens_auth_user');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          setCurrentUser(parsed);
          setUserProfile(parsed);
        } catch {
          setCurrentUser(null);
          setUserProfile(null);
        }
      } else {
        setCurrentUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    }
  }, []);

  // Register new user
  const register = async (email, password, displayName, avatarUrl) => {
    setLoading(true);

    if (isFirebaseConfigured && auth) {
      try {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCred.user;

        const photo =
          avatarUrl ||
          `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(displayName || email)}`;
        await updateProfile(user, {
          displayName,
          photoURL: photo,
        });

        const cleanHandle =
          displayName.toLowerCase().replace(/[^a-z0-9_]/g, '') || `user_${user.uid.substring(0, 6)}`;
        const now = Date.now();

        const profileData = {
          uid: user.uid,
          displayName,
          displayNameLower: displayName.toLowerCase(),
          photoURL: photo,
          bio: 'SnapLens Creator ✨',
          handle: cleanHandle,
          handleLower: cleanHandle.toLowerCase(),
          streakCount: 0,
          snapsCount: 0,
          createdAt: serverTimestamp(),
          createdAtMs: now,
        };

        if (db) {
          await setDoc(doc(db, 'users', user.uid), profileData);
        }

        setUserProfile(profileData);
        setIsAuthModalOpen(false);
        toast.success(`Welcome to SnapLens, ${displayName}! 🎉`);
        return { success: true, user };
      } catch (err) {
        toast.error(err.message || 'Registration failed');
        throw err;
      } finally {
        setLoading(false);
      }
    } else {
      // Local fallback registration
      const mockUser = {
        uid: `user_${Date.now()}`,
        email,
        displayName,
        photoURL:
          avatarUrl ||
          `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(displayName || email)}`,
        bio: 'SnapLens Creator ✨',
        handle: displayName.toLowerCase().replace(/\s+/g, '_'),
        streakCount: 1,
        snapsCount: 0,
      };
      setCurrentUser(mockUser);
      setUserProfile(mockUser);
      localStorage.setItem('snaplens_auth_user', JSON.stringify(mockUser));
      setIsAuthModalOpen(false);
      setLoading(false);
      toast.success(`Account created for ${displayName}! 🎉`);
      return { success: true, user: mockUser };
    }
  };

  // Login existing user
  const login = async (email, password) => {
    setLoading(true);

    if (isFirebaseConfigured && auth) {
      try {
        const userCred = await signInWithEmailAndPassword(auth, email, password);
        setIsAuthModalOpen(false);
        toast.success(`Welcome back, ${userCred.user.displayName || 'friend'}! ✨`);
        return { success: true, user: userCred.user };
      } catch (err) {
        toast.error(err.message || 'Login failed. Check your email & password.');
        throw err;
      } finally {
        setLoading(false);
      }
    } else {
      // Local fallback login
      const mockUser = {
        ...DEFAULT_DEMO_USER,
        email,
        displayName: email.split('@')[0],
      };
      setCurrentUser(mockUser);
      setUserProfile(mockUser);
      localStorage.setItem('snaplens_auth_user', JSON.stringify(mockUser));
      setIsAuthModalOpen(false);
      setLoading(false);
      toast.success(`Welcome back, ${mockUser.displayName}! ✨`);
      return { success: true, user: mockUser };
    }
  };

  // Logout
  const logout = async () => {
    if (isFirebaseConfigured && auth) {
      try {
        await signOut(auth);
        setCurrentUser(null);
        setUserProfile(null);
        toast.success('Signed out safely.');
      } catch (err) {
        toast.error('Logout error');
      }
    } else {
      setCurrentUser(null);
      setUserProfile(null);
      localStorage.removeItem('snaplens_auth_user');
      toast.success('Signed out safely.');
    }
  };

  // Update profile
  const updateUserProfile = async ({ displayName, bio, photoURL, handle }) => {
    if (isFirebaseConfigured && currentUser && auth?.currentUser) {
      try {
        await updateProfile(auth.currentUser, {
          displayName,
          photoURL,
        });

        if (db) {
          await updateDoc(doc(db, 'users', currentUser.uid), {
            displayName,
            bio,
            photoURL,
            handle,
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        console.warn('Profile sync error:', err);
      }
    }

    const updated = {
      ...(userProfile || currentUser),
      displayName: displayName || userProfile?.displayName,
      bio: bio || userProfile?.bio,
      photoURL: photoURL || userProfile?.photoURL,
      handle: handle || userProfile?.handle,
    };

    setCurrentUser((prev) => ({ ...prev, ...updated }));
    setUserProfile(updated);
    localStorage.setItem('snaplens_auth_user', JSON.stringify(updated));
    toast.success('Profile updated successfully!', { icon: '✨' });
  };

  // Guard action / navigation behind authentication
  const requireAuth = (callbackOrAction) => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      toast('Please sign in or create an account to use this feature!', { icon: '🔒' });
      return false;
    }
    if (typeof callbackOrAction === 'function') {
      callbackOrAction();
    }
    return true;
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        register,
        login,
        logout,
        updateUserProfile,
        isAuthModalOpen,
        setIsAuthModalOpen,
        requireAuth,
        isFirebaseConfigured,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

