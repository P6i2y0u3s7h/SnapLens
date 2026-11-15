// Firebase Integration Service with Full Offline & Local Fallback
import { db, storage, auth, isFirebaseConfigured } from '../firebase';
import {
  collection,
  addDoc,
  setDoc,
  updateDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
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
  const effectiveUserId = userId || auth?.currentUser?.uid || 'demo_user_snaplens_01';

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
    const q = query(
      collection(db, 'snaps'),
      where('userId', '==', effectiveUserId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const media = [];
    querySnapshot.forEach((docSnap) => {
      media.push({
        id: docSnap.id,
        cloudId: docSnap.id,
        ...docSnap.data(),
        // Format timestamp if Firestore serverTimestamp
        createdAt: docSnap.data().createdAt?.toDate
          ? docSnap.data().createdAt.toDate().toISOString()
          : new Date().toISOString(),
      });
    });

    return media;
  } catch (err) {
    console.warn('Failed to fetch user media from Firestore:', err);
    return [];
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
// FRIENDS & USERS: Search, Requests, Streaks
// ─────────────────────────────────────────────────────────────────

/**
 * Searches users registered in Firestore by username, name, or email
 */
export async function searchUsersInCloud(searchTerm) {
  if (!isFirebaseConfigured || !db || !searchTerm?.trim()) return [];

  const term = searchTerm.trim().toLowerCase();
  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    const results = [];

    snapshot.forEach((d) => {
      const data = d.data();
      const matchName = data.displayName?.toLowerCase().includes(term);
      const matchHandle = data.handle?.toLowerCase().includes(term);
      const matchEmail = data.email?.toLowerCase().includes(term);
      if (matchName || matchHandle || matchEmail) {
        results.push({
          id: d.id,
          uid: d.id,
          name: data.displayName || 'SnapLens User',
          handle: data.handle || d.id.substring(0, 8),
          avatar: data.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${d.id}`,
          streak: data.streakCount || 0,
          snapScore: data.snapScore || 1200,
        });
      }
    });

    return results;
  } catch (err) {
    console.warn('User search error:', err);
    return [];
  }
}

/**
 * Sends a friend request in Firestore
 */
export async function sendFriendRequestInCloud({ sender, receiver }) {
  if (!isFirebaseConfigured || !db) return { success: true, isLocal: true };

  try {
    const reqRef = await addDoc(collection(db, 'friendRequests'), {
      senderId: sender.uid,
      senderName: sender.displayName || 'Snap Friend',
      senderHandle: sender.handle || 'user',
      senderAvatar: sender.photoURL || '',
      receiverId: receiver.uid || receiver.id,
      receiverName: receiver.name || receiver.displayName,
      receiverHandle: receiver.handle,
      status: 'pending', // 'pending' | 'accepted' | 'rejected'
      createdAt: serverTimestamp(),
      createdAtMs: Date.now(),
    });

    return { success: true, requestId: reqRef.id };
  } catch (err) {
    console.warn('Friend request cloud error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Responds to a friend request ('accepted' or 'rejected')
 */
export async function respondToFriendRequestInCloud({ requestId, status, senderId, receiverId }) {
  if (!isFirebaseConfigured || !db) return { success: true };

  try {
    const reqDocRef = doc(db, 'friendRequests', requestId);
    await updateDoc(reqDocRef, {
      status,
      respondedAt: serverTimestamp(),
    });

    // If accepted, create bilateral friend records in 'friends' collection
    if (status === 'accepted') {
      const friendship1 = {
        userId: receiverId,
        friendId: senderId,
        streak: 1,
        createdAt: serverTimestamp(),
      };
      const friendship2 = {
        userId: senderId,
        friendId: receiverId,
        streak: 1,
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, 'friends'), friendship1);
      await addDoc(collection(db, 'friends'), friendship2);
    }

    return { success: true };
  } catch (err) {
    console.warn('Respond friend request error:', err);
    return { success: false, error: err.message };
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
 */
export async function markSnapViewedInCloud(chatId, messageId) {
  if (!isFirebaseConfigured || !db || !chatId || !messageId) return;

  try {
    const msgRef = doc(db, 'chats', chatId, 'messages', messageId);
    await updateDoc(msgRef, {
      isViewed: true,
      viewedAt: serverTimestamp(),
      viewedAtMs: Date.now(),
    });
  } catch (err) {
    console.warn('Mark snap viewed error:', err);
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
