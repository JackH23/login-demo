// Helper utilities from Mongoose for creating a model
import { Schema, model, models } from 'mongoose';

// Schema describing the shape of a user document
const UserSchema = new Schema({
  // Unique username used for login
  username: { type: String, required: true, unique: true },
  // Hashed password value
  password: { type: String, required: true },
});

// Reuse the model if it has already been compiled
export default models.User || model('User', UserSchema);
