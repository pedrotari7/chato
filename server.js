const express = require("express");
const app = express();
const cors = require("cors");

const { ExpressPeerServer } = require("peer");

const server = require("http").Server(app);

const io = require("socket.io")(server);

const peerServer = ExpressPeerServer(server, {
  debug: true,
  path: "/",
});

const roomId = 1;

io.on("connection", (socket) => {
  console.log("user connected");
  socket.on("join-room", (userId) => {
    console.log("join-room", userId);
    socket.join(roomId);
    socket.to(roomId).broadcast.emit("user-connected", userId);

    socket.on("disconnect", () => {
      console.log("user disconnected");
      socket.to(roomId).broadcast.emit("user-disconnected", userId);
    });
  });
});

app.use("/peerjs", peerServer);

peerServer.on("connection", (client) => {
  console.log("peerServer connection");
});

peerServer.on("disconnect", (client) => {
  console.log("peerServer disconnect");
});

server.listen(9000);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
