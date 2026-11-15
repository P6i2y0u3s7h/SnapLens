import { useState, useEffect, useCallback } from 'react';
import {
  searchUsersInCloud,
  sendFriendRequestInCloud,
  respondToFriendRequestInCloud,
  sendChatMessageInCloud,
  subscribeToChatMessagesInCloud,
  markSnapViewedInCloud,
  replaySnapInCloud,
  markSnapSavedInCloud,
  sendSnapToMultipleFriendsInCloud,
  fetchRegisteredUsersInCloud,
  fetchQuickAddSuggestionsInCloud,
  subscribeToIncomingFriendRequestsInCloud,
  subscribeToSentFriendRequestsInCloud,
  subscribeToFriendsInCloud,
  removeFriendInCloud,
  deleteChatMessageInCloud,
  clearChatConversationInCloud,
  blockUserInCloud,
  unblockUserInCloud,
  fetchFriendProfileDataInCloud,
  getChatId,
} from '../services/firebaseService';
import { useAuth } from '../contexts/AuthContext';

const CHAT_STORAGE_KEY = 'snaplens_chat_v2';
const REQUESTS_STORAGE_KEY = 'snaplens_friend_requests_v2';

// Known legacy demo IDs and names to automatically purge completely from state & persistence
export const DEMO_IDS = new Set([
  'friend_1',
  'friend_2',
  'friend_3',
  'friend_4',
  'friend_sophia',
  'friend_liam',
  'friend_emma',
  'friend_alex',
  'user_david',
  'user_maya',
  'user_jordan',
  'user_clara',
  'demo_user_snaplens_01',
  'demo_user',
]);

export const DEMO_NAMES = new Set([
  'sophia chen',
  'liam vance',
  'emma watson',
  'alex rivera',
  'david kim',
  'maya patel',
  'jordan lee',
  'clara oswald',
]);

export const DEMO_HANDLES = new Set([
  'sophiac',
  'liamv',
  'emma_lens',
  'alex_r',
  'davidk',
  'mayap',
  'jordanl',
  'clarao',
]);

export const isDemoEntity = (item) => {
  if (!item) return false;
  const id = String(item.id || item.uid || item.userId || item.senderId || '').trim();
  if (DEMO_IDS.has(id)) return true;
  const name = String(item.name || item.displayName || item.senderName || '').trim().toLowerCase();
  if (DEMO_NAMES.has(name)) return true;
  const handle = String(item.handle || item.username || item.senderHandle || '').trim().toLowerCase();
  if (DEMO_HANDLES.has(handle)) return true;
  return false;
};

const INITIAL_FRIENDS = [];
const INITIAL_REQUESTS = [];

