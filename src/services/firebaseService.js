// Firebase Integration Service with Full Offline & Local Fallback
import { db, storage, auth, isFirebaseConfigured } from '../firebase';
import {
  collection,
  addDoc,
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';

/**
 * Uploads a photo or video to Firebase Storage with upload progress tracking
 * and stores metadata in Firestore 'snaps' collection according to the required schema:
 * - userId
 * - mediaUrl
 * - type
 * - createdAt
 * - caption
 * - filter
 * - visibility
 */
export async function uploadMediaToCloud({
  fileBlob,
  dataUrl,
  type = 'photo',
  filter = 'Original',
  duration = null,
  caption = '',
  visibility = 'private',
  userId = null,
  onProgress = null,
}) {
  // Determine effective userId
  const effectiveUserId = userId || auth?.currentUser?.uid || 'user_local';

  // If Firebase is not configured or in offline demo mode, use local storage engine
  if (!isFirebaseConfigured || !storage || !db) {
    if (onProgress) {
      onProgress(50);
      setTimeout(() => onProgress(100), 200);
    }
    return {
      success: true,
      isLocal: true,
      mediaUrl: dataUrl || (fileBlob ? URL.createObjectURL(fileBlob) : null),
      cloudId: `local_${Date.now()}`,
      storagePath: null,
      userId: effectiveUserId,
      type,
      caption,
      filter,
      visibility,
      createdAt: new Date().toISOString(),
    };
  }

  try {
    // 1. Prepare blob
    let blobToUpload = fileBlob;
    if (!blobToUpload && dataUrl) {
      const res = await fetch(dataUrl);
      blobToUpload = await res.blob();
    }

    if (!blobToUpload) {
      throw new Error('No media blob available for upload');
    }

    // 2. Storage Reference: snaps/{userId}/{timestamp}_{rand}.{ext}
    const ext = type === 'video' ? 'webm' : 'jpg';
    const filename = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const storagePath = `snaps/${effectiveUserId}/${filename}`;
    const storageRef = ref(storage, storagePath);

    // 3. Upload with resumable task for live progress display
    const uploadTask = uploadBytesResumable(storageRef, blobToUpload, {
      contentType: type === 'video' ? 'video/webm' : 'image/jpeg',
      customMetadata: {
        userId: effectiveUserId,
        filter,
        type,
      },
    });

    const downloadURL = await new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          if (snapshot.totalBytes > 0 && onProgress) {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            onProgress(Math.round(progress));
          }
        },
        (error) => {
          console.error('Firebase Storage upload failed:', error);
          reject(error);
        },
        async () => {
          try {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(url);
          } catch (urlErr) {
            reject(urlErr);
          }
        }
      );
    });

    // 4. Save metadata in Firestore collection 'snaps'
    const snapDocData = {
      userId: effectiveUserId,
      mediaUrl: downloadURL,
      type,
      createdAt: serverTimestamp(),
      caption: caption || (type === 'video' ? 'Video Snap' : 'Photo Snap'),
      filter,
      visibility, // 'private' | 'public' | 'friends'
      duration,
      storagePath,
      likes: 0,
    };

    const docRef = await addDoc(collection(db, 'snaps'), snapDocData);

    return {
      success: true,
      isLocal: false,
      mediaUrl: downloadURL,
      cloudId: docRef.id,
      storagePath,
      ...snapDocData,
    };
  } catch (error) {
    console.warn('Firebase upload error, falling back to local storage:', error);
    return {
      success: false,
      isLocal: true,
      error: error.message,
      mediaUrl: dataUrl || (fileBlob ? URL.createObjectURL(fileBlob) : null),
      cloudId: `local_${Date.now()}`,
      userId: effectiveUserId,
      type,
      caption,
      filter,
      visibility,
    };
  }
}

/**
 * Fetches user photos and videos from Firestore
 */
export async function fetchUserCloudMedia(userId = null) {
  const effectiveUserId = userId || auth?.currentUser?.uid;

  if (!isFirebaseConfigured || !db || !effectiveUserId) {
    return [];
  }

  try {
    // Query by userId without composite index requirement, then sort in memory
    const q = query(
      collection(db, 'snaps'),
      where('userId', '==', effectiveUserId)
    );

    const querySnapshot = await getDocs(q);
    const media = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      media.push({
        id: docSnap.id,
        cloudId: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate
          ? data.createdAt.toDate().toISOString()
          : data.createdAt || new Date().toISOString(),
      });
    });

    media.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return media;
  } catch (err) {
    console.warn('Failed to fetch user media from Firestore:', err);
    return [];
  }
}

/**
 * Subscribes to real-time user cloud memories/snaps from Firestore
 */
export function subscribeToUserCloudMedia(userId, onUpdate) {
  const effectiveUserId = userId || auth?.currentUser?.uid;
  if (!isFirebaseConfigured || !db || !effectiveUserId || typeof onUpdate !== 'function') {
    return () => {};
  }

  try {
    const q = query(
      collection(db, 'snaps'),
      where('userId', '==', effectiveUserId)
    );

    return onSnapshot(
      q,
      (querySnapshot) => {
        const media = [];
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          media.push({
            id: docSnap.id,
            cloudId: docSnap.id,
            ...data,
            createdAt: data.createdAt?.toDate
              ? data.createdAt.toDate().toISOString()
              : data.createdAt || new Date().toISOString(),
          });
        });

        media.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        onUpdate(media);
      },
      (err) => {
        console.warn('subscribeToUserCloudMedia error:', err);
      }
    );
  } catch (e) {
    console.warn('subscribeToUserCloudMedia listener error:', e);
    return () => {};
  }
}

/**
 * Deletes media from Firestore and Firebase Storage
 */
export async function deleteCloudMedia(cloudId, storagePath) {
  if (!isFirebaseConfigured || !db) return;

  try {
    // 1. Delete document from Firestore
    if (cloudId) {
      await deleteDoc(doc(db, 'snaps', cloudId));
    }

    // 2. Delete file from Firebase Storage
    if (storagePath && storage) {
      const fileRef = ref(storage, storagePath);
      await deleteObject(fileRef).catch((e) => {
        console.debug('Storage file delete ignored:', e);
      });
    }
  } catch (err) {
    console.error('Failed to delete cloud snap:', err);
    throw err;
  }
}

