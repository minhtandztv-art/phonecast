const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const crypto = require("crypto");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: true } });

app.use(express.static("public"));
app.get("/health", (_req, res) => res.json({ ok: true, service: "PhoneCast" }));

const rooms = new Map();
const makeCode = () => String(crypto.randomInt(0, 1000000)).padStart(6, "0");

io.on("connection", socket => {
  socket.on("create-room", ack => {
    let code;
    do { code = makeCode(); } while (rooms.has(code));
    rooms.set(code, { host: socket.id, phone: null });
    socket.join(code);
    socket.data.room = code;
    socket.data.role = "host";
    if (typeof ack === "function") ack({ ok: true, code });
  });

  socket.on("join-room", ({ code }, ack) => {
    code = String(code || "").replace(/\D/g, "").slice(0, 6);
    const room = rooms.get(code);
    if (!room || !io.sockets.sockets.get(room.host)) {
      if (typeof ack === "function") ack({ ok: false, error: "Không tìm thấy phòng. Hãy kiểm tra mã trên máy tính." });
      return;
    }
    if (room.phone && io.sockets.sockets.get(room.phone)) {
      if (typeof ack === "function") ack({ ok: false, error: "Phòng đã có điện thoại kết nối." });
      return;
    }
    room.phone = socket.id;
    socket.join(code);
    socket.data.room = code;
    socket.data.role = "phone";
    io.to(room.host).emit("peer-joined");
    if (typeof ack === "function") ack({ ok: true });
  });

  for (const event of ["offer", "answer", "ice-candidate", "stop-sharing"]) {
    socket.on(event, payload => {
      const code = socket.data.room;
      if (!code || !rooms.has(code)) return;
      socket.to(code).emit(event, payload);
    });
  }

  socket.on("disconnect", () => {
    const code = socket.data.room;
    if (!code) return;
    const room = rooms.get(code);
    if (!room) return;
    socket.to(code).emit("peer-left");
    if (room.host === socket.id) rooms.delete(code);
    else if (room.phone === socket.id) room.phone = null;
  });
});

const port = process.env.PORT || 3000;
server.listen(port, "0.0.0.0", () => console.log(`PhoneCast listening on ${port}`));
