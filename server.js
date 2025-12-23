require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();

const port = process.env.PORT || 4000;
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin:
      process.env.NODE_ENV === "production"
        ? [process.env.PRODUCTION_URL]
        : ["http://localhost:3000"],
    methods: ["GET", "POST"],
  },
});

app.use(express.static("build"));

const onlinePlayers = {};

io.on("connection", (socket) => {
  socket.on("validateUsername", (username, callback) => {
    const isTaken = Object.values(onlinePlayers).includes(username);
    callback(!isTaken);
  });

  socket.on("addUser", (username) => {
    onlinePlayers[socket.id] = username;
    io.emit("onlinePlayers", Object.values(onlinePlayers));
    console.log(`${username} joined. Current users:`, onlinePlayers);
  });

  socket.on("gameRequest", (targetUsername) => {
    const targetSocketId = Object.keys(onlinePlayers).find(
      (id) => onlinePlayers[id] == targetUsername,
    );

    socket.join(`${onlinePlayers[socket.id]}-${onlinePlayers[targetSocketId]}`);

    if (targetSocketId) {
      io.to(targetSocketId).emit("gameRequest", onlinePlayers[socket.id]);
    }
  });

  socket.on("acceptRequest", (fromUsername) => {
    const targetSocketId = Object.keys(onlinePlayers).find(
      (id) => onlinePlayers[id] == fromUsername,
    );

    const room = `${onlinePlayers[targetSocketId]}-${onlinePlayers[socket.id]}`;

    socket.join(room);

    if (targetSocketId) {
      io.to(targetSocketId).emit("acceptRequest", onlinePlayers[socket.id]);
      io.in(room).emit("gameAccepted", room);
    }
  });

  socket.on("playMove", (data) => {
    // Can be optimized futher, checking the whole list for each move is tiresome.
    const targetSocketId = Object.keys(onlinePlayers).find(
      (id) => onlinePlayers[id] == data.opponent,
    );

    io.to(data.room).emit("updateBoard", data);
    io.to(targetSocketId).emit("changeTurn", true);
  });

  socket.on("leaveRoom", (room) => {
    socket.leave(room);
  });

  socket.on("disconnecting", () => {
    const roomName = Array.from(socket.rooms)[1];
    if (roomName) {
      const room = io.sockets.adapter.rooms.get(roomName);

      const socketIds = Array.from(room);
      const targetSocketId = socketIds.find((id) => id !== socket.id);

      if (targetSocketId) {
        io.to(targetSocketId).emit("opponentLeft");
      }
    }
  });

  socket.on("disconnect", () => {
    const username = onlinePlayers[socket.id];
    if (username) {
      delete onlinePlayers[socket.id];
      io.emit("onlinePlayers", Object.values(onlinePlayers));
    }
  });
});

server.listen(port, () => {
  console.log("Server is running on port 4000");
});