export function useChat() {
  const { currentUser, isFirebaseConfigured } = useAuth();
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [quickAddSuggestions, setQuickAddSuggestions] = useState([]);
  const [isLoadingQuickAdd, setIsLoadingQuickAdd] = useState(false);
  const [peopleOnSnapLens, setPeopleOnSnapLens] = useState([]);
  const [isLoadingPeople, setIsLoadingPeople] = useState(false);
  const [isLoadingMorePeople, setIsLoadingMorePeople] = useState(false);
  const [hasMorePeople, setHasMorePeople] = useState(false);
  const [lastPeopleDoc, setLastPeopleDoc] = useState(null);
  const [activeFriendId, setActiveFriendId] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // 1. Initial Load from LocalStorage (Purging any legacy demo items)
  useEffect(() => {
    try {
      // Purge any legacy unversioned keys
      localStorage.removeItem('snaplens_chat');
      localStorage.removeItem('snaplens_friends');
      localStorage.removeItem('snaplens_friend_requests');

      const storedFriends = localStorage.getItem(CHAT_STORAGE_KEY);
      if (storedFriends) {
        const parsed = JSON.parse(storedFriends);
        const cleaned = (parsed || []).filter((f) => !isDemoEntity(f));
        setFriends(cleaned);
        localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(cleaned));
      } else {
        setFriends([]);
      }

      const storedReqs = localStorage.getItem(REQUESTS_STORAGE_KEY);
      if (storedReqs) {
        const parsedReqs = JSON.parse(storedReqs);
        const cleanedReqs = (parsedReqs || []).filter((r) => !isDemoEntity(r));
        setFriendRequests(cleanedReqs);
        localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(cleanedReqs));
      } else {
        setFriendRequests([]);
      }
    } catch {
      setFriends([]);
      setFriendRequests([]);
    }
  }, []);

  const persistFriends = (updated) => {
    const cleaned = (updated || []).filter((f) => !isDemoEntity(f));
    setFriends(cleaned);
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(cleaned));
    } catch (e) {
      console.warn('Storage error in chat:', e);
    }
  };

  const persistRequests = (updated) => {
    const cleaned = (updated || []).filter((r) => !isDemoEntity(r));
    setFriendRequests(cleaned);
    try {
      localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(cleaned));
    } catch (e) {
      console.warn('Storage error in friend requests:', e);
    }
  };

  // 1b. Subscribe to real-time incoming & sent friend requests, and friends from Firestore
  useEffect(() => {
    if (!isFirebaseConfigured || !currentUser) {
      // When logged out or offline, ensure demo items are not displayed
      setFriends((prev) => prev.filter((f) => !isDemoEntity(f)));
      setFriendRequests((prev) => prev.filter((r) => !isDemoEntity(r)));
      setSentRequests((prev) => prev.filter((r) => !isDemoEntity(r)));
      return;
    }

    const unsubIncoming = subscribeToIncomingFriendRequestsInCloud(
      currentUser.uid,
      (cloudRequests) => {
        const cleaned = (cloudRequests || []).filter((r) => !isDemoEntity(r));
        setFriendRequests(cleaned);
        try {
          localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(cleaned));
        } catch {}
      }
    );

    const unsubSent = subscribeToSentFriendRequestsInCloud(
      currentUser.uid,
      (cloudSent) => {
        const cleaned = (cloudSent || []).filter((r) => !isDemoEntity(r));
        setSentRequests(cleaned);
      }
    );

    const unsubFriends = subscribeToFriendsInCloud(
      currentUser.uid,
      (cloudFriends) => {
        const validFriends = (cloudFriends || []).filter((f) => !isDemoEntity(f));

        setFriends((prev) => {
          const prevMap = new Map();
          prev.forEach((f) => {
            if (!isDemoEntity(f)) {
              prevMap.set(f.id, f);
            }
          });

          // Firestore cloudFriends is the canonical list of real friends
          const updated = validFriends.map((cf) => {
            const existing = prevMap.get(cf.id);
            return {
              ...cf,
              name: cf.name || cf.displayName || 'SnapLens User',
              handle: cf.handle || cf.username || 'user',
              avatar: cf.avatar || cf.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${cf.id}`,
              streak: cf.streak ?? existing?.streak ?? 0,
              snapScore: cf.snapScore ?? existing?.snapScore ?? 100,
              messages: existing?.messages || [],
              lastInteraction: existing?.lastInteraction || 'Friends',
              lastInteractionTime: existing?.lastInteractionTime || 'Active',
              unreadCount: existing?.unreadCount || 0,
            };
          });

          try {
            localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(updated));
          } catch {}
          return updated;
        });
      }
    );

    return () => {
      unsubIncoming();
      unsubSent();
      unsubFriends();
    };
  }, [isFirebaseConfigured, currentUser]);

  // 1c. Load Quick Add Suggestions from Firestore
  const refreshQuickAdd = useCallback(async () => {
    if (!isFirebaseConfigured || !currentUser) {
      setQuickAddSuggestions([]);
      return;
    }
    setIsLoadingQuickAdd(true);
    try {
      const suggestions = await fetchQuickAddSuggestionsInCloud(currentUser.uid);
      setQuickAddSuggestions((suggestions || []).filter((u) => !isDemoEntity(u)));
    } catch (e) {
      console.warn('Quick add load error:', e);
    } finally {
      setIsLoadingQuickAdd(false);
    }
  }, [isFirebaseConfigured, currentUser]);

  useEffect(() => {
    refreshQuickAdd();
  }, [refreshQuickAdd]);

  // 1d. Fetch "People on SnapLens" (All registered Firestore users) with pagination
  const fetchPeople = useCallback(
    async (isRefresh = false) => {
      if (!isFirebaseConfigured || !currentUser) {
        setPeopleOnSnapLens([]);
        return;
      }
      setIsLoadingPeople(true);
      try {
        const res = await fetchRegisteredUsersInCloud({
          currentUserId: currentUser.uid,
          lastVisibleDoc: null,
          pageSize: 16,
        });
        const validUsers = (res.users || []).filter((u) => !isDemoEntity(u));
        setPeopleOnSnapLens(validUsers);
        setLastPeopleDoc(res.lastDoc);
        setHasMorePeople(res.hasMore);
      } catch (e) {
        console.warn('fetchPeople error:', e);
      } finally {
        setIsLoadingPeople(false);
      }
    },
    [isFirebaseConfigured, currentUser]
  );

  const loadMorePeople = useCallback(async () => {
    if (
      !isFirebaseConfigured ||
      !currentUser ||
      !hasMorePeople ||
      isLoadingMorePeople ||
      !lastPeopleDoc
    ) {
      return;
    }
    setIsLoadingMorePeople(true);
    try {
      const res = await fetchRegisteredUsersInCloud({
        currentUserId: currentUser.uid,
        lastVisibleDoc: lastPeopleDoc,
        pageSize: 16,
      });
      const validUsers = (res.users || []).filter((u) => !isDemoEntity(u));
      setPeopleOnSnapLens((prev) => {
        const existingMap = new Set(prev.map((u) => u.id));
        const newUsers = validUsers.filter((u) => !existingMap.has(u.id));
        return [...prev, ...newUsers];
      });
      setLastPeopleDoc(res.lastDoc);
      setHasMorePeople(res.hasMore);
    } catch (e) {
      console.warn('loadMorePeople error:', e);
    } finally {
      setIsLoadingMorePeople(false);
    }
  }, [isFirebaseConfigured, currentUser, hasMorePeople, isLoadingMorePeople, lastPeopleDoc]);

  useEffect(() => {
    fetchPeople();
  }, [fetchPeople]);

  // Helper to determine friendship / request state with any user
  const getRequestStatus = useCallback(
    (userId) => {
      if (!userId) return 'none';
      if (friends.some((f) => f.id === userId || f.uid === userId)) return 'friends';
      if (sentRequests.some((r) => r.receiverId === userId && r.status === 'pending'))
        return 'requested';
      if (friendRequests.some((r) => r.senderId === userId && r.status === 'pending'))
        return 'received';
      return 'none';
    },
    [friends, sentRequests, friendRequests]
  );

  // 2. Real-Time Chat Message Listener via Firestore when connected
  useEffect(() => {
    if (!isFirebaseConfigured || !currentUser || !activeFriendId) return;

    const chatId = getChatId(currentUser.uid, activeFriendId);
    const unsubscribe = subscribeToChatMessagesInCloud(chatId, (cloudMsgs) => {
      if (!cloudMsgs || cloudMsgs.length === 0) return;

      setFriends((prev) => {
        return prev.map((f) => {
          if (f.id === activeFriendId) {
            // Transform cloud messages into UI shape
            const formatted = cloudMsgs.map((cm) => ({
              id: cm.id,
              sender: cm.senderId === currentUser.uid ? 'me' : 'them',
              text: cm.text,
              type: cm.isSnap ? 'snap' : cm.mediaUrl ? 'media' : 'text',
              mediaUrl: cm.mediaUrl,
              mediaType: cm.mediaType || 'photo',
              snapUrl: cm.mediaUrl,
              caption: cm.caption,
              time: cm.time,
              opened: cm.isViewed || false,
            }));

            const lastM = formatted[formatted.length - 1];
            return {
              ...f,
              lastInteraction: lastM?.type === 'snap' ? (lastM.opened ? 'Opened' : 'New Snap') : lastM?.text || 'Message',
              lastInteractionTime: lastM?.time || 'Just now',
              messages: formatted,
            };
          }
          return f;
        });
      });
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isFirebaseConfigured, currentUser, activeFriendId]);

  // 3. User Search in Firestore (Excludes current user)
  const searchUsers = useCallback(
    async (term) => {
      if (!term || !term.trim()) {
        setSearchResults([]);
        return [];
      }

      setIsSearching(true);
      try {
        const queryTerm = term.trim().toLowerCase();
        let cloudUsers = [];
        if (isFirebaseConfigured) {
          cloudUsers = await searchUsersInCloud(queryTerm, currentUser?.uid);
        }

        const validResults = (cloudUsers || []).filter((u) => !isDemoEntity(u));
        setSearchResults(validResults);
        return validResults;
      } catch (err) {
        console.warn('Search error:', err);
        return [];
      } finally {
        setIsSearching(false);
      }
    },
    [isFirebaseConfigured, currentUser]
  );

  // 4. Send Friend Request (with duplicate protection)
  const sendFriendRequest = useCallback(
    async (targetUser) => {
      const targetId = targetUser.id || targetUser.uid;
      if (!targetId || targetId === currentUser?.uid) {
        return { success: false, error: 'Cannot send request to yourself.' };
      }

      // Check if already friends or requested
      if (friends.some((f) => f.id === targetId || f.uid === targetId)) {
        return { success: false, error: 'Already friends.' };
      }

      if (sentRequests.some((r) => r.receiverId === targetId && r.status === 'pending')) {
        return { success: false, error: 'Friend request already sent.' };
      }

      // Optimistic update
      const tempReq = {
        id: 'req_sent_' + Date.now(),
        senderId: currentUser?.uid,
        receiverId: targetId,
        receiverName: targetUser.name || targetUser.displayName,
        receiverHandle: targetUser.handle,
        receiverAvatar: targetUser.avatar || targetUser.photoURL,
        status: 'pending',
        time: 'Just now',
      };
      setSentRequests((prev) => [tempReq, ...prev]);

      let res = { success: true };
      if (isFirebaseConfigured && currentUser) {
        res = await sendFriendRequestInCloud({
          sender: currentUser,
          receiver: targetUser,
        });

        if (!res.success) {
          // Revert optimistic update
          setSentRequests((prev) => prev.filter((r) => r.receiverId !== targetId));
          return res;
        }

        // Remove from quick add suggestions
        setQuickAddSuggestions((prev) =>
          prev.filter((u) => u.id !== targetId && u.uid !== targetId)
        );
      }

      return res;
    },
    [friends, sentRequests, isFirebaseConfigured, currentUser]
  );

  // 5. Accept Friend Request
  const acceptFriendRequest = useCallback(
    async (requestId) => {
      const req = friendRequests.find((r) => r.id === requestId);
      if (!req) return { success: false };

      const senderId = req.senderId;
      const newFriend = {
        id: senderId,
        uid: senderId,
        name: req.senderName || 'New Friend',
        handle: req.senderHandle || 'user',
        avatar:
          req.senderAvatar ||
          `https://api.dicebear.com/7.x/bottts/svg?seed=${senderId}`,
        streak: 1,
        snapScore: 500,
        lastInteraction: 'Added Friend',
        lastInteractionTime: 'Just now',
        unreadCount: 0,
        status: 'opened',
        messages: [],
      };

      const updatedFriends = [newFriend, ...friends.filter((f) => f.id !== senderId)];
      persistFriends(updatedFriends);

      const updatedReqs = friendRequests.filter((r) => r.id !== requestId);
      persistRequests(updatedReqs);

      if (isFirebaseConfigured && currentUser) {
        await respondToFriendRequestInCloud({
          requestId,
          status: 'accepted',
          senderId,
          receiverId: currentUser.uid,
        });
      }

      refreshQuickAdd();
      fetchPeople();
      return { success: true, friend: newFriend };
    },
    [friendRequests, friends, isFirebaseConfigured, currentUser, refreshQuickAdd, fetchPeople]
  );

  // 6. Reject Friend Request
  const rejectFriendRequest = useCallback(
    async (requestId) => {
      const req = friendRequests.find((r) => r.id === requestId);
      const updatedReqs = friendRequests.filter((r) => r.id !== requestId);
      persistRequests(updatedReqs);

      if (isFirebaseConfigured && req) {
        await respondToFriendRequestInCloud({
          requestId,
          status: 'rejected',
          senderId: req.senderId,
          receiverId: currentUser?.uid,
        });
      }
      return { success: true };
    },
    [friendRequests, isFirebaseConfigured, currentUser]
  );

  // 6b. Remove Friend
  const removeFriend = useCallback(
    async (friendId) => {
      const updated = friends.filter((f) => f.id !== friendId && f.uid !== friendId);
      persistFriends(updated);

      if (activeFriendId === friendId) {
        setActiveFriendId(null);
      }

      if (isFirebaseConfigured && currentUser) {
        await removeFriendInCloud(currentUser.uid, friendId);
      }

      refreshQuickAdd();
      fetchPeople();
      return { success: true };
    },
    [friends, activeFriendId, isFirebaseConfigured, currentUser, refreshQuickAdd, fetchPeople]
  );

  // 6c. Block User
  const blockUser = useCallback(
    async (targetUserId) => {
      if (!targetUserId) return { success: false };

      const updated = friends.filter((f) => f.id !== targetUserId && f.uid !== targetUserId);
      persistFriends(updated);

      if (activeFriendId === targetUserId) {
        setActiveFriendId(null);
      }

      if (isFirebaseConfigured && currentUser) {
        await blockUserInCloud(currentUser.uid, targetUserId);
      }

      refreshQuickAdd();
      fetchPeople();
      return { success: true };
    },
    [friends, activeFriendId, isFirebaseConfigured, currentUser, refreshQuickAdd, fetchPeople]
  );

  // 6d. Unblock User
  const unblockUser = useCallback(
    async (targetUserId) => {
      if (!targetUserId) return { success: false };

      if (isFirebaseConfigured && currentUser) {
        await unblockUserInCloud(currentUser.uid, targetUserId);
      }

      refreshQuickAdd();
      fetchPeople();
      return { success: true };
    },
    [isFirebaseConfigured, currentUser, refreshQuickAdd, fetchPeople]
  );

  // 7. Send a Regular Text / Media Message
  const sendMessage = useCallback(
    async (friendId, text = '', mediaUrl = '', mediaType = 'photo') => {
      if (!text.trim() && !mediaUrl) return;

      const newMsg = {
        id: 'm_' + Date.now(),
        sender: 'me',
        text: text.trim(),
        mediaUrl: mediaUrl || '',
        mediaType: mediaType || 'photo',
        time: 'Just now',
      };

      const updated = friends.map((f) => {
        if (f.id === friendId) {
          return {
            ...f,
            lastInteraction: text.trim() || 'Media Sent',
            lastInteractionTime: 'Just now',
            status: 'delivered',
            messages: [...(f.messages || []), newMsg],
          };
        }
        return f;
      });

      persistFriends(updated);

      // Cloud dispatch if connected
      if (isFirebaseConfigured && currentUser) {
        const chatId = getChatId(currentUser.uid, friendId);
        await sendChatMessageInCloud({
          chatId,
          sender: currentUser,
          text: text.trim(),
          mediaUrl,
          mediaType,
          isSnap: false,
        });
      }
    },
    [friends, isFirebaseConfigured, currentUser]
  );

  // 7b. Delete a single message from chat
  const deleteMessage = useCallback(
    async (friendId, messageId) => {
      if (!friendId || !messageId) return { success: false };

      const updated = friends.map((f) => {
        if (f.id === friendId) {
          const remainingMessages = (f.messages || []).filter((m) => m.id !== messageId);
          const lastMsg = remainingMessages[remainingMessages.length - 1];
          return {
            ...f,
            messages: remainingMessages,
            lastInteraction: lastMsg
              ? lastMsg.text || (lastMsg.type === 'snap' ? 'Snap' : 'Media')
              : 'Chat cleared',
            lastInteractionTime: lastMsg?.time || 'Just now',
          };
        }
        return f;
      });
      persistFriends(updated);

      if (isFirebaseConfigured && currentUser) {
        const chatId = getChatId(currentUser.uid, friendId);
        await deleteChatMessageInCloud(chatId, messageId);
      }

      return { success: true };
    },
    [friends, isFirebaseConfigured, currentUser]
  );

  // 7c. Clear / delete all messages in a conversation
  const clearChat = useCallback(
    async (friendId) => {
      if (!friendId) return { success: false };

      const updated = friends.map((f) => {
        if (f.id === friendId) {
          return {
            ...f,
            messages: [],
            lastInteraction: 'Chat cleared',
            lastInteractionTime: 'Just now',
            unreadCount: 0,
          };
        }
        return f;
      });
      persistFriends(updated);

      if (isFirebaseConfigured && currentUser) {
        const chatId = getChatId(currentUser.uid, friendId);
        await clearChatConversationInCloud(chatId);
      }

      return { success: true };
    },
    [friends, isFirebaseConfigured, currentUser]
  );

  // 8. Send a Disappearing Snap directly to a Friend
  const sendSnapToFriend = useCallback(
    async (friendId, { snapUrl, type = 'photo', caption = '' }) => {
      const newSnapMsg = {
        id: 'm_snap_' + Date.now(),
        sender: 'me',
        type: 'snap',
        snapUrl,
        mediaType: type,
        caption,
        time: 'Just now',
        opened: false,
      };

      const updated = friends.map((f) => {
        if (f.id === friendId) {
          return {
            ...f,
            streak: (f.streak || 0) + 1,
            lastInteraction: 'Snap Sent',
            lastInteractionTime: 'Just now',
            status: 'delivered',
            messages: [...(f.messages || []), newSnapMsg],
          };
        }
        return f;
      });

      persistFriends(updated);

      // Cloud dispatch if connected
      if (isFirebaseConfigured && currentUser) {
        const chatId = getChatId(currentUser.uid, friendId);
        await sendChatMessageInCloud({
          chatId,
          sender: currentUser,
          mediaUrl: snapUrl,
          mediaType: type,
          isSnap: true,
          caption,
        });
      }
    },
    [friends, isFirebaseConfigured, currentUser]
  );

  // 8b. Send Disappearing Snap to MULTIPLE friends simultaneously
  const sendSnapToMultipleFriends = useCallback(
    async (recipientIds, { snapUrl, dataUrl, fileBlob, type = 'photo', caption = '', onProgress = null }) => {
      if (!recipientIds || recipientIds.length === 0) return { success: false };

      const finalUrl = snapUrl || dataUrl;
      const nowTime = 'Just now';

      // 1. Optimistic Local State Update for instant feedback
      const updatedFriends = friends.map((f) => {
        if (recipientIds.includes(f.id)) {
          const newSnapMsg = {
            id: 'm_snap_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            sender: 'me',
            type: 'snap',
            snapUrl: finalUrl,
            mediaType: type,
            caption: caption || '',
            time: nowTime,
            opened: false,
            status: 'delivered',
          };

          return {
            ...f,
            streak: (f.streak || 0) + 1,
            lastInteraction: 'Snap Sent 🔥',
            lastInteractionTime: nowTime,
            status: 'delivered',
            messages: [...(f.messages || []), newSnapMsg],
          };
        }
        return f;
      });

      persistFriends(updatedFriends);

      // 2. Dispatch to Firebase with single storage upload & individual Firestore docs
      let cloudResult = { success: true };
      if (isFirebaseConfigured && currentUser) {
        cloudResult = await sendSnapToMultipleFriendsInCloud({
          sender: currentUser,
          recipientIds,
          mediaUrl: snapUrl,
          dataUrl,
          fileBlob,
          mediaType: type,
          caption,
          onProgress,
        });
      }

      return cloudResult;
    },
    [friends, isFirebaseConfigured, currentUser]
  );

  // 9. Mark Snap Message as Opened (Disappearing Media)
  // If isReplay is false: snap is viewed, 1 replay becomes available, media URL preserved for replay & saving
  // If isReplay is true: 1-time replay is exhausted -> snap disappears permanently
  const openSnapMessage = useCallback(
    async (friendId, messageId, isReplay = false) => {
      let targetSnapId = null;

      const updated = friends.map((f) => {
        if (f.id === friendId) {
          const updatedMsgs = (f.messages || []).map((m) => {
            if (m.id === messageId) {
              targetSnapId = m.snapId;
              const originalUrl = m.originalSnapUrl || m.snapUrl || m.mediaUrl;

              if (isReplay) {
                return {
                  ...m,
                  opened: true,
                  status: 'opened',
                  viewedAt: 'Just now',
                  replayAvailable: false,
                  replayUsed: true,
                  replayCount: 1,
                  // Replay finished: clear media URL permanently so it disappears
                  snapUrl: null,
                };
              } else {
                return {
                  ...m,
                  opened: true,
                  status: 'opened',
                  viewedAt: 'Just now',
                  replayAvailable: true,
                  replayUsed: false,
                  replayCount: 0,
                  originalSnapUrl: originalUrl,
                  snapUrl: originalUrl,
                };
              }
            }
            return m;
          });

          return {
            ...f,
            unreadCount: 0,
            status: 'opened',
            lastInteraction: isReplay ? 'Replayed Snap' : 'Opened Snap',
            lastInteractionTime: 'Just now',
            messages: updatedMsgs,
          };
        }
        return f;
      });

      persistFriends(updated);

      // Sync viewed status to Firestore
      if (isFirebaseConfigured && currentUser) {
        const chatId = getChatId(currentUser.uid, friendId);
        if (isReplay) {
          await replaySnapInCloud(chatId, messageId, targetSnapId, currentUser.uid);
        } else {
          await markSnapViewedInCloud(chatId, messageId, targetSnapId);
        }
      }
    },
    [friends, isFirebaseConfigured, currentUser]
  );

  // 9b. Replay Snap Message (strictly once per recipient)
  const replaySnapMessage = useCallback(
    async (friendId, messageId) => {
      let targetSnap = null;
      let alreadyUsed = false;

      friends.forEach((f) => {
        if (f.id === friendId) {
          (f.messages || []).forEach((m) => {
            if (m.id === messageId) {
              targetSnap = m;
              if (m.replayUsed || (m.replayCount && m.replayCount >= 1)) {
                alreadyUsed = true;
              }
            }
          });
        }
      });

      if (alreadyUsed || !targetSnap) {
        return { success: false, error: 'Replay already used.' };
      }

      const activeUrl = targetSnap.originalSnapUrl || targetSnap.snapUrl || targetSnap.mediaUrl;
      if (!activeUrl) {
        return { success: false, error: 'Media is no longer available.' };
      }

      const updated = friends.map((f) => {
        if (f.id === friendId) {
          const updatedMsgs = (f.messages || []).map((m) => {
            if (m.id === messageId) {
              return {
                ...m,
                replayCount: 1,
                replayUsed: true,
                replayAvailable: false,
                replayedAt: 'Just now',
                snapUrl: activeUrl,
              };
            }
            return m;
          });

          return {
            ...f,
            lastInteraction: 'Replayed Snap',
            lastInteractionTime: 'Just now',
            messages: updatedMsgs,
          };
        }
        return f;
      });

      persistFriends(updated);

      if (isFirebaseConfigured && currentUser) {
        const chatId = getChatId(currentUser.uid, friendId);
        await replaySnapInCloud(chatId, messageId, targetSnap.snapId, currentUser.uid);
      }

      return {
        success: true,
        message: {
          ...targetSnap,
          replayCount: 1,
          replayUsed: true,
          replayAvailable: false,
          snapUrl: activeUrl,
        },
      };
    },
    [friends, isFirebaseConfigured, currentUser]
  );

  // 9c. Mark Snap as Saved to Memories Locally & in Cloud
  const markSnapSavedLocally = useCallback(
    async (friendId, messageId) => {
      let targetSnapId = null;
      const updated = friends.map((f) => {
        if (f.id === friendId) {
          const updatedMsgs = (f.messages || []).map((m) => {
            if (m.id === messageId) {
              targetSnapId = m.snapId;
              return {
                ...m,
                savedToMemories: true,
                savedAt: 'Just now',
              };
            }
            return m;
          });

          return {
            ...f,
            messages: updatedMsgs,
          };
        }
        return f;
      });

      persistFriends(updated);

      if (isFirebaseConfigured && currentUser) {
        const chatId = getChatId(currentUser.uid, friendId);
        await markSnapSavedInCloud(chatId, messageId, targetSnapId, currentUser.uid);
      }
    },
    [friends, isFirebaseConfigured, currentUser]
  );

  // 10. Instant Add Friend by Name & Handle
  const addFriend = useCallback(
    (name, handle) => {
      const newFriend = {
        id: 'friend_' + Date.now(),
        name,
        handle: handle.startsWith('@') ? handle.slice(1) : handle,
        avatar: `https://images.unsplash.com/photo-${1534528741775 + Math.floor(Math.random() * 1000)}?auto=format&fit=crop&w=300&q=80`,
        streak: 1,
        snapScore: 100,
        lastInteraction: 'Added Friend',
        lastInteractionTime: 'Just now',
        unreadCount: 0,
        status: 'opened',
        messages: [
          {
            id: 'm_greet_' + Date.now(),
            sender: 'me',
            text: `Hi ${name}! Let’s snap 📸`,
            time: 'Just now',
          },
        ],
      };

      const updated = [newFriend, ...friends];
      persistFriends(updated);
      return newFriend;
    },
    [friends]
  );

  const activeFriend = friends.find((f) => f.id === activeFriendId) || null;

  return {
    friends,
    friendRequests,
    sentRequests,
    quickAddSuggestions,
    isLoadingQuickAdd,
    refreshQuickAdd,
    peopleOnSnapLens,
    isLoadingPeople,
    isLoadingMorePeople,
    hasMorePeople,
    loadMorePeople,
    fetchPeople,
    activeFriend,
    activeFriendId,
    setActiveFriendId,
    sendMessage,
    deleteMessage,
    clearChat,
    sendSnapToFriend,
    sendSnapToMultipleFriends,
    openSnapMessage,
    replaySnapMessage,
    markSnapSavedLocally,
    addFriend,
    searchUsers,
    searchResults,
    isSearching,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    blockUser,
    unblockUser,
    fetchFriendProfileDataInCloud,
    getRequestStatus,
  };
}
