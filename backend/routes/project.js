import express from "express";
import authMiddleware from "../middleware/auth-middleware.js";
import { validateRequest } from "zod-express-middleware";
import { 
  projectSchema, 
  addProjectMemberSchema,
  updateProjectMemberRoleSchema,
  updateProjectMembersSchema,
  updateProjectSchema
} from "../libs/validate-schema.js";
import { z } from "zod";
import {
  createProject,
  getProjectDetails,
  getProjectTasks,
  addMemberToProject,
  removeMemberFromProject,
  updateProjectMemberRole,
  updateProjectMembers,
  updateProject,
} from "../controllers/project.js";

const router = express.Router();

router.post(
  "/:workspaceId/create-project",
  authMiddleware,
  validateRequest({
    params: z.object({
      workspaceId: z.string(),
    }),
    body: projectSchema,
  }),
  createProject
);

router.get(
  "/:projectId",
  authMiddleware,
  validateRequest({
    params: z.object({ projectId: z.string() }),
  }),
  getProjectDetails
);

router.get(
  "/:projectId/tasks",
  authMiddleware,
  validateRequest({ params: z.object({ projectId: z.string() }) }),
  getProjectTasks
);

// Project update route
router.put(
  "/:projectId",
  authMiddleware,
  validateRequest({
    params: z.object({ 
      projectId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid project ID format") 
    }),
    body: updateProjectSchema
  }),
  updateProject
);

// Project member management routes
router.post(
  "/:projectId/members",
  authMiddleware,
  validateRequest({
    params: z.object({ 
      projectId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid project ID format") 
    }),
    body: addProjectMemberSchema
  }),
  addMemberToProject
);

router.delete(
  "/:projectId/members/:memberId",
  authMiddleware,
  validateRequest({
    params: z.object({ 
      projectId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid project ID format"),
      memberId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid member ID format")
    })
  }),
  removeMemberFromProject
);

router.put(
  "/:projectId/members/:memberId/role",
  authMiddleware,
  validateRequest({
    params: z.object({ 
      projectId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid project ID format"),
      memberId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid member ID format")
    }),
    body: updateProjectMemberRoleSchema
  }),
  updateProjectMemberRole
);

router.put(
  "/:projectId/members",
  authMiddleware,
  validateRequest({
    params: z.object({ 
      projectId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid project ID format") 
    }),
    body: updateProjectMembersSchema
  }),
  updateProjectMembers
);

export default router;
