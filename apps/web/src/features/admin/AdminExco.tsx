import { useState } from 'react';
import { Check, Copy, KeyRound, Link2, Search, UserPlus } from 'lucide-react';
import { Badge, Button, Input, Label, Select } from '@/components/ui/primitives';
import { DataTable } from '@/components/shared/DataTable';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { PageHeader } from '@/components/shared/misc';
import { AdminNav } from './AdminNav';
import { useOfficers, usePositions, useAssignPosition, useEndAssignment, useInviteOfficer, useTempPassword, useAdminMembers } from '@/hooks/adminQueries';

export default function AdminExco() {
  const { data: officers = [] } = useOfficers();
  const { data: positions = [] } = usePositions();
  const endAssignment = useEndAssignment();
  const [tempFor, setTempFor] = useState<{ profileId: string; name: string } | null>(null);

  return (
    <div>
      <PageHeader title="EXCO Management" description="Invite officers, assign positions, and issue one-time passwords." />
      <AdminNav />

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <AssignPositionCard positions={positions} />
        <InviteOfficerCard positions={positions} />
      </div>

      <h2 className="mb-3 text-lg font-semibold">Current administration officers</h2>
      <DataTable
        rows={officers} keyOf={(o) => o.assignmentId}
        empty={<p className="py-10 text-center text-sm text-muted-foreground">No officers yet — assign a position or send an invite link below.</p>}
        columns={[
          { header: 'Position', cell: (o) => <span className="font-medium">{o.position}</span> },
          { header: 'Officer', cell: (o) => (
            <div><p>{o.memberName}</p><p className="font-mono text-xs text-muted-foreground">{o.membershipNumber}</p></div>
          )},
          { header: 'Status', cell: (o) => (
            <Badge className={o.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'}>{o.status}</Badge>
          )},
          { header: '', className: 'text-right', cell: (o) => (
            <div className="flex justify-end gap-2">
              {o.profileId && o.status === 'active' && (
                <Button size="sm" variant="outline" onClick={() => setTempFor({ profileId: o.profileId!, name: o.memberName })}>
                  <KeyRound className="h-3 w-3" /> Temp password
                </Button>
              )}
              {o.status === 'active' && (
                <Button size="sm" variant="ghost" className="text-red-600" disabled={endAssignment.isPending}
                  onClick={() => { if (window.confirm(`End ${o.memberName}'s ${o.position} assignment?`)) endAssignment.mutate(o.assignmentId); }}>
                  End
                </Button>
              )}
            </div>
          )},
        ]}
      />

      {tempFor && <TempPasswordDialog profileId={tempFor.profileId} name={tempFor.name} onClose={() => setTempFor(null)} />}
    </div>
  );
}

function AssignPositionCard({ positions }: { positions: { id: string; title: string }[] }) {
  const [q, setQ] = useState('');
  const [memberId, setMemberId] = useState('');
  const [positionId, setPositionId] = useState('');
  const { data } = useAdminMembers({ page: 1, q, status: '' });
  const assign = useAssignPosition();

  const candidates = (data?.data ?? []).slice(0, 10);

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="mb-1 flex items-center gap-2"><UserPlus className="h-4 w-4 text-primary" /><p className="font-semibold">Assign a position</p></div>
      <p className="mb-4 text-sm text-muted-foreground">For members who already registered. Grant instantly — no email involved.</p>

      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search a member by name or matric…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {q.length >= 2 && candidates.length > 0 && (
          <div className="max-h-40 overflow-y-auto rounded-lg border">
            {candidates.map((m) => (
              <button key={m.id} type="button"
                className={`block w-full px-3 py-2 text-left text-sm hover:bg-muted ${memberId === m.id ? 'bg-secondary' : ''}`}
                onClick={() => { setMemberId(m.id); setQ(m.fullName); }}>
                {m.fullName} <span className="text-xs text-muted-foreground">· {m.matricNumber} · {m.membershipNumber}</span>
              </button>
            ))}
          </div>
        )}
        <div className="space-y-1.5">
          <Label>Position</Label>
          <Select value={positionId} onChange={(e) => setPositionId(e.target.value)}>
            <option value="">Select position…</option>
            {positions.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </Select>
        </div>
        {assign.isError && <p className="text-sm text-red-600">{(assign.error as Error).message}</p>}
        <Button className="w-full" disabled={!memberId || !positionId || assign.isPending}
          onClick={() => assign.mutate({ memberId, positionId }, { onSuccess: () => { setMemberId(''); setPositionId(''); setQ(''); } })}>
          {assign.isPending ? 'Assigning…' : 'Assign position'}
        </Button>
      </div>
    </div>
  );
}

function InviteOfficerCard({ positions }: { positions: { id: string; title: string }[] }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [positionId, setPositionId] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const invite = useInviteOfficer();

  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="mb-1 flex items-center gap-2"><Link2 className="h-4 w-4 text-primary" /><p className="font-semibold">Invite a new officer</p></div>
      <p className="mb-4 text-sm text-muted-foreground">Generates a link — send it via WhatsApp/SMS. No email needed; works around Supabase email limits.</p>

      <div className="space-y-3">
        <div className="space-y-1.5"><Label>Officer full name</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Email (their login)</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Position</Label>
          <Select value={positionId} onChange={(e) => setPositionId(e.target.value)}>
            <option value="">Select position…</option>
            {positions.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </Select>
        </div>
        {invite.isError && <p className="text-sm text-red-600">{(invite.error as Error).message}</p>}
        <Button className="w-full" disabled={!fullName || !email || !positionId || invite.isPending}
          onClick={() => invite.mutate({ fullName, email, positionId }, {
            onSuccess: (r) => { setResult(`${window.location.origin}/invite/${r.token}`); setFullName(''); setEmail(''); setPositionId(''); },
          })}>
          {invite.isPending ? 'Creating…' : 'Generate invite link'}
        </Button>
      </div>

      <Dialog open={!!result} onOpenChange={(v: boolean) => !v && setResult(null)}>
        <DialogContent>
          <DialogTitle>Invitation link ready</DialogTitle>
          <DialogDescription>Valid for 7 days, single use. Send it to the officer via WhatsApp, SMS or in person.</DialogDescription>
          <div className="mt-4 break-all rounded-lg bg-muted p-3 font-mono text-xs">{result}</div>
          <CopyButton text={result ?? ''} label="Copy link" />
          <p className="mt-3 text-xs text-muted-foreground">The officer opens the link, completes a short form (matric, faculty, level, state) and sets their own password.</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TempPasswordDialog({ profileId, name, onClose }: { profileId: string; name: string; onClose: () => void }) {
  const [result, setResult] = useState<string | null>(null);
  const temp = useTempPassword();

  return (
    <Dialog open onOpenChange={(v: boolean) => !v && onClose()}>
      <DialogContent>
        {!result ? (
          <>
            <DialogTitle>Temporary password — {name}</DialogTitle>
            <DialogDescription>One-time use, expires in 24 hours. The officer must create a new permanent password at first login.</DialogDescription>
            {temp.isError && <p className="mt-3 text-sm text-red-600">{(temp.error as Error).message}</p>}
            <Button className="mt-4 w-full" disabled={temp.isPending}
              onClick={() => temp.mutate(profileId, { onSuccess: (r) => setResult(r.tempPassword) })}>
              {temp.isPending ? 'Generating…' : 'Generate temporary password'}
            </Button>
          </>
        ) : (
          <>
            <DialogTitle>Copy it now — shown only once</DialogTitle>
            <div className="mt-4 rounded-lg bg-primary/5 p-4 text-center">
              <p className="font-mono text-2xl font-bold tracking-wider text-primary">{result}</p>
            </div>
            <CopyButton text={result} label="Copy password" />
            <p className="mt-3 text-xs text-muted-foreground">Deliver via WhatsApp/SMS/in person. Never store it anywhere. On first login the officer is forced to create their own password.</p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button className="mt-3 w-full" variant="outline" onClick={async () => {
      await navigator.clipboard.writeText(text);
      setCopied(true); setTimeout(() => setCopied(false), 1500);
    }}>
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? 'Copied!' : label}
    </Button>
  );
}