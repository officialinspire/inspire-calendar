/**
 * Handles synchronization between local storage and server
 */
const CalendarSync = (function() {
  const API_URL = '/api/events';
  let syncInProgress = false;
  
  // Initialize sync listeners
  function init() {
    // Listen for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Update UI based on current connection status
    updateConnectionStatus();
    
    // If we're online at startup, perform an initial sync
    if (navigator.onLine) {
      synchronize();
    }
  }
  
  // Handle coming online
  function handleOnline() {
    updateConnectionStatus(true);
    synchronize();
  }
  
  // Handle going offline
  function handleOffline() {
    updateConnectionStatus(false);
  }
  
  // Update the connection status indicator
  function updateConnectionStatus(isOnline = navigator.onLine) {
    const indicator = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');
    
    if (isOnline) {
      indicator.className = 'online';
      statusText.textContent = 'Online';
    } else {
      indicator.className = 'offline';
      statusText.textContent = 'Offline';
    }
  }
  
  // Synchronize with the server
  async function synchronize() {
    if (syncInProgress || !navigator.onLine) {
      return;
    }
    
    try {
      syncInProgress = true;
      
      // Get pending operations from sync queue
      const pendingOperations = await CalendarDB.getSyncQueue();
      
      if (pendingOperations.length > 0) {
        await processPendingOperations(pendingOperations);
        await CalendarDB.clearSyncQueue();
      }
      
      // Fetch latest data from server
      await fetchServerEvents();
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      syncInProgress = false;
    }
  }
  
  // Process all pending operations in the sync queue
  async function processPendingOperations(operations) {
    for (const op of operations) {
      try {
        if (op.operation === 'save') {
          await saveEventToServer(op.data);
        } else if (op.operation === 'delete') {
          await deleteEventFromServer(op.data.id);
        }
      } catch (error) {
        console.error(`Error processing operation ${op.id}:`, error);
      }
    }
  }
  
  // Save an event to the server
  async function saveEventToServer(event) {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(event)
    });
    
    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }
    
    return response.json();
  }
  
  // Delete an event from the server
  async function deleteEventFromServer(id) {
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }
    
    return true;
  }
  
  // Fetch latest events from the server
  async function fetchServerEvents() {
    try {
      const response = await fetch(API_URL);
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      const serverEvents = await response.json();
      
      // Update local events with server data
      await updateLocalEvents(serverEvents);
      
      // Notify the UI to refresh
      document.dispatchEvent(new CustomEvent('calendar:refresh'));
    } catch (error) {
      console.error('Error fetching server events:', error);
    }
  }
  
  // Update local events with server data
  async function updateLocalEvents(serverEvents) {
    try {
      // Get a transaction
      const transaction = db.transaction(['events'], 'readwrite');
      const store = transaction.objectStore('events');
  
      // Clear existing events
      await store.clear();
  
      // Add server events
      for (const event of serverEvents) {
        await store.add(event);
      }
  
      return true;
    } catch (error) {
      console.error('Error updating local events:', error);
      
      // Fallback: use one-by-one approach through our API
      for (const event of serverEvents) {
        await CalendarDB.saveEvent(event);
      }
    }
  }
  
  return {
    init,
    synchronize
  };
})();