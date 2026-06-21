const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    bio: {
      type: String,
      default: "",
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    profilePic: {
      type: String,
      default: "",
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    privacy: {
      lastSeen: { type: String, enum: ['Everyone', 'My contacts', 'Nobody'], default: 'Nobody' },
      profilePicture: { type: String, enum: ['Everyone', 'My contacts', 'Nobody'], default: 'Everyone' },
      about: { type: String, enum: ['Everyone', 'My contacts', 'Nobody'], default: 'My contacts' },
      links: { type: String, enum: ['Everyone', 'My contacts', 'Nobody'], default: 'My contacts' },
      groups: { type: String, enum: ['Everyone', 'My contacts', 'Selected contacts', 'Nobody'], default: 'Selected contacts' },
      status: { type: String, enum: ['Everyone', 'My contacts', 'Selected contacts', 'Nobody'], default: 'My contacts' },
      calls: { type: String, enum: ['Everyone', 'Silence unknown callers'], default: 'Silence unknown callers' }
    },
    blockedContacts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);