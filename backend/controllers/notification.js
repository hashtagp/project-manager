import Notification from "../models/notification.js";
import User from "../models/user.js";
import Workspace from "../models/workspace.js";
import { recordActivity } from "../libs/index.js";

// Get notifications for current user
const getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 10, unreadOnly = false } = req.query;
    const userId = req.user._id;

    const filter = { user: userId };
    if (unreadOnly === 'true') {
      filter.isRead = false;
    }

    const notifications = await Notification.find(filter)
      .populate("actionBy", "name profilePicture")
      .populate("workspace", "name color")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({
      user: userId,
      isRead: false
    });

    res.status(200).json({
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      unreadCount
    });
  } catch (error) {
    console.log("❌ [NOTIFICATION] Error fetching notifications:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

// Mark notification as read
const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, user: userId },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        message: "Notification not found",
      });
    }

    res.status(200).json(notification);
  } catch (error) {
    console.log("❌ [NOTIFICATION] Error marking as read:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

// Mark all notifications as read
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user._id;

    await Notification.updateMany(
      { user: userId, isRead: false },
      { isRead: true }
    );

    res.status(200).json({
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.log("❌ [NOTIFICATION] Error marking all as read:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

// Delete notification
const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      user: userId,
    });

    if (!notification) {
      return res.status(404).json({
        message: "Notification not found",
      });
    }

    res.status(200).json({
      message: "Notification deleted successfully",
    });
  } catch (error) {
    console.log("❌ [NOTIFICATION] Error deleting notification:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

// Get unread count only
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id;

    const unreadCount = await Notification.countDocuments({
      user: userId,
      isRead: false
    });

    res.status(200).json({ unreadCount });
  } catch (error) {
    console.log("❌ [NOTIFICATION] Error getting unread count:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

// Utility function to create notifications
const createNotification = async ({
  users,
  type,
  title,
  message,
  resourceType,
  resourceId,
  actionBy,
  workspace,
  metadata = {}
}) => {
  try {
    console.log(`🔔 [NOTIFICATION] Creating notification: ${type} for ${users.length} users`);

    // Ensure users is an array
    const userIds = Array.isArray(users) ? users : [users];

    // Filter out the actionBy user to avoid self-notifications
    const filteredUsers = userIds.filter(userId => 
      userId.toString() !== actionBy.toString()
    );

    if (filteredUsers.length === 0) {
      console.log("🔔 [NOTIFICATION] No users to notify after filtering");
      return;
    }

    const notifications = filteredUsers.map(userId => ({
      user: userId,
      type,
      title,
      message,
      resourceType,
      resourceId,
      actionBy,
      workspace,
      metadata
    }));

    const createdNotifications = await Notification.insertMany(notifications);
    console.log(`✅ [NOTIFICATION] Created ${createdNotifications.length} notifications`);

    return createdNotifications;
  } catch (error) {
    console.error("💥 [NOTIFICATION] Error creating notification:", error);
  }
};

export {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
  createNotification,
};
