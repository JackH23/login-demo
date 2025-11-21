import { Schema, model, models } from 'mongoose';

const EmojiSchema = new Schema(
  {
    shortcode: { type: String, required: true, unique: true },
    unicode: { type: String, required: true },
    category: { type: String, default: 'general' },
    sortOrder: { type: Number, default: 0 },
    hasSkinTones: { type: Boolean, default: false },
  },
  { versionKey: false }
);

EmojiSchema.index({ category: 1, sortOrder: 1 });

export default models.Emoji || model('Emoji', EmojiSchema);
