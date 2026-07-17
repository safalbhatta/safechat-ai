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
    notificationPreferences: {
      enabled: { type: Boolean, default: true },
      newMessages: { type: Boolean, default: true },
      reactions: { type: Boolean, default: true },
      contactRequests: { type: Boolean, default: true },
      friendUpdates: { type: Boolean, default: true },
      accountActivity: { type: Boolean, default: true },
      sound: { type: Boolean, default: true },
      desktop: { type: Boolean, default: true },
    },
    blockedContacts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    sentRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    sessions: [
      {
        token: { type: String, required: true },
        device: { type: String, default: "Unknown Device" },
        browser: { type: String, default: "Unknown Browser" },
        ip: { type: String, default: "Unknown IP" },
        lastActive: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);