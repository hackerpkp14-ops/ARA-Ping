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

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true
  },
  password: String
});

const MessageSchema = new mongoose.Schema({
  from: String,
  to: String,
  text: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const User = mongoose.model("User", UserSchema);
const Message = mongoose.model("Message", MessageSchema);

app.get("/", (req,res)=>{
  res.sendFile(path.join(__dirname,"Public","index.html"));
});

app.post("/signup", async(req,res)=>{

  try{

    const { username, password } = req.body;

    if(!username || !password){
      return res.json({
        ok:false,
        error:"All fields required"
      });
    }

    const existing = await User.findOne({
      username: username.trim()
    });

    if(existing){
      return res.json({
        ok:false,
        error:"Username already exists"
      });
    }

    await User.create({
      username: username.trim(),
      password: password.trim()
    });

    res.json({
      ok:true
    });

  }catch(err){

    console.log(err);

    res.json({
      ok:false,
      error:"Signup failed"
    });

  }

});

app.post("/login", async(req,res)=>{

  try{

    const { username, password } = req.body;

    const user = await User.findOne({
      username: username.trim(),
      password: password.trim()
    });

    if(!user){
      return res.json({
        ok:false,
        error:"Invalid credentials"
      });
    }

    res.json({
      ok:true,
      username:user.username
    });

  }catch(err){

    console.log(err);

    res.json({
      ok:false,
      error:"Login failed"
    });

  }

});

app.get("/search/:username", async(req,res)=>{

  const user = await User.findOne({
    username:req.params.username
  });

  if(!user){
    return res.json([]);
  }

  res.json([user]);

});

app.get("/messages/:a/:b", async(req,res)=>{

  const { a,b } = req.params;

  const msgs = await Message.find({
    $or:[
      { from:a, to:b },
      { from:b, to:a }
    ]
  }).sort({ createdAt:1 });

  res.json(msgs);

});

io.on("connection",(socket)=>{

  socket.on("message", async(data)=>{

    const saved = await Message.create({
      from:data.from,
      to:data.to,
      text:data.text
    });

    io.emit("message", saved);

  });

});

const PORT = process.env.PORT || 3000;

server.listen(PORT, ()=>{
  console.log("Server running on " + PORT);
});