/**
 * Triggers browser download for media
 */
export function downloadMediaFile(mediaUrl, filename = 'snaplens_media') {
  if (!mediaUrl) return;
  const link = document.createElement('a');
  link.href = mediaUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ─────────────────────────────────────────────────────────────────
// STORIES: Ephemeral 24-Hour Stories with Cloud Storage & Firestore
// ─────────────────────────────────────────────────────────────────

const STORY_EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Uploads a story item (photo or video) to Firebase Storage and adds metadata to 'stories'
 */
export async function uploadStoryToCloud({
  fileBlob,
  dataUrl,
  type = 'photo',
  filter = 'Original',
  caption = '',
  duration = null,
  user = null,
  onProgress = null,
}) {
  const effectiveUserId = user?.uid || auth?.currentUser?.uid || 'user_' + Date.now();
  const userName = user?.displayName || auth?.currentUser?.displayName || 'SnapLens Creator';
  const userHandle = user?.handle || userName.toLowerCase().replace(/\s+/g, '');
  const userAvatar =
    user?.photoURL ||
    auth?.currentUser?.photoURL ||
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80';

  const now = Date.now();
  const expiresAt = now + STORY_EXPIRATION_MS;

  // Local fallback if Firebase not configured
  if (!isFirebaseConfigured || !storage || !db) {
    if (onProgress) {
      onProgress(50);
      setTimeout(() => onProgress(100), 200);
    }
    return {
      id: 'local_story_' + now,
      cloudId: 'local_story_' + now,
      isLocal: true,
      userId: effectiveUserId,
      userName,
      userHandle,
      userAvatar,
      url: dataUrl || (fileBlob ? URL.createObjectURL(fileBlob) : ''),
      type,
      caption,
      filter,
      duration,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(expiresAt).toISOString(),
      time: 'Just now',
      views: 0,
    };
  }

  try {
    // 1. Prepare blob
    let blobToUpload = fileBlob;
    if (!blobToUpload && dataUrl) {
      const res = await fetch(dataUrl);
      blobToUpload = await res.blob();
    }
    if (!blobToUpload) throw new Error('No media blob available for story');

    // 2. Storage Reference: stories/{userId}/{timestamp}_{rand}.{ext}
    const ext = type === 'video' ? 'webm' : 'jpg';
    const filename = `${now}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
    const storagePath = `stories/${effectiveUserId}/${filename}`;
    const storageRef = ref(storage, storagePath);

    // 3. Upload file
    const uploadTask = uploadBytesResumable(storageRef, blobToUpload, {
      contentType: type === 'video' ? 'video/webm' : 'image/jpeg',
    });

    const downloadURL = await new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          if (snapshot.totalBytes > 0 && onProgress) {
            onProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
          }
        },
        reject,
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(url);
        }
      );
    });

    // 4. Firestore Document in 'stories'
    const storyDocData = {
      userId: effectiveUserId,
      userName,
      userHandle,
      userAvatar,
      url: downloadURL,
      storagePath,
      type,
      caption,
      filter,
      duration,
      createdAt: serverTimestamp(),
      createdAtMs: now,
      expiresAtMs: expiresAt,
      views: [],
    };

    const docRef = await addDoc(collection(db, 'stories'), storyDocData);

    return {
      id: docRef.id,
      cloudId: docRef.id,
      isLocal: false,
      ...storyDocData,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(expiresAt).toISOString(),
      time: 'Just now',
    };
  } catch (error) {
    console.warn('Story cloud upload failed, falling back locally:', error);
    return {
      id: 'local_story_' + now,
      cloudId: 'local_story_' + now,
      isLocal: true,
      userId: effectiveUserId,
      userName,
      userHandle,
      userAvatar,
      url: dataUrl || (fileBlob ? URL.createObjectURL(fileBlob) : ''),
      type,
      caption,
      filter,
      duration,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(expiresAt).toISOString(),
      time: 'Just now',
      views: 0,
    };
  }
}

/**
 * Fetches all unexpired stories from Firestore (within 24 hours)
 */
export async function fetchActiveStoriesFromCloud() {
  if (!isFirebaseConfigured || !db) return [];

  try {
    const minTimestamp = Date.now() - STORY_EXPIRATION_MS;
    const storiesRef = collection(db, 'stories');
    const q = query(
      storiesRef,
      where('createdAtMs', '>=', minTimestamp),
      orderBy('createdAtMs', 'desc')
    );

    const snapshot = await getDocs(q);
    const stories = [];
    snapshot.forEach((d) => {
      const data = d.data();
      stories.push({
        id: d.id,
        cloudId: d.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date(data.createdAtMs || Date.now()).toISOString(),
      });
    });
    return stories;
  } catch (err) {
    console.warn('Failed to fetch cloud stories (will fallback to local):', err);
    return [];
  }
}

/**
 * Deletes a story from Firestore & Storage
 */
export async function deleteStoryFromCloud(storyId, storagePath) {
  if (!isFirebaseConfigured || !db) return;
  try {
    if (storyId) await deleteDoc(doc(db, 'stories', storyId));
    if (storagePath && storage) {
      await deleteObject(ref(storage, storagePath)).catch(() => {});
    }
  } catch (err) {
    console.warn('Delete cloud story error:', err);
  }
}

// ─────────────────────────────────────────────────────────────────
// FRIENDS & USERS: Search, Requests, Streaks, Friendships
// ─────────────────────────────────────────────────────────────────

/**
 * Helper: Computes the genuine number of mutual friends between current user and target user
 * by checking real friendship records in the Firestore 'friends' collection.
 */
async function getMutualFriendsCount(targetId, existingFriendIdsSet) {
  if (!isFirebaseConfigured || !db || !existingFriendIdsSet || existingFriendIdsSet.size === 0 || !targetId) {
    return 0;
  }
  try {
    const fQuery = query(collection(db, 'friends'), where('userId', '==', targetId));
    const snap = await getDocs(fQuery);
    let count = 0;
    snap.forEach((doc) => {
      const data = doc.data();
      if (data.friendId && existingFriendIdsSet.has(data.friendId)) {
        count++;
      }
    });
    return count;
  } catch {
    return 0;
  }
}

/**
 * Searches users registered in Firestore by username or full name
 * Excludes currently logged-in user and never exposes private data (email, etc.)
 */
export async function searchUsersInCloud(searchTerm, excludeUserId = null) {
  if (!isFirebaseConfigured || !db || !searchTerm?.trim()) return [];

  const term = searchTerm.trim().toLowerCase();
  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    const results = [];

    // Get current user's friends for real mutual friends computation
    const existingFriendIds = new Set();
    if (excludeUserId) {
      const friendsRef = collection(db, 'friends');
      const fQuery = query(friendsRef, where('userId', '==', excludeUserId));
      const fSnap = await getDocs(fQuery);
      fSnap.forEach((d) => {
        const data = d.data();
        if (data.friendId) existingFriendIds.add(data.friendId);
      });
    }

    const matchedDocs = [];
    snapshot.forEach((d) => {
      if (excludeUserId && d.id === excludeUserId) return;
      if (d.id.startsWith('friend_') || d.id.startsWith('demo_')) return;
      const data = d.data();
      const name = (data.displayName || '').toLowerCase();
      if (['sophia chen', 'liam vance', 'emma watson', 'alex rivera'].includes(name)) return;
      const matchName = data.displayName?.toLowerCase().includes(term);
      const matchHandle = data.handle?.toLowerCase().includes(term);
      if (matchName || matchHandle) {
        matchedDocs.push(d);
      }
    });

    for (const d of matchedDocs.slice(0, 30)) {
      const data = d.data();
      const mutualCount = await getMutualFriendsCount(d.id, existingFriendIds);
      results.push({
        id: d.id,
        uid: d.id,
        name: data.displayName || 'SnapLens User',
        handle: data.handle || d.id.substring(0, 8),
        avatar: data.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${d.id}`,
        bio: data.bio || '',
        streak: data.streakCount || 0,
        snapScore: data.snapScore || 0,
        mutualCount,
      });
    }

    return results;
  } catch (err) {
    console.warn('User search error:', err);
    return [];
  }
}

