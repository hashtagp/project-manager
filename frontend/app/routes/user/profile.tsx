import { BackButton } from "@/components/back-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  useChangePassword,
  useUpdateUserProfile,
  useUserProfileQuery,
} from "@/hooks/use-user";
import { useAuth } from "@/provider/auth-context";
import type { User } from "@/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader, Loader2, Upload } from "lucide-react";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { z } from "zod";

const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, { message: "Current password is required" }),
    newPassword: z.string().min(8, { message: "New password is required" }),
    confirmPassword: z
      .string()
      .min(8, { message: "Confirm password is required" }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const profileSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  profilePicture: z.string().optional(),
});

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

export type ProfileFormData = z.infer<typeof profileSchema>;

const Profile = () => {
  const { data: user, isPending, error: userError } = useUserProfileQuery() as {
    data: User;
    isPending: boolean;
    error: any;
  };
  const { logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Handle user data loading errors
  if (userError) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load user profile. Please refresh the page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const form = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });
  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      profilePicture: "",
    },
  });

  // Update form values when user data loads
  React.useEffect(() => {
    if (user) {
      profileForm.reset({
        name: user.name || "",
        profilePicture: user.profilePicture || "",
      });
    }
  }, [user, profileForm]);

  const { mutate: updateUserProfile, isPending: isUpdatingProfile } =
    useUpdateUserProfile();
  const {
    mutate: changePassword,
    isPending: isChangingPassword,
    error,
  } = useChangePassword();

  const handlePasswordChange = (values: ChangePasswordFormData) => {
    changePassword(values, {
      onSuccess: () => {
        toast.success(
          "Password updated successfully. You will be logged out. Please login again."
        );
        form.reset();

        setTimeout(() => {
          logout();
          navigate("/sign-in");
        }, 3000);
      },
      onError: (error: any) => {
        const errorMessage =
          error.response?.data?.error || 
          error.response?.data?.message ||
          "Failed to update password";
        toast.error(errorMessage);
        console.error("Password change error:", error);
      },
    });
  };

  const handleProfileFormSubmit = (values: ProfileFormData) => {
    updateUserProfile(
      { 
        name: values.name, 
        profilePicture: previewUrl || values.profilePicture || "" 
      },
      {
        onSuccess: (data: any) => {
          toast.success("Profile updated successfully");
          setPreviewUrl(null); // Clear preview after successful update
          
          // Update the user context with the new profile data
          // Safely handle the API response structure
          if (updateUser && data && typeof data === 'object') {
            const updatedData = {
              ...(data.name && { name: data.name }),
              ...(data.profilePicture !== undefined && { profilePicture: data.profilePicture }),
            };
            updateUser(updatedData);
          }
        },
        onError: (error: any) => {
          const errorMessage =
            error.response?.data?.error || "Failed to update profile";
          toast.error(errorMessage);
          console.error("Profile update error:", error);
        },
      }
    );
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset any previous preview on new file selection
    setPreviewUrl(null);

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file (JPG, PNG, or GIF)');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      toast.error(`Image size is ${sizeMB}MB. Please select an image smaller than 5MB.`);
      return;
    }

    setUploading(true);
    
    try {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          setPreviewUrl(result);
          profileForm.setValue('profilePicture', result);
          toast.success('Image loaded successfully. Click "Save Changes" to update your profile.');
        } else {
          toast.error('Failed to process image');
        }
        setUploading(false);
      };
      
      reader.onerror = () => {
        toast.error('Error reading file. Please try again.');
        setUploading(false);
        setPreviewUrl(null);
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Avatar upload error:', error);
      toast.error('Error processing image. Please try again.');
      setUploading(false);
      setPreviewUrl(null);
    }
  };

  if (isPending)
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader className="animate-spin" />
      </div>
    );

  return (
    <div className="space-y-8">
      <div className="px-4 md:px-0">
        <BackButton />
        <h3 className="text-lg font-medium">Profile Information</h3>
        <p className="text-sm text-muted-foreground">
          Manage your account settings and preferences.
        </p>
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Update your personal details.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...profileForm}>
            <form
              onSubmit={profileForm.handleSubmit(handleProfileFormSubmit)}
              className="grid gap-4"
            >
              <div className="flex items-center space-x-4 mb-6">
                <Avatar className="h-20 w-20 bg-gray-600">
                  <AvatarImage
                    src={
                      previewUrl ||
                      profileForm.watch("profilePicture") ||
                      user?.profilePicture
                    }
                    alt={user?.name}
                  />
                  <AvatarFallback className="text-xl">
                    {user?.name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    disabled={uploading || isUpdatingProfile}
                    style={{ display: "none" }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      document.getElementById("avatar-upload")?.click()
                    }
                    disabled={uploading || isUpdatingProfile}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-3 w-3" />
                        Change Avatar
                      </>
                    )}
                  </Button>
                  {previewUrl && (
                    <p className="text-xs text-green-600 font-medium">
                      ✓ New image ready. Click "Save Changes" to update.
                    </p>
                  )}
                  {uploading && (
                    <p className="text-xs text-blue-600">
                      Processing image...
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG or GIF. Max size 5MB.
                  </p>
                </div>
              </div>
              <FormField
                control={profileForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  defaultValue={user?.email}
                  disabled
                />
                <p className="text-xs text-muted-foreground">
                  Your email address cannot be changed.
                </p>
              </div>
              <Button
                type="submit"
                className="w-fit"
                disabled={isUpdatingProfile || isPending}
              >
                {isUpdatingProfile ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>Update your password.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handlePasswordChange)}
              className="grid gap-4"
            >
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error.message}</AlertDescription>
                </Alert>
              )}

              <div className="grid gap-2">
                <FormField
                  control={form.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Password</FormLabel>
                      <FormControl>
                        <Input
                          id="current-password"
                          type="password"
                          placeholder="********"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input
                          id="new-password"
                          type="password"
                          placeholder="********"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input
                          id="confirm-password"
                          placeholder="********"
                          type="password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button
                type="submit"
                className="mt-2 w-fit"
                disabled={isPending || isChangingPassword}
              >
                {isPending || isChangingPassword ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
