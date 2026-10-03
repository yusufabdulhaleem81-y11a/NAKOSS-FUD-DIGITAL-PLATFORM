import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, ShieldCheck } from 'lucide-react';
import { Button, Card, CardContent, Input, Label } from '@/components/ui/primitives';
import { LogoMark } from '@/components/shared/misc';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';
import { homeForRoles } from '@/lib/roles';

const schema = z.object({
  password: z.string().min(10, 'Use at least 10 characters'),
  confirm: z.string(),
}).refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Passwords do not match' });
type FormValues = z.infer<typeof schema>;

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const markPasswordChanged = useAuthStore((s) => s.markPasswordChanged);
  const profile = useAuthStore((s) => s.profile);
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: (v: FormValues) => authService.changePassword(v.password),
    onSuccess: () => { markPasswordChanged(); navigate(homeForRoles(profile?.roles ?? ['student']), { replace: true }); },
  });

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <LogoMark className="mb-4" />
          <h1 className="flex items-center gap-2 text-xl font-bold"><ShieldCheck className="h-5 w-5 text-primary" /> Change your password</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            You are using a temporary or first-login credential. Create your permanent password to continue — nobody else can see or set it.
          </p>
          <form className="mt-6 space-y-4" onSubmit={handleSubmit((v) => mutation.mutate(v))}>
            <div className="space-y-1.5">
              <Label htmlFor="password">New password</Label>
              <Input id="password" type="password" {...register('password')} />
              {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirm new password</Label>
              <Input id="confirm" type="password" {...register('confirm')} />
              {errors.confirm && <p className="text-xs text-red-600">{errors.confirm.message}</p>}
            </div>
            {mutation.isError && <p className="text-sm text-red-600">{(mutation.error as Error).message}</p>}
            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}