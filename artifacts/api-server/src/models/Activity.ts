import mongoose, { Document, Schema } from "mongoose";

export type ActivityType =
  | "task_created"
  | "task_completed"
  | "task_assigned"
  | "project_created"
  | "status_changed";

export interface IActivity extends Document {
  _id: mongoose.Types.ObjectId;
  type: ActivityType;
  message: string;
  userId: mongoose.Types.ObjectId;
  userName: string;
  entityId: string;
  entityName: string;
  createdAt: Date;
}

const activitySchema = new Schema<IActivity>(
  {
    type: {
      type: String,
      enum: ["task_created", "task_completed", "task_assigned", "project_created", "status_changed"],
      required: true,
    },
    message: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    userName: { type: String, required: true },
    entityId: { type: String, required: true },
    entityName: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Activity = mongoose.model<IActivity>("Activity", activitySchema);
