const { Schema, model, models } = require('mongoose');

const UserSchema = new Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  image: { type: String },
  friends: { type: [String], default: [] },
  online: { type: Boolean, default: false },
});

UserSchema.index({ online: 1, username: 1 });

module.exports = models.User || model('User', UserSchema);
