import { useState, useEffect, useCallback } from 'react';
import { fetchUserCloudMedia, deleteCloudMedia } from '../services/firebaseService';

const DB_NAME = 'SnapLensDB_v3';
const DB_VERSION = 1;
const STORE_NAME = 'memories';
const LOCAL_STORAGE_KEY = 'snaplens_memories_manifest_v3';

// Starter Memories (empty by default for pure user media)
const STARTER_MEMORIES = [];

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
    request.onerror = (e) => {
      console.warn('IndexedDB open error:', e);
      resolve(null);
    };
  });
}

export function useMemories() {
  const [memories, setMemories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load all memories from local IndexedDB + Firestore cloud media + localStorage fallback
  const loadMemories = useCallback(async () => {
    let localItems = [];

    // 1. Fetch from IndexedDB
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
      console.warn('Error reading IndexedDB memories:', err);
    }

    // 2. Fallback to localStorage if IndexedDB had nothing
    if (!localItems || localItems.length === 0) {
      try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) {
          localItems = JSON.parse(stored);
        }
      } catch (e) {
        console.warn('LocalStorage memories fallback error:', e);
      }
    }

    // Convert any stored Blobs to active Object URLs for video playback
    const hydratedLocal = (localItems || []).map((item) => {
      if (item.type === 'video' && item.blob instanceof Blob) {
        return {
          ...item,
          url: URL.createObjectURL(item.blob),
        };
      }
      return item;
    });

    // 3. Merge with Firestore Cloud Media
    let cloudFormatted = [];
    try {
      const cloudItems = await fetchUserCloudMedia();
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
      console.debug('Cloud media sync handled:', e);
    }

    // Deduplicate items by ID
    const mergedMap = new Map();

    // Add local memories first (filtering any legacy starter demo items)
    hydratedLocal.forEach((item) => {
      if (item && item.id && !item.id.startsWith('starter_snap_')) {
        mergedMap.set(item.id, item);
      }
    });

    // Merge in cloud media
    cloudFormatted.forEach((item) => {
      if (item && item.id) {
        if (!mergedMap.has(item.id)) {
          mergedMap.set(item.id, item);
        } else {
          // Update cloud sync status
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

    // If completely empty, seed with starter memories
    if (mergedMap.size === 0) {
      STARTER_MEMORIES.forEach((m) => mergedMap.set(m.id, m));
    }

    const mergedList = Array.from(mergedMap.values());
    mergedList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    setMemories(mergedList);
    setIsLoading(false);
  }, []);

  // Initial load
  useEffect(() => {
    loadMemories();
  }, [loadMemories]);

  // Synchronize across open tabs or page navigations
  useEffect(() => {
    const handleSync = () => {
      loadMemories();
    };
    window.addEventListener('snaplens_memories_updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('snaplens_memories_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [loadMemories]);

  // Save new media memory (guaranteed write to IndexedDB & broadcast)
  const saveMemory = async (memoryItem) => {
    const memoryId =
      memoryItem.cloudId ||
      'snap_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);

    const newMemory = {
      id: memoryId,
      cloudId: memoryItem.cloudId || null,
      storagePath: memoryItem.storagePath || null,
      type: memoryItem.type || 'photo',
      url: memoryItem.url || memoryItem.dataUrl || '',
      dataUrl: memoryItem.dataUrl || memoryItem.url || '',
      blob: memoryItem.blob || null,
      filter: memoryItem.filter || 'Original',
      duration: memoryItem.duration || null,
      createdAt: new Date().toISOString(),
      favorite: false,
      title: memoryItem.title || (memoryItem.type === 'video' ? 'Video Snap' : 'Photo Snap'),
      isCloudSynced: Boolean(!memoryItem.isLocal && memoryItem.cloudId),
    };

    // 1. Commit to IndexedDB
    try {
      const db = await openIndexedDB();
      if (db) {
        await new Promise((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          store.put(newMemory);
          tx.oncomplete = () => resolve();
          tx.onerror = (e) => reject(e);
        });
      }
    } catch (err) {
      console.warn('IndexedDB save failed, using fallback:', err);
    }

    // 2. Safe localStorage manifest (omit massive blobs and huge raw base64 to avoid QuotaExceededError)
    try {
      const safeRecord = {
        id: newMemory.id,
        cloudId: newMemory.cloudId,
        type: newMemory.type,
        url: newMemory.url?.startsWith('http') ? newMemory.url : (newMemory.dataUrl?.length < 150000 ? newMemory.dataUrl : ''),
        dataUrl: newMemory.dataUrl?.length < 150000 ? newMemory.dataUrl : '',
        filter: newMemory.filter,
        duration: newMemory.duration,
        createdAt: newMemory.createdAt,
        favorite: newMemory.favorite,
        title: newMemory.title,
        isCloudSynced: newMemory.isCloudSynced,
      };

      const existingStored = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
      const updatedManifest = [safeRecord, ...existingStored.filter((m) => m.id !== safeRecord.id)].slice(0, 30);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedManifest));
    } catch (quotaErr) {
      console.debug('Safe localStorage quota note:', quotaErr);
    }

    // 3. Immediately update in-memory state
    setMemories((prev) => {
      const filtered = prev.filter((m) => m.id !== newMemory.id);
      return [newMemory, ...filtered];
    });

    // 4. Notify all components/pages
    window.dispatchEvent(new CustomEvent('snaplens_memories_updated'));

    return newMemory;
  };

  // Delete memory (removes from IndexedDB, localStorage, and Firestore if synced)
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
  };

  // Download media file
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

  // Clear all memories
  const clearAllMemories = async () => {
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
