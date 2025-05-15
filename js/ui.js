/**
 * UI components and interactions
 */
const CalendarUI = (function() {
  let calendar;
  let currentEvent = null;
  
  // Initialize the UI
  function init() {
    initializeCalendar();
    initializeEventModal();
    initializeImageUpload();
  }
  
  // Initialize FullCalendar
  function initializeCalendar() {
    const calendarEl = document.getElementById('calendar');
    
    calendar = new FullCalendar.Calendar(calendarEl, {
      initialView: 'dayGridMonth',
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay,listMonth'
      },
      editable: true,
      selectable: true,
      selectMirror: true,
      dayMaxEvents: true,
      events: fetchEvents,
      
      // Calendar interaction handlers
      dateClick: handleDateClick,
      eventClick: handleEventClick,
      eventDrop: handleEventDrop,
      eventResize: handleEventResize
    });
    
    // Listen for refresh events
    document.addEventListener('calendar:refresh', () => {
      calendar.refetchEvents();
    });
    
    calendar.render();
  }
  
  // Fetch events from the local database
  async function fetchEvents(info, successCallback, failureCallback) {
    try {
      const events = await CalendarDB.getAllEvents();
      successCallback(events.map(formatEventForCalendar));
    } catch (error) {
      console.error('Error fetching events:', error);
      failureCallback(error);
    }
  }
  
  // Format event for FullCalendar
  function formatEventForCalendar(event) {
    return {
      id: event.id,
      title: event.title,
      start: event.start,
      end: event.end,
      description: event.description,
      backgroundColor: event.color,
      borderColor: event.color,
      classNames: event.imageData ? ['event-with-image-icon'] : [],
      extendedProps: {
        description: event.description,
        imageData: event.imageData
      }
    };
  }
  
  // Initialize event modal
  function initializeEventModal() {
    const modal = document.getElementById('event-modal');
    const closeBtn = modal.querySelector('.close-button');
    const form = document.getElementById('event-form');
    const deleteBtn = document.getElementById('delete-button');
    const cancelBtn = document.getElementById('cancel-button');
    
    // Close modal on X button click
    closeBtn.addEventListener('click', () => {
      modal.style.display = 'none';
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });
    
    // Handle form submission
    form.addEventListener('submit', handleFormSubmit);
    
    // Handle delete button
    deleteBtn.addEventListener('click', handleDeleteEvent);
    
    // Handle cancel button
    cancelBtn.addEventListener('click', () => {
      modal.style.display = 'none';
    });
  }
  
  // Initialize image upload functionality
  function initializeImageUpload() {
    const imageInput = document.getElementById('event-image');
    const imagePreview = document.getElementById('image-preview');
    const previewContainer = document.getElementById('image-preview-container');
    const removeBtn = document.getElementById('remove-image');
    
    // Handle file selection
    imageInput.addEventListener('change', function() {
      if (this.files && this.files[0]) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
          imagePreview.src = e.target.result;
          previewContainer.style.display = 'block';
        };
        
        reader.readAsDataURL(this.files[0]);
      }
    });
    
    // Handle image removal
    removeBtn.addEventListener('click', function() {
      imageInput.value = '';
      previewContainer.style.display = 'none';
      imagePreview.src = '#';
    });
  }
  
  // Open modal to add a new event
  function handleDateClick(info) {
    currentEvent = null;
    
    const modal = document.getElementById('event-modal');
    const form = document.getElementById('event-form');
    const title = document.getElementById('modal-title');
    const deleteBtn = document.getElementById('delete-button');
    const imagePreview = document.getElementById('image-preview');
    const previewContainer = document.getElementById('image-preview-container');
    
    title.textContent = 'Add Event';
    form.reset();
    deleteBtn.style.display = 'none';
    previewContainer.style.display = 'none';
    
    // Set default start/end times
    const startInput = document.getElementById('event-start');
    const endInput = document.getElementById('event-end');
    
    const start = info.date;
    const end = new Date(start);
    end.setHours(end.getHours() + 1);
    
    startInput.value = formatDateTimeForInput(start);
    endInput.value = formatDateTimeForInput(end);
    
    modal.style.display = 'block';
  }
  
  // Open modal to edit an existing event
  function handleEventClick(info) {
    currentEvent = info.event;
    
    const modal = document.getElementById('event-modal');
    const form = document.getElementById('event-form');
    const title = document.getElementById('modal-title');
    const deleteBtn = document.getElementById('delete-button');
    const imagePreview = document.getElementById('image-preview');
    const previewContainer = document.getElementById('image-preview-container');
    
    title.textContent = 'Edit Event';
    form.reset();
    deleteBtn.style.display = 'block';
    
    // Fill form with event data
    document.getElementById('event-id').value = currentEvent.id;
    document.getElementById('event-title').value = currentEvent.title;
    document.getElementById('event-start').value = formatDateTimeForInput(currentEvent.start);
    document.getElementById('event-end').value = currentEvent.end ? formatDateTimeForInput(currentEvent.end) : '';
    document.getElementById('event-description').value = currentEvent.extendedProps?.description || '';
    document.getElementById('event-color').value = currentEvent.backgroundColor || '#00ffcc';
    
    // Handle image if exists
    if (currentEvent.extendedProps?.imageData) {
      imagePreview.src = currentEvent.extendedProps.imageData;
      previewContainer.style.display = 'block';
    } else {
      previewContainer.style.display = 'none';
    }
    
    modal.style.display = 'block';
  }
  
  // Handle drag-and-drop event move
  function handleEventDrop(info) {
    const event = {
      id: info.event.id,
      title: info.event.title,
      start: info.event.start.toISOString(),
      end: info.event.end ? info.event.end.toISOString() : null,
      description: info.event.extendedProps?.description || '',
      color: info.event.backgroundColor,
      imageData: info.event.extendedProps?.imageData || null
    };
    
    saveEvent(event);
  }
  
  // Handle event resize
  function handleEventResize(info) {
    const event = {
      id: info.event.id,
      title: info.event.title,
      start: info.event.start.toISOString(),
      end: info.event.end ? info.event.end.toISOString() : null,
      description: info.event.extendedProps?.description || '',
      color: info.event.backgroundColor,
      imageData: info.event.extendedProps?.imageData || null
    };
    
    saveEvent(event);
  }
  
  // Handle form submission
  async function handleFormSubmit(e) {
    e.preventDefault();
    
    // Get form values
    const eventId = document.getElementById('event-id').value;
    const imageInput = document.getElementById('event-image');
    const imagePreview = document.getElementById('image-preview');
    const previewContainer = document.getElementById('image-preview-container');
    
    // Get image data if available
    let imageData = null;
    if (previewContainer.style.display !== 'none' && imagePreview.src !== '#' && imagePreview.src !== '') {
      imageData = imagePreview.src; // This will be the data URL
    }
    
    const event = {
      id: eventId || null,
      title: document.getElementById('event-title').value,
      start: new Date(document.getElementById('event-start').value).toISOString(),
      end: document.getElementById('event-end').value ? 
           new Date(document.getElementById('event-end').value).toISOString() : null,
      description: document.getElementById('event-description').value,
      color: document.getElementById('event-color').value,
      imageData: imageData // Add image data
    };
    
    try {
      await saveEvent(event);
      document.getElementById('event-modal').style.display = 'none';
      calendar.refetchEvents();
    } catch (error) {
      console.error('Error saving event:', error);
      alert('Failed to save event. Please try again.');
    }
  }
  
  // Save an event
  async function saveEvent(event) {
    try {
      await CalendarDB.saveEvent(event);
      
      // If we're online, try to sync immediately
      if (navigator.onLine) {
        CalendarSync.synchronize();
      }
    } catch (error) {
      console.error('Error saving event:', error);
      throw error;
    }
  }
  
  // Handle delete event button
  async function handleDeleteEvent() {
    if (!currentEvent || !confirm('Are you sure you want to delete this event?')) {
      return;
    }
    
    try {
      await CalendarDB.deleteEvent(currentEvent.id);
      document.getElementById('event-modal').style.display = 'none';
      calendar.refetchEvents();
      
      // If we're online, try to sync immediately
      if (navigator.onLine) {
        CalendarSync.synchronize();
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event. Please try again.');
    }
  }
  
  // Format date for input fields
  function formatDateTimeForInput(date) {
    return new Date(date).toISOString().slice(0, 16);
  }
// Add this before the "return" statement in your ui.js file

// Open add event modal with date
function openAddEventModal(date) {
  currentEvent = null;
  
  const modal = document.getElementById('event-modal');
  const form = document.getElementById('event-form');
  const title = document.getElementById('modal-title');
  const deleteBtn = document.getElementById('delete-button');
  const imagePreview = document.getElementById('image-preview');
  const previewContainer = document.getElementById('image-preview-container');
  
  title.textContent = 'Add Event';
  form.reset();
  deleteBtn.style.display = 'none';
  previewContainer.style.display = 'none';
  
  // Set default start/end times
  const startInput = document.getElementById('event-start');
  const endInput = document.getElementById('event-end');
  
  const start = date || new Date();
  const end = new Date(start);
  end.setHours(end.getHours() + 1);
  
  startInput.value = formatDateTimeForInput(start);
  endInput.value = formatDateTimeForInput(end);
  
  modal.style.display = 'block';
}

// Update your return statement to include the new function
return {
  init,
  openAddEventModal  // Add this line
};
  
  return {
    init
  };
})();