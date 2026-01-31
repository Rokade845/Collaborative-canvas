const ws = io();
const board = document.getElementById("canvas");
const context = board.getContext("2d");

board.width = window.innerWidth;
board.height = window.innerHeight - 60;

let participantName = "", spaceName = "", strokeColor = "#000";
let strokeWidth = 5, activeTool = "brush";
let isDrawing = false, prevX = 0, prevY = 0;
let strokeLog = [];

document.getElementById("enterSpaceBtn").onclick = () => {
  participantName = document.getElementById("participantName").value.trim();
  spaceName = document.getElementById("spaceName").value.trim();
  if (!participantName || !spaceName) return alert("Name and space required");

  ws.emit("join", {
    name: participantName,
    color: strokeColor,
    room: spaceName
  });

  document.getElementById("entryOverlay").style.display = "none";
};

function renderSegment(xStart, yStart, xEnd, yEnd, segColor, segSize, segTool) {
  context.save();

  context.beginPath();
  context.moveTo(xStart, yStart);
  context.lineTo(xEnd, yEnd);

  context.lineWidth = segSize;
  context.lineCap = "round";

  if (segTool === "eraser") {
    context.globalCompositeOperation = "destination-out";
    context.strokeStyle = "rgba(0,0,0,1)";
  } else {
    context.globalCompositeOperation = "source-over";
    context.strokeStyle = segColor;
  }

  context.stroke();
  context.restore();
}

function refreshBoard() {
  context.clearRect(0, 0, board.width, board.height);
  strokeLog.forEach(seg =>
    renderSegment(seg.x1, seg.y1, seg.x2, seg.y2, seg.color, seg.size, seg.tool)
  );
}

board.onmousedown = e => {
  isDrawing = true;
  prevX = e.offsetX;
  prevY = e.offsetY;
};

board.onmousemove = e => {
  if (!isDrawing) return;

  const seg = {
    x1: prevX, y1: prevY,
    x2: e.offsetX, y2: e.offsetY,
    color: strokeColor, size: strokeWidth, tool: activeTool
  };

  renderSegment(seg.x1, seg.y1, seg.x2, seg.y2, seg.color, seg.size, seg.tool);
  ws.emit("draw", { room: spaceName, stroke: seg });

  ws.emit("cursor", { room: spaceName, x: e.clientX, y: e.clientY });

  prevX = e.offsetX;
  prevY = e.offsetY;
};

board.onmouseup = () => (isDrawing = false);

ws.on("draw", seg => {
  strokeLog.push(seg);
  renderSegment(seg.x1, seg.y1, seg.x2, seg.y2, seg.color, seg.size, seg.tool);
});

ws.on("sync", payload => {
  strokeLog = payload;
  context.clearRect(0, 0, board.width, board.height);
  strokeLog.forEach(seg => renderSegment(seg.x1, seg.y1, seg.x2, seg.y2, seg.color, seg.size, seg.tool));
});

ws.on("users", participantMap => {
  const listEl = document.getElementById("participantList");
  listEl.innerHTML = "<b>Participants</b><br>";
  Object.values(participantMap).forEach(p => {
    listEl.innerHTML += `<div style="color:${p.color}">${p.name}</div>`;
  });
});

ws.on("cursor", payload => {
  let cursorEl = document.getElementById(payload.id);
  if (!cursorEl) {
    cursorEl = document.createElement("div");
    cursorEl.className = "cursor";
    cursorEl.id = payload.id;
    cursorEl.innerHTML = `<span>${payload.name}</span>`;
    document.getElementById("cursorContainer").appendChild(cursorEl);
  }
  cursorEl.style.left = payload.x + "px";
  cursorEl.style.top = payload.y + "px";
});

document.getElementById("undoLastBtn").onclick = () => ws.emit("undo", spaceName);
document.getElementById("redoLastBtn").onclick = () => ws.emit("redo", spaceName);

document.getElementById("exportImageBtn").onclick = () => {
  const a = document.createElement("a");
  a.download = "canvas.png";
  a.href = board.toDataURL();
  a.click();
};

document.getElementById("strokeColor").onchange = e => (strokeColor = e.target.value);
document.getElementById("strokeSize").oninput = e => (strokeWidth = +e.target.value);
document.getElementById("strokeTool").onchange = e => (activeTool = e.target.value);
