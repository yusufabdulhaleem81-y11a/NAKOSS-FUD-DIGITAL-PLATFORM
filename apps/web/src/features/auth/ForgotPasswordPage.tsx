import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Loader2, MailCheck } from 'lucide-react';
import { Button, Card, CardContent, Input, Label } from '@/components/ui/primitives';
import { LogoMark } from '@/components/shared/misc';
import { supabase } from '@/lib/supabase';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const send = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
    },
    onSuccess: () => setSent(true),
  });

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <LogoMark className="mb-4" />
          {!sent ? (
            <>
              <h1 className="text-xl font-bold">Forgot your password?</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter your account email — we'll send you a link to set a new one.
              </p>
              <form className="mt-6 space-y-4"
                onSubmit={(e) => { e.preventDefault(); if (email) send.mutate(); }}>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="you@fud.edu.ng"
                    value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                {send.isError && <p className="text-sm text-red-600">{(send.error as Error).message}</p>}
                <Button type="submit" className="w-full" disabled={!email || send.isPending}>
                  {send.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Send reset link
                </Button>
              </form>
            </>
          ) : (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                <MailCheck className="h-7 w-7 text-emerald-600" />
              </div>
              <h1 className="text-xl font-bold">Check your email</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                If an account exists for <span className="font-medium">{email}</span>, a reset link is on its way.
                It expires shortly — check spam if it's late.
              </p>
            </div>
          )}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link to="/login" className="font-medium text-primary hover:underline">← Back to login</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
