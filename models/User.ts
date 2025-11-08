// Helper utilities from Mongoose for creating a model
import { Schema, model, models } from 'mongoose';

// Schema describing the shape of a user document
const UserSchema = new Schema({
  // Unique username used for login
  username: { type: String, required: true, unique: true },
  // Primary email address used for authentication
  email: { type: String, required: true, unique: true },
  // Hashed password value
  password: { type: String, required: true },
  // Position or title of the user
  position: { type: String },
  // Numeric age of the user
  age: { type: Number },
  // Base64 encoded image string
  image: { type: String },
  // List of usernames that this user has added as friends
  friends: { type: [String], default: [] },
  // Indicates whether the user is currently online
  online: { type: Boolean, default: false },
});

UserSchema.index({ username: 1 });
UserSchema.index({ email: 1 });
UserSchema.index({ online: 1, username: 1 });

// Reuse the model if it has already been compiled
export default models.User || model('User', UserSchema);
