import express from "express";
import { validateRequest } from "zod-express-middleware";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
} from "../controllers/notification.js";
import authMiddleware from "../middleware/auth-middleware.js";
import { z } from "zod";

const router = express.Router();

// Get notifications for current user
router.get("/", authMiddleware,
  validateRequest({
    query: z.object({
      page: z.string().optional(),
      limit: z.string().optional(),
      unreadOnly: z.string().optional(),
    })
  }),
  getNotifications
);

// Get unread count
router.get("/unread-count", authMiddleware, getUnreadCount);

// Mark notification as read
router.put("/:notificationId/read", authMiddleware,
  validateRequest({
    params: z.object({
      notificationId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid notification ID format")
    })
  }),
  markAsRead
);

// Mark all notifications as read
router.put("/mark-all-read", authMiddleware, markAllAsRead);

// Delete notification
router.delete("/:notificationId", authMiddleware,
  validateRequest({
    params: z.object({
      notificationId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid notification ID format")
    })
  }),
  deleteNotification
);

export default router;