/**
 * Fetches real registered users from Firestore for the "People on SnapLens" section.
 * - Excludes the current user
 * - Excludes users who are already friends
 * - Computes genuine mutual friend counts
 * - Supports pagination with startAfter and limit
 */
export async function fetchRegisteredUsersInCloud({
  currentUserId,
  lastVisibleDoc = null,
  pageSize = 12,
}) {
  if (!isFirebaseConfigured || !db) return { users: [], lastDoc: null, hasMore: false };

  try {
    // 1. Get current friends IDs to exclude
    const existingFriendIds = new Set();
    if (currentUserId) {
      const friendsRef = collection(db, 'friends');
      const fQuery = query(friendsRef, where('userId', '==', currentUserId));
      const fSnap = await getDocs(fQuery);
      fSnap.forEach((d) => {
        const data = d.data();
        if (data.friendId) existingFriendIds.add(data.friendId);
      });
    }

    // 2. Query users collection
    const usersRef = collection(db, 'users');
    const fetchLimit = Math.max(pageSize * 2, 24);
    let q;

    if (lastVisibleDoc) {
      q = query(usersRef, startAfter(lastVisibleDoc), limit(fetchLimit));
    } else {
      q = query(usersRef, limit(fetchLimit));
    }

    const snapshot = await getDocs(q);
    const rawDocs = snapshot.docs;
    const lastDoc = rawDocs.length > 0 ? rawDocs[rawDocs.length - 1] : null;
    const hasMore = rawDocs.length >= fetchLimit;

    const filteredDocs = rawDocs.filter((d) => {
      const uid = d.id;
      const data = d.data() || {};
      const name = (data.displayName || '').trim().toLowerCase();
      if (
        uid === currentUserId ||
        existingFriendIds.has(uid) ||
        uid.startsWith('friend_') ||
        uid.startsWith('user_') ||
        uid.startsWith('demo_') ||
        ['sophia chen', 'liam vance', 'emma watson', 'alex rivera'].includes(name)
      ) {
        return false;
      }
      return true;
    });

    const pageSlice = filteredDocs.slice(0, pageSize);
    const users = await Promise.all(
      pageSlice.map(async (d) => {
        const data = d.data();
        const uid = d.id;
        const mutualCount = await getMutualFriendsCount(uid, existingFriendIds);

        return {
          id: uid,
          uid,
          name: data.displayName || 'SnapLens User',
          handle: data.handle || uid.substring(0, 8),
          avatar: data.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`,
          bio: data.bio || '',
          streak: data.streakCount || 0,
          snapScore: data.snapScore || 0,
          createdAt: data.createdAtMs || (data.createdAt?.toMillis ? data.createdAt.toMillis() : null),
          mutualCount,
        };
      })
    );

    return {
      users,
      lastDoc,
      hasMore,
    };
  } catch (err) {
    console.warn('fetchRegisteredUsersInCloud error:', err);
    return { users: [], lastDoc: null, hasMore: false };
  }
}

/**
 * Fetches Quick Add suggested real users from Firestore
 * (Excludes current user, already added friends, and pending requests)
 * Suggests users based on genuine mutual friends and recently registered members.
 */
export async function fetchQuickAddSuggestionsInCloud(currentUserId, limitCount = 10) {
  if (!isFirebaseConfigured || !db || !currentUserId) return [];

  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);

    // Get current friends IDs
    const friendsRef = collection(db, 'friends');
    const fQuery = query(friendsRef, where('userId', '==', currentUserId));
    const fSnap = await getDocs(fQuery);
    const existingFriendIds = new Set();
    fSnap.forEach((d) => {
      const data = d.data();
      if (data.friendId) existingFriendIds.add(data.friendId);
    });

    // Get pending sent & received requests
    const reqsRef = collection(db, 'friendRequests');
    const sentQ = query(
      reqsRef,
      where('senderId', '==', currentUserId),
      where('status', '==', 'pending')
    );
    const recQ = query(
      reqsRef,
      where('receiverId', '==', currentUserId),
      where('status', '==', 'pending')
    );

    const [sentSnap, recSnap] = await Promise.all([getDocs(sentQ), getDocs(recQ)]);
    const pendingIds = new Set();
    sentSnap.forEach((d) => pendingIds.add(d.data().receiverId));
    recSnap.forEach((d) => pendingIds.add(d.data().senderId));

    const candidateDocs = [];
    snapshot.forEach((d) => {
      const uid = d.id;
      const data = d.data() || {};
      const name = (data.displayName || '').trim().toLowerCase();
      if (
        uid === currentUserId ||
        existingFriendIds.has(uid) ||
        pendingIds.has(uid) ||
        uid.startsWith('friend_') ||
        uid.startsWith('user_') ||
        uid.startsWith('demo_') ||
        ['sophia chen', 'liam vance', 'emma watson', 'alex rivera'].includes(name)
      ) {
        return;
      }
      candidateDocs.push(d);
    });

    // Compute genuine mutual friends and score
    const suggestionsWithScores = await Promise.all(
      candidateDocs.map(async (d) => {
        const data = d.data();
        const uid = d.id;
        const mutualCount = await getMutualFriendsCount(uid, existingFriendIds);
        const createdAtMs =
          data.createdAtMs || (data.createdAt?.toMillis ? data.createdAt.toMillis() : 0);

        return {
          id: uid,
          uid,
          name: data.displayName || 'Snap Friend',
          handle: data.handle || uid.substring(0, 8),
          avatar: data.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`,
          bio: data.bio || '',
          streak: data.streakCount || 0,
          snapScore: data.snapScore || 0,
          mutualCount,
          createdAtMs,
        };
      })
    );

    // Rank: candidates with mutual friends first (descending), then newest joined users
    suggestionsWithScores.sort((a, b) => {
      if (b.mutualCount !== a.mutualCount) {
        return b.mutualCount - a.mutualCount;
      }
      return b.createdAtMs - a.createdAtMs;
    });

    return suggestionsWithScores.slice(0, limitCount);
  } catch (err) {
    console.warn('Quick add fetch error:', err);
    return [];
  }
}

