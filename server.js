// Simple Deno server for INSPIRE HQ Calendar
// No external dependencies required

const PORT = 8443;
const SERVER_DIR = Deno.cwd();

// Start HTTP server
const server = Deno.listen({ port: PORT });
console.log(`INSPIRE HQ Calendar server running on http://localhost:${PORT}`);

async function handleHTTPRequests() {
  for await (const conn of server) {
    serveHTTP(conn);
  }
}

async function serveHTTP(conn) {
  const httpConn = Deno.serveHttp(conn);
  
  for await (const requestEvent of httpConn) {
    const url = new URL(requestEvent.request.url);
    const path = decodeURIComponent(url.pathname);
    const method = requestEvent.request.method;
    
    // API endpoints
    if (path === "/api/events" && method === "GET") {
      await handleGetEvents(requestEvent);
    } else if (path === "/api/events" && method === "POST") {
      await handleSaveEvent(requestEvent);
    } else if (path.startsWith("/api/events/") && method === "DELETE") {
      const id = path.split("/").pop();
      await handleDeleteEvent(requestEvent, id);
    }
    // Serve static files
    else {
      await serveStaticFile(requestEvent, path);
    }
  }
}

// Serve static files
async function serveStaticFile(requestEvent, path) {
  try {
    let filePath = path === "/" ? "/index.html" : path;
    
    // Add index.html to directory paths
    if (filePath.endsWith("/")) {
      filePath += "index.html";
    }
    
    // Construct absolute path but prevent directory traversal
    const fullPath = `${SERVER_DIR}${filePath}`;
    
    // Try to read the file
    const data = await Deno.readFile(fullPath);
    
    // Determine content type based on file extension
    const contentType = getContentType(filePath);
    
    // Respond with the file
    await requestEvent.respondWith(
      new Response(data, {
        status: 200,
        headers: {
          "Content-Type": contentType
        }
      })
    );
  } catch (e) {
    // File not found or other error
    await requestEvent.respondWith(
      new Response("Not Found", {
        status: 404
      })
    );
  }
}

// Get events from events.json
async function handleGetEvents(requestEvent) {
  try {
    const data = await Deno.readTextFile(`${SERVER_DIR}/events.json`);
    await requestEvent.respondWith(
      new Response(data, {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      })
    );
  } catch (e) {
    // If file doesn't exist, return empty array
    if (e instanceof Deno.errors.NotFound) {
      await requestEvent.respondWith(
        new Response("[]", {
          status: 200,
          headers: {
            "Content-Type": "application/json"
          }
        })
      );
    } else {
      await requestEvent.respondWith(
        new Response(JSON.stringify({ error: "Failed to read events" }), {
          status: 500,
          headers: {
            "Content-Type": "application/json"
          }
        })
      );
    }
  }
}

// Save event to events.json
async function handleSaveEvent(requestEvent) {
  try {
    const body = await requestEvent.request.json();
    let events = [];
    
    // Read existing events
    try {
      const eventsJson = await Deno.readTextFile(`${SERVER_DIR}/events.json`);
      events = JSON.parse(eventsJson);
    } catch (e) {
      // If file doesn't exist, create empty array
      if (!(e instanceof Deno.errors.NotFound)) {
        throw e;
      }
    }
    
    // Check if event already exists
    const existingIndex = events.findIndex(e => e.id === body.id);
    
    if (existingIndex >= 0) {
      // Update existing event
      events[existingIndex] = body;
    } else {
      // Add new event
      events.push(body);
    }
    
    // Write back to file
    await Deno.writeTextFile(`${SERVER_DIR}/events.json`, JSON.stringify(events, null, 2));
    
    await requestEvent.respondWith(
      new Response(JSON.stringify(body), {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      })
    );
  } catch (e) {
    await requestEvent.respondWith(
      new Response(JSON.stringify({ error: "Failed to save event" }), {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      })
    );
  }
}

// Delete event from events.json
async function handleDeleteEvent(requestEvent, id) {
  try {
    // Read existing events
    let events = [];
    try {
      const eventsJson = await Deno.readTextFile(`${SERVER_DIR}/events.json`);
      events = JSON.parse(eventsJson);
    } catch (e) {
      // If file doesn't exist, nothing to delete
      if (e instanceof Deno.errors.NotFound) {
        await requestEvent.respondWith(
          new Response(JSON.stringify({ error: "Event not found" }), {
            status: 404,
            headers: {
              "Content-Type": "application/json"
            }
          })
        );
        return;
      }
      throw e;
    }
    
    // Filter out the event to delete
    const filteredEvents = events.filter(e => e.id !== id);
    
    // If no events were removed, event wasn't found
    if (filteredEvents.length === events.length) {
      await requestEvent.respondWith(
        new Response(JSON.stringify({ error: "Event not found" }), {
          status: 404,
          headers: {
            "Content-Type": "application/json"
          }
        })
      );
      return;
    }
    
    // Write back to file
    await Deno.writeTextFile(`${SERVER_DIR}/events.json`, JSON.stringify(filteredEvents, null, 2));
    
    await requestEvent.respondWith(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      })
    );
  } catch (e) {
    await requestEvent.respondWith(
      new Response(JSON.stringify({ error: "Failed to delete event" }), {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      })
    );
  }
}

// Get content type based on file extension
function getContentType(path) {
  const extension = path.split('.').pop()?.toLowerCase();
  
  const contentTypes = {
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'json': 'application/json',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon'
  };
  
  return contentTypes[extension] || 'text/plain';
}

// Start the server
handleHTTPRequests();