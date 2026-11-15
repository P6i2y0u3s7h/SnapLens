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
  getChatId,
} from '../services/firebaseService';
import { useAuth } from '../contexts/AuthContext';

const CHAT_STORAGE_KEY = 'snaplens_chat_v2';
const REQUESTS_STORAGE_KEY = 'snaplens_friend_requests_v2';

const INITIAL_FRIENDS = [
  {
    id: 'friend_1',
    name: 'Sophia Chen',
    handle: 'sophiac',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
    streak: 48,
    snapScore: 14250,
    lastInteraction: 'New Snap',
    lastInteractionTime: '5m ago',
    unreadCount: 1,
    status: 'received', // 'received' | 'delivered' | 'opened'
    messages: [
      { id: 'm1', sender: 'them', text: 'Hey! Loved that sunset snap with the warm lens 🌅', time: '10:45 AM' },
      { id: 'm2', sender: 'me', text: 'Thanks! The warm sunset filter on SnapLens is insane 🔥', time: '10:46 AM' },
      {
        id: 'm3',
        sender: 'them',
        type: 'snap',
        snapUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
        originalSnapUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
        mediaType: 'photo',
        caption: 'Look at today’s waves! 🌊',
        time: '5m ago',
        opened: false,
        replayAvailable: false,
        replayUsed: false,
        replayCount: 0,
        savedToMemories: false,
      },
    ],
  },
  {
    id: 'friend_2',
    name: 'Liam Vance',
    handle: 'liamv',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
    streak: 19,
    snapScore: 9400,
    lastInteraction: 'Delivered',
    lastInteractionTime: '1h ago',
    unreadCount: 0,
    status: 'delivered',
    messages: [
      { id: 'm4', sender: 'me', text: 'Are you coming to the music session tonight?', time: '1:15 PM' },
      { id: 'm5', sender: 'them', text: 'Yeah just packing my synth! See you there 🎹', time: '1:18 PM' },
    ],
  },
  {
    id: 'friend_3',
    name: 'Emma Watson',
    handle: 'emma_lens',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=300&q=80',
    streak: 7,
    snapScore: 6120,
    lastInteraction: 'Opened',
    lastInteractionTime: '3h ago',
    unreadCount: 0,
    status: 'opened',
    messages: [
      { id: 'm6', sender: 'them', text: 'Check out the new cinematic filter, it looks like a movie 🎬', time: 'Yesterday' },
    ],
  },
  {
    id: 'friend_4',
    name: 'Alex Rivera',
    handle: 'alex_r',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    streak: 85,
    snapScore: 32100,
    lastInteraction: 'Received',
    lastInteractionTime: 'Yesterday',
    unreadCount: 0,
    status: 'opened',
    messages: [
      { id: 'm7', sender: 'them', text: 'Let’s keep the streak going! 🔥85', time: 'Yesterday' },
    ],
  },
];

const INITIAL_REQUESTS = [
  {
    id: 'req_1',
    senderId: 'user_david',
    senderName: 'David Kim',
    senderHandle: 'davidk',
    senderAvatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=300&q=80',
    status: 'pending',
    time: '2h ago',
  },
  {
    id: 'req_2',
    senderId: 'user_maya',
    senderName: 'Maya Patel',
    senderHandle: 'mayap',
    senderAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80',
    status: 'pending',
    time: 'Yesterday',
  },
];

