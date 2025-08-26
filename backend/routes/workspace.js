import express from "express";
import { validateRequest } from "zod-express-middleware";
import {
  acceptGenerateInvite,
  acceptInviteByToken,
  createWorkspace,
  deleteWorkspace,
  getWorkspaceDetails,
  getWorkspaceProjects,
  getWorkspaces,
  getWorkspaceStats,
  inviteUserToWorkspace,
  updateWorkspace,
  updateMemberRole,
  removeMemberFromWorkspace,
} from "../controllers/workspace.js";
import {
  inviteMemberSchema,
  tokenSchema,
  workspaceSchema,
  updateMemberRoleSchema,
} from "../libs/validate-schema.js";
import authMiddleware from "../middleware/auth-middleware.js";
import { z } from "zod";

const router = express.Router();

router.post(
  "/",
  authMiddleware,
  validateRequest({ body: workspaceSchema }),
  createWorkspace
);

router.post(
  "/accept-invite-token",
  authMiddleware,
  validateRequest({ body: tokenSchema }),
  acceptInviteByToken
);

router.post(
  "/:workspaceId/invite-member",
  authMiddleware,
  validateRequest({
    params: z.object({ 
      workspaceId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid workspace ID format") 
    }),
    body: inviteMemberSchema,
  }),
  inviteUserToWorkspace
);

router.post(
  "/:workspaceId/accept-generate-invite",
  authMiddleware,
  validateRequest({ 
    params: z.object({ 
      workspaceId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid workspace ID format") 
    }) 
  }),
  acceptGenerateInvite
);

router.get("/", authMiddleware, getWorkspaces);

router.get("/:workspaceId", authMiddleware, 
  validateRequest({ 
    params: z.object({ 
      workspaceId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid workspace ID format") 
    }) 
  }), 
  getWorkspaceDetails
);
router.get("/:workspaceId/projects", authMiddleware, 
  validateRequest({ 
    params: z.object({ 
      workspaceId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid workspace ID format") 
    }) 
  }), 
  getWorkspaceProjects
);
router.get("/:workspaceId/stats", authMiddleware, 
  validateRequest({ 
    params: z.object({ 
      workspaceId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid workspace ID format") 
    }) 
  }), 
  getWorkspaceStats
);

router.put("/:workspaceId", authMiddleware,
  validateRequest({
    params: z.object({
      workspaceId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid workspace ID format")
    }),
    body: z.object({
      name: z.string().min(1).max(100).optional(),
      description: z.string().max(500).optional(),
      color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
    })
  }),
  updateWorkspace
);

router.delete("/:workspaceId", authMiddleware,
  validateRequest({
    params: z.object({
      workspaceId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid workspace ID format")
    })
  }),
  deleteWorkspace
);

// Member management routes
router.put("/:workspaceId/members/:memberId/role", authMiddleware,
  validateRequest({
    params: z.object({
      workspaceId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid workspace ID format"),
      memberId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid member ID format")
    }),
    body: updateMemberRoleSchema
  }),
  updateMemberRole
);

router.delete("/:workspaceId/members/:memberId", authMiddleware,
  validateRequest({
    params: z.object({
      workspaceId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid workspace ID format"),
      memberId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid member ID format")
    })
  }),
  removeMemberFromWorkspace
);

export default router;
