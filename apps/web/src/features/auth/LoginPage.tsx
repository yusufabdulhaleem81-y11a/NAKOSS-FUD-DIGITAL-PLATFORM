import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Button, Card, CardContent, Input, Label, Select } from '@/components/ui/primitives';
import { LogoMark } from '@/components/shared/misc';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';
import { useCurrentAdministration } from '@/hooks/queries';
import { USE_MOCKS } from '@/lib/env';
import { homeForRoles } from '@/lib/roles';
import { setDevMustChangePassword, setDevRole } from '@/mocks/auth';
import { BRAND } from '@/lib/brand';
import type { AppRole } from '@/types/auth';

const schema = z.object({ email: z.string().email(), password: z.string().min(8, 'Minimum 8 characters') });
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const status = useAuthStore((s) => s.status);
  const profile = useAuthStore((s) => s.profile);
  const loginCompleted = useAuthStore((s) => s.loginCompleted);
  const navigate = useNavigate();
  const location = useLocation();
  const [devRole, setDevRoleState] = useState<AppRole>('president');
  const { data: administration } = useCurrentAdministration();

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => authService.login(values.email, values.password),
    onSuccess: (p) => { loginCompleted(p); navigate((location.state as any)?.from ?? homeForRoles(p.roles), { replace: true }); },
  });

  if (status === 'authenticated' && profile && !profile.mustChangePassword) {
    return <Navigate to={homeForRoles(profile.roles)} replace />;
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="flex items-center gap-3">
          <LogoMark className="bg-white/15 text-white" />
          <div>
            <p className="text-lg font-bold leading-tight">{BRAND.platformName}</p>
            <p className="text-xs opacity-80">{BRAND.chapter}</p>
          </div>
        </div>
        <div className="relative max-w-md">
          <h1 className="text-4xl font-extrabold leading-tight">One identity.<br />Every administration.</h1>
          <p className="mt-4 text-sm opacity-80">Membership, governance and resources for the NAKOSS community — built to outlast every administration.</p>
          {administration && (
            <div className="mt-8 rounded-xl bg-white/10 p-5 backdrop-blur">
              <p className="text-xs uppercase tracking-wide opacity-70">Current Administration</p>
              <p className="mt-1 text-xl font-bold">{administration.sessionLabel}</p>
              {administration.motto && <p className="mt-1 text-sm italic opacity-80">“{administration.motto}”</p>}
              <div className="mt-4 flex gap-6 text-sm">
                <div><p className="text-xs opacity-70">President</p><p className="font-medium">{administration.presidentName ?? '—'}</p></div>
                <div><p className="text-xs opacity-70">Vice President</p><p className="font-medium">{administration.vicePresidentName ?? '—'}</p></div>
              </div>
            </div>
          )}
        </div>
        <p className="text-xs opacity-60">© {new Date().getFullYear()} {BRAND.fullName}</p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <LogoMark />
            <p className="font-bold">{BRAND.platformName} <span className="text-muted-foreground">· {BRAND.chapter}</span></p>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Sign in</h2>
          <p className="mt-1 text-sm text-muted-foreground">Members, EXCO officers and administrators.</p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit((v) => mutation.mutate(v))}>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@fud.edu.ng" {...register('email')} />
              {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" {...register('password')} />
              {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
            </div>
            {mutation.isError && <p className="text-sm text-red-600">{(mutation.error as Error).message}</p>}
            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Sign in
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            New student? <Link to="/register" className="font-medium text-primary hover:underline">Register here</Link>
          </p>

          {USE_MOCKS && (
            <Card className="mt-6 border-dashed">
              <CardContent className="p-4 text-xs text-muted-foreground">
                <p className="mb-2 font-semibold text-foreground">Developer mode (mock auth)</p>
                <p className="mb-3">Any email + password (8+ chars) signs you in as the selected role.</p>
                <Select value={devRole} onChange={(e) => setDevRoleState(e.target.value as AppRole)}>
                  <option value="president">President</option>
                  <option value="vice_president">Vice President</option>
                  <option value="exco">EXCO (P.R.O 1)</option>
                  <option value="student">Student</option>
                  <option value="central_admin">Central Admin</option>
                </Select>
                <div className="mt-2 flex gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => setDevRole(devRole)}>Use role</Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setDevMustChangePassword(true)}>
                    Preview forced password change
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}