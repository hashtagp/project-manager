import { useState } from "react";
import { Loader } from "@/components/loader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useGetNotificationsQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  useDeleteNotificationMutation,
} from "@/hooks/use-notification";
import { NotificationItem } from "@/components/notification/notification-item";
import { format } from "date-fns";
import { 
  Bell, 
  Check, 
  CheckCircle2, 
  FilterIcon, 
  MoreHorizontal, 
  Trash2
} from "lucide-react";
import { toast } from "sonner";
import type { Notification } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";

const Notifications = () => {
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { 
    data: notificationData, 
    isLoading, 
    refetch 
  } = useGetNotificationsQuery({ 
    page, 
    limit: 20, 
    unreadOnly: activeTab === "unread" 
  });

  const markAsReadMutation = useMarkAsReadMutation();
  const markAllAsReadMutation = useMarkAllAsReadMutation();
  const deleteNotificationMutation = useDeleteNotificationMutation();

  const notifications = notificationData?.notifications || [];
  const unreadCount = notificationData?.unreadCount || 0;

  const filteredNotifications = notifications.filter((notification) =>
    notification.title.toLowerCase().includes(search.toLowerCase()) ||
    notification.message.toLowerCase().includes(search.toLowerCase()) ||
    notification.workspace.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsReadMutation.mutateAsync(notificationId);
      toast.success("Notification marked as read");
    } catch (error) {
      toast.error("Failed to mark notification as read");
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;
    
    try {
      await markAllAsReadMutation.mutateAsync();
      toast.success(`Marked ${unreadCount} notifications as read`);
    } catch (error) {
      toast.error("Failed to mark all notifications as read");
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      await deleteNotificationMutation.mutateAsync(notificationId);
      toast.success("Notification deleted");
    } catch (error) {
      toast.error("Failed to delete notification");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            Stay updated with your workspace activities
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={markAllAsReadMutation.isPending}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Search notifications..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "all" | "unread")}>
          <TabsList>
            <TabsTrigger value="all">
              All ({notifications.length})
            </TabsTrigger>
            <TabsTrigger value="unread">
              Unread ({unreadCount})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your Notifications</CardTitle>
              <CardDescription>
                {activeTab === "all" 
                  ? `${filteredNotifications.length} total notifications`
                  : `${filteredNotifications.filter(n => !n.isRead).length} unread notifications`
                }
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                {activeTab === "unread" ? "No unread notifications" : "No notifications"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {activeTab === "unread" 
                  ? "You're all caught up! Check back later for new updates."
                  : "You'll see updates about your tasks and projects here"
                }
              </p>
            </div>
          ) : (
            <ScrollArea className="max-h-[70vh]">
              <div className="divide-y">
                {filteredNotifications.map((notification) => (
                  <div key={notification._id} className="relative group">
                    <NotificationItem
                      notification={notification}
                      onMarkAsRead={handleMarkAsRead}
                      onDelete={handleDeleteNotification}
                    />
                    
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {!notification.isRead && (
                            <DropdownMenuItem
                              onClick={() => handleMarkAsRead(notification._id)}
                              disabled={markAsReadMutation.isPending}
                            >
                              <Check className="h-4 w-4 mr-2" />
                              Mark as read
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleDeleteNotification(notification._id)}
                            disabled={deleteNotificationMutation.isPending}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Pagination could be added here if needed */}
      {notificationData?.pagination && notificationData.pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          
          <span className="text-sm text-muted-foreground">
            Page {page} of {notificationData.pagination.pages}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(Math.min(notificationData.pagination.pages, page + 1))}
            disabled={page === notificationData.pagination.pages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

export default Notifications;
