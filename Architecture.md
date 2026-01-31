Project Architecture

What This Thing Does

Imagine a whiteboard that lives in your browser. You pick a name and a room, and suddenly you’re drawing together with whoever else joined that same room. Everyone sees the same canvas. You can undo, redo, export the whole thing as an image, and even see little labels showing where everyone’s cursor is. That’s what this project is—a shared drawing board.


The Big Picture

The app is split into two main parts: **the browser** (client) and **the server**. They talk over WebSockets using Socket.IO, so updates are sent as soon as they happen instead of constantly refreshing the page.

- Client: HTML, CSS, and JavaScript that run in the user’s browser. It draws on a canvas, captures mouse movement, and sends what’s happening to the server.
- Server: Node.js app that keeps track of rooms, who’s in them, and what’s been drawn. It broadcasts changes to everyone in the right room.


How the Pieces Fit Together

┌─────────────────────────────────────────────────────────────┐
│                        Browser (Client)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ index.html   │  │ style.css    │  │ canvas.js        │  │
│  │ (structure)  │  │ (looks)      │  │ (logic + canvas) │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↕ WebSockets (Socket.IO)
┌─────────────────────────────────────────────────────────────┐
│                        Server (Node.js)                      │
│  ┌──────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ server.js    │  │ room.js         │  │ drawing-state.js│ │
│  │ (routing,    │  │ (who’s where)   │  │ (what’s drawn)  │ │
│  │  events)     │  │                 │  │                 │ │
│  └──────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘


Client Side

index.html

The page structure. You’ve got:

1. Entry overlay – Name and room inputs, plus an Enter button. Nothing else shows until you’ve joined.
2. Toolbar – Color picker, pen/eraser switch, brush size slider, Undo, Redo, and Export.
3. Participant list – Who else is in the room, shown in their chosen colors.
4. Canvas – Where the drawing happens.
5. Cursor layer – Invisible to clicks but shows everyone’s cursor labels.

style.css

Handles layout and look: dark background, toolbar at the top, canvas below, participant list on the side. The entry overlay covers everything until you enter.

canvas.js

This is where the real work happens in the browser:

- Connection: Connects to the server via Socket.IO as soon as the script loads.
- Canvas setup: Sets width/height from the window and grabs the 2D drawing context.
- Joining: On Enter, it sends your name, color, and room to the server and hides the overlay.
- Drawing: Tracks mouse down/move/up. Each movement between points becomes a “segment” (stroke) with start/end coordinates, color, size, and tool (pen or eraser).
- Rendering: A single `renderSegment` function draws each stroke. Eraser uses `destination-out` so it actually removes pixels.
- State: A local `strokeLog` array mirrors the server’s history so we can redraw whenever we get a sync.
- Listeners: Responds to `draw`, `sync`, `users`, and `cursor` events from the server, updating the canvas and UI as needed.

---

Server Side

server.js

The main entry point. It:

- Serves static files from the `client` folder.
- Listens for Socket.IO connections and wires up event handlers.
- Delegates room logic to `room.js` and drawing state to `drawing-state.js`.

Think of it as a switchboard: when something happens, it figures out what to do and calls the right module.

room.js

Manages who is in each room:

- getOrCreateRoom(roomId): Creates the room if it doesn’t exist.
- addParticipant: Registers a user (name + color) when they join.
- removeParticipant: Cleans up when someone leaves.
- getParticipant / getParticipants: Look up users for cursor labels and the participant list.
- getAllRoomIds: Lets the server iterate over all rooms when someone disconnects (to remove them everywhere they might have been).

Each room is stored as an object with a `users` map keyed by Socket.IO client IDs.

drawing-state.js

Manages what is drawn in each room:

- getOrCreateState(roomId): Sets up history and redo stacks for a room if needed.
- addStroke: Appends a stroke to history and clears redo (new action invalidates redo).
- undo / redo: Moves strokes between history and redo stacks.
- getHistory: Returns the current list of strokes for a room.

Each room’s state has `history` (the strokes in order) and `redo` (the stack of undone strokes).


What Happens When Things Happen

Someone Joins

1. User enters name and room, clicks Enter.
2. Client emits `join` with `{ name, color, room }`.
3. Server creates the room (and drawing state) if needed, adds the participant, and joins the socket to the room.
4. Server sends `init` with the full drawing history so the new user sees what’s already there.
5. Server broadcasts `users` to everyone in the room so the participant list updates.

Someone Draws

1. User moves the mouse while holding the button.
2. Client turns each move into a segment and calls `renderSegment` locally (optimistic update).
3. Client emits `draw` with `{ room, stroke }`.
4. Server adds the stroke to that room’s history in `drawing-state`, clears redo, and forwards the stroke to everyone else in the room via `draw`.
5. Other clients receive `draw`, push the stroke into their local `strokeLog`, and render it.

Someone Undoes

1. User clicks Undo.
2. Client emits `undo` with the room ID.
3. Server pops the last stroke from history into redo and sends a `sync` event with the updated history to everyone in the room.
4. All clients (including the one who undid) replace their `strokeLog` with the new history and redraw.

Redo works the same way, but in reverse: moves from redo back to history and syncs again.

Someone Moves Their Cursor

1. Client emits `cursor` with `{ room, x, y }` on each mouse move (while drawing or not).
2. Server looks up the participant and broadcasts their cursor position to others in the room.
3. Other clients create or update a cursor label div and position it at those coordinates.

Someone Leaves

1. Socket disconnects (tab closed, network drop, etc.).
2. Server iterates all rooms and removes that client from the participant list.
3. Server broadcasts the updated `users` list to each affected room.
4. Participant lists update and cursor labels for that user can be left as-is or cleaned up (depending on implementation).


Data Flow at a Glance

| User Action    | Client Sends    | Server Does                          | Server Broadcasts      |
|----------------|-----------------|--------------------------------------|------------------------|
| Join room      | `join`          | Add participant, prepare state       | `init`, `users`        |
| Draw           | `draw`          | Add stroke to history                | `draw`                 |
| Undo           | `undo`          | Pop history → redo                   | `sync`                 |
| Redo           | `redo`          | Pop redo → history                   | `sync`                 |
| Move cursor    | `cursor`        | Look up participant                  | `cursor`               |
| Disconnect     | (automatic)     | Remove from all rooms                | `users`                |


Why It’s Structured This Way

- Separation of concerns: Rooms handle people; drawing-state handles strokes. The server only orchestrates.
- Real-time feel: WebSockets mean no polling—changes appear as they happen.
- Single source of truth: The server owns the canonical history and user list. Clients mirror it locally and stay in sync via events.
- Room isolation: Each room has its own participants and drawing history, so “room A” and “room B” are completely separate.


Running the Project

1. `npm install` to fetch dependencies.
2. `node server/server.js` to start the server (listens on port 3000).
3. Open `http://localhost:3000` in one or more browser tabs.
4. Enter a name and room name, click Enter, and start drawing.

If you and a friend use the same room name from different machines, you’ll share the same canvas in real time.
