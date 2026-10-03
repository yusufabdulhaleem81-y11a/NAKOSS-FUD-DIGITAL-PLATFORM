import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Camera, Loader2 } from 'lucide-react';
import { Button, Input, Label, Select } from '@/components/ui/primitives';
import { LogoMark } from '@/components/shared/misc';
import { registrationService } from '@/services/registration.service';
import type { RegisterInput } from '@/services/registration.service';

const schema = z.object({
  fullName: z.string().min(3, 'Enter your full name'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().min(7, 'Enter a valid phone number'),
  matricNumber: z.string().min(3, 'Enter your matric number'),
  departmentId: z.string().min(1, 'Select your faculty'),
  levelId: z.string().min(1, 'Select your level'),
  stateId: z.string().min(1, 'Select your state of origin'),
  localGovernmentId: z.string().min(1, 'Select your local government area'),
  categoryId: z.string().optional(),
  password: z.string().min(10, 'Use at least 10 characters'),
  confirm: z.string(),
}).refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Passwords do not match' });
type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const { data: ref } = useQuery({
    queryKey: ['reference-data'],
    queryFn: () => registrationService.getReferenceData(),
    staleTime: 10 * 60_000,
  });

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const input: RegisterInput = { ...values, categoryId: values.categoryId ?? '', photo };
      return registrationService.register(input);
    },
    onSuccess: (result) => navigate('/registration-success', { state: result, replace: true }),
  });

  const pickPhoto = (file: File | null) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return;
    if (file.size > 2 * 1024 * 1024) return;
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  return (
    <div className="min-h-screen py-10">
      <div className="mx-auto w-full max-w-2xl px-4">
        <div className="mb-8 flex items-center gap-3">
          <LogoMark />
          <div>
            <p className="font-bold leading-tight">Student Registration</p>
            <p className="text-xs text-muted-foreground">NAKOSS Digital — FUD Chapter</p>
          </div>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit((v) => mutation.mutate(v))}>
          {/* Personal */}
          <section className="rounded-xl border bg-card p-6">
            <h2 className="mb-4 font-semibold">Personal details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input id="fullName" placeholder="e.g. Aisha Muhammad" {...register('fullName')} />
                {errors.fullName && <p className="text-xs text-red-600">{errors.fullName.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@fud.edu.ng" {...register('email')} />
                {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone number</Label>
                <Input id="phone" type="tel" placeholder="0803 000 0000" {...register('phone')} />
                {errors.phone && <p className="text-xs text-red-600">{errors.phone.message}</p>}
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Student photo <span className="text-xs text-muted-foreground">(optional — JPEG/PNG, max 2 MB)</span></Label>
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed p-3 hover:bg-muted/50">
                  {photoPreview
                    ? <img src={photoPreview} alt="preview" className="h-12 w-12 rounded-full object-cover" />
                    : <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted"><Camera className="h-5 w-5 text-muted-foreground" /></span>}
                  <span className="text-sm text-muted-foreground">{photo ? photo.name : 'Click to choose a photo'}</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                    onChange={(e) => pickPhoto(e.target.files?.[0] ?? null)} />
                </label>
              </div>
            </div>
          </section>

          {/* Academic */}
          <section className="rounded-xl border bg-card p-6">
            <h2 className="mb-4 font-semibold">Academic details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="matric">Matric number</Label>
                <Input id="matric" placeholder="e.g. FUD/CSC/21/0183" {...register('matricNumber')} />
                {errors.matricNumber && <p className="text-xs text-red-600">{errors.matricNumber.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Faculty</Label>
                <Select {...register('departmentId')}>
                  <option value="">Select faculty…</option>
                  {(ref?.departments ?? []).map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </Select>
                {errors.departmentId && <p className="text-xs text-red-600">{errors.departmentId.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Level</Label>
                <Select {...register('levelId')}>
                  <option value="">Select level…</option>
                  {(ref?.levels ?? []).map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
                </Select>
                {errors.levelId && <p className="text-xs text-red-600">{errors.levelId.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>State of origin</Label>
                <Select {...register('stateId')}>
                  <option value="">Select state…</option>
                  {(ref?.states ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
                {errors.stateId && <p className="text-xs text-red-600">{errors.stateId.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Local Government Area</Label>
                <Select {...register('localGovernmentId')}>
                  <option value="">Select LGA…</option>
                  {(ref?.localGovernments ?? []).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </Select>
                {errors.localGovernmentId && <p className="text-xs text-red-600">{errors.localGovernmentId.message}</p>}
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Membership category <span className="text-xs text-muted-foreground">(if applicable)</span></Label>
                <Select {...register('categoryId')}>
                  <option value="">— Not specified —</option>
                  {(ref?.categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </Select>
              </div>
            </div>
          </section>

          {/* Security */}
          <section className="rounded-xl border bg-card p-6">
            <h2 className="mb-1 font-semibold">Create your login</h2>
            <p className="mb-4 text-xs text-muted-foreground">You will use this email and password to access your membership card and member portal.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" autoComplete="new-password" {...register('password')} />
                {errors.password && <p className="text-xs text-red-600">{errors.password.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm">Confirm password</Label>
                <Input id="confirm" type="password" autoComplete="new-password" {...register('confirm')} />
                {errors.confirm && <p className="text-xs text-red-600">{errors.confirm.message}</p>}
              </div>
            </div>
          </section>

          {mutation.isError && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{(mutation.error as Error).message}</p>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Complete registration
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Already registered? <Link to="/login" className="font-medium text-primary hover:underline">Member login</Link>
          </p>
        </form>
      </div>
    </div>
  );
}