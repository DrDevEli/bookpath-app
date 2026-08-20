import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { userAPI } from '../api';
import { isAuthenticated } from '../auth';

interface ProfileData {
  id: string;
  username: string;
  email: string;
  role: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;
}

// Mirrors the backend mongoose validator: >=12 chars, upper + lower + number + special
const passwordRule = z
  .string()
  .min(12, 'At least 12 characters')
  .regex(/[a-z]/, 'One lowercase letter')
  .regex(/[A-Z]/, 'One uppercase letter')
  .regex(/\d/, 'One number')
  .regex(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/, 'One special character');

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordRule,
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ChangePasswordForm = z.infer<typeof changePasswordSchema>;

export function Profile() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const authenticated = isAuthenticated();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
  });

  useEffect(() => {
    if (!authenticated) return;
    (async () => {
      try {
        setLoading(true);
        const res = await userAPI.getProfile();
        setProfile(res.data?.data || res.data || null);
      } catch (err: any) {
        const msg = err.response?.data?.message || err.message || 'Failed to load profile';
        setLoadError(typeof msg === 'string' ? msg : String(msg));
      } finally {
        setLoading(false);
      }
    })();
  }, [authenticated]);

  const onSubmit = async (data: ChangePasswordForm) => {
    try {
      setIsSubmitting(true);
      setPwError(null);
      setPwSuccess(null);
      const res = await userAPI.changePassword(data.currentPassword, data.newPassword);
      // Backend bumps tokenVersion + returns fresh tokens — swap the stored token
      const newToken = res.data?.accessToken;
      if (newToken) localStorage.setItem('auth_token', newToken);
      setPwSuccess(res.data?.message || 'Password updated successfully');
      reset();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to update password';
      setPwError(typeof msg === 'string' ? msg : String(msg));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!authenticated) {
    return (
      <div className="container max-w-md mx-auto py-20 text-center">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: 'rgb(30, 41, 59)' }}>Sign in required</h2>
        <p className="text-muted-foreground mb-4">You need to sign in to view your profile.</p>
        <Button asChild>
          <Link to="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-20 text-muted-foreground">Loading profile...</div>;
  }

  return (
    <div className="container max-w-2xl mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold" style={{ color: 'rgb(30, 41, 59)' }}>Profile</h1>
        <p className="text-sm text-muted-foreground">Manage your account settings.</p>
      </div>

      {loadError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{loadError}</p>
        </div>
      )}

      {/* Account info */}
      <Card>
        <CardHeader className="p-6 pb-2">
          <CardTitle className="text-xl">Account</CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-2 space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Username</p>
              <p className="font-semibold" style={{ color: 'rgb(30, 41, 59)' }}>{profile?.username}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Email</p>
              <p className="font-semibold break-all" style={{ color: 'rgb(30, 41, 59)' }}>{profile?.email}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Role</p>
              <p className="font-semibold capitalize" style={{ color: 'rgb(30, 41, 59)' }}>{profile?.role}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Email verified</p>
              <p className="font-semibold" style={{ color: 'rgb(30, 41, 59)' }}>
                {profile?.emailVerified ? 'Yes' : 'No'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Change password */}
      <Card>
        <CardHeader className="p-6 pb-2">
          <CardTitle className="text-xl">Change password</CardTitle>
          <CardDescription>
            At least 12 characters with uppercase, lowercase, a number, and a special character.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-2">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword" style={{ color: '#dbcd90' }}>Current password</Label>
              <Input
                id="currentPassword"
                type="password"
                placeholder="Enter current password"
                {...register('currentPassword')}
                disabled={isSubmitting}
              />
              {errors.currentPassword && (
                <p className="text-sm text-red-500">{errors.currentPassword.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword" style={{ color: '#dbcd90' }}>New password</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Enter new password"
                {...register('newPassword')}
                disabled={isSubmitting}
              />
              {errors.newPassword && (
                <p className="text-sm text-red-500">{errors.newPassword.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" style={{ color: '#dbcd90' }}>Confirm new password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Re-enter new password"
                {...register('confirmPassword')}
                disabled={isSubmitting}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
              )}
            </div>

            {pwError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{pwError}</p>
              </div>
            )}
            {pwSuccess && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-700">{pwSuccess}</p>
              </div>
            )}

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default Profile;
