const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
    },

    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    messageType: {
  type: String,
  enum: ["text", "voice"],
  default: "text",
},

text: {
  type: String,
  default: "",
  trim: true,
},

audioUrl: {
  type: String,
  default: "",
},

audioDuration: {
  type: Number,
  default: 0,
},

    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    isEdited: {
      type: Boolean,
      default: false,
    },

    editedAt: {
      type: Date,
      default: null,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    deletedAt: {
      type: Date,
      default: null,
    },

    isFlagged: {
      type: Boolean,
      default: false,
    },

    flagCategory: {
      type: String,
      enum: [
        "None",
        "Spam",
        "Harassment",
        "Hate Speech",
        "Threat",
        "Scam",
        "Other",
      ],
      default: "None",
    },

    flagReason: {
      type: String,
      default: "",
    },

    flagStatus: {
      type: String,
      enum: ["None", "Pending", "Reviewed", "Dismissed"],
      default: "None",
    },

    flaggedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    flaggedAt: {
      type: Date,
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },

    isViewed: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);