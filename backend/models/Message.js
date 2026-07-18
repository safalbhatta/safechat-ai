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
      required: false,
      default: null,
    },

    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

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

    isForwarded: {
      type: Boolean,
      default: false,
    },

    forwardedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    pinnedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    starredBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    reactions: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        emoji: {
          type: String,
          required: true,
        },
        reactedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

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
    
    deletedFor: [
  {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
],


    predictedCategory: {
      type: String,
      enum: [
        "normal",
        "spam",
        "abusive",
        "hateful",
        "unclassified",
      ],
      default: "unclassified",
      index: true,
    },

    classificationStatus: {
      type: String,
      enum: [
        "classified",
        "unclassified",
        "error",
      ],
      default: "unclassified",
      index: true,
    },

    classificationConfidence: {
      type: Number,
      default: null,
      min: 0,
      max: 1,
    },

    classificationProbabilities: {
      normal: {
        type: Number,
        default: 0,
      },
      spam: {
        type: Number,
        default: 0,
      },
      abusive: {
        type: Number,
        default: 0,
      },
      hateful: {
        type: Number,
        default: 0,
      },
    },

    modelVersion: {
      type: String,
      default: "",
      trim: true,
    },

    modelName: {
      type: String,
      default: "",
      trim: true,
    },

    classificationLatencyMs: {
      type: Number,
      default: null,
    },

    classifiedAt: {
      type: Date,
      default: null,
      index: true,
    },

    classificationError: {
      type: String,
      default: "",
      trim: true,
    },

    isSafetyHidden: {
      type: Boolean,
      default: false,
      index: true,
    },

    revealedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

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
