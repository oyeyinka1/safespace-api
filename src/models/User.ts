import mongoose, { Schema, Model } from 'mongoose';
import { IUser } from '../types';

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    phone: {
      type: String,
      required: [true, 'Phone is required'],
      trim: true,
      match: [/^[\d\s\+\-\(\)]+$/, 'Please provide a valid phone number'],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
      sparse: true, // Allows multiple null values but enforces uniqueness for non-null values
    },
  },
  {
    timestamps: true,
  }
);

// Create compound index for phone lookups
userSchema.index({ phone: 1 });
userSchema.index({ email: 1 }, { sparse: true });

const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);

export default User;