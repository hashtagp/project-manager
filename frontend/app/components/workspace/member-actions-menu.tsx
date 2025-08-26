import { useState } from "react";
import { MoreHorizontal, UserCog, UserX, Shield, User as UserIcon, Eye } from "lucide-react";
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
import { Button } from "@/components/ui/button";
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
import { useUpdateMemberRoleMutation, useRemoveMemberMutation } from "@/hooks/use-workspace";
import { toast } from "sonner";
import type { User } from "@/types";

interface MemberActionsMenuProps {
  member: {
    user: User;
    role: "admin" | "member" | "owner" | "viewer";
    joinedAt: Date;
  };
  workspaceId: string;
  currentUserRole: "admin" | "member" | "owner" | "viewer";
  currentUserId: string;
  onSuccess?: () => void;
}

const ROLE_ICONS = {
  admin: Shield,
  member: UserIcon,
  viewer: Eye,
  owner: Shield,
};

const ROLE_LABELS = {
  admin: "Admin",
  member: "Member", 
  viewer: "Viewer",
  owner: "Owner",
};

export const MemberActionsMenu = ({
  member,
  workspaceId,
  currentUserRole,
  currentUserId,
  onSuccess
}: MemberActionsMenuProps) => {
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  
  const updateMemberRole = useUpdateMemberRoleMutation();
  const removeMember = useRemoveMemberMutation();

  // Can't manage yourself or if you're not owner/admin
  const canManageMembers = ["owner", "admin"].includes(currentUserRole);
  const canRemoveMember = canManageMembers && member.user._id !== currentUserId && member.role !== "owner";
  const canChangeRole = canManageMembers && member.user._id !== currentUserId && member.role !== "owner";

  if (!canManageMembers) return null;

  const handleRoleChange = async (newRole: string) => {
    try {
      await updateMemberRole.mutateAsync({
        workspaceId,
        memberId: member.user._id,
        role: newRole
      });
      toast.success(`Member role updated to ${newRole}`);
      onSuccess?.();
    } catch (error) {
      toast.error("Failed to update member role");
    }
  };

  const handleRemoveMember = async () => {
    try {
      await removeMember.mutateAsync({
        workspaceId,
        memberId: member.user._id
      });
      toast.success("Member removed from workspace");
      setShowRemoveDialog(false);
      onSuccess?.();
    } catch (error) {
      toast.error("Failed to remove member");
    }
  };

  const availableRoles = member.role === "owner" ? [] : ["admin", "member", "viewer"];

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
          
          {canChangeRole && availableRoles.length > 0 && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <UserCog className="h-4 w-4 mr-2" />
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
              Remove Member
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{member.user.name}</strong> from this workspace?
              This action cannot be undone and they will lose access to all projects in this workspace.
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
