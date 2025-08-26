import { useState } from "react";
import { Plus, UserPlus, MoreHorizontal, UserX, Shield, User as UserIcon, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  useAddProjectMemberMutation, 
  useRemoveProjectMemberMutation, 
  useUpdateProjectMemberRoleMutation 
} from "@/hooks/use-project";
import { toast } from "sonner";
import type { User, Project } from "@/types";

interface ProjectMemberManagementProps {
  project: Project;
  workspaceMembers: {
    user: User;
    role: "admin" | "member" | "owner" | "viewer";
    joinedAt: Date;
  }[];
  currentUserRole: "admin" | "member" | "owner" | "viewer";
  currentUserId: string;
}

interface AddMembersDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  workspaceMembers: {
    user: User;
    role: "admin" | "member" | "owner" | "viewer";
    joinedAt: Date;
  }[];
  currentProjectMembers: {
    user: User;
    role: "manager" | "contributor" | "viewer";
  }[];
}

const ROLE_ICONS = {
  manager: Shield,
  contributor: UserIcon,
  viewer: Eye,
};

const ROLE_LABELS = {
  manager: "Manager",
  contributor: "Contributor",
  viewer: "Viewer",
};

const AddMembersDialog = ({ 
  isOpen, 
  onOpenChange, 
  projectId, 
  workspaceMembers, 
  currentProjectMembers 
}: AddMembersDialogProps) => {
  const [selectedMembers, setSelectedMembers] = useState<{userId: string, role: string}[]>([]);
  const addProjectMember = useAddProjectMemberMutation();

  // Filter workspace members who are not already in the project
  const availableMembers = workspaceMembers.filter(
    wm => !currentProjectMembers.some(pm => pm.user._id === wm.user._id)
  );

  const handleMemberToggle = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedMembers(prev => [...prev, { userId, role: 'contributor' }]);
    } else {
      setSelectedMembers(prev => prev.filter(m => m.userId !== userId));
    }
  };

  const handleRoleChange = (userId: string, role: string) => {
    setSelectedMembers(prev => 
      prev.map(m => m.userId === userId ? { ...m, role } : m)
    );
  };

  const handleAddMembers = async () => {
    try {
      await Promise.all(
        selectedMembers.map(member => 
          addProjectMember.mutateAsync({
            projectId,
            userId: member.userId,
            role: member.role
          })
        )
      );
      toast.success(`Added ${selectedMembers.length} member(s) to project`);
      setSelectedMembers([]);
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to add members to project");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Members to Project</DialogTitle>
          <DialogDescription>
            Select workspace members to add to this project
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-96 pr-4">
          <div className="space-y-3">
            {availableMembers.map((member) => {
              const isSelected = selectedMembers.some(m => m.userId === member.user._id);
              const memberRole = selectedMembers.find(m => m.userId === member.user._id)?.role || 'contributor';
              
              return (
                <div key={member.user._id} className="flex items-center space-x-3 p-3 border rounded-lg">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => 
                      handleMemberToggle(member.user._id, checked as boolean)
                    }
                  />
                  
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.user.profilePicture} />
                    <AvatarFallback>
                      {member.user.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <p className="text-sm font-medium">{member.user.name}</p>
                    <p className="text-xs text-muted-foreground">{member.user.email}</p>
                  </div>
                  
                  {isSelected && (
                    <Select
                      value={memberRole}
                      onValueChange={(role) => handleRoleChange(member.user._id, role)}
                    >
                      <SelectTrigger className="w-24 h-6 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="contributor">Contributor</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              );
            })}
            
            {availableMembers.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                All workspace members are already in this project
              </p>
            )}
          </div>
        </ScrollArea>
        
        <div className="flex justify-end space-x-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAddMembers}
            disabled={selectedMembers.length === 0 || addProjectMember.isPending}
          >
            {addProjectMember.isPending ? "Adding..." : `Add ${selectedMembers.length} Member(s)`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const ProjectMemberActions = ({
  member,
  projectId,
  canManageMembers,
  currentUserId
}: {
  member: { user: User; role: "manager" | "contributor" | "viewer" };
  projectId: string;
  canManageMembers: boolean;
  currentUserId: string;
}) => {
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const updateMemberRole = useUpdateProjectMemberRoleMutation();
  const removeMember = useRemoveProjectMemberMutation();

  const canRemoveMember = canManageMembers && member.user._id !== currentUserId;
  const canChangeRole = canManageMembers && member.user._id !== currentUserId;

  if (!canManageMembers) return null;

  const handleRoleChange = async (newRole: string) => {
    try {
      await updateMemberRole.mutateAsync({
        projectId,
        userId: member.user._id,
        role: newRole
      });
      toast.success(`Member role updated to ${newRole}`);
    } catch (error) {
      toast.error("Failed to update member role");
    }
  };

  const handleRemoveMember = async () => {
    try {
      await removeMember.mutateAsync({
        projectId,
        userId: member.user._id
      });
      toast.success("Member removed from project");
      setShowRemoveDialog(false);
    } catch (error) {
      toast.error("Failed to remove member");
    }
  };

  const availableRoles = ["manager", "contributor", "viewer"];

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Member Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {canChangeRole && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Shield className="h-4 w-4 mr-2" />
                Change Role
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {availableRoles.map((role) => {
                  const Icon = ROLE_ICONS[role as keyof typeof ROLE_ICONS];
                  return (
                    <DropdownMenuItem
                      key={role}
                      onClick={() => handleRoleChange(role)}
                      disabled={updateMemberRole.isPending}
                      className={member.role === role ? "bg-muted" : ""}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {ROLE_LABELS[role as keyof typeof ROLE_LABELS]}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}
          
          {canRemoveMember && (
            <DropdownMenuItem
              className="text-red-600"
              onClick={() => setShowRemoveDialog(true)}
            >
              <UserX className="h-4 w-4 mr-2" />
              Remove from Project
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{member.user.name}</strong> from this project?
              They will lose access to all tasks and resources in this project.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              disabled={removeMember.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {removeMember.isPending ? "Removing..." : "Remove Member"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export const ProjectMemberManagement = ({
  project,
  workspaceMembers,
  currentUserRole,
  currentUserId
}: ProjectMemberManagementProps) => {
  const [showAddMembersDialog, setShowAddMembersDialog] = useState(false);
  
  // Can manage members if user is project manager or workspace owner/admin
  const canManageMembers = 
    currentUserRole === "owner" || 
    currentUserRole === "admin" ||
    project.members.some(m => m.user._id === currentUserId && m.role === "manager");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Project Members</h3>
          <p className="text-sm text-muted-foreground">
            {project.members.length} member(s) in this project
          </p>
        </div>
        
        {canManageMembers && (
          <Button onClick={() => setShowAddMembersDialog(true)} size="sm">
            <UserPlus className="h-4 w-4 mr-2" />
            Add Members
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {project.members.map((member) => (
          <div
            key={member.user._id}
            className="flex items-center justify-between p-3 border rounded-lg"
          >
            <div className="flex items-center space-x-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={member.user.profilePicture} />
                <AvatarFallback>
                  {member.user.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              
              <div>
                <p className="font-medium">{member.user.name}</p>
                <p className="text-sm text-muted-foreground">{member.user.email}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Badge
                variant={member.role === "manager" ? "destructive" : "secondary"}
                className="capitalize"
              >
                {member.role}
              </Badge>
              
              <ProjectMemberActions
                member={member}
                projectId={project._id}
                canManageMembers={canManageMembers}
                currentUserId={currentUserId}
              />
            </div>
          </div>
        ))}
        
        {project.members.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            No members in this project yet
          </p>
        )}
      </div>

      <AddMembersDialog
        isOpen={showAddMembersDialog}
        onOpenChange={setShowAddMembersDialog}
        projectId={project._id}
        workspaceMembers={workspaceMembers}
        currentProjectMembers={project.members}
      />
    </div>
  );
};
