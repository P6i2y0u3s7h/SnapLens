import { useState, useEffect, useCallback, useRef } from 'react';
import {
  uploadStoryToCloud,
  subscribeToActiveStoriesInCloud,
  deleteStoryFromCloud,
  markStoryViewedInCloud,
  subscribeToFriendsInCloud,
} from '../services/firebaseService';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../firebase';

const STORIES_STORAGE_KEY = 'snaplens_stories_v3';
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

const DEMO_STORY_IDS = new Set([
  'friend_sophia',
  'friend_liam',
  'friend_emma',
  'friend_alex',
  'friend_1',
  'friend_2',
  'friend_3',
  'friend_4',
  'demo_user',
]);

const isDemoStory = (f) => {
  if (!f) return false;
  const id = String(f.id || f.userId || '').trim();
  if (DEMO_STORY_IDS.has(id)) return true;
  const name = String(f.user?.name || f.userName || f.username || f.name || '').toLowerCase();
  if (['sophia chen', 'liam vance', 'emma watson', 'alex rivera'].includes(name)) return true;
  return false;
};

/**
 * Filter out stories that are older than 24 hours (Ephemeral 24h expiration)
 */
function filterExpiredStories(items) {
  const now = Date.now();
  return (items || []).filter((item) => {
    if (!item) return false;
    const expiresAt =
      item.expiresAtMs ||
      (item.expiresAt ? new Date(item.expiresAt).getTime() : 0);
    if (expiresAt && expiresAt > now) return true;
    const createdTime =
      item.createdAtMs ||
      (item.createdAt ? new Date(item.createdAt).getTime() : now);
    return now - createdTime < TWENTY_FOUR_HOURS_MS;
  });
}

/**
 * Format timestamp to a human-friendly relative label
 */
function formatStoryRelativeTime(timestamp) {
  if (!timestamp) return 'Just now';
  const timeMs = typeof timestamp === 'number' ? timestamp : new Date(timestamp).getTime();
  const diffSec = Math.floor((Date.now() - timeMs) / 1000);

  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return 'Today';
}

