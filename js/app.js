/**
 * Main application entry point
 */
document.addEventListener('DOMContentLoaded', async function() {
  try {
    // Check for auth
    if (!localStorage.getItem('isLoggedIn') && !window.location.href.includes('login.html')) {
      window.location.href = 'login.html';
      return;
    }
    
    // Check for "Add Event" shortcut from PWA
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    
    // Initialize the database
    await CalendarDB.init();
    
    // Initialize UI components
    CalendarUI.init();
    
    // Initialize sync functionality
    CalendarSync.init();
    
    // If "Add Event" shortcut was used, open modal
    if (action === 'add') {
      // Open add event modal with current date
      setTimeout(() => {
        const today = new Date();
        CalendarUI.openAddEventModal(today);
      }, 500);
    }
    
    console.log('INSPIRE HQ Calendar initialized successfully');
  } catch (error) {
    console.error('Failed to initialize calendar:', error);
    alert('There was a problem loading the calendar. Please refresh the page or try again later.');
  }
});