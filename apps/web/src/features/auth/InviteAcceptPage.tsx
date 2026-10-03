import { useNavigate, useParams } from 'react-router-dom';
import { Badge, Button, Card, CardContent, Input, Label } from '@/components/ui/primitives';
import { LogoMark } from '@/components/shared/misc';

/**
 * UI-complete; the accept endpoint arrives with the invitation system (Phase 3).
 * Central Admin → token → this page creates the account + password.
 */
export default function InviteAcceptPage() {
  const { token } = useParams();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <LogoMark className="mb-4" />
          <h1 className="text-xl font-bold">EXCO Invitation</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            You have been invited to serve on the NAKOSS Executive Council. Invitation token:
          </p>
          <Badge className="mt-3 bg-secondary text-secondary-foreground">{token}</Badge>

          <div className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label>Confirm your email</Label>
              <Input type="email" placeholder="you@fud.edu.ng" />
            </div>
            <div className="space-y-1.5">
              <Label>Create your password</Label>
              <Input type="password" placeholder="Minimum 10 characters" />
            </div>
            <Button className="w-full" onClick={() => navigate('/login')}>
              Accept invitation
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Acceptance is enabled once the backend invitation endpoints land (Phase 3).
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}