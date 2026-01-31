const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const room = require("./room");
const drawingState = require("./drawing-state");

const application = express();
const httpServer = http.createServer(application);
const wsServer = new Server(httpServer);

application.use(express.static("client"));

wsServer.on("connection", (client) => {
  console.log("Client connected:", client.id);

  client.on("join", ({ name, color, room: roomId }) => {
    client.join(roomId);
    room.getOrCreateRoom(roomId);
    room.addParticipant(roomId, client.id, { name, color });
    drawingState.getOrCreateState(roomId);

    client.emit("init", drawingState.getHistory(roomId));
    wsServer.to(roomId).emit("users", room.getParticipants(roomId));
  });

  client.on("draw", ({ room: roomId, stroke }) => {
    drawingState.addStroke(roomId, stroke);
    client.to(roomId).emit("draw", stroke);
  });

  client.on("undo", (roomId) => {
    const history = drawingState.undo(roomId);
    if (history !== null) {
      wsServer.to(roomId).emit("sync", history);
    }
  });

  client.on("redo", (roomId) => {
    const history = drawingState.redo(roomId);
    if (history !== null) {
      wsServer.to(roomId).emit("sync", history);
    }
  });

  client.on("cursor", ({ room: roomId, x, y }) => {
    const participant = room.getParticipant(roomId, client.id);
    if (!participant) return;

    client.to(roomId).emit("cursor", {
      id: client.id,
      name: participant.name,
      color: participant.color,
      x, y
    });
  });

  client.on("disconnect", () => {
    room.getAllRoomIds().forEach((roomId) => {
      room.removeParticipant(roomId, client.id);
      wsServer.to(roomId).emit("users", room.getParticipants(roomId));
    });
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log("Listening on port", PORT);
});
