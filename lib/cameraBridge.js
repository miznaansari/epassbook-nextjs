// Lightweight client bridge to transfer captured camera photos between Navbar and Assistant page
// Supports in-memory for instant SPA transitions and IndexedDB fallback for mobile lifecycle persistence

const DB_NAME = 'epassbook_camera_db';
const STORE_NAME = 'pending_photos';
const PHOTO_KEY = 'latest_camera_photo';

let memoryFile = null;

function openIndexedDB() {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }
    try {
      const request = window.indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = (event) => resolve(event.target.result);
      request.onerror = (err) => {
        console.warn('[cameraBridge] IndexedDB open error:', err);
        resolve(null);
      };
    } catch (e) {
      console.warn('[cameraBridge] IndexedDB initialization error:', e);
      resolve(null);
    }
  });
}

/**
 * Stores a captured photo file into memory and IndexedDB,
 * and broadcasts an event for active assistant listeners.
 * @param {File|Blob} file
 */
export async function setPendingCameraPhoto(file) {
  if (!file) return;
  memoryFile = file;

  // Persist to IndexedDB so photo survives mobile page reloads
  try {
    const db = await openIndexedDB();
    if (db) {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(file, PHOTO_KEY);
      await new Promise((resolve) => {
        tx.oncomplete = resolve;
        tx.onerror = resolve;
      });
    }
  } catch (err) {
    console.warn('[cameraBridge] Failed to save photo to IndexedDB:', err);
  }

  // Notify any active listeners on the page
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('assistant-attach-camera-photo', { detail: { file } }));
  }
}

/**
 * Retrieves and clears the pending captured photo file.
 * Checks memory first, then IndexedDB.
 * @returns {Promise<File|Blob|null>}
 */
export async function getPendingCameraPhoto() {
  if (memoryFile) {
    const file = memoryFile;
    memoryFile = null;
    clearPendingCameraPhoto();
    return file;
  }

  try {
    const db = await openIndexedDB();
    if (db) {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(PHOTO_KEY);
      const file = await new Promise((resolve) => {
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });

      if (file) {
        store.delete(PHOTO_KEY);
        return file;
      }
    }
  } catch (err) {
    console.warn('[cameraBridge] Failed to read photo from IndexedDB:', err);
  }

  return null;
}

/**
 * Clears any pending photo stored in memory and IndexedDB.
 */
export async function clearPendingCameraPhoto() {
  memoryFile = null;
  try {
    const db = await openIndexedDB();
    if (db) {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(PHOTO_KEY);
    }
  } catch (err) {
    console.warn('[cameraBridge] Failed to clear IndexedDB photo:', err);
  }
}
