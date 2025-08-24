import { Loader } from "@/components/loader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useGetWorkspaceQuery } from "@/hooks/use-workspace";
import { getProjectProgress, getTaskStatusColor } from "@/lib";
import type { Project } from "@/types";
import { format } from "date-fns";
import { Calendar, Users } from "lucide-react";
import { Link, useSearchParams } from "react-router";

const AchievedPage = () => {
  const [searchParams] = useSearchParams();
  const workspaceId = searchParams.get("workspaceId");

  const { data, isLoading } = useGetWorkspaceQuery(workspaceId!) as {
    data: { projects: Project[]; workspace: any };
    isLoading: boolean;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader />
      </div>
    );
  }

  if (!data || !workspaceId) {
    return (
      <div className="text-center py-8">
        <h2 className="text-xl font-semibold mb-2">No Workspace Selected</h2>
        <p className="text-muted-foreground">
          Please select a workspace to view achieved projects.
        </p>
      </div>
    );
  }

  const completedProjects = data.projects.filter(
    (project) => project.status === "Completed"
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Achieved Projects</h1>
          <p className="text-muted-foreground">
            Completed projects in {data.workspace?.name || "this workspace"}
          </p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          {completedProjects.length} Completed
        </Badge>
      </div>

      {completedProjects.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="mx-auto w-12 h-12 bg-muted rounded-lg flex items-center justify-center mb-4">
              <Calendar className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Completed Projects</h3>
            <p className="text-muted-foreground mb-4">
              You haven't completed any projects in this workspace yet.
            </p>
            <Link to={`/workspaces/${workspaceId}`}>
              <Button>View All Projects</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {completedProjects.map((project) => (
            <ProjectCard
              key={project._id}
              project={project}
              workspaceId={workspaceId}
            />
          ))}
        </div>
      )}
    </div>
  );
};
interface ProjectCardProps {
  project: Project;
  workspaceId: string;
}

const ProjectCard = ({ project, workspaceId }: ProjectCardProps) => {
  const progress = getProjectProgress(project.tasks || []);

  return (
    <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg mb-2 line-clamp-1">
              {project.title}
            </CardTitle>
            <CardDescription className="line-clamp-2">
              {project.description}
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className={getTaskStatusColor(project.status)}
          >
            {project.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Project Stats */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>
                {project.tasks?.length || 0} Task
                {(project.tasks?.length || 0) !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>
                {project.members?.length || 0} Member
                {(project.members?.length || 0) !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* Due Date */}
          {project.dueDate && (
            <div className="text-sm text-muted-foreground">
              Completed: {format(new Date(project.dueDate), "MMM d, yyyy")}
            </div>
          )}

          {/* Action Button */}
          <Link
            to={`/workspaces/${workspaceId}/projects/${project._id}`}
            className="w-full"
          >
            <Button variant="outline" className="w-full">
              View Project
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

export default AchievedPage;
