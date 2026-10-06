import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Badge, Button, Input, Label, Select } from '@/components/ui/primitives';
import { LogoMark } from '@/components/shared/misc';
import { adminService } from '@/services/admin.service';
import { registrationService } from '@/services/registration.service';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';
import { homeForRoles } from '@/lib/roles';

export default function InviteAcceptPage() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const loginCompleted = useAuthStore((s) => s.loginCompleted);

  const { data: invite, isLoading, isError } = useQuery({
    queryKey: ['invite', token],
    queryFn: () => adminService.validateInvite(token),
    retry: false,
  });
  const { data: ref } = useQuery({
    queryKey: ['reference-data'],
    queryFn: () => registrationService.getReferenceData(),
    staleTime: 10 * 60_000,
    enabled: !!invite,
  });

  const [form, setForm] = useState({
    fullName: '', matricNumber: '', departmentId: '', levelId: '', stateId: '',
    password: '', confirm: '',
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const accept = useMutation({
    mutationFn: () => adminService.acceptInvite({
      token, fullName: invite?.fullName || form.fullName,
      matricNumber: form.matricNumber, departmentId: form.departmentId,
      levelId: form.levelId, stateId: form.stateId, password: form.password,
      photo,
    }),
    onSuccess: async () => {
      const profile = await authService.login(invite!.email, form.password);
      loginCompleted(profile);
      navigate(homeForRoles(profile.roles), { replace: true });
    },
  });

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (isError || !invite) {
    return (
      <CenteredCard>
        <LogoMark className="mb-4" />
        <h1 className="text-xl font-bold">Invitation invalid</h1>
        <p className="mt-2 text-sm text-muted-foreground">This invitation link is invalid, already used, or expired. Ask the Central Admin for a new one.</p>
      </CenteredCard>
    );
  }

  const passwordsMatch = form.password === form.confirm;
  const hasName = !!invite.fullName || form.fullName.trim().length >= 3;
  const valid = hasName && form.matricNumber.length >= 3
    && !!form.departmentId && !!form.levelId && !!form.stateId;

  return (
    <CenteredCard wide>
      <div className="mb-6 flex items-center gap-3">
        <LogoMark />
        <div>
          <h1 className="text-lg font-bold leading-tight">EXCO Invitation</h1>
          <p className="text-xs text-muted-foreground">Complete your officer profile to activate your account.</p>
        </div>
      </div>

      <div className="mb-5 rounded-xl bg-secondary p-4">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge className="bg-emerald-100 text-emerald-700">{invite.positionTitle}</Badge>
          <span className="text-muted-foreground">· administration {invite.sessionLabel}</span>
        </div>
        <p className="mt-2 text-sm"><span className="text-muted-foreground">Login email:</span> <span className="font-medium">{invite.email}</span></p>
      </div>

      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (valid && passwordsMatch) accept.mutate(); }}>
        {!invite.fullName && (
          <div className="space-y-1.5"><Label>Full name</Label><Input value={form.fullName} onChange={set('fullName')} /></div>
        )}
        <div className="space-y-1.5"><Label>Matric number</Label><Input placeholder="e.g. FUD/CSC/21/0183" value={form.matricNumber} onChange={set('matricNumber')} /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Faculty</Label>
            <Select value={form.departmentId} onChange={set('departmentId')}>
              <option value="">Select faculty…</option>
              {(ref?.departments ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select></div>
          <div className="space-y-1.5"><Label>Level</Label>
            <Select value={form.levelId} onChange={set('levelId')}>
              <option value="">Select…</option>
              {(ref?.levels ?? []).map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
            </Select></div>
        </div>
        <div className="space-y-1.5"><Label>Local Government Area</Label>
          <Select value={form.stateId} onChange={set('stateId')}>
            <option value="">Select LGA…</option>
            {(ref?.states ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select></div>
        <div className="space-y-1.5">
          <Label>Passport photo <span className="text-xs text-muted-foreground">(JPEG/PNG, max 2 MB — appears on your digital ID card)</span></Label>
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed p-3 hover:bg-muted/50">
            {photoPreview
              ? <img src={photoPreview} alt="preview" className="h-12 w-12 rounded-full object-cover" />
              : <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground">Photo</span>}
            <span className="text-sm text-muted-foreground">{photo ? photo.name : 'Click to choose a photo'}</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                if (f && ['image/jpeg','image/png','image/webp'].includes(f.type) && f.size <= 2 * 1024 * 1024) {
                  setPhoto(f); setPhotoPreview(URL.createObjectURL(f));
                }
              }} />
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Create password</Label><Input type="password" autoComplete="new-password" value={form.password} onChange={set('password')} /></div>
          <div className="space-y-1.5"><Label>Confirm password</Label><Input type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} /></div>
        </div>
        {form.confirm && !passwordsMatch && <p className="text-xs text-red-600">Passwords do not match</p>}
        {accept.isError && <p className="text-sm text-red-600">{(accept.error as Error).message}</p>}
        <Button type="submit" className="w-full" size="lg"
          disabled={!valid || !passwordsMatch || form.password.length < 10 || accept.isPending}>
          {accept.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Activate my account
        </Button>
        <p className="text-center text-xs text-muted-foreground">Password: minimum 10 characters. You'll land directly on your EXCO dashboard.</p>
      </form>
    </CenteredCard>
  );
}

function CenteredCard({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className={`w-full rounded-xl border bg-card p-8 shadow-sm ${wide ? 'max-w-xl' : 'max-w-md'}`}>{children}</div>
    </div>
  );
}