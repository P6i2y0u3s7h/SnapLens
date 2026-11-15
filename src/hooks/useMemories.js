import { useState, useEffect, useCallback } from 'react';
import { fetchUserCloudMedia, deleteCloudMedia } from '../services/firebaseService';

const DB_NAME = 'SnapLensDB';
const DB_VERSION = 1;
const STORE_NAME = 'memories';
const LOCAL_STORAGE_KEY = 'snaplens_memories_index';

// Initialize IndexedDB for storing large photo & video blobs safely
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      resolve(null);
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e);
  });
}

export function useMemories() {
  const [memories, setMemories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load all memories from local IndexedDB + merge with Firestore cloud media
  const loadMemories = useCallback(async () => {
    let localItems = [];
    try {
      const db = await openIndexedDB();
      if (db) {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        localItems = await new Promise((resolve) => {
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve(getLocalStoredItems());
        });
      } else {
        localItems = getLocalStoredItems();
      }
    } catch {
      localItems = getLocalStoredItems();
    }

    // Attempt to fetch from Firestore Cloud Media
    try {
      const cloudItems = await fetchUserCloudMedia();
      if (cloudItems && cloudItems.length > 0) {
        // Merge cloud items with local items, avoiding duplicates
        const cloudFormatted = cloudItems.map((c) => ({
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

        const existingIds = new Set(localItems.map((i) => i.id));
        const merged = [...localItems];
        cloudFormatted.forEach((ci) => {
          if (!existingIds.has(ci.id)) {
            merged.push(ci);
          }
        });

        merged.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setMemories(merged);
        setIsLoading(false);
        return;
      }
    } catch (e) {
      console.debug('Cloud media sync handled:', e);
    }

    localItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    setMemories(localItems);
    setIsLoading(false);
  }, []);

  const getLocalStoredItems = () => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  useEffect(() => {
    loadMemories();
  }, [loadMemories]);

  // Save new media memory
  const saveMemory = async (memoryItem) => {
    const newMemory = {
      id: memoryItem.cloudId || 'snap_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      cloudId: memoryItem.cloudId || null,
      storagePath: memoryItem.storagePath || null,
      type: memoryItem.type || 'photo',
      url: memoryItem.url || memoryItem.dataUrl || memoryItem.mediaUrl,
      dataUrl: memoryItem.dataUrl || memoryItem.url || memoryItem.mediaUrl,
      filter: memoryItem.filter || 'Original',
      duration: memoryItem.duration || null,
      createdAt: new Date().toISOString(),
      favorite: false,
      title: memoryItem.title || (memoryItem.type === 'video' ? 'Video Snap' : 'Photo Snap'),
      isCloudSynced: !memoryItem.isLocal,
    };

    try {
      const db = await openIndexedDB();
      if (db) {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(newMemory);
      }
    } catch (err) {
      console.warn('IndexedDB save failed, using fallback:', err);
    }

    setMemories((prev) => {
      const updated = [newMemory, ...prev.filter((m) => m.id !== newMemory.id)];
      try {
        const lightIndex = updated.slice(0, 30).map((m) => ({
          ...m,
          dataUrl: m.dataUrl && m.dataUrl.length > 500000 ? null : m.dataUrl,
        }));
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(lightIndex));
      } catch (e) {
        console.warn('Storage quota limit handled:', e);
      }
      return updated;
    });

    return newMemory;
  };

  // Delete memory (removes from local IndexedDB and Firestore/Storage if synced)
  const deleteMemory = async (id) => {
    const target = memories.find((m) => m.id === id);

    // If synced with Firestore / Storage, delete from cloud
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
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.delete(id);
      }
    } catch (err) {
      console.warn('IndexedDB delete error:', err);
    }

    setMemories((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated.slice(0, 30)));
      } catch {}
      return updated;
    });
  };

  // Download media
  const downloadMemory = (memory) => {
    if (!memory) return;
    const a = document.createElement('a');
    a.href = memory.url || memory.dataUrl;
    const ext = memory.type === 'video' ? 'webm' : 'jpg';
    a.download = `snaplens_${memory.type}_${Date.now()}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Toggle favorite
  const toggleFavorite = async (id) => {
    setMemories((prev) => {
      const updated = prev.map((item) => {
        if (item.id === id) {
          const mod = { ...item, favorite: !item.favorite };
          openIndexedDB().then((db) => {
            if (db) {
              const tx = db.transaction(STORE_NAME, 'readwrite');
              tx.objectStore(STORE_NAME).put(mod);
            }
          });
          return mod;
        }
        return item;
      });
      return updated;
    });
  };

  // Clear all
  const clearAllMemories = async () => {
    try {
      const db = await openIndexedDB();
      if (db) {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).clear();
      }
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      setMemories([]);
    } catch (err) {
      console.error('Failed to clear memories:', err);
    }
  };

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
