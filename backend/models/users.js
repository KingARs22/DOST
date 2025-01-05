const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  friends: [{ userId: mongoose.Schema.Types.ObjectId}], // Friends list
  friendRequests: [{ userId: mongoose.Schema.Types.ObjectId}] // Pending requests
});

module.exports = mongoose.model('User', userSchema);
