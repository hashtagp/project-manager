import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  useGetNotificationsQuery, 
  useGetUnreadCountQuery,
  useMarkAsReadMutation, 
  useMarkAllAsReadMutation 
} from "@/hooks/use-notification";
import { Bell, Check, ExternalLink } from "lucide-react";
import { NotificationItem } from "./notification-item";
import { Loader } from "../loader";
import { Badge } from "../ui/badge";
import { useNavigate } from "react-router";

export const NotificationDropdown = () => {
  const navigate = useNavigate();
  const { data: notificationData, isLoading } = useGetNotificationsQuery({ limit: 10, unreadOnly: false });
  const { data: unreadData } = useGetUnreadCountQuery();
  const markAsReadMutation = useMarkAsReadMutation();
  const markAllAsReadMutation = useMarkAllAsReadMutation();

  const unreadCount = unreadData?.unreadCount || 0;
  const notifications = notificationData?.notifications || [];

  const handleMarkAsRead = (notificationId: string) => {
    markAsReadMutation.mutate(notificationId);
  };

  const handleMarkAllAsRead = () => {
    if (unreadCount > 0) {
      markAllAsReadMutation.mutate();
    }
  };

  const handleViewAll = () => {
    // Navigate to a full notifications page (to be created)
    navigate("/notifications");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs p-0 min-w-[20px]"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-4 py-3">
          <h3 className="font-semibold text-base">Notifications</h3>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleMarkAllAsRead}
              disabled={markAllAsReadMutation.isPending}
              className="text-xs"
            >
              <Check className="w-3 h-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        <DropdownMenuSeparator />

        <ScrollArea className="h-80">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <Bell className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-sm text-gray-500 font-medium">No notifications yet</p>
              <p className="text-xs text-gray-400 mt-1">
                You'll see updates about your tasks and projects here
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification._id}
                  notification={notification}
                  onMarkAsRead={handleMarkAsRead}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleViewAll}
                className="w-full justify-center text-xs"
              >
                View all notifications
                <ExternalLink className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
