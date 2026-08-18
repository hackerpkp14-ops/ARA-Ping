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

  // NEW
  seen: {
    type: Boolean,
    default: false
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});
const User = mongoose.model(
  "User",
  UserSchema
);

const Message = mongoose.model(
  "Message",
  MessageSchema
);

/* ======================
   MULTER IMAGE STORAGE
====================== */

const cloudinary =
require("cloudinary").v2;

cloudinary.config({

  cloud_name:
  process.env.CLOUDINARY_CLOUD_NAME,

  api_key:
  process.env.CLOUDINARY_API_KEY,

  api_secret:
  process.env.CLOUDINARY_API_SECRET

});

const upload =
multer({
  dest: "temp/"
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

    const unread =
await Message.countDocuments({

  from: other,

  to: me,

  seen: false

});

users.push({

  username: other,

  profilePic:
    profileUser?.profilePic || "",

  lastMessage:
    m.text || "📷 Image",

  lastTime:
    m.createdAt,

  unread

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
  async (req, res) => {

    try {

      const result =
      await cloudinary.uploader.upload(
        req.file.path,
        {
          folder: "ara-ping"
        }
      );

      res.json({
        image: result.secure_url
      });

    } catch (err) {

      console.log(err);

      res.status(500).json({
        error: "Upload failed"
      });

    }

  }
);
app.post(
  "/upload-profile",
  upload.single("image"),
  async (req, res) => {

    try {

      const username =
      req.body.username;

      const result =
      await cloudinary.uploader.upload(
        req.file.path,
        {
          folder: "ara-ping/profile"
        }
      );

      const image =
      result.secure_url;

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

      res.status(500).json({
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

  // =========================
  // USER ONLINE
  // =========================

  socket.on("user-online", username => {

    console.log(
      "USER ONLINE:",
      username,
      socket.id
    );

    onlineUsers[username] =
      socket.id;

    console.log(
      "ALL ONLINE USERS:",
      Object.keys(onlineUsers)
    );

    io.emit(
      "online-users",
      Object.keys(onlineUsers)
    );

  });


  // =========================
  // TYPING
  // =========================

  socket.on("typing", data => {

    console.log(
      "SERVER RECEIVED:",
      data
    );

    const targetSocket =
      onlineUsers[data.to];

    if (targetSocket) {

      io.to(targetSocket).emit(
        "typing",
        data
      );

    }

  });


  // =========================
  // STOP TYPING
  // =========================

  socket.on("stop-typing", data => {

    const targetSocket =
      onlineUsers[data.to];

    if (targetSocket) {

      io.to(targetSocket).emit(
        "stop-typing",
        data
      );

    }

  });


  // =========================
  // MESSAGE
  // =========================

  socket.on("message", async data => {

    try {

      const saved =
        await Message.create({

          from: data.from,

          to: data.to,

          text: data.text || "",

          image: data.image || "",

          seen: false

        });


      console.log(
        "MESSAGE SAVED:",
        saved._id.toString()
      );


      const targetSocket =
        onlineUsers[data.to];


      console.log(
        "DELIVERY CHECK:",
        {
          from: data.from,

          to: data.to,

          targetSocket,

          onlineUsers
        }
      );


      // Send saved message back
      // to the sender

      socket.emit(
        "message",
        saved
      );


      // Send message to recipient

      if (targetSocket) {

        io.to(targetSocket).emit(
          "message",
          saved
        );


        console.log(
          "SENDING DELIVERY CONFIRMATION"
        );


        socket.emit(
          "message-delivered",
          {

            messageId:
              saved._id.toString(),

            to: data.to

          }
        );


      } else {

        console.log(
          "RECIPIENT OFFLINE:",
          data.to
        );

      }


    } catch (err) {

      console.log(
        "MESSAGE ERROR:",
        err
      );

    }

  });


  // =========================
  // DISCONNECT
  // =========================

  socket.on("disconnect", () => {

    for (
      const username
      in onlineUsers
    ) {

      if (
        onlineUsers[username] ===
        socket.id
      ) {

        delete onlineUsers[
          username
        ];

        console.log(
          "USER OFFLINE:",
          username
        );

        break;

      }

    }


    io.emit(
      "online-users",
      Object.keys(
        onlineUsers
      )
    );

  });

});

app.post("/seen", async (req, res) => {

  try {

    const from = req.body.from;
    const to = req.body.to;

    const result = await Message.updateMany(
      {
        from: from,
        to: to,
        seen: false
      },
      {
        seen: true
      }
    );

    // Tell the sender that their messages were seen
    const senderSocket =
      onlineUsers[from];
      console.log("SENDING SEEN EVENT:", {
      from,
      to,
      senderSocket
});
     console.log("SEEN ROUTING:", {
     from,
     to,
    senderSocket,
    onlineUsers
});

    if (senderSocket) {

      io.to(senderSocket).emit(
        "messages-seen",
        {
          from: from,
          to: to
        }
      );

    }

    res.json({
      ok: true
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      ok: false
    });

  }

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
app.get(
  "/user/:username",
  async (req, res) => {

    const user =
    await User.findOne({
      username:
      req.params.username
    });

    res.json(user);

  }
);app.get(
  "/user/:username",
  async (req, res) => {

    const user =
    await User.findOne({
      username:
      req.params.username
    });

    res.json(user);

  }
);