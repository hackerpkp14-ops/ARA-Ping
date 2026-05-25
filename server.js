const express = require("express");
const http = require("http");
const path = require("path");
const mongoose = require("mongoose");
const multer = require("multer");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.urlencoded({ extended:true }));

app.use(express.static(path.join(__dirname,"Public")));
app.use("/uploads",express.static("uploads"));

mongoose.connect(process.env.MONGO_URI)
.then(()=>console.log("MongoDB Connected"))
.catch(err=>console.log(err));

const storage = multer.diskStorage({

  destination:(req,file,cb)=>{
    cb(null,"uploads/");
  },

  filename:(req,file,cb)=>{
    cb(
      null,
      Date.now() + "-" + file.originalname
    );
  }

});

const upload = multer({ storage });

const UserSchema = new mongoose.Schema({
  username:{
    type:String,
    unique:true
  },
  password:String
});

const MessageSchema = new mongoose.Schema({

  from:String,

  to:String,

  text:String,

  image:String,

  createdAt:{
    type:Date,
    default:Date.now
  }

});

const User = mongoose.model("User",UserSchema);
const Message = mongoose.model("Message",MessageSchema);

app.get("/",(req,res)=>{
  res.sendFile(
    path.join(__dirname,"Public","index.html")
  );
});

app.post("/signup",async(req,res)=>{

  try{

    const { username,password } = req.body;

    const existing =
    await User.findOne({
      username:username.trim()
    });

    if(existing){

      return res.json({
        ok:false,
        error:"Username already exists"
      });

    }

    await User.create({
      username:username.trim(),
      password:password.trim()
    });

    res.json({ ok:true });

  }catch(err){

    console.log(err);

    res.json({
      ok:false,
      error:"Signup failed"
    });

  }

});

app.post("/login",async(req,res)=>{

  try{

    const { username,password } = req.body;

    const user =
    await User.findOne({
      username:username.trim(),
      password:password.trim()
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

app.get("/search/:username",async(req,res)=>{

  const user =
  await User.findOne({
    username:req.params.username
  });

  if(!user){
    return res.json([]);
  }

  res.json([user]);

});

app.get("/recent/:me",async(req,res)=>{

  const me = req.params.me;

  const msgs =
  await Message.find({
    $or:[
      { from:me },
      { to:me }
    ]
  }).sort({ createdAt:-1 });

  const users = [];

  msgs.forEach(m=>{

    const other =
    m.from === me ? m.to : m.from;

    if(!users.find(
      x=>x.username === other
    )){

      users.push({
        username:other,
        text:m.text || "📷 Image"
      });

    }

  });

  res.json(users);

});

app.get("/messages/:a/:b",async(req,res)=>{

  const msgs =
  await Message.find({

    $or:[
      {
        from:req.params.a,
        to:req.params.b
      },
      {
        from:req.params.b,
        to:req.params.a
      }
    ]

  }).sort({ createdAt:1 });

  res.json(msgs);

});

app.post(
  "/upload",
  upload.single("image"),
  async(req,res)=>{

    res.json({
      image:"/uploads/" + req.file.filename
    });

  }
);

io.on("connection",(socket)=>{

  socket.on("message",async(data)=>{

    const saved =
    await Message.create(data);

    io.emit("message",saved);

  });

});

const PORT =
process.env.PORT || 3000;

server.listen(PORT,()=>{
  console.log("Running on " + PORT);
});