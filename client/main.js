const ws = io();

ws.on("connect", () => {
  console.log("Server connection established:", ws.id);
  listenForDraw((payload) => {
    drawLine(
      payload.x1,
      payload.y1,
      payload.x2,
      payload.y2,
      payload.color,
      payload.size,
      payload.tool
    );
  });
});
