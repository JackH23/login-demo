import { Schema, model, models } from 'mongoose';

const PostSchema = new Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    image: { type: String },
    author: { type: String, required: true },
    likes: { type: Number, default: 0 },
    dislikes: { type: Number, default: 0 },
    likedBy: { type: [String], default: [] },
    dislikedBy: { type: [String], default: [] },
  },
  { timestamps: true }
);

export default models.Post || model('Post', PostSchema);