export function useStories() {
  const { currentUser, userProfile, isFirebaseConfigured } = useAuth();
  const [myStories, setMyStories] = useState([]);
  const [friendStories, setFriendStories] = useState([]);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);

  // References for live data
  const rawCloudStoriesRef = useRef([]);
  const friendsMapRef = useRef(new Map());

  // 1. Initial Load from LocalStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORIES_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const validMyStories = filterExpiredStories(parsed.myStories || []);
        const validFriends = (parsed.friendStories || [])
          .filter((f) => !isDemoStory(f))
          .map((f) => ({
            ...f,
            items: filterExpiredStories(f.items),
          }))
          .filter((f) => f.items.length > 0);

        setMyStories(validMyStories);
        setFriendStories(validFriends);
      }
    } catch {
      setFriendStories([]);
    }
  }, []);

  // Save changes locally
  const persistStories = useCallback((updatedMyStories, updatedFriendStories) => {
    try {
      localStorage.setItem(
        STORIES_STORAGE_KEY,
        JSON.stringify({
          myStories: updatedMyStories,
          friendStories: updatedFriendStories,
        })
      );
    } catch (e) {
      console.warn('Storage error persisting stories:', e);
    }
  }, []);

  // Synchronize state from cloud stories + friends
  const syncStoriesState = useCallback(
    (allStories, friendsList) => {
      const currentUserId =
        currentUser?.uid ||
        auth?.currentUser?.uid ||
        userProfile?.uid ||
        currentUser?.id;
      const now = Date.now();

      // 1. Build friends lookup map
      const friendMap = new Map();
      (friendsList || []).forEach((f) => {
        const fid = f.id || f.friendId || f.uid;
        if (fid && !isDemoStory(f)) {
          friendMap.set(fid, f);
        }
      });
      friendsMapRef.current = friendMap;

      // 2. Separate current user's stories and friends' stories
      const myItems = [];
      const friendGroups = {};

      (allStories || []).forEach((story) => {
        const expiresAt =
          story.expiresAtMs ||
          (story.expiresAt ? new Date(story.expiresAt).getTime() : 0);
        const createdTime =
          story.createdAtMs ||
          (story.createdAt ? new Date(story.createdAt).getTime() : now);
        const isExpired =
          expiresAt ? expiresAt <= now : now - createdTime >= TWENTY_FOUR_HOURS_MS;
        if (isExpired) return;

        const uid = story.userId;
        if (!uid) return;

        const isVideo = story.mediaType === 'video' || story.type === 'video';
        const normalizedStory = {
          id: story.storyId || story.id,
          storyId: story.storyId || story.id,
          cloudId: story.storyId || story.id,
          userId: story.userId,
          username: story.username || story.userHandle || 'user',
          userName: story.userName || story.username || 'Snap Friend',
          profileImage: story.profileImage || story.userAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`,
          userAvatar: story.profileImage || story.userAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`,
          userHandle: story.username || story.userHandle || 'user',
          mediaUrl: story.mediaUrl || story.url,
          url: story.mediaUrl || story.url,
          mediaType: isVideo ? 'video' : 'image',
          type: isVideo ? 'video' : 'photo',
          caption: story.caption || '',
          filter: story.filter || 'Original',
          duration: story.duration || (isVideo ? 10 : 5),
          createdAt: story.createdAt,
          createdAtMs: story.createdAtMs || createdTime,
          expiresAt: story.expiresAt,
          expiresAtMs: story.expiresAtMs || expiresAt,
          views: Array.isArray(story.views) ? story.views : [],
          viewsCount: typeof story.viewsCount === 'number' ? story.viewsCount : (Array.isArray(story.views) ? story.views.length : 0),
          time: formatStoryRelativeTime(story.createdAtMs || createdTime),
        };

        // Current User's Story
        if (currentUserId && (uid === currentUserId || uid === auth?.currentUser?.uid)) {
          myItems.push(normalizedStory);
        } else if (friendMap.has(uid)) {
          // Accepted Friend's Story
          const friendInfo = friendMap.get(uid);
          if (!friendGroups[uid]) {
            friendGroups[uid] = {
              id: uid,
              user: {
                id: uid,
                uid: uid,
                name: friendInfo.name || friendInfo.displayName || normalizedStory.userName || 'Snap Friend',
                handle: friendInfo.handle || friendInfo.username || normalizedStory.username || 'user',
                avatar: friendInfo.avatar || friendInfo.photoURL || normalizedStory.profileImage || `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`,
              },
              items: [],
            };
          }
          friendGroups[uid].items.push(normalizedStory);
        }
      });

      // 3. Update My Stories: Merge local & cloud items without dropping any unexpired upload
      setMyStories((prev) => {
        const cloudIdSet = new Set(myItems.map((c) => c.id || c.storyId));
        // Keep local optimistic or fallback items that have not yet appeared in cloudIdSet
        const localRemaining = prev.filter(
          (p) => !cloudIdSet.has(p.id) && !cloudIdSet.has(p.storyId) && !cloudIdSet.has(p.cloudId)
        );
        const merged = [...localRemaining, ...myItems];
        merged.sort((a, b) => {
          const tA = a.createdAtMs || new Date(a.createdAt || 0).getTime();
          const tB = b.createdAtMs || new Date(b.createdAt || 0).getTime();
          return tB - tA;
        });
        const valid = filterExpiredStories(merged);
        return valid;
      });

      // 4. Update Friend Stories: Sort chronologically within group, unseen first
      const processedFriends = Object.values(friendGroups).map((fg) => {
        fg.items.sort((a, b) => {
          const tA = a.createdAtMs || new Date(a.createdAt || 0).getTime();
          const tB = b.createdAtMs || new Date(b.createdAt || 0).getTime();
          return tA - tB;
        });

        const hasUnseen = currentUserId
          ? fg.items.some((item) => {
              const views = Array.isArray(item.views) ? item.views : [];
              return !views.includes(currentUserId);
            })
          : true;

        const newestItem = fg.items[fg.items.length - 1];
        const lastStoryTime = newestItem
          ? newestItem.createdAtMs || new Date(newestItem.createdAt || now).getTime()
          : now;

        return {
          ...fg,
          hasUnseen,
          lastStoryTime,
          lastUpdated: formatStoryRelativeTime(lastStoryTime),
        };
      });

      // Sort: Unseen stories first, then most recently updated
      processedFriends.sort((a, b) => {
        if (a.hasUnseen !== b.hasUnseen) {
          return a.hasUnseen ? -1 : 1;
        }
        return b.lastStoryTime - a.lastStoryTime;
      });

      setFriendStories(processedFriends);
      persistStories(myItems, processedFriends);
    },
    [currentUser, userProfile, persistStories]
  );

  // 2. Real-Time Listeners for Stories and Friends from Firestore
  useEffect(() => {
    if (!isFirebaseConfigured) {
      setIsCloudSyncing(false);
      return;
    }

    setIsCloudSyncing(true);
    let unsubFriends = () => {};
    let unsubStories = () => {};

    // Real-time listener for friends
    const effectiveUid = currentUser?.uid || auth?.currentUser?.uid;
    if (effectiveUid) {
      unsubFriends = subscribeToFriendsInCloud(effectiveUid, (friends) => {
        const validFriends = (friends || []).filter((f) => !isDemoStory(f));
        syncStoriesState(rawCloudStoriesRef.current, validFriends);
      });
    }

    // Real-time listener for all active stories
    unsubStories = subscribeToActiveStoriesInCloud((stories) => {
      rawCloudStoriesRef.current = stories || [];
      const currentFriends = Array.from(friendsMapRef.current.values());
      syncStoriesState(stories || [], currentFriends);
      setIsCloudSyncing(false);
    });

    return () => {
      unsubFriends();
      unsubStories();
    };
  }, [isFirebaseConfigured, currentUser, syncStoriesState]);

  // Add new snap (photo or video) to My Story
  const addSnapToMyStory = useCallback(
    async ({
      type = 'photo',
      mediaType = null,
      url,
      fileBlob = null,
      caption = '',
      filter = 'Original',
      duration = 5,
    }) => {
      const now = Date.now();
      const localId = 'mystory_' + now;
      const isVideo =
        type === 'video' ||
        mediaType === 'video' ||
        (fileBlob && fileBlob.type && fileBlob.type.startsWith('video'));
      const cleanMediaType = isVideo ? 'video' : 'image';

      const effectiveUid =
        currentUser?.uid ||
        auth?.currentUser?.uid ||
        userProfile?.uid ||
        'user_' + now;
      const username =
        userProfile?.handle ||
        userProfile?.username ||
        currentUser?.displayName?.toLowerCase().replace(/[^a-z0-9_]/g, '') ||
        'user';
      const userAvatar =
        userProfile?.photoURL ||
        currentUser?.photoURL ||
        auth?.currentUser?.photoURL ||
        `https://api.dicebear.com/7.x/bottts/svg?seed=${effectiveUid}`;

      // 1. Immediately create optimistic item for zero-latency UI appearance
      const optimisticItem = {
        id: localId,
        storyId: localId,
        cloudId: localId,
        userId: effectiveUid,
        username,
        userHandle: username,
        userName: userProfile?.displayName || currentUser?.displayName || 'My Story',
        profileImage: userAvatar,
        userAvatar,
        mediaUrl: url,
        url,
        mediaType: cleanMediaType,
        type: isVideo ? 'video' : 'photo',
        caption: caption || '',
        filter: filter || 'Original',
        duration: isVideo ? (duration || 10) : 5,
        time: 'Just now',
        createdAt: new Date(now).toISOString(),
        createdAtMs: now,
        expiresAt: new Date(now + TWENTY_FOUR_HOURS_MS).toISOString(),
        expiresAtMs: now + TWENTY_FOUR_HOURS_MS,
        views: [],
        viewsCount: 0,
        isUploading: true,
      };

      setMyStories((prev) => {
        const updated = [optimisticItem, ...prev.filter((p) => p.id !== localId)];
        persistStories(updated, friendStories);
        return updated;
      });

      // 2. Upload to Cloud in Background
      try {
        const cloudResult = await uploadStoryToCloud({
          fileBlob,
          dataUrl: url,
          type: isVideo ? 'video' : 'photo',
          mediaType: cleanMediaType,
          filter: filter || 'Original',
          caption: caption || '',
          duration: isVideo ? (duration || 10) : 5,
          user: currentUser || {
            uid: effectiveUid,
            displayName: userProfile?.displayName || 'My Story',
            photoURL: userAvatar,
            handle: username,
          },
        });

        // Update item with cloud URL and ID
        setMyStories((prev) => {
          const updated = prev.map((item) =>
            item.id === localId
              ? {
                  ...item,
                  id: cloudResult.storyId || cloudResult.id || item.id,
                  storyId: cloudResult.storyId || cloudResult.id || item.id,
                  cloudId: cloudResult.storyId || cloudResult.id,
                  mediaUrl: cloudResult.mediaUrl || cloudResult.url || item.url,
                  url: cloudResult.mediaUrl || cloudResult.url || item.url,
                  storagePath: cloudResult.storagePath,
                  isUploading: false,
                  isLocal: cloudResult.isLocal || false,
                }
              : item
          );
          persistStories(updated, friendStories);
          return updated;
        });

        return cloudResult;
      } catch (err) {
        console.warn('Story cloud upload failed, kept locally:', err);
        setMyStories((prev) => {
          const updated = prev.map((item) =>
            item.id === localId ? { ...item, isUploading: false, isLocal: true } : item
          );
          persistStories(updated, friendStories);
          return updated;
        });
        return optimisticItem;
      }
    },
    [friendStories, currentUser, userProfile, persistStories]
  );

  // Delete snap from My Story
  const deleteFromMyStory = useCallback(
    async (id) => {
      const target = myStories.find((item) => item.id === id || item.storyId === id);
      setMyStories((prev) => {
        const updated = prev.filter((item) => item.id !== id && item.storyId !== id);
        persistStories(updated, friendStories);
        return updated;
      });

      if (target?.cloudId || target?.storyId || target?.id) {
        await deleteStoryFromCloud(target.cloudId || target.storyId || target.id, target.storagePath);
      }
    },
    [myStories, friendStories, persistStories]
  );

  // Mark a friend story item as seen (in local state and in Firestore)
  const markStoryAsSeen = useCallback(
    (storyId, friendId) => {
      const viewerId = currentUser?.uid || auth?.currentUser?.uid;

      setFriendStories((prev) => {
        const updated = prev.map((friend) => {
          if (friend.id === friendId || friend.user?.id === friendId) {
            const updatedItems = friend.items.map((item) => {
              if (item.id === storyId || item.storyId === storyId) {
                const currentViews = Array.isArray(item.views) ? item.views : [];
                if (viewerId && !currentViews.includes(viewerId)) {
                  return { ...item, views: [...currentViews, viewerId] };
                }
              }
              return item;
            });

            const hasUnseen = viewerId
              ? updatedItems.some((item) => {
                  const views = Array.isArray(item.views) ? item.views : [];
                  return !views.includes(viewerId);
                })
              : false;

            return {
              ...friend,
              items: updatedItems,
              hasUnseen,
            };
          }
          return friend;
        });

        persistStories(myStories, updated);
        return updated;
      });

      // Record in Firestore
      if (viewerId && storyId) {
        markStoryViewedInCloud(storyId, viewerId);
      }
    },
    [currentUser, myStories, persistStories]
  );

  return {
    myStories,
    friendStories,
    isCloudSyncing,
    addSnapToMyStory,
    deleteFromMyStory,
    markStoryAsSeen,
  };
}
