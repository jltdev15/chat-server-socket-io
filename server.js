const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const auth = require("./middleware/auth");
const jwt = require("jsonwebtoken");
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 3000;

// Connect to MongoDB
mongoose.connect("mongodb://127.0.0.1:27017/chatAppDB", {});
app.use(cors());
app.use(bodyParser.json());
app.use("/api/auth", authRoutes);

// Simple protected route
app.get("/api/protected", auth, (req, res) => {
  res.send("This is a protected route");
});

let users = [];

const addUser = (userName, socketId) => {
  !users.some((user) => user.userName === userName) &&
    users.push({ userName, socketId });
};

const removeUser = (socketId) => {
  users = users.filter((user) => user.socketId !== socketId);
};
io.use((socket, next) => {
  const token = socket.handshake.query.token;
  console.log(token);
  try {
    const decoded = jwt.verify(token, "yourSecretKey");
    socket.user = decoded.user;
    console.log(socket.user.username);
    next();
  } catch (err) {
    console.log(err);
    next(new Error("Authentication error"));
  }
}).on("connection", (socket) => {
  socket.on("message", (msg) => {
    // console.log(socket.user.username, msg);
    io.emit("message", { sender: socket.user.username, content: msg });
  });

  addUser(socket.user.username, socket.id);
  io.emit("getUsers", users);

  socket.on("disconnect", () => {
    console.log("Client disconnected");
    removeUser(socket.id);
    io.emit("getUsers", users);
  });
});

// Start the Express server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
