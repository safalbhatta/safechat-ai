const User = require("../models/User");
const bcrypt = require("bcryptjs");

const getUsers = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate(
      "friends",
      "-password"
    );

    res.json(user.friends || []);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.json([]);

    const users = await User.find({
      $and: [
        { _id: { $ne: req.user._id } },
        {
          $or: [
            { username: { $regex: query, $options: "i" } },
            { name: { $regex: query, $options: "i" } },
            { email: { $regex: query, $options: "i" } }
          ]
        }
      ]
    }).select("-password");

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const sendFriendRequest = async (req, res) => {
  try {
    const { targetUserId } = req.body;
    if (targetUserId === req.user._id.toString()) {
      return res.status(400).json({ message: "Cannot send request to yourself" });
    }

    const currentUser = await User.findById(req.user._id);
    const targetUser = await User.findById(targetUserId);

    if (!targetUser) return res.status(404).json({ message: "User not found" });

    if (currentUser.friends.includes(targetUserId)) {
      return res.status(400).json({ message: "Already friends" });
    }
    if (currentUser.sentRequests.includes(targetUserId)) {
      return res.status(400).json({ message: "Request already sent" });
    }

    currentUser.sentRequests.push(targetUserId);
    targetUser.friendRequests.push(currentUser._id);

    await currentUser.save();
    await targetUser.save();

    const io = req.app.get("io");
    if (io) {
      io.to(targetUser._id.toString()).emit("friendRequestReceived", {
        from: { _id: currentUser._id, username: currentUser.username, name: currentUser.name }
      });
    }

    res.json({ message: "Friend request sent" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const acceptFriendRequest = async (req, res) => {
  try {
    const { requesterId } = req.body;
    const currentUser = await User.findById(req.user._id);
    const requesterUser = await User.findById(requesterId);

    if (!requesterUser) return res.status(404).json({ message: "Requester not found" });

    if (!currentUser.friendRequests.includes(requesterId)) {
      return res.status(400).json({ message: "No pending request from this user" });
    }

    // Add to friends
    if (!currentUser.friends.includes(requesterId)) currentUser.friends.push(requesterId);
    if (!requesterUser.friends.includes(currentUser._id)) requesterUser.friends.push(currentUser._id);

    // Remove requests
    currentUser.friendRequests = currentUser.friendRequests.filter(id => id.toString() !== requesterId);
    requesterUser.sentRequests = requesterUser.sentRequests.filter(id => id.toString() !== currentUser._id.toString());

    await currentUser.save();
    await requesterUser.save();

    const io = req.app.get("io");
    if (io) {
      io.to(requesterUser._id.toString()).emit("friendRequestAccepted", {
        from: { _id: currentUser._id, username: currentUser.username, name: currentUser.name }
      });
    }

    res.json({ message: "Friend request accepted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const declineFriendRequest = async (req, res) => {
  try {
    const { requesterId } = req.body;
    const currentUser = await User.findById(req.user._id);
    const requesterUser = await User.findById(requesterId);

    if (currentUser.friendRequests.includes(requesterId)) {
      currentUser.friendRequests = currentUser.friendRequests.filter(id => id.toString() !== requesterId);
      await currentUser.save();
    }

    if (requesterUser && requesterUser.sentRequests.includes(currentUser._id)) {
      requesterUser.sentRequests = requesterUser.sentRequests.filter(id => id.toString() !== currentUser._id.toString());
      await requesterUser.save();
    }

    res.json({ message: "Friend request declined" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getFriendRequests = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate("friendRequests", "name username profilePic")
      .populate("sentRequests", "name username profilePic");

    res.json({
      incoming: user.friendRequests,
      outgoing: user.sentRequests
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const removeFriend = async (req, res) => {
  try {
    const { friendId } = req.body;
    const currentUser = await User.findById(req.user._id);
    const friendUser = await User.findById(friendId);

    if (currentUser && currentUser.friends.includes(friendId)) {
      currentUser.friends = currentUser.friends.filter(id => id.toString() !== friendId);
      await currentUser.save();
    }

    if (friendUser && friendUser.friends.includes(currentUser._id)) {
      friendUser.friends = friendUser.friends.filter(id => id.toString() !== currentUser._id.toString());
      await friendUser.save();
    }

    res.json({ message: "Friend removed" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    console.log("updateUserProfile called by user:", req.user._id, "with body:", req.body);
    const { name, username, bio, privacy, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    if (user) {
      console.log("Current user before update:", user.name, user.username, user.bio);
      if (username && username !== user.username) {
        const usernameExists = await User.findOne({ username });
        if (usernameExists) {
          return res.status(400).json({ message: "Username already taken." });
        }
      }

      if (currentPassword && newPassword) {
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
          return res.status(401).json({ message: "Incorrect current password." });
        }
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
      }

      user.name = name !== undefined ? name : user.name;
      user.username = username || user.username;
      user.bio = bio !== undefined ? bio : user.bio;

      if (privacy) {
        user.privacy = {
          ...(user.privacy ? (user.privacy.toObject ? user.privacy.toObject() : user.privacy) : {}),
          ...privacy
        };
        user.markModified("privacy");
      }

      console.log("User object before save:", user.name, user.username, user.bio);
      const updatedUser = await user.save();
      console.log("User object after save:", updatedUser.name, updatedUser.username, updatedUser.bio);

      const payload = {
        _id: updatedUser._id,
        name: updatedUser.name,
        username: updatedUser.username,
        email: updatedUser.email,
        bio: updatedUser.bio,
        profilePic: updatedUser.profilePic,
        privacy: updatedUser.privacy,
        blockedContacts: updatedUser.blockedContacts,
      };

      const io = req.app.get("io");
      if (io) {
        io.emit("userProfileUpdated", payload);
      }

      res.json(payload);
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Username already taken." });
    }
    res.status(500).json({ message: error.message });
  }
};

const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate("blockedContacts", "name username bio profilePic");
    if (user) {
      res.json({
        _id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        bio: user.bio,
        profilePic: user.profilePic,
        privacy: user.privacy,
        blockedContacts: user.blockedContacts,
      });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      await User.deleteOne({ _id: req.user._id });
      res.json({ message: "User removed" });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getSessions = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const activeSessions = user.sessions.map((session) => ({
      id: session._id,
      device: session.device,
      browser: session.browser,
      ip: session.ip,
      lastActive: session.lastActive,
      current: session.token === req.token,
    }));

    res.json(activeSessions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const revokeSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const user = await User.findById(req.user._id);
    
    if (!user) return res.status(404).json({ message: "User not found" });

    const sessionToRevoke = user.sessions.find(s => s._id.toString() === sessionId);
    if (sessionToRevoke) {
      const io = req.app.get("io");
      if (io) {
        io.to(user._id.toString()).emit("sessionRevoked", sessionToRevoke.token);
      }
    }

    user.sessions = user.sessions.filter(s => s._id.toString() !== sessionId);
    await user.save();
    
    res.json({ message: "Session revoked successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const toggleBlockUser = async (req, res) => {
  try {
    const userToBlockId = req.params.userId;
    if (userToBlockId === req.user._id.toString()) {
      return res.status(400).json({ message: "You cannot block yourself" });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isBlocked = user.blockedContacts.some((id) => id.toString() === userToBlockId);

    if (isBlocked) {
      user.blockedContacts = user.blockedContacts.filter((id) => id.toString() !== userToBlockId);
    } else {
      user.blockedContacts.push(userToBlockId);
    }

    await user.save();
    const updatedUser = await User.findById(user._id).populate("blockedContacts", "name username bio profilePic");

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      username: updatedUser.username,
      email: updatedUser.email,
      bio: updatedUser.bio,
      profilePic: updatedUser.profilePic,
      privacy: updatedUser.privacy,
      blockedContacts: updatedUser.blockedContacts,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { 
  getUsers, 
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  getFriendRequests,
  getUserProfile, 
  updateUserProfile, 
  deleteUserProfile, 
  getSessions, 
  revokeSession, 
  toggleBlockUser,
  removeFriend
};
