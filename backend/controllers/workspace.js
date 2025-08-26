import Workspace from "../models/workspace.js";
import Project from "../models/project.js";
import User from "../models/user.js";
import WorkspaceInvite from "../models/workspace-invite.js";
import jwt from "jsonwebtoken";
import { sendEmail } from "../libs/send-email.js";
import { recordActivity } from "../libs/index.js";
import { createNotification } from "./notification.js";

const createWorkspace = async (req, res) => {
  try {
    const { name, description, color } = req.body;

    const workspace = await Workspace.create({
      name,
      description,
      color,
      owner: req.user._id,
      members: [
        {
          user: req.user._id,
          role: "owner",
          joinedAt: new Date(),
        },
      ],
    });

    res.status(201).json(workspace);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

const getWorkspaces = async (req, res) => {
  try {
    const workspaces = await Workspace.find({
      "members.user": req.user._id,
    }).sort({ createdAt: -1 });

    res.status(200).json(workspaces);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

const getWorkspaceDetails = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const workspace = await Workspace.findById({
      _id: workspaceId,
    })
    .populate("members.user", "name email profilePicture")
    .populate("owner", "name email profilePicture");

    if (!workspace) {
      return res.status(404).json({
        message: "Workspace not found",
      });
    }

    res.status(200).json(workspace);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

const getWorkspaceProjects = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const workspace = await Workspace.findOne({
      _id: workspaceId,
      "members.user": req.user._id,
    }).populate("members.user", "name email profilePicture");

    if (!workspace) {
      return res.status(404).json({
        message: "Workspace not found",
      });
    }

    const projects = await Project.find({
      workspace: workspaceId,
      isArchived: false,
      members: { $elemMatch: { user: req.user._id } },
    })
      .populate("tasks", "status")
      .sort({ createdAt: -1 });

    res.status(200).json({ projects, workspace });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

const getWorkspaceStats = async (req, res) => {
  console.log("📊 [WORKSPACE] Getting workspace statistics");
  
  try {
    const { workspaceId } = req.params;
    console.log("🔍 [WORKSPACE] Workspace ID from params:", workspaceId);

    // Validate workspaceId
    if (!workspaceId || workspaceId === "null" || workspaceId === "undefined") {
      console.log("❌ [WORKSPACE] Invalid workspace ID provided:", workspaceId);
      return res.status(400).json({
        message: "Invalid workspace ID provided",
      });
    }

    // Check if workspaceId is a valid MongoDB ObjectId
    if (!/^[0-9a-fA-F]{24}$/.test(workspaceId)) {
      console.log("❌ [WORKSPACE] Invalid ObjectId format:", workspaceId);
      return res.status(400).json({
        message: "Invalid workspace ID format",
      });
    }

    console.log("🔍 [WORKSPACE] Finding workspace by ID:", workspaceId);
    const workspace = await Workspace.findById(workspaceId);

    if (!workspace) {
      console.log("❌ [WORKSPACE] Workspace not found:", workspaceId);
      return res.status(404).json({
        message: "Workspace not found",
      });
    }

    console.log("✅ [WORKSPACE] Workspace found:", { id: workspace._id, name: workspace.name });

    const isMember = workspace.members.some(
      (member) => member.user.toString() === req.user._id.toString()
    );

    if (!isMember) {
      console.log("❌ [WORKSPACE] User not a member of workspace:", { userId: req.user._id, workspaceId });
      return res.status(403).json({
        message: "You are not a member of this workspace",
      });
    }

    console.log("✅ [WORKSPACE] User is member, fetching statistics");
    const [totalProjects, projects] = await Promise.all([
      Project.countDocuments({ workspace: workspaceId }),
      Project.find({ workspace: workspaceId })
        .populate(
          "tasks",
          "title status dueDate project updatedAt isArchived priority"
        )
        .sort({ createdAt: -1 }),
    ]);

    console.log("📊 [WORKSPACE] Projects fetched:", { totalProjects, projectsWithTasks: projects.length });

    const totalTasks = projects.reduce((acc, project) => {
      return acc + project.tasks.length;
    }, 0);

    const totalProjectInProgress = projects.filter(
      (project) => project.status === "In Progress"
    ).length;
    // const totalProjectCompleted = projects.filter(
    //   (project) => project.status === "Completed"
    // ).length;

    const totalTaskCompleted = projects.reduce((acc, project) => {
      return (
        acc + project.tasks.filter((task) => task.status === "Done").length
      );
    }, 0);

    const totalTaskToDo = projects.reduce((acc, project) => {
      return (
        acc + project.tasks.filter((task) => task.status === "To Do").length
      );
    }, 0);

    const totalTaskInProgress = projects.reduce((acc, project) => {
      return (
        acc +
        project.tasks.filter((task) => task.status === "In Progress").length
      );
    }, 0);

    const tasks = projects.flatMap((project) => project.tasks);

    // get upcoming task in next 7 days

    const upcomingTasks = tasks.filter((task) => {
      const taskDate = new Date(task.dueDate);
      const today = new Date();
      return (
        taskDate > today &&
        taskDate <= new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
      );
    });

    const taskTrendsData = [
      { name: "Sun", completed: 0, inProgress: 0, toDo: 0 },
      { name: "Mon", completed: 0, inProgress: 0, toDo: 0 },
      { name: "Tue", completed: 0, inProgress: 0, toDo: 0 },
      { name: "Wed", completed: 0, inProgress: 0, toDo: 0 },
      { name: "Thu", completed: 0, inProgress: 0, toDo: 0 },
      { name: "Fri", completed: 0, inProgress: 0, toDo: 0 },
      { name: "Sat", completed: 0, inProgress: 0, toDo: 0 },
    ];

    // get last 7 days tasks date
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date;
    }).reverse();

    // populate

    for (const project of projects) {
      for (const task in project.tasks) {
        const taskDate = new Date(task.updatedAt);

        const dayInDate = last7Days.findIndex(
          (date) =>
            date.getDate() === taskDate.getDate() &&
            date.getMonth() === taskDate.getMonth() &&
            date.getFullYear() === taskDate.getFullYear()
        );

        if (dayInDate !== -1) {
          const dayName = last7Days[dayInDate].toLocaleDateString("en-US", {
            weekday: "short",
          });

          const dayData = taskTrendsData.find((day) => day.name === dayName);

          if (dayData) {
            switch (task.status) {
              case "Done":
                dayData.completed++;
                break;
              case "In Progress":
                dayData.inProgress++;
                break;
              case "To Do":
                dayData.toDo++;
                break;
            }
          }
        }
      }
    }

    // get project status distribution
    const projectStatusData = [
      { name: "Completed", value: 0, color: "#10b981" },
      { name: "In Progress", value: 0, color: "#3b82f6" },
      { name: "Planning", value: 0, color: "#f59e0b" },
    ];

    for (const project of projects) {
      switch (project.status) {
        case "Completed":
          projectStatusData[0].value++;
          break;
        case "In Progress":
          projectStatusData[1].value++;
          break;
        case "Planning":
          projectStatusData[2].value++;
          break;
      }
    }

    // Task priority distribution
    const taskPriorityData = [
      { name: "High", value: 0, color: "#ef4444" },
      { name: "Medium", value: 0, color: "#f59e0b" },
      { name: "Low", value: 0, color: "#6b7280" },
    ];

    for (const task of tasks) {
      switch (task.priority) {
        case "High":
          taskPriorityData[0].value++;
          break;
        case "Medium":
          taskPriorityData[1].value++;
          break;
        case "Low":
          taskPriorityData[2].value++;
          break;
      }
    }

    const workspaceProductivityData = [];

    for (const project of projects) {
      const projectTask = tasks.filter(
        (task) => task.project.toString() === project._id.toString()
      );

      const completedTask = projectTask.filter(
        (task) => task.status === "Done" && task.isArchived === false
      );

      workspaceProductivityData.push({
        name: project.title,
        completed: completedTask.length,
        total: projectTask.length,
      });
    }

    const stats = {
      totalProjects,
      totalTasks,
      totalProjectInProgress,
      totalTaskCompleted,
      totalTaskToDo,
      totalTaskInProgress,
    };

    console.log("✅ [WORKSPACE] Statistics calculated successfully:", stats);

    res.status(200).json({
      stats,
      taskTrendsData,
      projectStatusData,
      taskPriorityData,
      workspaceProductivityData,
      upcomingTasks,
      recentProjects: projects.slice(0, 5),
    });
  } catch (error) {
    console.error("💥 [WORKSPACE] Error getting workspace stats:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

const inviteUserToWorkspace = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { email, role } = req.body;

    const workspace = await Workspace.findById(workspaceId);

    if (!workspace) {
      return res.status(404).json({
        message: "Workspace not found",
      });
    }

    const userMemberInfo = workspace.members.find(
      (member) => member.user.toString() === req.user._id.toString()
    );

    if (!userMemberInfo || !["admin", "owner"].includes(userMemberInfo.role)) {
      return res.status(403).json({
        message: "You are not authorized to invite members to this workspace",
      });
    }

    const existingUser = await User.findOne({ email });

    if (!existingUser) {
      return res.status(400).json({
        message: "User not found",
      });
    }

    const isMember = workspace.members.some(
      (member) => member.user.toString() === existingUser._id.toString()
    );

    if (isMember) {
      return res.status(400).json({
        message: "User already a member of this workspace",
      });
    }

    const isInvited = await WorkspaceInvite.findOne({
      user: existingUser._id,
      workspaceId: workspaceId,
    });

    if (isInvited && isInvited.expiresAt > new Date()) {
      return res.status(400).json({
        message: "User already invited to this workspace",
      });
    }

    if (isInvited && isInvited.expiresAt < new Date()) {
      await WorkspaceInvite.deleteOne({ _id: isInvited._id });
    }

    const inviteToken = jwt.sign(
      {
        user: existingUser._id,
        workspaceId: workspaceId,
        role: role || "member",
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    await WorkspaceInvite.create({
      user: existingUser._id,
      workspaceId: workspaceId,
      token: inviteToken,
      role: role || "member",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const invitationLink = `${process.env.FRONTEND_URL}/workspace-invite/${workspace._id}?tk=${inviteToken}`;

    const emailContent = `
      <p>You have been invited to join ${workspace.name} workspace</p>
      <p>Click here to join: <a href="${invitationLink}">${invitationLink}</a></p>
    `;

    await sendEmail(
      email,
      "You have been invited to join a workspace",
      emailContent
    );

    res.status(200).json({
      message: "Invitation sent successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

const acceptGenerateInvite = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const workspace = await Workspace.findById(workspaceId);

    if (!workspace) {
      return res.status(404).json({
        message: "Workspace not found",
      });
    }

    const isMember = workspace.members.some(
      (member) => member.user.toString() === req.user._id.toString()
    );

    if (isMember) {
      return res.status(400).json({
        message: "You are already a member of this workspace",
      });
    }

    workspace.members.push({
      user: req.user._id,
      role: "member",
      joinedAt: new Date(),
    });

    await workspace.save();

    // Add the new member to all projects in the workspace
    const projects = await Project.find({ workspace: workspaceId });
    
    const projectUpdates = projects.map(project => {
      // Check if user is not already a member of this project
      const isProjectMember = project.members.some(
        member => member.user.toString() === req.user._id.toString()
      );
      
      if (!isProjectMember) {
        project.members.push({
          user: req.user._id,
          role: "contributor" // Default role for project membership
        });
        return project.save();
      }
      return Promise.resolve();
    });

    await Promise.all([
      recordActivity(
        req.user._id,
        "joined_workspace",
        "Workspace",
        workspaceId,
        {
          description: `Joined ${workspace.name} workspace`,
        }
      ),
      ...projectUpdates
    ]);

    res.status(200).json({
      message: "Invitation accepted successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

const acceptInviteByToken = async (req, res) => {
  try {
    const { token } = req.body;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { user, workspaceId, role } = decoded;

    const workspace = await Workspace.findById(workspaceId);

    if (!workspace) {
      return res.status(404).json({
        message: "Workspace not found",
      });
    }

    const isMember = workspace.members.some(
      (member) => member.user.toString() === user.toString()
    );

    if (isMember) {
      return res.status(400).json({
        message: "User already a member of this workspace",
      });
    }

    const inviteInfo = await WorkspaceInvite.findOne({
      user: user,
      workspaceId: workspaceId,
    });

    if (!inviteInfo) {
      return res.status(404).json({
        message: "Invitation not found",
      });
    }

    if (inviteInfo.expiresAt < new Date()) {
      return res.status(400).json({
        message: "Invitation has expired",
      });
    }

    workspace.members.push({
      user: user,
      role: role || "member",
      joinedAt: new Date(),
    });

    await workspace.save();

    // Add the new member to all projects in the workspace
    const projects = await Project.find({ workspace: workspaceId });
    
    const projectUpdates = projects.map(project => {
      // Check if user is not already a member of this project
      const isProjectMember = project.members.some(
        member => member.user.toString() === user.toString()
      );
      
      if (!isProjectMember) {
        project.members.push({
          user: user,
          role: "contributor" // Default role for project membership
        });
        return project.save();
      }
      return Promise.resolve();
    });

    await Promise.all([
      WorkspaceInvite.deleteOne({ _id: inviteInfo._id }),
      recordActivity(user, "joined_workspace", "Workspace", workspaceId, {
        description: `Joined ${workspace.name} workspace`,
      }),
      ...projectUpdates
    ]);

    // Notify workspace admins and owner about new member
    const workspaceAdmins = workspace.members
      .filter(member => ["owner", "admin"].includes(member.role))
      .map(member => member.user);

    if (workspaceAdmins.length > 0) {
      const newUser = await User.findById(user);
      await createNotification({
        users: workspaceAdmins,
        type: "workspace_member_joined",
        title: "New Member Joined",
        message: `${newUser.name} has joined the ${workspace.name} workspace`,
        resourceType: "Workspace",
        resourceId: workspaceId,
        actionBy: user,
        workspace: workspaceId,
        metadata: {
          memberName: newUser.name,
          memberRole: role || "member",
          workspaceName: workspace.name
        }
      });
    }

    // Notify the new member about successful joining
    await createNotification({
      users: [user],
      type: "workspace_invited", 
      title: "Welcome to Workspace",
      message: `You have successfully joined the ${workspace.name} workspace`,
      resourceType: "Workspace",
      resourceId: workspaceId,
      actionBy: workspace.owner,
      workspace: workspaceId,
      metadata: {
        workspaceName: workspace.name,
        role: role || "member"
      }
    });

    res.status(200).json({
      message: "Invitation accepted successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

const updateWorkspace = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { name, description, color } = req.body;

    const workspace = await Workspace.findById(workspaceId);

    if (!workspace) {
      return res.status(404).json({
        message: "Workspace not found",
      });
    }

    // Check if user is the owner
    if (workspace.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Only the workspace owner can update workspace settings",
      });
    }

    // Update only provided fields
    if (name !== undefined) workspace.name = name;
    if (description !== undefined) workspace.description = description;
    if (color !== undefined) workspace.color = color;

    await workspace.save();

    await recordActivity(
      req.user._id,
      "updated_workspace",
      "Workspace",
      workspaceId,
      {
        description: `Updated ${workspace.name} workspace settings`,
      }
    );

    res.status(200).json(workspace);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

const deleteWorkspace = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const workspace = await Workspace.findById(workspaceId);

    if (!workspace) {
      return res.status(404).json({
        message: "Workspace not found",
      });
    }

    // Check if user is the owner
    if (workspace.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Only the workspace owner can delete the workspace",
      });
    }

    // Delete all projects in the workspace (you might want to add cascade delete logic)
    await Project.deleteMany({ workspace: workspaceId });

    // Delete all workspace invites
    await WorkspaceInvite.deleteMany({ workspaceId: workspaceId });

    // Delete the workspace
    await Workspace.findByIdAndDelete(workspaceId);

    await recordActivity(
      req.user._id,
      "deleted_workspace",
      "Workspace",
      workspaceId,
      {
        description: `Deleted ${workspace.name} workspace`,
      }
    );

    res.status(200).json({
      message: "Workspace deleted successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

const updateMemberRole = async (req, res) => {
  try {
    const { workspaceId, memberId } = req.params;
    const { role } = req.body;

    const workspace = await Workspace.findById(workspaceId);

    if (!workspace) {
      return res.status(404).json({
        message: "Workspace not found",
      });
    }

    // Check if the current user is owner or admin
    const currentUserMember = workspace.members.find(
      member => member.user.toString() === req.user._id.toString()
    );

    if (!currentUserMember || !["owner", "admin"].includes(currentUserMember.role)) {
      return res.status(403).json({
        message: "You don't have permission to modify member roles",
      });
    }

    // Find the member to update
    const memberToUpdate = workspace.members.find(
      member => member.user.toString() === memberId
    );

    if (!memberToUpdate) {
      return res.status(404).json({
        message: "Member not found in this workspace",
      });
    }

    // Don't allow changing the owner role
    if (memberToUpdate.role === "owner") {
      return res.status(400).json({
        message: "Cannot change the role of the workspace owner",
      });
    }

    // Only owner can assign admin role
    if (role === "admin" && currentUserMember.role !== "owner") {
      return res.status(403).json({
        message: "Only the workspace owner can assign admin roles",
      });
    }

    // Update the member's role
    const oldRole = memberToUpdate.role;
    memberToUpdate.role = role;
    await workspace.save();

    await recordActivity(
      req.user._id,
      "updated_member_role",
      "Workspace",
      workspaceId,
      {
        description: `Updated member role to ${role} in ${workspace.name} workspace`,
      }
    );

    // Notify the member about role change
    const targetUser = await User.findById(memberId);
    const actionUser = await User.findById(req.user._id);
    
    await createNotification({
      users: [memberId],
      type: "workspace_updated",
      title: "Your Role Updated",
      message: `Your role in ${workspace.name} workspace has been updated from ${oldRole} to ${role} by ${actionUser.name}`,
      resourceType: "Workspace",
      resourceId: workspaceId,
      actionBy: req.user._id,
      workspace: workspaceId,
      metadata: {
        oldRole,
        newRole: role,
        workspaceName: workspace.name,
        actionByName: actionUser.name
      }
    });

    res.status(200).json({
      message: "Member role updated successfully",
      member: memberToUpdate,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

const removeMemberFromWorkspace = async (req, res) => {
  try {
    const { workspaceId, memberId } = req.params;

    const workspace = await Workspace.findById(workspaceId);

    if (!workspace) {
      return res.status(404).json({
        message: "Workspace not found",
      });
    }

    // Check if the current user is owner or admin
    const currentUserMember = workspace.members.find(
      member => member.user.toString() === req.user._id.toString()
    );

    if (!currentUserMember || !["owner", "admin"].includes(currentUserMember.role)) {
      return res.status(403).json({
        message: "You don't have permission to remove members",
      });
    }

    // Find the member to remove
    const memberToRemove = workspace.members.find(
      member => member.user.toString() === memberId
    );

    if (!memberToRemove) {
      return res.status(404).json({
        message: "Member not found in this workspace",
      });
    }

    // Don't allow removing the owner
    if (memberToRemove.role === "owner") {
      return res.status(400).json({
        message: "Cannot remove the workspace owner",
      });
    }

    // Remove member from workspace
    workspace.members = workspace.members.filter(
      member => member.user.toString() !== memberId
    );

    // Remove member from all projects in the workspace
    const projects = await Project.find({ workspace: workspaceId });
    const projectUpdates = projects.map(project => {
      project.members = project.members.filter(
        member => member.user.toString() !== memberId
      );
      return project.save();
    });

    await Promise.all([
      workspace.save(),
      ...projectUpdates,
      recordActivity(
        req.user._id,
        "removed_member",
        "Workspace",
        workspaceId,
        {
          description: `Removed member from ${workspace.name} workspace`,
        }
      )
    ]);

    // Notify the removed member
    const removedUser = await User.findById(memberId);
    const actionUser = await User.findById(req.user._id);
    
    await createNotification({
      users: [memberId],
      type: "workspace_updated",
      title: "Removed from Workspace",
      message: `You have been removed from the ${workspace.name} workspace by ${actionUser.name}`,
      resourceType: "Workspace", 
      resourceId: workspaceId,
      actionBy: req.user._id,
      workspace: workspaceId,
      metadata: {
        workspaceName: workspace.name,
        actionByName: actionUser.name,
        removedUserName: removedUser.name
      }
    });

    res.status(200).json({
      message: "Member removed successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};

export {
  createWorkspace,
  getWorkspaces,
  getWorkspaceDetails,
  getWorkspaceProjects,
  getWorkspaceStats,
  inviteUserToWorkspace,
  acceptGenerateInvite,
  acceptInviteByToken,
  updateWorkspace,
  deleteWorkspace,
  updateMemberRole,
  removeMemberFromWorkspace,
};
