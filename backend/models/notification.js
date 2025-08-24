import mongoose, { Schema } from "mongoose";

const notificationSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        "task_assigned",
        "task_completed",
        "task_status_changed",
        "task_commented",
        "task_priority_changed",
        "task_due_soon",
        "project_added",
        "project_status_changed",
        "project_member_added",
        "workspace_invited",
        "workspace_member_joined",
        "workspace_updated",
        "overdue_tasks",
        "weekly_summary",
        "achievement_unlocked",
      ],
    },
    title: {
      type: String,
      required: true,
      maxlength: 100,
    },
    message: {
      type: String,
      required: true,
      maxlength: 500,
    },
    resourceType: {
      type: String,
      required: true,
      enum: ["Task", "Project", "Workspace", "User"],
    },
    resourceId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    actionBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    workspace: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    metadata: {
      type: Object,
      default: {},
    },
  },
  { 
    timestamps: true,
    // Add index for efficient queries
    indexes: [
      { user: 1, createdAt: -1 },
      { user: 1, isRead: 1 },
      { workspace: 1, createdAt: -1 },
    ]
  }
);

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
