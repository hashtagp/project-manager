import type { Notification } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { 
  CheckCircle, 
  MessageSquare, 
  UserPlus, 
  AlertTriangle, 
  Calendar,
  Briefcase,
  Users,
  Settings,
  Trophy
} from "lucide-react";
import { useNavigate } from "react-router";

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete?: (id: string) => void;
}

export const NotificationItem = ({ 
  notification, 
  onMarkAsRead, 
  onDelete 
}: NotificationItemProps) => {
  const navigate = useNavigate();

  const getNotificationIcon = (type: string) => {
    const iconClass = "w-4 h-4";
    
    switch (type) {
      case "task_assigned":
      case "task_status_changed":
        return <CheckCircle className={iconClass} />;
      case "task_completed":
        return <CheckCircle className={`${iconClass} text-green-600`} />;
      case "task_commented":
        return <MessageSquare className={iconClass} />;
      case "task_priority_changed":
        return <AlertTriangle className={iconClass} />;
      case "task_due_soon":
        return <Calendar className={iconClass} />;
      case "project_added":
      case "project_status_changed":
        return <Briefcase className={iconClass} />;
      case "project_member_added":
        return <UserPlus className={iconClass} />;
      case "workspace_invited":
      case "workspace_member_joined":
        return <Users className={iconClass} />;
      case "workspace_updated":
        return <Settings className={iconClass} />;
      case "achievement_unlocked":
        return <Trophy className={`${iconClass} text-yellow-600`} />;
      default:
        return <CheckCircle className={iconClass} />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "task_completed":
      case "achievement_unlocked":
        return "border-l-green-500";
      case "task_priority_changed":
      case "task_due_soon":
        return "border-l-orange-500";
      case "workspace_invited":
        return "border-l-blue-500";
      default:
        return "border-l-gray-300";
    }
  };

  const handleClick = () => {
    if (!notification.isRead) {
      onMarkAsRead(notification._id);
    }

    // Navigate to relevant resource
    const { resourceType, resourceId, workspace } = notification;
    
    if (resourceType === "Task") {
      // Need to get project ID from metadata or make another call
      // For now, navigate to workspace
      navigate(`/workspaces/${workspace._id}`);
    } else if (resourceType === "Project") {
      navigate(`/workspaces/${workspace._id}`);
    } else if (resourceType === "Workspace") {
      navigate(`/workspaces/${resourceId}`);
    }
  };

  return (
    <div
      className={`
        p-3 border-l-4 cursor-pointer transition-all hover:bg-gray-50
        ${getNotificationColor(notification.type)}
        ${!notification.isRead ? "bg-blue-50/50" : "bg-white"}
      `}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        <div className={`
          mt-1 p-2 rounded-full 
          ${!notification.isRead ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600"}
        `}>
          {getNotificationIcon(notification.type)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className={`text-sm font-medium ${!notification.isRead ? "text-gray-900" : "text-gray-700"}`}>
                {notification.title}
              </p>
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                {notification.message}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                </span>
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs text-gray-500">
                  {notification.workspace.name}
                </span>
                {!notification.isRead && (
                  <>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
