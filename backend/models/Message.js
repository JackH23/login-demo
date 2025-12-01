const { Schema, model, models } = require('mongoose');

const MessageSchema = new Schema({
  from: { type: String, required: true },
  to: { type: String, required: true },
  type: { type: String, enum: ['text', 'image', 'file'], required: true },
  content: { type: String, required: true },
  fileName: { type: String },
  createdAt: { type: Date, default: Date.now },
});

MessageSchema.index({ from: 1, to: 1, createdAt: -1 });

module.exports = models.Message || model('Message', MessageSchema);
