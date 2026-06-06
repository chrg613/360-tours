import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react';
import { Button, Input, PhoneInput, Checkbox } from '@/components/ui';
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
    control,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      phone: '',
      password: '',
      confirm_password: '',
      full_name: '',
      email: '',
      acceptTerms: false,
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
        <Controller
          name="phone"
          control={control}
          render={({ field }) => (
            <PhoneInput
              name="phone"
              value={field.value}
              onChange={field.onChange}
              error={errors.phone?.message}
              placeholder="Phone number"
              ariaLabel="Phone number"
              autoComplete="tel"
              required
            />
          )}
        />

        {/* Full Name (Optional) */}
        <div className="relative">
          <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <Input
            {...register('full_name')}
            type="text"
            placeholder="Full name (optional)"
            aria-label="Full name"
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
            aria-label="Email address"
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
            aria-label="Password"
            autoComplete="new-password"
            required
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
            aria-label="Confirm password"
            autoComplete="new-password"
            required
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
        <div>
          <div className="flex items-start gap-2">
            <Controller
              name="acceptTerms"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="acceptTerms"
                  className="mt-0.5"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <label htmlFor="acceptTerms" className="text-sm text-[var(--color-text-muted)]">
              I agree to the{' '}
              <a
                href="https://360ghar.com/policies/terms-of-service"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-primary-600)] hover:underline"
              >
                Terms of Service
              </a>{' '}
              and{' '}
              <a
                href="https://360ghar.com/policies/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-primary-600)] hover:underline"
              >
                Privacy Policy
              </a>
            </label>
          </div>
          {errors.acceptTerms?.message && (
            <p className="mt-1 text-sm text-[var(--color-error-600)]">{errors.acceptTerms.message}</p>
          )}
        </div>

        {/* Submit Button */}
        <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
          Create account
        </Button>
      </form>
    </div>
  );
}