/**
 * Sends a friend request in Firestore with duplicate prevention
 */
export async function sendFriendRequestInCloud({ sender, receiver }) {
  if (!isFirebaseConfigured || !db) return { success: true, isLocal: true };

  const senderId = sender.uid || sender.id;
  const receiverId = receiver.uid || receiver.id;

  if (senderId === receiverId) {
    return { success: false, error: 'You cannot send a friend request to yourself.' };
  }

  try {
    // 1. Check if friendship already exists in 'friends'
    const friendDocRef = doc(db, 'friends', `${senderId}_${receiverId}`);
    const friendDocSnap = await getDoc(friendDocRef);
    if (friendDocSnap.exists()) {
      return { success: false, error: 'You are already friends with this user.' };
    }

    // 2. Check if a pending request was already sent by us
    const reqsRef = collection(db, 'friendRequests');
    const q1 = query(
      reqsRef,
      where('senderId', '==', senderId),
      where('receiverId', '==', receiverId),
      where('status', '==', 'pending')
    );
    const snap1 = await getDocs(q1);
    if (!snap1.empty) {
      return { success: false, error: 'Friend request already sent.' };
    }

    // 3. Check if they already sent a request to us (if so, auto-accept!)
    const q2 = query(
      reqsRef,
      where('senderId', '==', receiverId),
      where('receiverId', '==', senderId),
      where('status', '==', 'pending')
    );
    const snap2 = await getDocs(q2);
    if (!snap2.empty) {
      const incomingReqDoc = snap2.docs[0];
      await respondToFriendRequestInCloud({
        requestId: incomingReqDoc.id,
        status: 'accepted',
        senderId: receiverId,
        receiverId: senderId,
      });
      return { success: true, autoAccepted: true };
    }

    // 4. Create new friend request
    const reqRef = await addDoc(collection(db, 'friendRequests'), {
      senderId,
      senderName: sender.displayName || sender.name || 'Snap Friend',
      senderHandle: sender.handle || 'user',
      senderAvatar: sender.photoURL || sender.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${senderId}`,
      receiverId,
      receiverName: receiver.displayName || receiver.name || 'Snap Friend',
      receiverHandle: receiver.handle || 'user',
      receiverAvatar: receiver.photoURL || receiver.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${receiverId}`,
      status: 'pending', // 'pending' | 'accepted' | 'rejected'
      createdAt: serverTimestamp(),
      createdAtMs: Date.now(),
      updatedAt: serverTimestamp(),
    });

    return { success: true, requestId: reqRef.id };
  } catch (err) {
    console.warn('Friend request cloud error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Responds to a friend request ('accepted' or 'rejected')
 * When accepted, establishes bilateral friendships in Firestore
 */
export async function respondToFriendRequestInCloud({ requestId, status, senderId, receiverId }) {
  if (!isFirebaseConfigured || !db) return { success: true };

  try {
    const now = Date.now();
    if (requestId) {
      const reqDocRef = doc(db, 'friendRequests', requestId);
      await updateDoc(reqDocRef, {
        status,
        respondedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }).catch(() => {});
    }

    // If accepted, create bilateral friend records and friendship document
    if (status === 'accepted' && senderId && receiverId) {
      const friendshipId = [senderId, receiverId].sort().join('_');

      // 1. Bilateral 'friends' records
      await setDoc(doc(db, 'friends', `${receiverId}_${senderId}`), {
        userId: receiverId,
        friendId: senderId,
        streak: 1,
        createdAt: serverTimestamp(),
        createdAtMs: now,
      });

      await setDoc(doc(db, 'friends', `${senderId}_${receiverId}`), {
        userId: senderId,
        friendId: receiverId,
        streak: 1,
        createdAt: serverTimestamp(),
        createdAtMs: now,
      });

      // 2. 'friendships' record
      await setDoc(
        doc(db, 'friendships', friendshipId),
        {
          friendshipId,
          user1Id: senderId,
          user2Id: receiverId,
          createdAt: serverTimestamp(),
          createdAtMs: now,
        },
        { merge: true }
      );
    }

    return { success: true };
  } catch (err) {
    console.warn('Respond friend request error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Removes a friendship in Firestore
 */
export async function removeFriendInCloud(currentUserId, friendId) {
  if (!isFirebaseConfigured || !db || !currentUserId || !friendId) return { success: true };

  try {
    const friendshipId = [currentUserId, friendId].sort().join('_');
    await Promise.all([
      deleteDoc(doc(db, 'friendships', friendshipId)).catch(() => {}),
      deleteDoc(doc(db, 'friends', `${currentUserId}_${friendId}`)).catch(() => {}),
      deleteDoc(doc(db, 'friends', `${friendId}_${currentUserId}`)).catch(() => {}),
    ]);
    return { success: true };
  } catch (err) {
    console.warn('Remove friend in cloud error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Subscribes to incoming friend requests in real-time
 */
export function subscribeToIncomingFriendRequestsInCloud(currentUserId, onUpdate) {
  if (!isFirebaseConfigured || !db || !currentUserId) return () => {};

  try {
    const reqsRef = collection(db, 'friendRequests');
    const q = query(
      reqsRef,
      where('receiverId', '==', currentUserId),
      where('status', '==', 'pending')
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const requests = [];
        snapshot.forEach((d) => {
          requests.push({
            id: d.id,
            ...d.data(),
          });
        });
        onUpdate(requests);
      },
      (err) => {
        console.warn('Friend requests snapshot error:', err);
      }
    );
  } catch (err) {
    console.warn('Subscribe friend requests error:', err);
    return () => {};
  }
}

/**
 * Subscribes to sent pending friend requests in real-time
 */
export function subscribeToSentFriendRequestsInCloud(currentUserId, onUpdate) {
  if (!isFirebaseConfigured || !db || !currentUserId) return () => {};

  try {
    const reqsRef = collection(db, 'friendRequests');
    const q = query(
      reqsRef,
      where('senderId', '==', currentUserId),
      where('status', '==', 'pending')
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const sent = [];
        snapshot.forEach((d) => {
          sent.push({
            id: d.id,
            ...d.data(),
          });
        });
        onUpdate(sent);
      },
      (err) => {
        console.warn('Sent friend requests snapshot error:', err);
      }
    );
  } catch (err) {
    console.warn('Subscribe sent friend requests error:', err);
    return () => {};
  }
}

/**
 * Subscribes to user friends in real-time from Firestore
 */
export function subscribeToFriendsInCloud(currentUserId, onUpdate) {
  if (!isFirebaseConfigured || !db || !currentUserId) return () => {};

  try {
    const friendsRef = collection(db, 'friends');
    const q = query(friendsRef, where('userId', '==', currentUserId));

    return onSnapshot(
      q,
      async (snapshot) => {
        const friendIds = [];
        snapshot.forEach((d) => {
          const data = d.data();
          if (data.friendId) {
            friendIds.push({
              friendId: data.friendId,
              streak: data.streak || 0,
            });
          }
        });

        if (friendIds.length === 0) {
          onUpdate([]);
          return;
        }

        const friendsData = await Promise.all(
          friendIds.map(async ({ friendId, streak }) => {
            try {
              const userSnap = await getDoc(doc(db, 'users', friendId));
              if (userSnap.exists()) {
                const u = userSnap.data();
                return {
                  id: friendId,
                  uid: friendId,
                  name: u.displayName || 'Snap Friend',
                  handle: u.handle || friendId.substring(0, 8),
                  avatar: u.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${friendId}`,
                  streak: streak || u.streakCount || 0,
                  snapScore: u.snapScore || 500,
                  status: 'opened',
                  lastInteraction: 'Friends',
                  lastInteractionTime: 'Active',
                  messages: [],
                };
              }
            } catch (e) {
              console.warn('Error fetching friend user doc:', e);
            }
            return {
              id: friendId,
              uid: friendId,
              name: 'Snap Friend',
              handle: friendId.substring(0, 8),
              avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${friendId}`,
              streak: streak || 1,
              status: 'opened',
              lastInteraction: 'Friends',
              lastInteractionTime: 'Active',
              messages: [],
            };
          })
        );

        onUpdate(friendsData);
      },
      (err) => {
        console.warn('Friends snapshot error:', err);
      }
    );
  } catch (err) {
    console.warn('Subscribe friends error:', err);
    return () => {};
  }
}

// ─────────────────────────────────────────────────────────────────
// CHAT & DISAPPEARING SNAPS
// ─────────────────────────────────────────────────────────────────

/**
 * Helper to compute deterministic 1-on-1 chatId between two users
 */
export function getChatId(user1Id, user2Id) {
  return [user1Id, user2Id].sort().join('_');
}

/**
 * Sends a chat message or disappearing Snap to Firestore
 */
export async function sendChatMessageInCloud({
  chatId,
  sender,
  text = '',
  mediaUrl = '',
  mediaType = 'photo',
  isSnap = false,
  caption = '',
}) {
  if (!isFirebaseConfigured || !db) return { success: true, isLocal: true };

  try {
    const now = Date.now();
    const messagesRef = collection(db, 'chats', chatId, 'messages');

    const messageData = {
      senderId: sender.uid || sender.id,
      senderName: sender.displayName || sender.name || 'User',
      senderAvatar: sender.photoURL || sender.avatar || '',
      text: text || '',
      mediaUrl: mediaUrl || '',
      mediaType: mediaType || 'photo',
      isSnap: Boolean(isSnap),
      caption: caption || '',
      isViewed: false,
      viewedAt: null,
      createdAt: serverTimestamp(),
      createdAtMs: now,
    };

    const docRef = await addDoc(messagesRef, messageData);

    // Update parent chat document metadata
    const chatDocRef = doc(db, 'chats', chatId);
    await setDoc(
      chatDocRef,
      {
        lastMessage: isSnap ? 'Sent a Snap' : text || 'Media message',
        lastMessageTime: serverTimestamp(),
        lastMessageTimeMs: now,
      },
      { merge: true }
    );

    return { success: true, messageId: docRef.id };
  } catch (err) {
    console.warn('Send chat cloud message error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Marks a disappearing Snap as viewed in Firestore
 * Sets status to 'opened', records openedAt, and makes 1 replay available
 */
export async function markSnapViewedInCloud(chatId, messageId, snapId = null) {
  if (!isFirebaseConfigured || !db) return;

  try {
    const now = Date.now();
    if (chatId && messageId) {
      const msgRef = doc(db, 'chats', chatId, 'messages', messageId);
      await updateDoc(msgRef, {
        isViewed: true,
        status: 'opened',
        openedAt: serverTimestamp(),
        openedAtMs: now,
        viewedAt: serverTimestamp(),
        viewedAtMs: now,
        replayAvailable: true,
        replayUsed: false,
        replayCount: 0,
      }).catch(() => {});
    }

    if (snapId) {
      const snapRef = doc(db, 'snaps', snapId);
      await updateDoc(snapRef, {
        status: 'opened',
        openedAt: serverTimestamp(),
        openedAtMs: now,
        viewedAt: serverTimestamp(),
        viewedAtMs: now,
        replayAvailable: true,
        replayUsed: false,
        replayCount: 0,
      }).catch(() => {});
    }
  } catch (err) {
    console.warn('Mark snap viewed error:', err);
  }
}

/**
 * Marks a Snap as replayed in Firestore with 1-time server restriction
 */
export async function replaySnapInCloud(chatId, messageId, snapId = null, recipientId = null) {
  if (!isFirebaseConfigured || !db) return { success: true };

  try {
    const now = Date.now();

    // Verify server-side snap record if available
    if (snapId) {
      const snapRef = doc(db, 'snaps', snapId);
      const snapSnap = await getDoc(snapRef);
      if (snapSnap.exists()) {
        const snapData = snapSnap.data();
        if (snapData.replayUsed || (snapData.replayCount && snapData.replayCount >= 1)) {
          return { success: false, error: 'Replay already used for this snap.' };
        }
      }

      await updateDoc(snapRef, {
        replayAvailable: false,
        replayUsed: true,
        replayCount: 1,
        replayedAt: serverTimestamp(),
        replayedAtMs: now,
      }).catch(() => {});
    }

    if (chatId && messageId) {
      const msgRef = doc(db, 'chats', chatId, 'messages', messageId);
      await updateDoc(msgRef, {
        replayAvailable: false,
        replayUsed: true,
        replayCount: 1,
        replayedAt: serverTimestamp(),
        replayedAtMs: now,
      }).catch(() => {});
    }

    return { success: true };
  } catch (err) {
    console.warn('Replay snap in cloud error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Marks a Snap as saved to Memories in Firestore
 */
export async function markSnapSavedInCloud(chatId, messageId, snapId = null, userId = null) {
  if (!isFirebaseConfigured || !db) return { success: true };

  try {
    const now = Date.now();
    if (chatId && messageId) {
      const msgRef = doc(db, 'chats', chatId, 'messages', messageId);
      await updateDoc(msgRef, {
        savedToMemories: true,
        savedAt: serverTimestamp(),
        savedAtMs: now,
      }).catch(() => {});
    }

    if (snapId) {
      const snapRef = doc(db, 'snaps', snapId);
      await updateDoc(snapRef, {
        savedToMemories: true,
        savedAt: serverTimestamp(),
        savedAtMs: now,
      }).catch(() => {});
    }

    return { success: true };
  } catch (err) {
    console.warn('Mark snap saved in cloud error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Subscribes in real-time to messages of a chat
 */
export function subscribeToChatMessagesInCloud(chatId, onUpdate) {
  if (!isFirebaseConfigured || !db || !chatId) {
    return () => {};
  }

  try {
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('createdAtMs', 'asc'), limit(100));

    return onSnapshot(
      q,
      (snapshot) => {
        const msgs = [];
        snapshot.forEach((d) => {
          const data = d.data();
          msgs.push({
            id: d.id,
            ...data,
            time: data.createdAt?.toDate
              ? data.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : 'Just now',
          });
        });
        onUpdate(msgs);
      },
      (err) => {
        console.warn('Chat subscription warning:', err);
      }
    );
  } catch (e) {
    console.warn('Failed to subscribe to chat:', e);
    return () => {};
  }
}

/**
 * Deletes a single message from Firestore chat
 */
export async function deleteChatMessageInCloud(chatId, messageId) {
  if (!isFirebaseConfigured || !db || !chatId || !messageId) return { success: true };

  try {
    const msgRef = doc(db, 'chats', chatId, 'messages', messageId);
    await deleteDoc(msgRef);
    return { success: true };
  } catch (err) {
    console.warn('Delete chat message cloud error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Clears / deletes all messages in a chat conversation in Firestore
 */
export async function clearChatConversationInCloud(chatId) {
  if (!isFirebaseConfigured || !db || !chatId) return { success: true };

  try {
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const snap = await getDocs(messagesRef);
    const deletePromises = snap.docs.map((d) => deleteDoc(d.ref).catch(() => {}));
    await Promise.all(deletePromises);

    // Update parent chat metadata
    const chatDocRef = doc(db, 'chats', chatId);
    await setDoc(
      chatDocRef,
      {
        lastMessage: 'Chat cleared',
        lastMessageTime: serverTimestamp(),
        lastMessageTimeMs: Date.now(),
      },
      { merge: true }
    );

    return { success: true };
  } catch (err) {
    console.warn('Clear chat conversation cloud error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Uploads a photo or video once to Firebase Storage for sharing across multiple recipients
 */
export async function uploadSnapMediaOnce({
  fileBlob,
  dataUrl,
  type = 'photo',
  userId = null,
  onProgress = null,
}) {
  const effectiveUserId = userId || auth?.currentUser?.uid || 'user_' + Date.now();

  if (!isFirebaseConfigured || !storage) {
    if (onProgress) {
      onProgress(50);
      setTimeout(() => onProgress(100), 200);
    }
    return {
      mediaUrl: dataUrl || (fileBlob ? URL.createObjectURL(fileBlob) : ''),
      storagePath: null,
      isLocal: true,
    };
  }

  try {
    let blobToUpload = fileBlob;
    if (!blobToUpload && dataUrl) {
      if (dataUrl.startsWith('http')) {
        return { mediaUrl: dataUrl, storagePath: null, isLocal: false };
      }
      const res = await fetch(dataUrl);
      blobToUpload = await res.blob();
    }

    if (!blobToUpload) {
      throw new Error('No media blob available for upload');
    }

    const ext = type === 'video' ? 'webm' : 'jpg';
    const filename = `${Date.now()}_shared_${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const storagePath = `snaps/${effectiveUserId}/${filename}`;
    const storageRef = ref(storage, storagePath);

    const uploadTask = uploadBytesResumable(storageRef, blobToUpload, {
      contentType: type === 'video' ? 'video/webm' : 'image/jpeg',
      customMetadata: {
        userId: effectiveUserId,
        type,
        sharedSnap: 'true',
      },
    });

    const downloadURL = await new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          if (snapshot.totalBytes > 0 && onProgress) {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            onProgress(Math.round(progress));
          }
        },
        (error) => {
          console.error('Firebase single snap upload failed:', error);
          reject(error);
        },
        async () => {
          try {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(url);
          } catch (urlErr) {
            reject(urlErr);
          }
        }
      );
    });

    return { mediaUrl: downloadURL, storagePath, isLocal: false };
  } catch (err) {
    console.warn('Upload snap media error, using local fallback:', err);
    return {
      mediaUrl: dataUrl || (fileBlob ? URL.createObjectURL(fileBlob) : ''),
      storagePath: null,
      isLocal: true,
      error: err.message,
    };
  }
}

/**
 * Sends the SAME photo/video to multiple friends simultaneously:
 * 1. Uploads media once to Firebase Storage
 * 2. Creates individual recipient records in Firestore 'snaps' collection
 * 3. Adds snap message into each 1-on-1 chat in Firestore
 * 4. Updates sender and recipient interaction statuses
 */
export async function sendSnapToMultipleFriendsInCloud({
  sender,
  recipientIds = [],
  fileBlob = null,
  dataUrl = null,
  mediaUrl = null,
  mediaType = 'photo',
  caption = '',
  onProgress = null,
}) {
  if (!recipientIds || recipientIds.length === 0) {
    return { success: false, error: 'No recipients selected' };
  }

  const senderId = sender?.uid || sender?.id || auth?.currentUser?.uid || 'user_local';
  const senderName = sender?.displayName || sender?.name || 'SnapLens User';
  const senderAvatar = sender?.photoURL || sender?.avatar || '';
  const senderHandle = sender?.handle || (sender?.email ? sender.email.split('@')[0] : 'user');

  try {
    // Step 1: Upload media once if not already a cloud URL
    let finalMediaUrl = mediaUrl;
    let storagePath = null;

    if (!finalMediaUrl && (fileBlob || dataUrl)) {
      const uploadResult = await uploadSnapMediaOnce({
        fileBlob,
        dataUrl,
        type: mediaType,
        userId: senderId,
        onProgress,
      });
      finalMediaUrl = uploadResult.mediaUrl;
      storagePath = uploadResult.storagePath;
    }

    if (onProgress) {
      onProgress(100);
    }

    const now = Date.now();
    const expiresAtMs = now + 24 * 60 * 60 * 1000; // 24-hour expiration
    const expiresAt = new Date(expiresAtMs).toISOString();

    // Step 2: If Firestore is connected, batch/parallel create recipient records
    const snapRecords = [];

    if (isFirebaseConfigured && db) {
      const writePromises = recipientIds.map(async (recipientId) => {
        try {
          // A. Create dedicated snap record in 'snaps' collection
          const snapData = {
            senderId,
            senderName,
            senderAvatar,
            senderHandle,
            recipientId,
            mediaUrl: finalMediaUrl,
            mediaType,
            caption: caption || '',
            storagePath,
            status: 'delivered', // 'sent' | 'delivered' | 'opened'
            createdAt: serverTimestamp(),
            createdAtMs: now,
            expiresAt,
            expiresAtMs,
            viewedAt: null,
            openedAt: null,
            replayAvailable: false,
            replayUsed: false,
            replayCount: 0,
            savedToMemories: false,
          };

          const snapDocRef = await addDoc(collection(db, 'snaps'), snapData);

          // B. Add message in 1-on-1 chat
          const chatId = getChatId(senderId, recipientId);
          const chatMsgData = {
            snapId: snapDocRef.id,
            senderId,
            senderName,
            senderAvatar,
            text: caption || '',
            mediaUrl: finalMediaUrl,
            mediaType,
            isSnap: true,
            caption: caption || '',
            isViewed: false,
            status: 'delivered',
            viewedAt: null,
            openedAt: null,
            replayAvailable: false,
            replayUsed: false,
            replayCount: 0,
            savedToMemories: false,
            createdAt: serverTimestamp(),
            createdAtMs: now,
          };

          await addDoc(collection(db, 'chats', chatId, 'messages'), chatMsgData);

          // C. Update chat metadata
          await setDoc(
            doc(db, 'chats', chatId),
            {
              lastMessage: 'Sent a Snap 🔥',
              lastMessageTime: serverTimestamp(),
              lastMessageTimeMs: now,
            },
            { merge: true }
          );

          snapRecords.push({
            snapId: snapDocRef.id,
            recipientId,
            mediaUrl: finalMediaUrl,
          });
        } catch (subErr) {
          console.warn(`Failed cloud dispatch to friend ${recipientId}:`, subErr);
        }
      });

      await Promise.all(writePromises);
    }

    return {
      success: true,
      mediaUrl: finalMediaUrl,
      recipientCount: recipientIds.length,
      snapRecords,
    };
  } catch (error) {
    console.error('sendSnapToMultipleFriendsInCloud failed:', error);
    return {
      success: false,
      error: error.message,
      mediaUrl: mediaUrl || dataUrl,
    };
  }
}

/**
 * Fetches all unread/received snaps for a user from Firestore
 */
export async function fetchReceivedSnapsFromCloud(userId) {
  if (!isFirebaseConfigured || !db || !userId) return [];

  try {
    const snapsRef = collection(db, 'snaps');
    const q = query(
      snapsRef,
      where('recipientId', '==', userId),
      where('status', 'in', ['delivered', 'sent']),
      orderBy('createdAtMs', 'desc'),
      limit(50)
    );

    const snapshot = await getDocs(q);
    const snaps = [];
    snapshot.forEach((d) => {
      snaps.push({
        id: d.id,
        snapId: d.id,
        ...d.data(),
      });
    });

    return snaps;
  } catch (err) {
    console.warn('Failed to fetch received snaps:', err);
    return [];
  }
}

/**
 * ─────────────────────────────────────────────────────────────────
 * FRIEND PROFILE & SAFETY (Blocks & Relationships)
 * ─────────────────────────────────────────────────────────────────
 */

/**
 * Fetches complete public profile data, friendship stats, mutual friends,
 * active stories, and shared snaps for a friend from Firestore.
 */
export async function fetchFriendProfileDataInCloud(targetUserId, currentUserId = null) {
  if (!isFirebaseConfigured || !db || !targetUserId) return null;

  try {
    // 1. Fetch user document
    const userDocRef = doc(db, 'users', targetUserId);
    const userDocSnap = await getDoc(userDocRef);
    if (!userDocSnap.exists()) return null;

    const userData = userDocSnap.data();

    // 2. Fetch friendship with current user
    let isFriend = false;
    let streak = userData.streakCount || 0;
    let friendsSince = null;

    if (currentUserId && currentUserId !== targetUserId) {
      const friendDocRef = doc(db, 'friends', `${currentUserId}_${targetUserId}`);
      const friendDocSnap = await getDoc(friendDocRef);
      if (friendDocSnap.exists()) {
        isFriend = true;
        const fData = friendDocSnap.data();
        streak = fData.streak || streak || 0;
        friendsSince = fData.createdAtMs || (fData.createdAt?.toMillis ? fData.createdAt.toMillis() : null);
      }
    }

    // 3. Fetch target user's friends count
    const targetFriendsQuery = query(collection(db, 'friends'), where('userId', '==', targetUserId));
    const targetFriendsSnap = await getDocs(targetFriendsQuery);
    const targetFriendIds = new Set();
    targetFriendsSnap.forEach((d) => {
      const data = d.data();
      if (data.friendId) targetFriendIds.add(data.friendId);
    });
    const friendsCount = targetFriendIds.size;

    // 4. Calculate real mutual friends
    const mutualFriends = [];
    if (currentUserId && currentUserId !== targetUserId && targetFriendIds.size > 0) {
      const myFriendsQuery = query(collection(db, 'friends'), where('userId', '==', currentUserId));
      const myFriendsSnap = await getDocs(myFriendsQuery);
      const mutualIds = [];
      myFriendsSnap.forEach((d) => {
        const data = d.data();
        if (data.friendId && targetFriendIds.has(data.friendId)) {
          mutualIds.push(data.friendId);
        }
      });

      // Fetch avatar & name for mutual preview
      for (const mId of mutualIds.slice(0, 6)) {
        try {
          const mSnap = await getDoc(doc(db, 'users', mId));
          if (mSnap.exists()) {
            const mData = mSnap.data();
            mutualFriends.push({
              id: mId,
              name: mData.displayName || 'Snap Friend',
              handle: mData.handle || 'user',
              avatar: mData.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${mId}`,
            });
          }
        } catch {}
      }
    }

    // 5. Fetch active stories (last 24 hours)
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    const storiesQuery = query(
      collection(db, 'stories'),
      where('userId', '==', targetUserId),
      limit(20)
    );
    const storiesSnap = await getDocs(storiesQuery);
    const activeStories = [];
    storiesSnap.forEach((d) => {
      const sData = d.data();
      const createdTime = sData.createdAtMs || (sData.createdAt?.toMillis ? sData.createdAt.toMillis() : 0);
      if (createdTime >= twentyFourHoursAgo) {
        activeStories.push({
          id: d.id,
          ...sData,
        });
      }
    });

    // 6. Fetch shared snaps between current user and target user
    const sharedSnaps = [];
    if (currentUserId && currentUserId !== targetUserId) {
      try {
        const q1 = query(
          collection(db, 'snaps'),
          where('recipientId', '==', currentUserId),
          where('senderId', '==', targetUserId),
          limit(20)
        );
        const q2 = query(
          collection(db, 'snaps'),
          where('recipientId', '==', targetUserId),
          where('senderId', '==', currentUserId),
          limit(20)
        );
        const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
        const snapMap = new Map();
        snap1.forEach((d) => snapMap.set(d.id, { id: d.id, ...d.data(), isReceived: true }));
        snap2.forEach((d) => snapMap.set(d.id, { id: d.id, ...d.data(), isReceived: false }));

        const sorted = Array.from(snapMap.values()).sort(
          (a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0)
        );
        sharedSnaps.push(...sorted.slice(0, 16));
      } catch (err) {
        console.warn('Error fetching shared snaps:', err);
      }
    }

    // 7. Check if blocked
    let isBlocked = false;
    if (currentUserId && currentUserId !== targetUserId) {
      try {
        const blockSnap = await getDoc(doc(db, 'blocks', `${currentUserId}_${targetUserId}`));
        if (blockSnap.exists()) {
          isBlocked = true;
        }
      } catch {}
    }

    return {
      id: targetUserId,
      uid: targetUserId,
      name: userData.displayName || 'SnapLens Creator',
      handle: userData.handle || targetUserId.substring(0, 8),
      avatar: userData.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${targetUserId}`,
      bio: userData.bio || '',
      streak,
      snapScore: userData.snapScore || 0,
      createdAtMs: userData.createdAtMs || (userData.createdAt?.toMillis ? userData.createdAt.toMillis() : null),
      friendsCount,
      mutualFriends,
      mutualCount: mutualFriends.length,
      isFriend,
      friendsSince,
      activeStories,
      sharedSnaps,
      isBlocked,
    };
  } catch (err) {
    console.warn('fetchFriendProfileDataInCloud error:', err);
    return null;
  }
}

/**
 * Blocks a user and removes existing friendship
 */
export async function blockUserInCloud(currentUserId, targetUserId) {
  if (!isFirebaseConfigured || !db || !currentUserId || !targetUserId) return { success: true };

  try {
    const blockId = `${currentUserId}_${targetUserId}`;
    await setDoc(doc(db, 'blocks', blockId), {
      blockerId: currentUserId,
      blockedUserId: targetUserId,
      createdAt: serverTimestamp(),
      createdAtMs: Date.now(),
    });

    // Remove friendship
    await removeFriendInCloud(currentUserId, targetUserId);

    return { success: true };
  } catch (err) {
    console.warn('blockUserInCloud error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Unblocks a user
 */
export async function unblockUserInCloud(currentUserId, targetUserId) {
  if (!isFirebaseConfigured || !db || !currentUserId || !targetUserId) return { success: true };

  try {
    const blockId = `${currentUserId}_${targetUserId}`;
    await deleteDoc(doc(db, 'blocks', blockId));
    return { success: true };
  } catch (err) {
    console.warn('unblockUserInCloud error:', err);
    return { success: false, error: err.message };
  }
}
