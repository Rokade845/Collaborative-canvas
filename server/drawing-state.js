const stateByRoom = {};

function getOrCreateState(roomId) {
  if (!stateByRoom[roomId]) {
    stateByRoom[roomId] = { history: [], redo: [] };
  }
  return stateByRoom[roomId];
}

function addStroke(roomId, stroke) {
  const state = getOrCreateState(roomId);
  state.history.push(stroke);
  state.redo = [];
  return state.history;
}

function undo(roomId) {
  const state = stateByRoom[roomId];
  if (!state || state.history.length === 0) return null;
  state.redo.push(state.history.pop());
  return state.history;
}

function redo(roomId) {
  const state = stateByRoom[roomId];
  if (!state || state.redo.length === 0) return null;
  state.history.push(state.redo.pop());
  return state.history;
}

function getHistory(roomId) {
  const state = stateByRoom[roomId];
  return state ? state.history : [];
}

module.exports = {
  getOrCreateState,
  addStroke,
  undo,
  redo,
  getHistory
};
