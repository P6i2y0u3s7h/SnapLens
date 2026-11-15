import { useState, useEffect, useCallback, useRef } from 'react';
import {
  uploadStoryToCloud,
  fetchActiveStoriesFromCloud,
  subscribeToActiveStoriesInCloud,
  deleteStoryFromCloud,
  markStoryViewedInCloud,
  subscribeToFriendsInCloud,
} from '../services/firebaseService';
import { useAuth } from '../contexts/AuthContext';

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
  const name = String(f.user?.name || f.userName || f.name || '').toLowerCase();
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
    const expiresAt = item.expiresAtMs || (new Date(item.expiresAt).getTime() || 0);
    if (expiresAt && expiresAt > now) return true;
    const createdTime = item.createdAtMs || new Date(item.createdAt || now).getTime();
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

  // 1. Initial Load from LocalStorage + 24h Expiration Check
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

  // Helper to reprocess raw cloud stories against friends list
  const syncStoriesState = useCallback((allStories, friendsList) => {
    const currentUserId = currentUser?.uid;
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
      // Exclude expired stories
      const expiresAt = story.expiresAtMs || (new Date(story.expiresAt).getTime() || 0);
      const createdTime = story.createdAtMs || new Date(story.createdAt || now).getTime();
      const isExpired = expiresAt ? expiresAt <= now : now - createdTime >= TWENTY_FOUR_HOURS_MS;
      if (isExpired) return;

      const uid = story.userId;

      // My story
      if (currentUserId && uid === currentUserId) {
        myItems.push(story);
      } else if (currentUserId && friendMap.has(uid)) {
        // Belongs to an accepted friend!
        const friendInfo = friendMap.get(uid);
        if (!friendGroups[uid]) {
          friendGroups[uid] = {
            id: uid,
            user: {
              id: uid,
              uid: uid,
              name: friendInfo.name || friendInfo.displayName || story.userName || 'Snap Friend',
              handle: friendInfo.handle || friendInfo.username || story.userHandle || 'user',
              avatar: friendInfo.avatar || friendInfo.photoURL || story.userAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${uid}`,
            },
            items: [],
          };
        }
        friendGroups[uid].items.push(story);
      }
    });

    // 3. Update My Stories
    setMyStories((prev) => {
      const cloudIds = new Set(myItems.map((c) => c.id));
      // Keep optimistic uploading items
      const pendingOptimistic = prev.filter((p) => p.isUploading && !cloudIds.has(p.id));
      const merged = [...pendingOptimistic, ...myItems];
      merged.sort((a, b) => {
        const tA = a.createdAtMs || new Date(a.createdAt || 0).getTime();
        const tB = b.createdAtMs || new Date(b.createdAt || 0).getTime();
        return tB - tA;
      });
      return filterExpiredStories(merged);
    });

    // 4. Update Friend Stories with unseen calculations and sorting
    const processedFriends = Object.values(friendGroups).map((fg) => {
      // Chronological order within each friend's story series
      fg.items.sort((a, b) => {
        const tA = a.createdAtMs || new Date(a.createdAt || 0).getTime();
        const tB = b.createdAtMs || new Date(b.createdAt || 0).getTime();
        return tA - tB;
      });

      // A friend has unseen stories if ANY item has not been viewed by current user
      const hasUnseen = currentUserId
        ? fg.items.some((item) => {
            const views = Array.isArray(item.views) ? item.views : [];
            return !views.includes(currentUserId);
          })
        : true;

      // Most recent snap timestamp for friend
      const newestItem = fg.items[fg.items.length - 1];
      const lastStoryTime = newestItem ? (newestItem.createdAtMs || new Date(newestItem.createdAt || now).getTime()) : now;

      return {
        ...fg,
        hasUnseen,
        lastStoryTime,
        lastUpdated: formatStoryRelativeTime(lastStoryTime),
      };
    });

    // Sort: Unseen stories first, then most recent
    processedFriends.sort((a, b) => {
      if (a.hasUnseen !== b.hasUnseen) {
        return a.hasUnseen ? -1 : 1;
      }
      return b.lastStoryTime - a.lastStoryTime;
    });

    setFriendStories(processedFriends);
    persistStories(myItems, processedFriends);
  }, [currentUser, persistStories]);

  // 2. Real-Time Listeners for Friends and Active Stories from Firestore
  useEffect(() => {
    if (!isFirebaseConfigured || !currentUser) {
      setIsCloudSyncing(false);
      return;
    }

    setIsCloudSyncing(true);
    let unsubFriends = () => {};
    let unsubStories = () => {};

    // 1) Subscribe to real-time accepted friends
    unsubFriends = subscribeToFriendsInCloud(currentUser.uid, (friends) => {
      const validFriends = (friends || []).filter((f) => !isDemoStory(f));
      syncStoriesState(rawCloudStoriesRef.current, validFriends);
    });

    // 2) Subscribe to real-time unexpired stories
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
      url,
      fileBlob = null,
      caption = '',
      filter = 'Original',
      duration = 5,
    }) => {
      const now = Date.now();
      const localId = 'mystory_' + now;

      // 1. Immediately create optimistic item for zero-latency UX
      const optimisticItem = {
        id: localId,
        type: type === 'video' ? 'video' : 'photo',
        url,
        caption: caption || '',
        filter: filter || 'Original',
        duration: type === 'video' ? (duration || 10) : 5,
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
        const updated = [optimisticItem, ...prev];
        persistStories(updated, friendStories);
        return updated;
      });

      // 2. Upload to Cloud in Background
      try {
        const cloudResult = await uploadStoryToCloud({
          fileBlob,
          dataUrl: url,
          type: type === 'video' ? 'video' : 'photo',
          filter: filter || 'Original',
          caption: caption || '',
          duration: type === 'video' ? (duration || 10) : 5,
          user: currentUser || {
            uid: currentUser?.uid,
            displayName: userProfile?.displayName || 'My Story',
            photoURL: userProfile?.photoURL,
            handle: userProfile?.handle,
          },
        });

        // Update item with cloud URL and ID
        setMyStories((prev) => {
          const updated = prev.map((item) =>
            item.id === localId
              ? {
                  ...item,
                  id: cloudResult.id || item.id,
                  cloudId: cloudResult.id,
                  url: cloudResult.url || item.url,
                  storagePath: cloudResult.storagePath,
                  isUploading: false,
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
            item.id === localId ? { ...item, isUploading: false } : item
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
      const target = myStories.find((item) => item.id === id);
      setMyStories((prev) => {
        const updated = prev.filter((item) => item.id !== id);
        persistStories(updated, friendStories);
        return updated;
      });

      if (target?.cloudId || target?.id) {
        await deleteStoryFromCloud(target.cloudId || target.id, target.storagePath);
      }
    },
    [myStories, friendStories, persistStories]
  );

  // Mark a friend story item as seen (in local state and in Firestore)
  const markStoryAsSeen = useCallback(
    (storyId, friendId) => {
      const viewerId = currentUser?.uid;

      setFriendStories((prev) => {
        const updated = prev.map((friend) => {
          if (friend.id === friendId || friend.user?.id === friendId) {
            const updatedItems = friend.items.map((item) => {
              if (item.id === storyId) {
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
