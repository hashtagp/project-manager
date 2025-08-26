import Workspace from "../models/workspace.js";
import Project from "../models/project.js";
import Task from "../models/task.js";
import User from "../models/user.js";
import { recordActivity } from "../libs/index.js";
import { createNotification } from "./notification.js";

const createProject = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { title, description, status, startDate, dueDate, tags, members } =
      req.body;

    const workspace = await Workspace.findById(workspaceId);

    if (!workspace) {
      return res.status(404).json({
        message: "Workspace not found",
      });
    }

    const isMember = workspace.members.some(
      (member) => member.user.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({
        message: "You are not a member of this workspace",
      });
    }

    const tagArray = tags ? tags.split(",") : [];

    const newProject = await Project.create({
      title,
      description,
      status,
      startDate,
      dueDate,
      tags: tagArray,
      workspace: workspaceId,
      members,
      createdBy: req.user._id,
    });

    workspace.projects.push(newProject._id);
    await workspace.save();

    // Record activity
    await recordActivity(
      req.user._id,
      "created_project",
      "Project",
      newProject._id,
      {
        description: `Created ${title} project`,
      }
    );

    // Notify members added to the project (exclude the creator)
    if (members && members.length > 0) {
      const memberUserIds = members
        .map(member => member.user)
        .filter(userId => userId.toString() !== req.user._id.toString());

      if (memberUserIds.length > 0) {
        const creator = await User.findById(req.user._id);
        
        await createNotification({
          users: memberUserIds,
          type: "project_member_added",
          title: "Added to New Project",
          message: `You have been added to the ${title} project by ${creator.name}`,
          resourceType: "Project",
          resourceId: newProject._id,
          actionBy: req.user._id,
          workspace: workspaceId,
          metadata: {
            projectTitle: title,
            actionByName: creator.name
          }
        });
      }
    }

    return res.status(201).json(newProject);
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const getProjectDetails = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    const isMember = project.members.some(
      (member) => member.user.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({
        message: "You are not a member of this project",
      });
    }

    res.status(200).json(project);
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const getProjectTasks = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { includeArchived } = req.query; // Get query parameter
    
    const project = await Project.findById(projectId).populate("members.user");

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    const isMember = project.members.some(
      (member) => member.user._id.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({
        message: "You are not a member of this project",
      });
    }

    // Build query filter - include archived tasks if requested
    const taskFilter = { project: projectId };
    if (includeArchived !== "true") {
      taskFilter.isArchived = false;
    }

    const tasks = await Task.find(taskFilter)
      .populate("assignees", "name profilePicture")
      .sort({ createdAt: -1 });

    res.status(200).json({
      project,
      tasks,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const addMemberToProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { userId, role } = req.body;

    const project = await Project.findById(projectId).populate("workspace");

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    // Check if current user has permission (manager role in project or admin/owner in workspace)
    const currentUserInProject = project.members.find(
      member => member.user.toString() === req.user._id.toString()
    );

    const workspace = await Workspace.findById(project.workspace);
    const currentUserInWorkspace = workspace.members.find(
      member => member.user.toString() === req.user._id.toString()
    );

    const hasProjectPermission = currentUserInProject && currentUserInProject.role === "manager";
    const hasWorkspacePermission = currentUserInWorkspace && ["owner", "admin"].includes(currentUserInWorkspace.role);

    if (!hasProjectPermission && !hasWorkspacePermission) {
      return res.status(403).json({
        message: "You don't have permission to add members to this project",
      });
    }

    // Check if user to be added is a workspace member
    const userToAdd = workspace.members.find(
      member => member.user.toString() === userId
    );

    if (!userToAdd) {
      return res.status(400).json({
        message: "User must be a workspace member first",
      });
    }

    // Check if user is already a project member
    const isAlreadyMember = project.members.some(
      member => member.user.toString() === userId
    );

    if (isAlreadyMember) {
      return res.status(400).json({
        message: "User is already a member of this project",
      });
    }

    // Add user to project
    project.members.push({
      user: userId,
      role: role || "contributor",
    });

    await project.save();

    // Record activity
    await recordActivity(
      req.user._id,
      "added_member_to_project",
      "Project",
      projectId,
      {
        description: `Added member to ${project.title} project`,
      }
    );

    // Notify the new member about being added to the project
    const addedUser = await User.findById(userId);
    const actionUser = await User.findById(req.user._id);
    
    await createNotification({
      users: [userId],
      type: "project_member_added",
      title: "Added to Project",
      message: `You have been added to the ${project.title} project by ${actionUser.name} with ${role || "contributor"} role`,
      resourceType: "Project",
      resourceId: projectId,
      actionBy: req.user._id,
      workspace: project.workspace._id,
      metadata: {
        projectTitle: project.title,
        actionByName: actionUser.name,
        role: role || "contributor",
        memberName: addedUser.name
      }
    });

    res.status(200).json({
      message: "Member added to project successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const removeMemberFromProject = async (req, res) => {
  try {
    const { projectId, memberId } = req.params;

    const project = await Project.findById(projectId).populate("workspace");

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    // Check if current user has permission (manager role in project or admin/owner in workspace)
    const currentUserInProject = project.members.find(
      member => member.user.toString() === req.user._id.toString()
    );

    const workspace = await Workspace.findById(project.workspace);
    const currentUserInWorkspace = workspace.members.find(
      member => member.user.toString() === req.user._id.toString()
    );

    const hasProjectPermission = currentUserInProject && currentUserInProject.role === "manager";
    const hasWorkspacePermission = currentUserInWorkspace && ["owner", "admin"].includes(currentUserInWorkspace.role);

    if (!hasProjectPermission && !hasWorkspacePermission) {
      return res.status(403).json({
        message: "You don't have permission to remove members from this project",
      });
    }

    // Find member to remove
    const memberToRemove = project.members.find(
      member => member.user.toString() === memberId
    );

    if (!memberToRemove) {
      return res.status(404).json({
        message: "Member not found in this project",
      });
    }

    // Remove member from project
    project.members = project.members.filter(
      member => member.user.toString() !== memberId
    );

    await project.save();

    // Record activity
    await recordActivity(
      req.user._id,
      "removed_member_from_project",
      "Project",
      projectId,
      {
        description: `Removed member from ${project.title} project`,
      }
    );

    // Notify the removed member
    const removedUser = await User.findById(memberId);
    const actionUser = await User.findById(req.user._id);
    
    await createNotification({
      users: [memberId],
      type: "project_status_changed",
      title: "Removed from Project",
      message: `You have been removed from the ${project.title} project by ${actionUser.name}`,
      resourceType: "Project",
      resourceId: projectId,
      actionBy: req.user._id,
      workspace: project.workspace._id,
      metadata: {
        projectTitle: project.title,
        actionByName: actionUser.name,
        removedUserName: removedUser.name
      }
    });

    res.status(200).json({
      message: "Member removed from project successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const updateProjectMemberRole = async (req, res) => {
  try {
    const { projectId, memberId } = req.params;
    const { role } = req.body;

    const project = await Project.findById(projectId).populate("workspace");

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    // Check if current user has permission (manager role in project or admin/owner in workspace)
    const currentUserInProject = project.members.find(
      member => member.user.toString() === req.user._id.toString()
    );

    const workspace = await Workspace.findById(project.workspace);
    const currentUserInWorkspace = workspace.members.find(
      member => member.user.toString() === req.user._id.toString()
    );

    const hasProjectPermission = currentUserInProject && currentUserInProject.role === "manager";
    const hasWorkspacePermission = currentUserInWorkspace && ["owner", "admin"].includes(currentUserInWorkspace.role);

    if (!hasProjectPermission && !hasWorkspacePermission) {
      return res.status(403).json({
        message: "You don't have permission to update member roles in this project",
      });
    }

    // Find member to update
    const memberToUpdate = project.members.find(
      member => member.user.toString() === memberId
    );

    if (!memberToUpdate) {
      return res.status(404).json({
        message: "Member not found in this project",
      });
    }

    // Update role
    const oldRole = memberToUpdate.role;
    memberToUpdate.role = role;
    await project.save();

    // Record activity
    await recordActivity(
      req.user._id,
      "updated_project_member_role",
      "Project", 
      projectId,
      {
        description: `Updated member role in ${project.title} project`,
      }
    );

    // Notify the member about role change
    const targetUser = await User.findById(memberId);
    const actionUser = await User.findById(req.user._id);
    
    await createNotification({
      users: [memberId],
      type: "project_status_changed",
      title: "Your Project Role Updated",
      message: `Your role in ${project.title} project has been updated from ${oldRole} to ${role} by ${actionUser.name}`,
      resourceType: "Project",
      resourceId: projectId,
      actionBy: req.user._id,
      workspace: project.workspace._id,
      metadata: {
        projectTitle: project.title,
        oldRole,
        newRole: role,
        actionByName: actionUser.name
      }
    });

    res.status(200).json({
      message: "Member role updated successfully",
      member: memberToUpdate,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const updateProjectMembers = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { members } = req.body;

    const project = await Project.findById(projectId).populate("workspace");

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    // Check if current user has permission (manager role in project or admin/owner in workspace)
    const currentUserInProject = project.members.find(
      member => member.user.toString() === req.user._id.toString()
    );

    const workspace = await Workspace.findById(project.workspace);
    const currentUserInWorkspace = workspace.members.find(
      member => member.user.toString() === req.user._id.toString()
    );

    const hasProjectPermission = currentUserInProject && currentUserInProject.role === "manager";
    const hasWorkspacePermission = currentUserInWorkspace && ["owner", "admin"].includes(currentUserInWorkspace.role);

    if (!hasProjectPermission && !hasWorkspacePermission) {
      return res.status(403).json({
        message: "You don't have permission to update members in this project",
      });
    }

    // Validate that all users are workspace members
    for (const member of members) {
      const isWorkspaceMember = workspace.members.some(
        wMember => wMember.user.toString() === member.user
      );

      if (!isWorkspaceMember) {
        return res.status(400).json({
          message: `User ${member.user} is not a member of the workspace`,
        });
      }
    }

    // Update project members
    project.members = members;
    await project.save();

    res.status(200).json({
      message: "Project members updated successfully",
      members: project.members,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const updateProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { title, description, status, startDate, dueDate } = req.body;

    const project = await Project.findById(projectId).populate("workspace");

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    // Check if current user has permission (manager role in project or admin/owner in workspace)
    const currentUserInProject = project.members.find(
      member => member.user.toString() === req.user._id.toString()
    );

    const workspace = await Workspace.findById(project.workspace);
    const currentUserInWorkspace = workspace.members.find(
      member => member.user.toString() === req.user._id.toString()
    );

    const hasProjectPermission = currentUserInProject && currentUserInProject.role === "manager";
    const hasWorkspacePermission = currentUserInWorkspace && ["owner", "admin"].includes(currentUserInWorkspace.role);

    if (!hasProjectPermission && !hasWorkspacePermission) {
      return res.status(403).json({
        message: "You don't have permission to update this project",
      });
    }

    // Store old values for notifications
    const oldStatus = project.status;
    const oldTitle = project.title;

    // Update project fields
    if (title !== undefined) project.title = title;
    if (description !== undefined) project.description = description;
    if (status !== undefined) project.status = status;
    if (startDate !== undefined) project.startDate = startDate;
    if (dueDate !== undefined) project.dueDate = dueDate;

    await project.save();

    // Record activity
    await recordActivity(
      req.user._id,
      "updated_project",
      "Project",
      projectId,
      {
        description: `Updated ${project.title} project`,
      }
    );

    // Send notification if status changed
    if (status && status !== oldStatus) {
      const projectMembers = project.members
        .map(member => member.user)
        .filter(userId => userId.toString() !== req.user._id.toString());

      if (projectMembers.length > 0) {
        const actionUser = await User.findById(req.user._id);
        
        await createNotification({
          users: projectMembers,
          type: "project_status_changed",
          title: "Project Status Updated",
          message: `${project.title} project status has been changed from ${oldStatus} to ${status} by ${actionUser.name}`,
          resourceType: "Project",
          resourceId: projectId,
          actionBy: req.user._id,
          workspace: project.workspace._id,
          metadata: {
            projectTitle: project.title,
            oldStatus,
            newStatus: status,
            actionByName: actionUser.name
          }
        });
      }
    }

    res.status(200).json({
      message: "Project updated successfully",
      project,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

export { 
  createProject, 
  getProjectDetails, 
  getProjectTasks, 
  addMemberToProject,
  removeMemberFromProject,
  updateProjectMemberRole,
  updateProjectMembers,
  updateProject
};
