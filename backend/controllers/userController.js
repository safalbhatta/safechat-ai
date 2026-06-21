const User = require("../models/User");

const getUsers = async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id } }).select(
      "-password"
    );

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const { name, username, bio, privacy } = req.body;

    const user = await User.findById(req.user._id);

    if (user) {
      if (username && username !== user.username) {
        const usernameExists = await User.findOne({ username });
        if (usernameExists) {
          return res.status(400).json({ message: "Username already taken." });
        }
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

      const updatedUser = await user.save();

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

module.exports = { getUsers, updateUserProfile, deleteUserProfile };
