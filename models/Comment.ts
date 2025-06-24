import { Schema, model, models } from 'mongoose';

const ReplySchema = new Schema(
  {
    author: { type: String, required: true },
    text: { type: String, required: true },
  },
  { _id: false, timestamps: true }
);

const CommentSchema = new Schema(
  {
    postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
    author: { type: String, required: true },
    text: { type: String, required: true },
    likes: { type: Number, default: 0 },
    dislikes: { type: Number, default: 0 },
    replies: { type: [ReplySchema], default: [] },
  },
  { timestamps: true }
);

export default models.Comment || model('Comment', CommentSchema);

