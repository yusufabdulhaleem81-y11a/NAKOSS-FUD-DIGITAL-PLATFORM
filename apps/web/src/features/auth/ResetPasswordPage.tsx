import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { KeyRound, Loader2, ShieldX } from 'lucide-react';
import { Button, Card, CardContent, Input, Label } from '@/components/ui/primitives';
import { LogoMark } from '@/components/shared/misc';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [sessionState, setSessionState] = useState<'checking' | 'ready' | 'invalid'>('checking');
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const establishSession = async () => {
      let exchangeError: string | null = null;
      const code = new URLSearchParams(window.location.search).get('code');
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) exchangeError = error.message;
      }

      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        setSessionError(error.message);
        setSessionState('invalid');
        return;
      }

      setSessionError(exchangeError);
      setSessionState(session ? 'ready' : 'invalid');
    };

    void establishSession().catch((caught: unknown) => {
      setSessionError(caught instanceof Error ? caught.message : 'Could not verify this reset link.');
      setSessionState('invalid');
    });
  }, []);

  const reset = useMutation({
    mutationFn: async () => {
      if (password.length < 10) throw new Error('Use at least 10 characters');
      if (password !== confirm) throw new Error('Passwords do not match');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Your reset link has expired — please request a new one.');
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
    },
    onSuccess: () => navigate('/login', { replace: true }),
  });

  if (sessionState === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (sessionState === 'invalid') {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <LogoMark className="mx-auto mb-4" />
            <ShieldX className="mx-auto mb-3 h-8 w-8 text-red-600" />
            <h1 className="text-xl font-bold">Link invalid or expired</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Reset links are single-use and expire quickly. Request a new link to reset your password.
            </p>
            {sessionError && <p className="mt-3 text-sm text-red-600">{sessionError}</p>}
            <Button type="button" className="mt-6 w-full" onClick={() => navigate('/forgot-password')}>
              Request a new reset link
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <LogoMark className="mb-4" />
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <KeyRound className="h-5 w-5 text-primary" /> Set a new password
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose a new permanent password — minimum 10 characters.
          </p>
          {sessionError && <p className="mt-3 text-sm text-red-600">{sessionError}</p>}
          <form className="mt-6 space-y-4"
            onSubmit={(e) => { e.preventDefault(); reset.mutate(); }}>
            <div className="space-y-1.5">
              <Label htmlFor="password">New password</Label>
              <Input id="password" type="password" autoComplete="new-password"
                value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirm new password</Label>
              <Input id="confirm" type="password" autoComplete="new-password"
                value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
            {reset.isError && <p className="text-sm text-red-600">{(reset.error as Error).message}</p>}
            <Button type="submit" className="w-full" disabled={reset.isPending}>
              {reset.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
