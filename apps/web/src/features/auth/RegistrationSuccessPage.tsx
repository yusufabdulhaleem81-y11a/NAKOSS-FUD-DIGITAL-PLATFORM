import { Link, Navigate, useLocation } from 'react-router-dom';
import { Check, CheckCircle2, Copy, Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/primitives';
import { DigitalIdCard } from '@/components/shared/DigitalIdCard';
import { useCardActions } from '@/hooks/useCardActions';
import type { RegistrationResult } from '@/services/registration.service';

export default function RegistrationSuccessPage() {
  const location = useLocation();
  const result = location.state as RegistrationResult | undefined;

  if (!result) return <Navigate to="/register" replace />;

  const { ref, copied, downloading, copy, download, print } = useCardActions(result.membershipNumber);

  return (
    <div className="min-h-screen py-10">
      <div className="mx-auto w-full max-w-xl px-4 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-9 w-9 text-emerald-600" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Student Registration Successful!</h1>
        <p className="mt-2 text-muted-foreground">Welcome to NAKOSS, {result.fullName.split(' ')[0]}. Your official membership card is ready below.</p>

        <div className="mx-auto mt-6 w-full max-w-sm rounded-xl border bg-card p-5 text-left">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Registration number</p>
              <p className="font-mono text-lg font-bold text-primary">{result.membershipNumber}</p>
            </div>
            <Button size="sm" variant="outline" onClick={copy}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
          <div className="mt-3 space-y-1 text-sm">
            <p><span className="text-muted-foreground">Name:</span> <span className="font-medium">{result.fullName}</span></p>
            <p><span className="text-muted-foreground">Status:</span>
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">{result.status}</span>
              <span className="ml-2 text-xs text-muted-foreground">(pending admin verification)</span>
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center gap-4">
          <DigitalIdCard ref={ref} card={{ ...result, position: null }} />
          <div className="no-print flex flex-wrap justify-center gap-2">
            <Button variant="outline" onClick={download} disabled={downloading}>
              <Download className="h-4 w-4" /> {downloading ? 'Preparing…' : 'Download'}
            </Button>
            <Button variant="outline" onClick={print}><Printer className="h-4 w-4" /> Print card</Button>
            <Link to="/login" className="no-print inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              Go to Member Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}