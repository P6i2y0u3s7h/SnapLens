import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchUserCloudMedia,
  subscribeToUserCloudMedia,
  deleteCloudMedia,
} from '../services/firebaseService';
import { useAuth } from '../contexts/AuthContext';

const DB_NAME = 'SnapLensMemoriesDB_v4';
const DB_VERSION = 1;
const STORE_NAME = 'memories';
const LOCAL_STORAGE_KEY = 'snaplens_memories_manifest_v4';

/**
 * Open primary IndexedDB for large media blobs and high-res dataUrls
 */
function openIndexedDB() {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = (e) => resolve(e.target.result);
      request.onerror = (e) => {
        console.warn('IndexedDB open error:', e);
        resolve(null);
      };
      request.onblocked = () => {
        console.warn('IndexedDB blocked');
        resolve(null);
      };
    } catch (err) {
      console.warn('IndexedDB exception:', err);
      resolve(null);
    }
  });
}

/**
 * Read all items from legacy databases if available, to seamlessly migrate
 */
async function readLegacyIndexedDB(legacyName) {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve([]);
      return;
    }
    try {
      const req = window.indexedDB.open(legacyName);
      req.onsuccess = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('memories')) {
          db.close();
          resolve([]);
          return;
        }
        try {
          const tx = db.transaction('memories', 'readonly');
          const store = tx.objectStore('memories');
          const getReq = store.getAll();
          getReq.onsuccess = () => {
            const res = getReq.result || [];
            db.close();
            resolve(res);
          };
          getReq.onerror = () => {
            db.close();
            resolve([]);
          };
        } catch {
          db.close();
          resolve([]);
        }
      };
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

