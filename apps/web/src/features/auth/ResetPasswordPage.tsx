import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { KeyRound, Loader2 } from 'lucide-react';
import { Button, Card, CardContent, Input, Label } from '@/components/ui/primitives';
import { LogoMark } from '@/components/shared/misc';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const reset = useMutation({
    mutationFn: async () => {
      if (password.length < 10) throw new Error('Use at least 10 characters');
      if (password !== confirm) throw new Error('Passwords do not match');
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
    },
    onSuccess: () => navigate('/login', { replace: true }),
  });

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
          <form className="mt-6 space-y-4"
            onSubmit={(e) => { e.preventDefault(); setError(null); reset.mutate(); }}>
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
            {(error || reset.isError) && (
              <p className="text-sm text-red-600">{error ?? (reset.error as Error).message}</p>
            )}
            <Button type="submit" className="w-full" disabled={reset.isPending}>
              {reset.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
