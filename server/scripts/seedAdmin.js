import mongoose from "mongoose";
import "dotenv/config";
import config from "../src/config/env.js";
import User from "../src/models/user.model.js";

const seedAdmin = async () => {
  const adminUserName = process.env.ADMIN_USERNAME || "superadmin";
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@example.com")
    .toLowerCase()
    .trim();
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin123456!";

  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(config.mongoUri);

    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log(`ℹ️ Admin user already exists with email: ${adminEmail}`);
      if (existingAdmin.role !== "admin") {
        existingAdmin.role = "admin";
        await existingAdmin.save();
        console.log(`🔄 Upgraded existing user '${existingAdmin.userName}' to admin role.`);
      }
      process.exit(0);
    }

    const newAdmin = await User.create({
      userName: adminUserName,
      email: adminEmail,
      password: adminPassword,
      role: "admin",
    });

    console.log("==========================================");
    console.log("✅ Initial Admin Account Created!");
    console.log(`   Username: ${newAdmin.userName}`);
    console.log(`   Email:    ${newAdmin.email}`);
    console.log(`   Role:     ${newAdmin.role}`);
    console.log("==========================================");
    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to seed admin user:", error.message);
    process.exit(1);
  }
};

seedAdmin();