export function useMemories() {
  const { currentUser, isFirebaseConfigured } = useAuth();
  const [memories, setMemories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const activeVideoUrlsRef = useRef(new Set());

  // Helper to revoke old Object URLs when unmounting or reloading
  const cleanupVideoUrls = useCallback(() => {
    activeVideoUrlsRef.current.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch {}
    });
    activeVideoUrlsRef.current.clear();
  }, []);

  // Main loader: IndexedDB + LocalStorage fallback + Firestore Cloud Media
  const loadMemories = useCallback(async () => {
    let localItems = [];

    // 1. Fetch from primary IndexedDB
    try {
      const db = await openIndexedDB();
      if (db) {
        localItems = await new Promise((resolve) => {
          const tx = db.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve([]);
        });
      }
    } catch (err) {
      console.warn('IndexedDB read error:', err);
    }

    // 2. Migration: check legacy databases if primary is empty
    if (!localItems || localItems.length === 0) {
      try {
        const legacyV3 = await readLegacyIndexedDB('SnapLensDB_v3');
        const legacyV1 = await readLegacyIndexedDB('SnapLensDB');
        const combinedLegacy = [...(legacyV3 || []), ...(legacyV1 || [])];
        if (combinedLegacy.length > 0) {
          localItems = combinedLegacy;
          // Persist legacy items into v4 IndexedDB
          const db = await openIndexedDB();
          if (db) {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            combinedLegacy.forEach((item) => store.put(item));
          }
        }
      } catch (legacyErr) {
        console.debug('Legacy migration checked:', legacyErr);
      }
    }

    // 3. Fallback / merge with LocalStorage manifest
    let storedLocal = [];
    try {
      const rawStored =
        localStorage.getItem(LOCAL_STORAGE_KEY) ||
        localStorage.getItem('snaplens_memories_manifest_v3') ||
        localStorage.getItem('snaplens_memories_index');
      if (rawStored) {
        storedLocal = JSON.parse(rawStored) || [];
      }
    } catch (e) {
      console.warn('LocalStorage memories fallback error:', e);
    }

    // Combine local items (IndexedDB takes precedence for rich media blobs)
    const localMap = new Map();
    storedLocal.forEach((item) => {
      if (item && item.id) localMap.set(item.id, item);
    });
    localItems.forEach((item) => {
      if (item && item.id) localMap.set(item.id, item);
    });

    // 4. Hydrate video items with active Object URLs
    const hydratedLocal = Array.from(localMap.values()).map((item) => {
      let activeUrl = item.url || item.dataUrl || '';
      if (item.type === 'video') {
        if (item.blob && (item.blob instanceof Blob || item.blob?.size > 0)) {
          try {
            const objUrl = URL.createObjectURL(item.blob);
            activeVideoUrlsRef.current.add(objUrl);
            activeUrl = objUrl;
          } catch (e) {
            console.debug('Failed to create object URL:', e);
          }
        }
      }
      return {
        ...item,
        url: activeUrl,
        dataUrl: item.dataUrl || activeUrl,
      };
    });

    // 5. Fetch from Firestore Cloud Media for current user
    let cloudFormatted = [];
    if (isFirebaseConfigured && currentUser?.uid) {
      try {
        const cloudItems = await fetchUserCloudMedia(currentUser.uid);
        if (cloudItems && cloudItems.length > 0) {
          cloudFormatted = cloudItems.map((c) => ({
            id: c.cloudId || c.id,
            cloudId: c.cloudId || c.id,
            type: c.type || 'photo',
            url: c.mediaUrl,
            dataUrl: c.mediaUrl,
            filter: c.filter || 'Original',
            duration: c.duration || null,
            createdAt: c.createdAt || new Date().toISOString(),
            favorite: false,
            title: c.caption || (c.type === 'video' ? 'Video Snap' : 'Photo Snap'),
            storagePath: c.storagePath || null,
            isCloudSynced: true,
          }));
        }
      } catch (e) {
        console.debug('Cloud media fetch handled:', e);
      }
    }

    // 6. Merge & Deduplicate
    const mergedMap = new Map();
    hydratedLocal.forEach((item) => {
      if (item && item.id && !item.id.startsWith('starter_snap_')) {
        mergedMap.set(item.id, item);
      }
    });

    cloudFormatted.forEach((item) => {
      if (item && item.id) {
        if (!mergedMap.has(item.id)) {
          mergedMap.set(item.id, item);
        } else {
          const existing = mergedMap.get(item.id);
          mergedMap.set(item.id, {
            ...existing,
            ...item,
            url: item.url || existing.url,
            isCloudSynced: true,
          });
        }
      }
    });

    const mergedList = Array.from(mergedMap.values());
    mergedList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    setMemories(mergedList);
    setIsLoading(false);
  }, [currentUser, isFirebaseConfigured]);

  // Initial load & reload when user changes
  useEffect(() => {
    loadMemories();
  }, [loadMemories]);

  // Real-time Firestore sync when authenticated
  useEffect(() => {
    if (!isFirebaseConfigured || !currentUser?.uid) return;

    const unsubscribe = subscribeToUserCloudMedia(currentUser.uid, (cloudSnaps) => {
      if (!cloudSnaps) return;

      const cloudFormatted = cloudSnaps.map((c) => ({
        id: c.cloudId || c.id,
        cloudId: c.cloudId || c.id,
        type: c.type || 'photo',
        url: c.mediaUrl,
        dataUrl: c.mediaUrl,
        filter: c.filter || 'Original',
        duration: c.duration || null,
        createdAt: c.createdAt || new Date().toISOString(),
        favorite: false,
        title: c.caption || (c.type === 'video' ? 'Video Snap' : 'Photo Snap'),
        storagePath: c.storagePath || null,
        isCloudSynced: true,
      }));

      setMemories((prev) => {
        const map = new Map();
        prev.forEach((item) => map.set(item.id, item));
        cloudFormatted.forEach((item) => {
          const existing = map.get(item.id);
          map.set(item.id, {
            ...existing,
            ...item,
            url: item.url || existing?.url,
            isCloudSynced: true,
          });
        });
        const list = Array.from(map.values());
        list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return list;
      });
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser, isFirebaseConfigured]);

  // Cross-tab and event synchronization
  useEffect(() => {
    const handleSync = () => {
      loadMemories();
    };
    window.addEventListener('snaplens_memories_updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('snaplens_memories_updated', handleSync);
      window.removeEventListener('storage', handleSync);
      cleanupVideoUrls();
    };
  }, [loadMemories, cleanupVideoUrls]);

  // Save new media memory (guaranteed write to IndexedDB & state)
  const saveMemory = useCallback(
    async (memoryItem) => {
      const memoryId =
        memoryItem.cloudId ||
        'snap_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);

      const activeUrl = memoryItem.url || memoryItem.dataUrl || '';
      const activeDataUrl = memoryItem.dataUrl || memoryItem.url || '';

      const newMemory = {
        id: memoryId,
        cloudId: memoryItem.cloudId || null,
        storagePath: memoryItem.storagePath || null,
        type: memoryItem.type || 'photo',
        url: activeUrl,
        dataUrl: activeDataUrl,
        filter: memoryItem.filter || 'Original',
        duration: memoryItem.duration || null,
        createdAt: memoryItem.createdAt || new Date().toISOString(),
        favorite: false,
        title: memoryItem.title || (memoryItem.type === 'video' ? 'Video Snap' : 'Photo Snap'),
        isCloudSynced: Boolean(!memoryItem.isLocal && memoryItem.cloudId),
      };

      // Ensure video blob is a clean standalone Blob
      if (memoryItem.blob) {
        try {
          newMemory.blob = new Blob([memoryItem.blob], {
            type: memoryItem.blob.type || 'video/webm',
          });
        } catch {
          newMemory.blob = memoryItem.blob;
        }
      }

      // 1. Commit to IndexedDB
      try {
        const db = await openIndexedDB();
        if (db) {
          await new Promise((resolve) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            store.put(newMemory);
            tx.oncomplete = () => resolve();
            tx.onerror = (e) => {
              console.warn('IndexedDB put error:', e);
              resolve();
            };
          });
        }
      } catch (err) {
        console.warn('IndexedDB save exception:', err);
      }

      // 2. Safe LocalStorage manifest (persists metadata and inline preview data)
      try {
        const safeRecord = {
          id: newMemory.id,
          cloudId: newMemory.cloudId,
          type: newMemory.type,
          url: newMemory.url,
          dataUrl:
            newMemory.dataUrl && newMemory.dataUrl.length < 1500000
              ? newMemory.dataUrl
              : newMemory.url?.startsWith('http')
              ? newMemory.url
              : '',
          filter: newMemory.filter,
          duration: newMemory.duration,
          createdAt: newMemory.createdAt,
          favorite: newMemory.favorite,
          title: newMemory.title,
          isCloudSynced: newMemory.isCloudSynced,
        };

        const existingStored = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
        const updatedManifest = [
          safeRecord,
          ...existingStored.filter((m) => m.id !== safeRecord.id),
        ].slice(0, 40);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedManifest));
      } catch (quotaErr) {
        console.debug('LocalStorage quota note:', quotaErr);
      }

      // 3. Immediately update in-memory state for instant UI update
      setMemories((prev) => {
        const filtered = prev.filter((m) => m.id !== newMemory.id);
        return [newMemory, ...filtered];
      });

      // 4. Notify all components/pages immediately
      window.dispatchEvent(new CustomEvent('snaplens_memories_updated'));

      return newMemory;
    },
    []
  );

  // Delete memory (removes from IndexedDB, LocalStorage, and Firestore)
  const deleteMemory = useCallback(
    async (id) => {
      const target = memories.find((m) => m.id === id);

      if (target && (target.cloudId || target.storagePath)) {
        try {
          await deleteCloudMedia(target.cloudId, target.storagePath);
        } catch (err) {
          console.warn('Cloud delete note:', err);
        }
      }

      try {
        const db = await openIndexedDB();
        if (db) {
          await new Promise((resolve) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            store.delete(id);
            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
          });
        }
      } catch (err) {
        console.warn('IndexedDB delete error:', err);
      }

      try {
        const existingStored = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
        const filtered = existingStored.filter((m) => m.id !== id);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
      } catch {}

      setMemories((prev) => prev.filter((item) => item.id !== id));
      window.dispatchEvent(new CustomEvent('snaplens_memories_updated'));
    },
    [memories]
  );

  // Download media
  const downloadMemory = useCallback((memory) => {
    if (!memory) return;
    const a = document.createElement('a');
    a.href = memory.url || memory.dataUrl;
    const ext = memory.type === 'video' ? 'webm' : 'jpg';
    a.download = `snaplens_${memory.type}_${Date.now()}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  // Toggle favorite
  const toggleFavorite = useCallback(async (id) => {
    setMemories((prev) => {
      const updated = prev.map((item) => {
        if (item.id === id) {
          const mod = { ...item, favorite: !item.favorite };
          openIndexedDB().then((db) => {
            if (db) {
              try {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                tx.objectStore(STORE_NAME).put(mod);
              } catch {}
            }
          });
          return mod;
        }
        return item;
      });
      return updated;
    });
  }, []);

  // Clear all memories
  const clearAllMemories = useCallback(async () => {
    try {
      const db = await openIndexedDB();
      if (db) {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).clear();
      }
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      setMemories([]);
      window.dispatchEvent(new CustomEvent('snaplens_memories_updated'));
    } catch (err) {
      console.error('Failed to clear memories:', err);
    }
  }, []);

  return {
    memories,
    isLoading,
    saveMemory,
    deleteMemory,
    downloadMemory,
    toggleFavorite,
    clearAllMemories,
    reloadMemories: loadMemories,
  };
}
