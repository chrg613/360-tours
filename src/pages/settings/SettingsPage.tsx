import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { Eye, EyeOff, Bell, Shield, Palette, Trash2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Input,
} from '@/components/ui';
import { usersApi } from '@/api';
import { useAuthStore, useUIStore } from '@/stores';
import { cn } from '@/utils';

export function SettingsPage() {
  const { user, logout } = useAuthStore();
  const { theme, setTheme } = useUIStore();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      current_password: '',
      new_password: '',
      confirm_password: '',
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: (data: { current_password: string; new_password: string }) =>
      usersApi.changePassword(data),
    onSuccess: () => {
      reset();
      alert('Password changed successfully!');
    },
  });

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: (password: string) => usersApi.deleteAccount(password),
    onSuccess: () => {
      logout();
    },
  });

  const onChangePassword = async (data: {
    current_password: string;
    new_password: string;
    confirm_password: string;
  }) => {
    if (data.new_password !== data.confirm_password) {
      alert('Passwords do not match');
      return;
    }
    await changePasswordMutation.mutateAsync({
      current_password: data.current_password,
      new_password: data.new_password,
    });
  };

  return (
    <div className="animate-fade-in mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Settings</h1>
        <p className="mt-1 text-[var(--color-text-muted)]">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-[var(--color-text-muted)]" />
            <CardTitle>Appearance</CardTitle>
          </div>
          <CardDescription>Customize how the app looks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Theme</label>
              <div className="flex gap-3">
                {(['light', 'dark', 'system'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={cn(
                      'flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-colors',
                      theme === t
                        ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-50)] text-[var(--color-primary-700)]'
                        : 'border-[var(--color-border)] hover:bg-[var(--color-surface)]'
                    )}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-[var(--color-text-muted)]" />
            <CardTitle>Notifications</CardTitle>
          </div>
          <CardDescription>Configure notification preferences</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-[var(--color-text-muted)]">
                  Receive updates about your tours via email
                </p>
              </div>
              <input
                type="checkbox"
                defaultChecked
                className="h-5 w-5 rounded border-[var(--color-border)] text-[var(--color-primary-600)]"
              />
            </label>
            <label className="flex items-center justify-between">
              <div>
                <p className="font-medium">Marketing Emails</p>
                <p className="text-sm text-[var(--color-text-muted)]">
                  Receive tips and promotional content
                </p>
              </div>
              <input
                type="checkbox"
                className="h-5 w-5 rounded border-[var(--color-border)] text-[var(--color-primary-600)]"
              />
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-[var(--color-text-muted)]" />
            <CardTitle>Security</CardTitle>
          </div>
          <CardDescription>Manage your password and security settings</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onChangePassword)} className="space-y-4">
            <div className="relative">
              <Input
                label="Current Password"
                type={showCurrentPassword ? 'text' : 'password'}
                {...register('current_password', { required: 'Required' })}
                error={errors.current_password?.message}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-9 text-[var(--color-text-muted)]"
              >
                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="relative">
              <Input
                label="New Password"
                type={showNewPassword ? 'text' : 'password'}
                {...register('new_password', { required: 'Required', minLength: 8 })}
                error={errors.new_password?.message}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-9 text-[var(--color-text-muted)]"
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Input
              label="Confirm New Password"
              type="password"
              {...register('confirm_password', { required: 'Required' })}
              error={errors.confirm_password?.message}
            />
            <div className="flex justify-end">
              <Button type="submit" isLoading={changePasswordMutation.isPending}>
                Update Password
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-[var(--color-error-500)]">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-[var(--color-error-600)]" />
            <CardTitle className="text-[var(--color-error-600)]">Danger Zone</CardTitle>
          </div>
          <CardDescription>
            Irreversible actions that affect your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-[var(--color-error-200)] bg-[var(--color-error-50)] p-4">
            <h4 className="font-medium text-[var(--color-error-700)]">Delete Account</h4>
            <p className="mt-1 text-sm text-[var(--color-error-600)]">
              Once you delete your account, there is no going back. All your tours and data will be
              permanently deleted.
            </p>
            <div className="mt-4 space-y-3">
              <Input
                placeholder='Type "DELETE" to confirm'
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
              />
              <Button
                variant="destructive"
                disabled={deleteConfirm !== 'DELETE'}
                isLoading={deleteAccountMutation.isPending}
                onClick={() => {
                  const password = prompt('Enter your password to confirm:');
                  if (password) {
                    deleteAccountMutation.mutate(password);
                  }
                }}
              >
                Delete My Account
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
