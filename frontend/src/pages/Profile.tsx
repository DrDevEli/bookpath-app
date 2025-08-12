import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import api from '../api';

interface User {
  _id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  createdAt: string;
  lastLogin?: string;
}

interface Collection {
  _id: string;
  name: string;
  description?: string;
  books: any[];
  isPublic: boolean;
  createdAt: string;
}

interface ReadingStats {
  totalBooks: number;
  completedBooks: number;
  readingBooks: number;
  toReadBooks: number;
  abandonedBooks: number;
  averageRating: number;
  totalPages: number;
  readingStreak: number;
}

const updateProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  email: z.string().email('Invalid email address'),
});

type UpdateProfileForm = z.infer<typeof updateProfileSchema>;

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ChangePasswordForm = z.infer<typeof changePasswordSchema>;

export function Profile() {
  const [user, setUser] = useState<User | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [stats, setStats] = useState<ReadingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const { toast } = useToast();

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
    reset: resetProfile,
  } = useForm<UpdateProfileForm>({
    resolver: zodResolver(updateProfileSchema),
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    reset: resetPassword,
  } = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
  });

  const fetchUserData = useCallback(async () => {
    try {
      setLoading(true);
      const [userResponse, collectionsResponse, statsResponse] = await Promise.all([
        // GET /users/profile — get user profile
        api.get('/users/profile'),
        // GET /collections — list user's collections
        api.get('/collections'),
        // GET /users/stats — get user reading stats
        api.get('/users/stats'),
      ]);

      if (userResponse.data.success) {
        setUser(userResponse.data.data);
        resetProfile({
          firstName: userResponse.data.data.firstName || '',
          lastName: userResponse.data.data.lastName || '',
          email: userResponse.data.data.email,
        });
      }

      if (collectionsResponse.data.success) {
        setCollections(collectionsResponse.data.data);
      }

      if (statsResponse.data.success) {
        setStats(statsResponse.data.data);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to fetch user data';
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }, [resetProfile, toast]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const handleUpdateProfile = async (data: UpdateProfileForm) => {
    try {
      setUpdating(true);
      // PUT /users/profile — update profile
      const response = await api.put('/users/profile', data);
      if (response.data.success) {
        setUser(response.data.data);
        toast({
          variant: "success",
          title: "Profile Updated",
          description: "Your profile has been updated successfully.",
        });
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to update profile';
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: errorMessage,
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleChangePassword = async (data: ChangePasswordForm) => {
    try {
      setChangingPassword(true);
      // PUT /users/password — change password
      const response = await api.put('/users/password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      if (response.data.success) {
        resetPassword();
        toast({
          variant: "success",
          title: "Password Changed",
          description: "Your password has been changed successfully.",
        });
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to change password';
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Password Change Failed",
        description: errorMessage,
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const getCompletionRate = () => {
    if (!stats || stats.totalBooks === 0) return 0;
    return Math.round((stats.completedBooks / stats.totalBooks) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Profile not found</h2>
        <p className="text-muted-foreground">
          Unable to load your profile information.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2" style={{ color: '#dbcd90' }}>
          Profile
        </h1>
        <p className="text-muted-foreground">
          Manage your account settings and view your reading statistics
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Profile Information */}
        <div className="space-y-6">
          <Card className="overflow-hidden group hover:shadow-xl transition-all duration-300 hover:scale-[1.02] focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2">
            <CardHeader className="transition-colors duration-300 group-hover:bg-primary/5">
              <CardTitle className="group-hover:text-primary transition-colors duration-300">Profile Information</CardTitle>
              <CardDescription className="group-hover:text-muted-foreground/80 transition-colors duration-300">
                Update your personal information
              </CardDescription>
            </CardHeader>
            <CardContent className="transition-colors duration-300 group-hover:bg-primary/5">
              <form onSubmit={handleProfileSubmit(handleUpdateProfile)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      {...registerProfile('firstName')}
                      className="focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
                    />
                    {profileErrors.firstName && (
                      <p className="text-sm text-red-500">{profileErrors.firstName.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      {...registerProfile('lastName')}
                      className="focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
                    />
                    {profileErrors.lastName && (
                      <p className="text-sm text-red-500">{profileErrors.lastName.message}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    {...registerProfile('email')}
                    className="focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
                  />
                  {profileErrors.email && (
                    <p className="text-sm text-red-500">{profileErrors.email.message}</p>
                  )}
                </div>
                <Button type="submit" disabled={updating} className="w-full transition-all duration-300 hover:scale-105">
                  {updating ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Updating...
                    </div>
                  ) : (
                    'Update Profile'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="overflow-hidden group hover:shadow-xl transition-all duration-300 hover:scale-[1.02] focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2">
            <CardHeader className="transition-colors duration-300 group-hover:bg-primary/5">
              <CardTitle className="group-hover:text-primary transition-colors duration-300">Change Password</CardTitle>
              <CardDescription className="group-hover:text-muted-foreground/80 transition-colors duration-300">
                Update your password
              </CardDescription>
            </CardHeader>
            <CardContent className="transition-colors duration-300 group-hover:bg-primary/5">
              <form onSubmit={handlePasswordSubmit(handleChangePassword)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    {...registerPassword('currentPassword')}
                    className="focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
                  />
                  {passwordErrors.currentPassword && (
                    <p className="text-sm text-red-500">{passwordErrors.currentPassword.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    {...registerPassword('newPassword')}
                    className="focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
                  />
                  {passwordErrors.newPassword && (
                    <p className="text-sm text-red-500">{passwordErrors.newPassword.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    {...registerPassword('confirmPassword')}
                    className="focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
                  />
                  {passwordErrors.confirmPassword && (
                    <p className="text-sm text-red-500">{passwordErrors.confirmPassword.message}</p>
                  )}
                </div>
                <Button type="submit" disabled={changingPassword} className="w-full transition-all duration-300 hover:scale-105">
                  {changingPassword ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Changing Password...
                    </div>
                  ) : (
                    'Change Password'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Reading Statistics */}
        <div className="space-y-6">
          <Card className="overflow-hidden group hover:shadow-xl transition-all duration-300 hover:scale-[1.02] focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2">
            <CardHeader className="transition-colors duration-300 group-hover:bg-primary/5">
              <CardTitle className="group-hover:text-primary transition-colors duration-300">Reading Statistics</CardTitle>
              <CardDescription className="group-hover:text-muted-foreground/80 transition-colors duration-300">
                Your reading progress and achievements
              </CardDescription>
            </CardHeader>
            <CardContent className="transition-colors duration-300 group-hover:bg-primary/5">
              {stats ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg transition-all duration-300 hover:scale-105">
                      <div className="text-2xl font-bold text-blue-600">{stats.totalBooks}</div>
                      <div className="text-sm text-blue-600">Total Books</div>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg transition-all duration-300 hover:scale-105">
                      <div className="text-2xl font-bold text-green-600">{stats.completedBooks}</div>
                      <div className="text-sm text-green-600">Completed</div>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg transition-all duration-300 hover:scale-105">
                      <div className="text-2xl font-bold text-yellow-600">{stats.readingBooks}</div>
                      <div className="text-sm text-yellow-600">Currently Reading</div>
                    </div>
                    <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg transition-all duration-300 hover:scale-105">
                      <div className="text-2xl font-bold text-purple-600">{stats.toReadBooks}</div>
                      <div className="text-sm text-purple-600">To Read</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Completion Rate</span>
                        <span>{getCompletionRate()}%</span>
                      </div>
                      <Progress value={getCompletionRate()} className="h-3" />
                    </div>

                    {stats.averageRating > 0 && (
                      <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg transition-all duration-300 hover:scale-105">
                        <div className="text-2xl font-bold text-orange-600">{stats.averageRating.toFixed(1)}</div>
                        <div className="text-sm text-orange-600">Average Rating</div>
                      </div>
                    )}

                    {stats.readingStreak > 0 && (
                      <div className="text-center p-4 bg-gradient-to-br from-red-50 to-red-100 rounded-lg transition-all duration-300 hover:scale-105">
                        <div className="text-2xl font-bold text-red-600">{stats.readingStreak}</div>
                        <div className="text-sm text-red-600">Day Reading Streak</div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">📚</div>
                  <p className="text-muted-foreground">No reading statistics available yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden group hover:shadow-xl transition-all duration-300 hover:scale-[1.02] focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2">
            <CardHeader className="transition-colors duration-300 group-hover:bg-primary/5">
              <CardTitle className="group-hover:text-primary transition-colors duration-300">Your Collections</CardTitle>
              <CardDescription className="group-hover:text-muted-foreground/80 transition-colors duration-300">
                Manage your book collections
              </CardDescription>
            </CardHeader>
            <CardContent className="transition-colors duration-300 group-hover:bg-primary/5">
              {collections.length > 0 ? (
                <div className="space-y-3">
                  {collections.map((collection) => (
                    <div
                      key={collection._id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg transition-all duration-300 hover:bg-gray-100 hover:scale-105"
                    >
                      <div>
                        <h4 className="font-medium">{collection.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {collection.books.length} books
                        </p>
                      </div>
                      <Button variant="outline" size="sm" asChild className="transition-all duration-300 hover:scale-105">
                        <a href={`/collections/${collection._id}`}>View</a>
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">📖</div>
                  <p className="text-muted-foreground mb-4">No collections yet</p>
                  <Button asChild className="transition-all duration-300 hover:scale-105">
                    <a href="/collections">Create Collection</a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 