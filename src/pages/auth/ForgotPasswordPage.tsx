import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { authApi } from '@/api';
import { forgotPasswordSchema, type ForgotPasswordFormData } from '@/utils/validation';
import { ROUTES } from '@/constants';

export function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    setError(null);
    try {
      await authApi.forgotPassword(data.email);
      setIsSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="animate-fade-in text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-success-50)]">
          <CheckCircle className="h-8 w-8 text-[var(--color-success-600)]" />
        </div>
        <h2 className="mt-6 text-2xl font-bold text-[var(--color-text-primary)]">Check your email</h2>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          We sent a password reset link to{' '}
          <span className="font-medium text-[var(--color-text-primary)]">{getValues('email')}</span>
        </p>
        <p className="mt-4 text-sm text-[var(--color-text-muted)]">
          Didn't receive the email? Check your spam folder or{' '}
          <button
            onClick={() => setIsSuccess(false)}
            className="font-medium text-[var(--color-primary-600)] hover:underline"
          >
            try another email address
          </button>
        </p>
        <Link to={ROUTES.LOGIN}>
          <Button variant="outline" className="mt-8 w-full">
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <Link
        to={ROUTES.LOGIN}
        className="inline-flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to sign in
      </Link>

      <h2 className="mt-6 text-2xl font-bold text-[var(--color-text-primary)]">Forgot password?</h2>
      <p className="mt-2 text-sm text-[var(--color-text-muted)]">
        No worries, we'll send you reset instructions.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6">
        {/* Error Message */}
        {error && (
          <div className="rounded-lg bg-[var(--color-error-50)] p-3 text-sm text-[var(--color-error-600)]">
            {error}
          </div>
        )}

        {/* Email */}
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <Input
            {...register('email')}
            type="email"
            placeholder="Email address"
            autoComplete="email"
            error={errors.email?.message}
            className="pl-10"
          />
        </div>

        {/* Submit Button */}
        <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
          Reset password
        </Button>
      </form>
    </div>
  );
}
