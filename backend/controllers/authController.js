const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const { createNotification } = require("../services/notificationService");
const { sendOtpEmail } = require("../services/emailService");

const parseUserAgent = (ua) => {
  if (!ua) return { browser: "Unknown Browser", device: "Unknown Device" };
  
  let browser = "Unknown Browser";
  if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Edg")) browser = "Edge";
  else if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Safari")) browser = "Safari";
  
  let device = "Unknown Device";
  if (ua.includes("Windows NT 10.0")) device = "Windows 10/11";
  else if (ua.includes("Windows NT")) device = "Windows";
  else if (ua.includes("Mac OS X")) device = "Mac";
  else if (ua.includes("Linux")) device = "Linux";
  else if (ua.includes("Android")) device = "Android";
  else if (ua.includes("iPhone")) device = "iPhone";
  else if (ua.includes("iPad")) device = "iPad";
  
  return { browser, device };
};

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

const registerUser = async (req, res) => {
  try {
    const username = req.body.username?.trim();
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "Please fill all fields" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: "User already exists with this email" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
    });

    const token = generateToken(user._id);
    const { browser, device } = parseUserAgent(req.headers['user-agent']);
    const ip = req.ip || req.connection?.remoteAddress || "Unknown IP";

    user.sessions.push({ token, browser, device, ip });
    await user.save();

    const populatedUser = await User.findById(user._id).populate("blockedContacts", "name username bio profilePic");

    await createNotification({
      io: req.app.get("io"),
      recipientId: user._id,
      actorId: user._id,
      type: "system",
      title: "Welcome to SafeChat AI",
      body: "Your account is ready. Notification preferences can be managed from the Activity Center.",
      metadata: { action: "account_created" },
    });

    res.status(201).json({
      _id: populatedUser._id,
      name: populatedUser.name,
      username: populatedUser.username,
      email: populatedUser.email,
      bio: populatedUser.bio,
      profilePic: populatedUser.profilePic,
      privacy: populatedUser.privacy,
      blockedContacts: populatedUser.blockedContacts,
      token,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const loginUser = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = generateToken(user._id);
    const { browser, device } = parseUserAgent(req.headers['user-agent']);
    const ip = req.ip || req.connection?.remoteAddress || "Unknown IP";

    user.sessions.push({ token, browser, device, ip, lastActive: Date.now() });
    await user.save();

    const populatedUser = await User.findById(user._id).populate("blockedContacts", "name username bio profilePic");

    const io = req.app.get("io");

    await createNotification({
      io,
      recipientId: user._id,
      actorId: user._id,
      type: "account",
      title: "New login",
      body: `Signed in using ${browser} on ${device}.`,
      metadata: { action: "login", browser, device, ip },
    });

    if (io) {
      io.to(user._id.toString()).emit("sessionCreated", {
        message: "New session started"
      });
    }

    res.json({
      _id: populatedUser._id,
      name: populatedUser.name,
      username: populatedUser.username,
      email: populatedUser.email,
      bio: populatedUser.bio,
      profilePic: populatedUser.profilePic,
      privacy: populatedUser.privacy,
      blockedContacts: populatedUser.blockedContacts,
      token,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── Forgot password: Step 1 — send OTP ────────────────────────────────────
const sendOtp = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email });

    // Always respond OK so we don't leak which emails are registered
    if (!user) {
      return res.json({ message: "If this email is registered, an OTP has been sent." });
    }

    // Generate a cryptographically random 6-digit OTP
    const otp = String(crypto.randomInt(100000, 999999));
    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otp, salt);

    user.passwordResetOtp = hashedOtp;
    user.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 min
    await user.save();

    await sendOtpEmail(email, otp, user.username || user.name);

    res.json({ message: "If this email is registered, an OTP has been sent." });
  } catch (error) {
    console.error("sendOtp error:", error.message);
    res.status(500).json({ message: "Failed to send OTP. Please try again." });
  }
};

// ── Forgot password: Step 2 — verify OTP ──────────────────────────────────
const verifyOtp = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const { otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const user = await User.findOne({ email });

    if (!user || !user.passwordResetOtp || !user.passwordResetExpires) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    if (user.passwordResetExpires < new Date()) {
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });
    }

    const isMatch = await bcrypt.compare(otp, user.passwordResetOtp);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect OTP" });
    }

    res.json({ message: "OTP verified" });
  } catch (error) {
    console.error("verifyOtp error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

// ── Forgot password: Step 3 — reset password ──────────────────────────────
const resetPassword = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const { otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "Email, OTP and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const user = await User.findOne({ email });

    if (!user || !user.passwordResetOtp || !user.passwordResetExpires) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    if (user.passwordResetExpires < new Date()) {
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });
    }

    const isMatch = await bcrypt.compare(otp, user.passwordResetOtp);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect OTP" });
    }

    // Hash new password and clear OTP fields
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.passwordResetOtp = null;
    user.passwordResetExpires = null;
    await user.save();

    await createNotification({
      io: null,
      recipientId: user._id,
      actorId: user._id,
      type: "account",
      title: "Password reset",
      body: "Your SafeChat password was reset successfully.",
      metadata: { action: "password_reset" },
    });

    res.json({ message: "Password reset successfully. You can now log in." });
  } catch (error) {
    console.error("resetPassword error:", error.message);
    res.status(500).json({ message: error.message });
  }
};
// ──────────────────────────────────────────────────────────────────────────

module.exports = { registerUser, loginUser, sendOtp, verifyOtp, resetPassword };
