const express = require("express");
const http = require("http");
const path = require("path");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "Public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "Public", "index.html"));
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.error("Mongo error:", err));

const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true }
});

const MessageSchema = new mongoose.Schema({
  from: String,
  to: String,
  text: String,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model("User", UserSchema);
const Message = mongoose.model("Message", MessageSchema);

app.post("/signup", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "All fields required" });
    }

    const existing = await User.findOne({ username: username.trim() });

    if (existing) {
      return res.status(400).json({ error: "User already exists" });
    }

    await User.create({
      username: username.trim(),
      password: password.trim()
    });

    res.json({ ok: true });

  } catch (err) {
    console.error("SIGNUP ERROR:", err);
    res.status(500).json({ error: "Signup failed" });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({
      username: username.trim(),
      password: password.trim()
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    res.json({
      ok: true,
      username: user.username
    });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

app.get("/users/:me", async (req, res) => {
  const users = await User.find({
    username: { $ne: req.params.me }
  });

  res.json(users);
});

app.get("/messages/:a/:b", async (req, res) => {
  const { a, b } = req.params;

  const messages = await Message.find({
    $or: [
      { from: a, to: b },
      { from: b, to: a }
    ]
  }).sort({ createdAt: 1 });

  res.json(messages);
});

io.on("connection", socket => {
  socket.on("message", async msg => {
    const saved = await Message.create(msg);
    io.emit("message", saved);
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});