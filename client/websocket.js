const ws = io();
const cursorElements = {};

ws.on("draw", (payload) => {
  drawLine(
    payload.x1,
    payload.y1,
    payload.x2,
    payload.y2,
    payload.color,
    payload.size,
    payload.tool
  );
  history.push(payload);
});

ws.on("undo", () => {
  history.pop();
  redrawCanvas();
});

ws.on("redo", (seg) => {
  history.push(seg);
  redrawCanvas();
});

ws.on("init", (payload) => {
  history = payload;
  redrawCanvas();
});

ws.on("cursor", (payload) => {
  let cursorEl = cursorElements[payload.id];

  if (!cursorEl) {
    cursorEl = document.createElement("div");
    cursorEl.className = "cursor";
    cursorEl.innerHTML = `<span class="name">${payload.name}</span>`;
    cursorEl.style.background = payload.color;
    document.getElementById("cursorContainer").appendChild(cursorEl);
    cursorElements[payload.id] = cursorEl;
  }

  cursorEl.style.left = payload.x + "px";
  cursorEl.style.top = payload.y + "px";
});

function randomColor() {
  return `hsl(${Math.random() * 360}, 100%, 50%)`;
}
