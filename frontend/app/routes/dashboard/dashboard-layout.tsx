import { Header } from "@/components/layout/header";
import { SidebarComponent } from "@/components/layout/sidebar-component";
import { Loader } from "@/components/loader";
import { CreateWorkspace } from "@/components/workspace/create-workspace";
import { fetchData } from "@/lib/fetch-util";
import { useAuth } from "@/provider/auth-context";
import type { Workspace } from "@/types";
import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation, useSearchParams } from "react-router";

const DashboardLayout = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(
    null
  );
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);

  // Load workspaces
  useEffect(() => {
    const loadWorkspaces = async () => {
      try {
        const data = await fetchData("/workspaces");
        setWorkspaces(data as Workspace[]);
      } catch (error) {
        console.log(error);
      }
    };
    if (isAuthenticated) {
      loadWorkspaces();
    }
  }, [isAuthenticated]);

  // Detect current workspace from URL
  useEffect(() => {
    if (workspaces.length === 0) return;

    // Check for workspace ID in URL path (e.g., /workspaces/:workspaceId)
    const pathMatch = location.pathname.match(/\/workspaces\/([^\/]+)/);
    const pathWorkspaceId = pathMatch ? pathMatch[1] : null;

    // Check for workspace ID in query params (e.g., ?workspaceId=...)
    const queryWorkspaceId = searchParams.get('workspaceId');

    // Use path workspace ID first, then query param
    const workspaceId = pathWorkspaceId || queryWorkspaceId;

    if (workspaceId && workspaces.length > 0) {
      const workspace = workspaces.find(w => w._id === workspaceId);
      if (workspace && workspace._id !== currentWorkspace?._id) {
        setCurrentWorkspace(workspace);
      }
    }
  }, [location.pathname, searchParams, workspaces, currentWorkspace?._id]);

  if (isLoading) {
    return <Loader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/sign-in" />;
  }

  const handleWorkspaceSelected = (workspace: Workspace) => {
    setCurrentWorkspace(workspace);
  };

  return (
    <div className="flex h-screen w-full">
      <SidebarComponent currentWorkspace={currentWorkspace} />

      <div className="flex flex-1 flex-col h-full">
        <Header
          onWorkspaceSelected={handleWorkspaceSelected}
          selectedWorkspace={currentWorkspace}
          onCreateWorkspace={() => setIsCreatingWorkspace(true)}
          workspaces={workspaces}
        />

        <main className="flex-1 overflow-y-auto h-full w-full">
          <div className="mx-auto container px-2 sm:px-6 lg:px-8 py-0 md:py-8 w-full h-full">
            <Outlet />
          </div>
        </main>
      </div>

      <CreateWorkspace
        isCreatingWorkspace={isCreatingWorkspace}
        setIsCreatingWorkspace={setIsCreatingWorkspace}
      />
    </div>
  );
};

export default DashboardLayout;
