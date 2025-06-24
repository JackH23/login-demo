import { Schema, model, models } from 'mongoose';

const PostSchema = new Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    image: { type: String },
    author: { type: String, required: true },
  },
  { timestamps: true }
);

export default models.Post || model('Post', PostSchema);
