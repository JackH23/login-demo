const { Schema, model, models } = require('mongoose');

const PostSchema = new Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    image: { type: String },
    imageData: { type: Buffer },
    imageContentType: { type: String },
    author: { type: String, required: true },
    likes: { type: Number, default: 0 },
    dislikes: { type: Number, default: 0 },
    likedBy: { type: [String], default: [] },
    dislikedBy: { type: [String], default: [] },
  },
  { timestamps: true }
);

PostSchema.index({ author: 1, createdAt: -1 });
PostSchema.index({ createdAt: -1 });

module.exports = models.Post || model('Post', PostSchema);
