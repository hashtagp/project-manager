import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(3, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const verifyEmailSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters long"),
  confirmPassword: z.string().min(1, "Confirm password is required"),
});

const emailSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const inviteMemberSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["admin", "member", "viewer"]),
});

const tokenSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

const workspaceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  color: z.string().min(1, "Color is required"),
});

const projectSchema = z.object({
  title: z.string().min(3, "Title is required"),
  description: z.string().optional(),
  status: z.enum([
    "Planning",
    "In Progress",
    "On Hold",
    "Completed",
    "Cancelled",
  ]),
  startDate: z.string(),
  dueDate: z.string().optional(),
  tags: z.string().optional(),
  members: z
    .array(
      z.object({
        user: z.string(),
        role: z.enum(["manager", "contributor", "viewer"]),
      })
    )
    .optional(),
});

const taskSchema = z.object({
  title: z.string().min(1, "Task title is required"),
  description: z.string().optional(),
  status: z.enum(["To Do", "In Progress", "Done"]),
  priority: z.enum(["Low", "Medium", "High"]),
  dueDate: z.string().min(1, "Due date is required"),
  assignees: z.array(z.string()).min(1, "At least one assignee is required"),
});

const updateMemberRoleSchema = z.object({
  role: z.enum(["owner", "admin", "member", "viewer"]),
});

const projectMemberSchema = z.object({
  user: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid user ID"),
  role: z.enum(["manager", "contributor", "viewer"]),
});

const updateProjectMembersSchema = z.object({
  members: z.array(projectMemberSchema),
});

const addProjectMemberSchema = z.object({
  userId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid user ID"),
  role: z.enum(["manager", "contributor", "viewer"]).default("contributor"),
});

const updateProjectMemberRoleSchema = z.object({
  role: z.enum(["manager", "contributor", "viewer"]),
});

const updateProjectSchema = z.object({
  title: z.string().min(3, "Title is required").optional(),
  description: z.string().optional(),
  status: z.enum([
    "Planning",
    "In Progress", 
    "On Hold",
    "Completed",
    "Cancelled",
  ]).optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
});

export {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resetPasswordSchema,
  emailSchema,
  workspaceSchema,
  projectSchema,
  taskSchema,
  inviteMemberSchema,
  tokenSchema,
  updateMemberRoleSchema,
  projectMemberSchema,
  updateProjectMembersSchema,
  addProjectMemberSchema,
  updateProjectMemberRoleSchema,
  updateProjectSchema,
};
