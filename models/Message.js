const mongoose = require("mongoose");

module.exports = mongoose.model("Message", new mongoose.Schema({
  from: String,
  to: String,
  text: String
}, { timestamps: true }));