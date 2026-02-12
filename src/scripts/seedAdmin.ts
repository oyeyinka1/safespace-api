import mongoose from 'mongoose';
import Admin from '../models/Admin';
import logger from '../utils/logger';
import { env } from "../config/env";

const email = "hi@mail.io";
const password = "helloworld";
const name = "ski101"

const seedAdmin = async (): Promise<void> => {
  try {
    // Connect to database
    const mongoURI = env.MONGODB_URI;
    await mongoose.connect(mongoURI);

    logger.info('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({
      email,
    });

    if (existingAdmin) {
      logger.warn('Admin already exists. Skipping seed.');
      process.exit(0);
    }

    // Create admin
    const admin = await Admin.create({
      email,
      password,
      name,
      isActive: true,
    });

    logger.info(`Admin created successfully:`);
    logger.info(`Email: ${admin.email}`);
    logger.info(`Name: ${admin.name}`);
    logger.info(`Password: helloworld`);

    process.exit(0);
  } catch (error: any) {
    logger.error(`Error seeding admin: ${error.message}`);
    process.exit(1);
  }
};

seedAdmin();