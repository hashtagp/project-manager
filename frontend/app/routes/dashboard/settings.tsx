import { useAuth } from "../../provider/auth-context";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Separator } from "../../components/ui/separator";
import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { useGetWorkspaceDetailsQuery, useUpdateWorkspaceMutation, useDeleteWorkspaceMutation } from "../../hooks/use-workspace";
import { Loader } from "../../components/loader";
import { toast } from "sonner";
import { AlertTriangle, Trash2, Save } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../../components/ui/alert-dialog";
import type { Workspace } from "../../types";

export default function WorkspaceSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const workspaceId = searchParams.get('workspaceId');

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#FF5733",
  });

  const { data: workspace, isLoading, error } = useGetWorkspaceDetailsQuery(workspaceId || "");
  const updateWorkspaceMutation = useUpdateWorkspaceMutation();
  const deleteWorkspaceMutation = useDeleteWorkspaceMutation();

  // Populate form with workspace data
  useEffect(() => {
    if (workspace) {
      setFormData({
        name: workspace.name || "",
        description: workspace.description || "",
        color: workspace.color || "#FF5733",
      });
    }
  }, [workspace]);

  if (!workspaceId) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">No Workspace Selected</h1>
          <p className="text-muted-foreground mb-6">Please select a workspace to view its settings.</p>
          <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <Loader />;
  }

  if (error || !workspace) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Workspace Not Found</h1>
          <p className="text-muted-foreground mb-6">The workspace you're looking for doesn't exist or you don't have access to it.</p>
          <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
        </div>
      </div>
    );
  }

  // Check if current user is the owner
  const isOwner = typeof workspace.owner === 'string' 
    ? workspace.owner === user?._id 
    : workspace.owner?._id === user?._id;

  const handleSave = async () => {
    if (!isOwner) {
      toast.error("Only the workspace owner can edit settings");
      return;
    }

    try {
      await updateWorkspaceMutation.mutateAsync({
        workspaceId: workspaceId,
        data: {
          name: formData.name,
          description: formData.description,
          color: formData.color,
        }
      });
      toast.success("Workspace settings updated successfully");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update workspace");
    }
  };

  const handleDelete = async () => {
    if (!isOwner) {
      toast.error("Only the workspace owner can delete the workspace");
      return;
    }

    try {
      await deleteWorkspaceMutation.mutateAsync(workspaceId);
      toast.success("Workspace deleted successfully");
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete workspace");
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    if (!isOwner) return; // Prevent editing if not owner
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workspace Settings</h1>
          <p className="text-muted-foreground">
            Manage your workspace settings and preferences.
          </p>
          {!isOwner && (
            <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
              <p className="text-sm text-amber-800 flex items-center">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Only the workspace owner can modify these settings.
              </p>
            </div>
          )}
        </div>

        <Separator />

        {/* Workspace Details */}
        <Card>
          <CardHeader>
            <CardTitle>Workspace Details</CardTitle>
            <CardDescription>
              Update your workspace information and appearance.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Workspace Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter workspace name"
                  disabled={!isOwner}
                  className={!isOwner ? "opacity-50 cursor-not-allowed" : ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="color">Workspace Color</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="color"
                    type="color"
                    value={formData.color}
                    onChange={(e) => handleInputChange('color', e.target.value)}
                    disabled={!isOwner}
                    className={`w-16 h-10 p-1 rounded-md ${!isOwner ? "opacity-50 cursor-not-allowed" : ""}`}
                  />
                  <Input
                    value={formData.color}
                    onChange={(e) => handleInputChange('color', e.target.value)}
                    placeholder="#FF5733"
                    disabled={!isOwner}
                    className={!isOwner ? "opacity-50 cursor-not-allowed" : ""}
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Enter workspace description (optional)"
                disabled={!isOwner}
                className={`flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${!isOwner ? "opacity-50 cursor-not-allowed" : ""}`}
              />
            </div>
            {isOwner && (
              <Button 
                onClick={handleSave} 
                disabled={updateWorkspaceMutation.isPending}
                className="w-full sm:w-auto"
              >
                <Save className="w-4 h-4 mr-2" />
                {updateWorkspaceMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Workspace Information */}
        <Card>
          <CardHeader>
            <CardTitle>Workspace Information</CardTitle>
            <CardDescription>
              General information about this workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Created On</Label>
                <p className="text-sm text-muted-foreground">
                  {new Date(workspace.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Total Members</Label>
                <p className="text-sm text-muted-foreground">
                  {workspace.members?.length || 0} members
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Owner</Label>
                <p className="text-sm text-muted-foreground">
                  {typeof workspace.owner === 'string' 
                    ? workspace.owner 
                    : workspace.owner?.name || "Unknown"}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Your Role</Label>
                <p className="text-sm text-muted-foreground">
                  {workspace.members?.find((m: any) => m.user._id === user?._id || m.user === user?._id)?.role || "Unknown"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone - Only show to owner */}
        {isOwner && (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>
                Irreversible and destructive actions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Delete Workspace</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Permanently delete this workspace and all its data. This cannot be undone.
                  </p>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Workspace
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the
                          workspace "{workspace.name}" and remove all associated data including
                          projects, tasks, and member information.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDelete}
                          disabled={deleteWorkspaceMutation.isPending}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {deleteWorkspaceMutation.isPending ? "Deleting..." : "Delete Workspace"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
