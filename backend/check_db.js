require('dotenv').config();
const mongoose = require('mongoose');

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;
  const users = await db.collection('users').find({}).toArray();
  console.log("USERS IN DB:");
  users.forEach(u => {
    console.log(`Email: ${u.email}, Name: ${u.name}, Username: ${u.username}, Bio: ${u.bio}`);
  });
  process.exit(0);
}
check();
