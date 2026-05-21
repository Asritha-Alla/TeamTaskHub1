import mongoose, { Document, Schema } from "mongoose";

export type ProjectRole = "admin" | "member";

export interface IProjectMember {
  userId: mongoose.Types.ObjectId;
  role: ProjectRole;
}

export interface IProject extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  color: string;
  ownerId: mongoose.Types.ObjectId;
  members: IProjectMember[];
  createdAt: Date;
  updatedAt: Date;
}

const PROJECT_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
  "#f97316", "#eab308", "#22c55e", "#3b82f6",
];

const projectMemberSchema = new Schema<IProjectMember>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["admin", "member"], required: true },
  },
  { _id: false }
);

const projectSchema = new Schema<IProject>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    color: {
      type: String,
      default: () => PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)],
    },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    members: [projectMemberSchema],
  },
  { timestamps: true }
);

export const Project = mongoose.model<IProject>("Project", projectSchema);
