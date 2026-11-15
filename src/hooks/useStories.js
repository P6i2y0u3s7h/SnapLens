import { useState, useEffect, useCallback } from 'react';
import {
  uploadStoryToCloud,
  fetchActiveStoriesFromCloud,
  deleteStoryFromCloud,
} from '../services/firebaseService';
import { useAuth } from '../contexts/AuthContext';

const STORIES_STORAGE_KEY = 'snaplens_stories_v2';
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

const DEMO_STORY_IDS = new Set(['friend_sophia', 'friend_liam', 'friend_emma', 'friend_alex']);
const INITIAL_FRIEND_STORIES = [];

/**
 * Filter out stories that are older than 24 hours (Ephemeral 24h expiration)
 */
function filterExpiredStories(items) {
  const now = Date.now();
  return (items || []).filter((item) => {
    const createdTime = new Date(item.createdAt || item.createdAtMs || now).getTime();
    return now - createdTime < TWENTY_FOUR_HOURS_MS;
  });
}

export function useStories() {
  const { currentUser, userProfile, isFirebaseConfigured } = useAuth();
  const [myStories, setMyStories] = useState([]);
  const [friendStories, setFriendStories] = useState([]);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);

  // 1. Initial Load from LocalStorage + 24h Expiration Check (Purging demo stories)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORIES_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const validMyStories = filterExpiredStories(parsed.myStories || []);
        const validFriends = (parsed.friendStories || [])
          .filter((f) => !DEMO_STORY_IDS.has(f.id))
          .map((f) => ({
            ...f,
            items: filterExpiredStories(f.items),
          }))
          .filter((f) => f.items.length > 0);

        setMyStories(validMyStories);
        setFriendStories(validFriends);
        localStorage.setItem(
          STORIES_STORAGE_KEY,
          JSON.stringify({ myStories: validMyStories, friendStories: validFriends })
        );
      } else {
        setFriendStories([]);
      }
    } catch {
      setFriendStories([]);
    }
  }, []);

  // 2. Fetch Active Stories from Firestore when connected
  useEffect(() => {
    if (!isFirebaseConfigured) return;

    let isMounted = true;
    async function loadCloudStories() {
      setIsCloudSyncing(true);
      try {
        const cloudStories = await fetchActiveStoriesFromCloud();
        if (!isMounted || !cloudStories || cloudStories.length === 0) {
          setIsCloudSyncing(false);
          return;
        }

        // Separate current user's stories and other users' stories
        const currentUserId = currentUser?.uid;
        const myCloudItems = [];
        const friendMap = {};

        cloudStories.forEach((item) => {
          if (currentUserId && item.userId === currentUserId) {
            myCloudItems.push(item);
          } else {
            const uid = item.userId || 'anon';
            if (!friendMap[uid]) {
              friendMap[uid] = {
                id: uid,
                user: {
                  id: uid,
                  name: item.userName || 'Snap Friend',
                  handle: item.userHandle || 'user',
                  avatar: item.userAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
                },
                hasUnseen: true,
                lastUpdated: 'Recent',
                items: [],
              };
            }
            friendMap[uid].items.push(item);
          }
        });

        // Merge with existing state
        if (myCloudItems.length > 0) {
          setMyStories((prev) => {
            const ids = new Set(myCloudItems.map((c) => c.id));
            const merged = [...myCloudItems, ...prev.filter((p) => !ids.has(p.id))];
            return filterExpiredStories(merged);
          });
        }

        const cloudFriendList = Object.values(friendMap);
        if (cloudFriendList.length > 0) {
          setFriendStories((prev) => {
            const cloudIds = new Set(cloudFriendList.map((c) => c.id));
            return [...cloudFriendList, ...prev.filter((p) => !cloudIds.has(p.id))];
          });
        }
      } catch (e) {
        console.debug('Failed to sync cloud stories:', e);
      } finally {
        if (isMounted) setIsCloudSyncing(false);
      }
    }

    loadCloudStories();
    return () => {
      isMounted = false;
    };
  }, [isFirebaseConfigured, currentUser]);

  // Save changes locally
  const persistStories = (updatedMyStories, updatedFriendStories) => {
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
  };

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
        type,
        url,
        caption,
        filter,
        duration: type === 'video' ? duration : 5,
        time: 'Just now',
        createdAt: new Date(now).toISOString(),
        expiresAt: new Date(now + TWENTY_FOUR_HOURS_MS).toISOString(),
        views: 0,
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
          type,
          filter,
          caption,
          duration: type === 'video' ? duration : 5,
          user: currentUser || {
            displayName: userProfile?.displayName || 'My Story',
            photoURL: userProfile?.photoURL,
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
    [friendStories, currentUser, userProfile]
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

      if (target?.cloudId) {
        await deleteStoryFromCloud(target.cloudId, target.storagePath);
      }
    },
    [myStories, friendStories]
  );

  // Mark a friend story as seen
  const markStoryAsSeen = useCallback(
    (friendId) => {
      setFriendStories((prev) => {
        const updated = prev.map((f) =>
          f.id === friendId ? { ...f, hasUnseen: false } : f
        );
        persistStories(myStories, updated);
        return updated;
      });
    },
    [myStories]
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