export function useChat() {
  const { currentUser, isFirebaseConfigured } = useAuth();
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [activeFriendId, setActiveFriendId] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // 1. Initial Load from LocalStorage
  useEffect(() => {
    try {
      const storedFriends = localStorage.getItem(CHAT_STORAGE_KEY);
      if (storedFriends) {
        setFriends(JSON.parse(storedFriends));
      } else {
        setFriends(INITIAL_FRIENDS);
      }

      const storedReqs = localStorage.getItem(REQUESTS_STORAGE_KEY);
      if (storedReqs) {
        setFriendRequests(JSON.parse(storedReqs));
      } else {
        setFriendRequests(INITIAL_REQUESTS);
      }
    } catch {
      setFriends(INITIAL_FRIENDS);
      setFriendRequests(INITIAL_REQUESTS);
    }
  }, []);

  const persistFriends = (updated) => {
    setFriends(updated);
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Storage error in chat:', e);
    }
  };

  const persistRequests = (updated) => {
    setFriendRequests(updated);
    try {
      localStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Storage error in friend requests:', e);
    }
  };

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

  // 3. User Search in Firestore
  const searchUsers = useCallback(
    async (term) => {
      if (!term || !term.trim()) {
        setSearchResults([]);
        return [];
      }

      setIsSearching(true);
      try {
        const queryTerm = term.trim().toLowerCase();
        // First check Firestore users
        let cloudUsers = [];
        if (isFirebaseConfigured) {
          cloudUsers = await searchUsersInCloud(queryTerm);
        }

        // Also search existing local seed directory
        const existingIds = new Set(friends.map((f) => f.id));
        const combined = [...cloudUsers];

        // Add matching demo users not yet in friends list
        const demoPool = [
          { id: 'user_david', name: 'David Kim', handle: 'davidk', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=300&q=80', streak: 12, snapScore: 7800 },
          { id: 'user_maya', name: 'Maya Patel', handle: 'mayap', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80', streak: 25, snapScore: 16400 },
          { id: 'user_jordan', name: 'Jordan Lee', handle: 'jordanl', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80', streak: 4, snapScore: 3200 },
          { id: 'user_clara', name: 'Clara Oswald', handle: 'clara_o', avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=300&q=80', streak: 52, snapScore: 28900 },
        ];

        demoPool.forEach((u) => {
          if (
            (u.name.toLowerCase().includes(queryTerm) || u.handle.toLowerCase().includes(queryTerm)) &&
            !existingIds.has(u.id) &&
            !combined.some((c) => c.id === u.id)
          ) {
            combined.push(u);
          }
        });

        setSearchResults(combined);
        return combined;
      } catch (err) {
        console.warn('Search error:', err);
        return [];
      } finally {
        setIsSearching(false);
      }
    },
    [isFirebaseConfigured, friends]
  );

  // 4. Send Friend Request
  const sendFriendRequest = useCallback(
    async (targetUser) => {
      const newReq = {
        id: 'req_sent_' + Date.now(),
        receiverId: targetUser.id || targetUser.uid,
        receiverName: targetUser.name,
        receiverHandle: targetUser.handle,
        receiverAvatar: targetUser.avatar,
        status: 'sent',
        time: 'Just now',
      };

      const updated = [newReq, ...friendRequests];
      persistRequests(updated);

      if (isFirebaseConfigured && currentUser) {
        await sendFriendRequestInCloud({
          sender: currentUser,
          receiver: targetUser,
        });
      }

      return newReq;
    },
    [friendRequests, isFirebaseConfigured, currentUser]
  );

  // 5. Accept Friend Request
  const acceptFriendRequest = useCallback(
    async (requestId) => {
      const req = friendRequests.find((r) => r.id === requestId);
      if (!req) return;

      // Add to friends list
      const newFriend = {
        id: req.senderId || 'friend_' + Date.now(),
        name: req.senderName || 'New Friend',
        handle: req.senderHandle || 'user',
        avatar: req.senderAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
        streak: 1,
        snapScore: 500,
        lastInteraction: 'Added Friend',
        lastInteractionTime: 'Just now',
        unreadCount: 0,
        status: 'opened',
        messages: [
          {
            id: 'm_greet_' + Date.now(),
            sender: 'them',
            text: `Hey! Thanks for accepting my friend request 👋`,
            time: 'Just now',
          },
        ],
      };

      const updatedFriends = [newFriend, ...friends];
      persistFriends(updatedFriends);

      const updatedReqs = friendRequests.filter((r) => r.id !== requestId);
      persistRequests(updatedReqs);

      if (isFirebaseConfigured && currentUser) {
        await respondToFriendRequestInCloud({
          requestId,
          status: 'accepted',
          senderId: req.senderId,
          receiverId: currentUser.uid,
        });
      }

      return newFriend;
    },
    [friendRequests, friends, isFirebaseConfigured, currentUser]
  );

  // 6. Reject Friend Request
  const rejectFriendRequest = useCallback(
    async (requestId) => {
      const updatedReqs = friendRequests.filter((r) => r.id !== requestId);
      persistRequests(updatedReqs);

      if (isFirebaseConfigured) {
        await respondToFriendRequestInCloud({
          requestId,
          status: 'rejected',
        });
      }
    },
    [friendRequests, isFirebaseConfigured]
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
    activeFriend,
    activeFriendId,
    setActiveFriendId,
    sendMessage,
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
  };
}
