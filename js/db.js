/**
 * IndexedDB wrapper for local event storage
 */
const CalendarDB = (function() {
  const DB_NAME = 'inspire-calendar';
  const DB_VERSION = 2; // Incremented to 2 to support images
  const EVENTS_STORE = 'events';
  const SYNC_STORE = 'sync-queue';
  
  let db = null;
  
  // Initialize the database
  function init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        const oldVersion = event.oldVersion;
        
        if (oldVersion < 1) {
          // Create events store with UUID as key path
          const eventStore = db.createObjectStore(EVENTS_STORE, { keyPath: 'id' });
          eventStore.createIndex('start', 'start', { unique: false });
          eventStore.createIndex('end', 'end', { unique: false });
          
          // Create sync queue store for offline changes
          const syncStore = db.createObjectStore(SYNC_STORE, { keyPath: 'id', autoIncrement: true });
          syncStore.createIndex('operation', 'operation', { unique: false });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
        
        // Add upgrade path from version 1 to 2 to support images
        if (oldVersion < 2) {
          // Nothing specific to add for migration - the new imageData field 
          // will be added automatically when events are saved
        }
      };
      
      request.onsuccess = (event) => {
        db = event.target.result;
        resolve(db);
      };
      
      request.onerror = (event) => {
        console.error('IndexedDB error:', event.target.error);
        reject(event.target.error);
      };
    });
  }
  
  // Get all events
  function getAllEvents() {
    return new Promise((resolve, reject) => {
      if (!db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const transaction = db.transaction([EVENTS_STORE], 'readonly');
      const store = transaction.objectStore(EVENTS_STORE);
      const request = store.getAll();
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }
  
  // Add or update an event
  function saveEvent(event) {
    return new Promise((resolve, reject) => {
      if (!db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      // Generate UUID if not provided
      if (!event.id) {
        event.id = crypto.randomUUID();
      }
      
      const transaction = db.transaction([EVENTS_STORE], 'readwrite');
      const store = transaction.objectStore(EVENTS_STORE);
      const request = store.put(event);
      
      request.onsuccess = () => {
        // Add to sync queue if we're offline
        if (!navigator.onLine) {
          addToSyncQueue({
            operation: 'save',
            data: event,
            timestamp: new Date().toISOString()
          });
        }
        resolve(event);
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }
  
  // Delete an event
  function deleteEvent(id) {
    return new Promise((resolve, reject) => {
      if (!db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const transaction = db.transaction([EVENTS_STORE], 'readwrite');
      const store = transaction.objectStore(EVENTS_STORE);
      const request = store.delete(id);
      
      request.onsuccess = () => {
        // Add to sync queue if we're offline
        if (!navigator.onLine) {
          addToSyncQueue({
            operation: 'delete',
            data: { id },
            timestamp: new Date().toISOString()
          });
        }
        resolve(id);
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }
  
  // Add operation to sync queue
  function addToSyncQueue(operation) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([SYNC_STORE], 'readwrite');
      const store = transaction.objectStore(SYNC_STORE);
      const request = store.add(operation);
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }
  
  // Get all pending operations from sync queue
  function getSyncQueue() {
    return new Promise((resolve, reject) => {
      if (!db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const transaction = db.transaction([SYNC_STORE], 'readonly');
      const store = transaction.objectStore(SYNC_STORE);
      const request = store.getAll();
      
      request.onsuccess = () => {
        resolve(request.result);
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }
  
  // Clear processed operations from sync queue
  function clearSyncQueue() {
    return new Promise((resolve, reject) => {
      if (!db) {
        reject(new Error('Database not initialized'));
        return;
      }
      
      const transaction = db.transaction([SYNC_STORE], 'readwrite');
      const store = transaction.objectStore(SYNC_STORE);
      const request = store.clear();
      
      request.onsuccess = () => {
        resolve();
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }
  
  return {
    init,
    getAllEvents,
    saveEvent,
    deleteEvent,
    getSyncQueue,
    clearSyncQueue
  };
})();