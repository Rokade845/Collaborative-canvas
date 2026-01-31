const rooms = {};

function getOrCreateRoom(roomId) {
  if (!rooms[roomId]) {
    rooms[roomId] = { users: {} };
  }
  return rooms[roomId];
}

function addParticipant(roomId, clientId, { name, color }) {
  const room = getOrCreateRoom(roomId);
  room.users[clientId] = { name, color };
  return room.users;
}

function removeParticipant(roomId, clientId) {
  const room = rooms[roomId];
  if (!room) return undefined;
  delete room.users[clientId];
  return room.users;
}

function getParticipant(roomId, clientId) {
  const room = rooms[roomId];
  return room?.users[clientId] ?? null;
}

function getParticipants(roomId) {
  const room = rooms[roomId];
  return room ? room.users : {};
}

function getAllRoomIds() {
  return Object.keys(rooms);
}

module.exports = {
  getOrCreateRoom,
  addParticipant,
  removeParticipant,
  getParticipant,
  getParticipants,
  getAllRoomIds
};
