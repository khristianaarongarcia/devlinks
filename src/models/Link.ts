import mongoose, { Schema, Document, Model } from 'mongoose'

export interface ILink extends Document {
  userId: mongoose.Types.ObjectId
  title: string
  url: string
  icon: string
  clicks: number
  order: number
  createdAt: Date
  updatedAt: Date
}

const LinkSchema = new Schema<ILink>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    url: {
      type: String,
      required: [true, 'URL is required'],
      trim: true,
    },
    icon: {
      type: String,
      default: '🌐',
    },
    clicks: {
      type: Number,
      default: 0,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
)

// Prevent recompilation during development
const Link: Model<ILink> = mongoose.models.Link || mongoose.model<ILink>('Link', LinkSchema)

export default Link
