import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Mail, Lock, User, Phone } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { useAuthStore } from '@/stores';
import { registerSchema, type RegisterFormData } from '@/utils/validation';
import { ROUTES } from '@/constants';

export function RegisterPage() {
  const navigate = useNavigate();
  const { register: registerUser, isLoading, error } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      phone: '',
      password: '',
      confirm_password: '',
      full_name: '',
      email: '',
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await registerUser({
        phone: data.phone,
        password: data.password,
        full_name: data.full_name || undefined,
        email: data.email || undefined,
      });
      navigate(ROUTES.DASHBOARD, { replace: true });
    } catch {
      // Error is handled by the store
    }
  };

  return (
    <div className="animate-fade-in">
      <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">Create your account</h2>
      <p className="mt-2 text-sm text-[var(--color-text-muted)]">
        Start creating stunning virtual tours today
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
        {/* Error Message */}
        {error && (
          <div className="rounded-lg bg-[var(--color-error-50)] p-3 text-sm text-[var(--color-error-600)]">
            {error}
          </div>
        )}

        {/* Phone (Required) */}
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <Input
            {...register('phone')}
            type="tel"
            placeholder="Phone number (e.g., +919876543210)"
            autoComplete="tel"
            error={errors.phone?.message}
            className="pl-10"
          />
        </div>

        {/* Full Name (Optional) */}
        <div className="relative">
          <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <Input
            {...register('full_name')}
            type="text"
            placeholder="Full name (optional)"
            autoComplete="name"
            error={errors.full_name?.message}
            className="pl-10"
          />
        </div>

        {/* Email (Optional) */}
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <Input
            {...register('email')}
            type="email"
            placeholder="Email address (optional)"
            autoComplete="email"
            error={errors.email?.message}
            className="pl-10"
          />
        </div>

        {/* Password */}
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <Input
            {...register('password')}
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            autoComplete="new-password"
            error={errors.password?.message}
            className="pl-10 pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>

        {/* Confirm Password */}
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <Input
            {...register('confirm_password')}
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="Confirm password"
            autoComplete="new-password"
            error={errors.confirm_password?.message}
            className="pl-10 pr-10"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
          >
            {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>

        {/* Terms */}
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            required
            className="mt-1 h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-primary-600)] focus:ring-[var(--color-primary-500)]"
          />
          <span className="text-sm text-[var(--color-text-muted)]">
            I agree to the{' '}
            <a href="#" className="text-[var(--color-primary-600)] hover:underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="text-[var(--color-primary-600)] hover:underline">
              Privacy Policy
            </a>
          </span>
        </label>

        {/* Submit Button */}
        <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
          Create account
        </Button>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[var(--color-border)]" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-[var(--color-background)] px-2 text-[var(--color-text-muted)]">
              Or sign up with
            </span>
          </div>
        </div>

        {/* Social Signup Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <Button type="button" variant="outline" className="w-full">
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google
          </Button>
          <Button type="button" variant="outline" className="w-full">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            Facebook
          </Button>
        </div>
      </form>
    </div>
  );
}
