import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { BadgeCheck, CheckCircle2, Search, ShieldX } from 'lucide-react';
import { Button, Input } from '@/components/ui/primitives';
import { LogoMark } from '@/components/shared/misc';
import { verifyService } from '@/services/verify.service';
import { BRAND } from '@/lib/brand';
import { cn } from '@/lib/utils';

const STATUS_STYLE: Record<string, string> = {
  verified: 'bg-emerald-100 text-emerald-700',
  active: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-800',
  suspended: 'bg-red-100 text-red-700',
  graduated: 'bg-slate-100 text-slate-600',
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-2.5 last:border-0">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium">{value}</span>
    </div>
  );
}

export default function VerifyPage() {
  const { membershipNumber = '' } = useParams();
  const navigate = useNavigate();
  const [manual, setManual] = useState('');

  const { data: outcome, isLoading, isError, error } = useQuery({
    queryKey: ['verify', membershipNumber],
    queryFn: () => verifyService.verify(membershipNumber),
    enabled: membershipNumber.length > 0,
    retry: false,
    staleTime: 0,
  });

  return (
    <div className="min-h-screen bg-background py-10">
      <div className="mx-auto w-full max-w-md px-4">
        {/* Brand strip */}
        <div className="flex items-center justify-between rounded-t-2xl bg-gradient-to-br from-[#0b3d23] via-[hsl(160,74%,26%)] to-[#0f4d2b] p-5 text-white">
          <div className="flex items-center gap-3">
            <img src={BRAND.logoUrl} alt="NAKOSS" className="h-10 w-10 rounded-full bg-white/95 object-contain p-1" />
            <div className="leading-tight">
              <p className="text-sm font-extrabold tracking-wide">{BRAND.associationName}</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/70">{BRAND.chapter}</p>
            </div>
          </div>
          <img src={BRAND.fudLogoUrl} alt="FUD" className="h-10 w-10 rounded-full bg-white/95 object-contain p-1" />
        </div>

        {/* Result card */}
        <div className="rounded-b-2xl border border-t-0 bg-card p-6 shadow-sm">
          {membershipNumber.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Enter a membership number below to verify.</p>
          ) : isLoading ? (
            <div className="py-10 text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="mt-4 text-sm text-muted-foreground">Verifying…</p>
            </div>
          ) : isError ? (
            <div className="py-6 text-center">
              <ShieldX className="mx-auto h-12 w-12 text-red-500" />
              <p className="mt-3 font-semibold">Verification unavailable</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {(error as Error)?.message ?? 'Something went wrong. Please try again.'}
              </p>
            </div>
          ) : outcome?.found ? (
            <>
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle2 className="h-9 w-9 text-emerald-600" />
                </div>
                <p className="mt-3 text-xl font-extrabold tracking-tight text-emerald-700">✓ VERIFIED</p>
                {outcome.data.officerVerified && outcome.data.positionTitle && (
                  <div className="mt-3 rounded-lg bg-accent px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-accent-foreground">
                    <BadgeCheck className="mr-1 inline h-3.5 w-3.5" /> Verified Officer — {outcome.data.positionTitle}
                  </div>
                )}
              </div>

              <div className="mt-5">
                <Field label="Name" value={outcome.data.fullName} />
                <Field label="Faculty" value={outcome.data.department} />
                <Field label="Level" value={outcome.data.level} />
                <Field label="Membership ID" value={<span className="font-mono text-primary">{outcome.data.membershipNumber}</span>} />
                <Field label="Status" value={
                  <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', STATUS_STYLE[outcome.data.status] ?? 'bg-muted text-muted-foreground')}>
                    {outcome.data.status}
                  </span>
                } />
                <Field label="Administration" value={outcome.data.sessionLabel} />
              </div>

              <p className="mt-4 text-center text-[11px] text-muted-foreground">
                Verified {format(new Date(), 'd MMM yyyy, HH:mm')} · This check is logged.
              </p>
            </>
          ) : (
            <div className="py-6 text-center">
              <ShieldX className="mx-auto h-12 w-12 text-red-500" />
              <p className="mt-3 text-lg font-bold">Not Found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                No member exists with the number <span className="font-mono font-semibold">{membershipNumber.toUpperCase()}</span>.
                Check the number and try again.
              </p>
            </div>
          )}
        </div>

        {/* Manual check */}
        <form className="mt-6 flex gap-2"
          onSubmit={(e) => { e.preventDefault(); if (manual.trim()) navigate(`/verify/${manual.trim().toUpperCase()}`); }}>
          <Input placeholder="Enter membership no. e.g. NAKOSS-2026-0001" value={manual}
            onChange={(e) => setManual(e.target.value)} className="font-mono" />
          <Button type="submit" size="icon" aria-label="Verify" disabled={!manual.trim()}>
            <Search className="h-4 w-4" />
          </Button>
        </form>

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          Powered by {BRAND.platformName} · Only name, faculty, level, status and administration are shown — never private data.
        </p>
      </div>
    </div>
  );
}