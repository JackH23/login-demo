import { Schema, model, models } from 'mongoose';

const MessageSchema = new Schema({
  from: { type: String, required: true },
  to: { type: String, required: true },
  type: { type: String, enum: ['text', 'image', 'file'], required: true },
  content: { type: String, required: true },
  fileName: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export default models.Message || model('Message', MessageSchema);

