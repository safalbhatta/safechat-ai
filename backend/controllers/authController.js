const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

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

    res.status(201).json({
      _id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      bio: user.bio,
      profilePic: user.profilePic,
      privacy: user.privacy,
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

    const io = req.app.get("io");
    if (io) {
      io.to(user._id.toString()).emit("sessionCreated", {
        message: "New session started"
      });
    }

    res.json({
      _id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      bio: user.bio,
      profilePic: user.profilePic,
      privacy: user.privacy,
      token,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { registerUser, loginUser };
