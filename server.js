const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const socketio = require("socket.io");
const path = require("path");
const multer = require("multer");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "Public")));
app.use("/uploads", express.static("uploads"));

if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

/* ======================
   MONGODB
====================== */

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));

/* ======================
   MODELS
====================== */

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true
  },
  password: String,

  profilePic: {
    type: String,
    default: ""
  },

  lastSeen: {
    type: Date,
    default: Date.now
  }
});

const MessageSchema = new mongoose.Schema({
  from: String,
  to: String,

  text: String,
  image: String,

  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },

  deletedForEveryone: {
    type: Boolean,
    default: false
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

const User = mongoose.model("User", UserSchema);
const Message = mongoose.model("Message", MessageSchema);

/* ======================
   MULTER IMAGE STORAGE
====================== */

const storage = multer.diskStorage({

  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },

  filename: (req, file, cb) => {
    cb(
      null,
      Date.now() +
      "-" +
      file.originalname
    );
  }

});

const upload = multer({
  storage
});

/* ======================
   ROUTES
====================== */

app.get("/", (req, res) => {
  res.sendFile(
    path.join(__dirname, "Public", "index.html")
  );
});

/* SIGNUP */

app.post("/signup", async (req, res) => {

  try {

    const username =
      req.body.username.trim();

    const password =
      req.body.password.trim();

    if (!username || !password) {
      return res.json({
        ok: false,
        error: "Fill all fields"
      });
    }

    const exists =
      await User.findOne({ username });

    if (exists) {
      return res.json({
        ok: false,
        error: "Username already exists"
      });
    }

    await User.create({
      username,
      password
    });

    res.json({
      ok: true
    });

  } catch (err) {

    console.log(err);

    res.json({
      ok: false,
      error: "Signup failed"
    });

  }

});

/* LOGIN */

app.post("/login", async (req, res) => {

  try {

    const username =
      req.body.username.trim();

    const password =
      req.body.password.trim();

    const user = await User.findOne({
      username,
      password
    });

    if (!user) {
      return res.json({
        ok: false,
        error: "Invalid credentials"
      });
    }

    res.json({
      ok: true,
      username: user.username
    });

  } catch (err) {

    console.log(err);

    res.json({
      ok: false,
      error: "Login failed"
    });

  }

});

/* SEARCH USERS */

app.get("/search/:username", async (req, res) => {

  const username = req.params.username;

  const users = await User.find({
    username: {
      $regex: username,
      $options: "i"
    }
  });

  res.json(users);

});
app.get(
  "/profile/:username",
  async (req, res) => {

    const user =
      await User.findOne({
        username:
          req.params.username
      });

    if (!user) {
      return res.json({
        ok: false
      });
    }

    res.json({
      ok: true,
      username: user.username,
      profilePic: user.profilePic
    });

  }
);

/* GET CHATS */

app.get("/chats/:me", async (req, res) => {

  const me = req.params.me;

  const msgs = await Message.find({
    $or: [
      { from: me },
      { to: me }
    ]
  }).sort({ createdAt: -1 });

  const users = [];

 for (const m of msgs) {

  const other =
    m.from === me ? m.to : m.from;

  if (!users.find(u => u.username === other)) {

    const profileUser =
      await User.findOne({
        username: other
      });

    users.push({
      username: other,
      profilePic:
        profileUser?.profilePic || "",
      lastMessage:
        m.text || "📷 Image"
    });

  }

}

  res.json(users);

});

/* GET MESSAGES */

app.get("/messages/:a/:b", async (req, res) => {

  const a = req.params.a;
  const b = req.params.b;

  const msgs = await Message.find({

    $or: [
      { from: a, to: b },
      { from: b, to: a }
    ]

  }).sort({ createdAt: 1 });

  res.json(msgs);

});

/* IMAGE UPLOAD */

app.post(
  "/upload",
  upload.single("image"),
  (req, res) => {

    res.json({
      image:
        "/uploads/" +
        req.file.filename
    });

  }
);
app.post(
  "/upload-profile",
  upload.single("image"),
  async (req, res) => {

    try {

      const username = req.body.username;

      const image =
        "/uploads/" +
        req.file.filename;

      await User.updateOne(
        { username },
        {
          profilePic: image
        }
      );

      res.json({
        ok: true,
        image
      });

    } catch (err) {

      console.log(err);

      res.json({
        ok: false
      });

    }

  }
);

/* ======================
   SOCKET
====================== */

const onlineUsers = {};

io.on("connection", socket => {

socket.on("user-online", username => {


onlineUsers[username] = socket.id;

io.emit(
  "online-users",
  Object.keys(onlineUsers)
);


});

socket.on(
"message",
async data => {


  try {

    const saved =
    await Message.create({

      from: data.from,
      to: data.to,
      text: data.text || "",
      image: data.image || ""

    });

    io.emit(
      "message",
      saved
    );

  } catch(err){

    console.log(err);

  }

}


);

socket.on(
"disconnect",
() => {


  for(
    const username
    in onlineUsers
  ){

    if(
      onlineUsers[username]
      === socket.id
    ){

      delete onlineUsers[
        username
      ];

      break;

    }

  }

  io.emit(
    "online-users",
    Object.keys(
      onlineUsers
    )
  );

}


);

});


/* ======================
   SERVER
====================== */

const PORT =
  process.env.PORT || 3000;

server.listen(PORT, () => {

  console.log(
    "Server running on " + PORT
  );

});