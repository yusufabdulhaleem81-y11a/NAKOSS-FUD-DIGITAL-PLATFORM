import { Check, Copy, Download, Printer } from 'lucide-react';
import { Button, Skeleton } from '@/components/ui/primitives';
import { EmptyState, PageHeader } from '@/components/shared/misc';
import { DigitalIdCard } from '@/components/shared/DigitalIdCard';
import { useCardActions } from '@/hooks/useCardActions';
import { useMyCard } from '@/hooks/queries';

export default function MemberDashboard() {
  const { data: card, isLoading, isError } = useMyCard();
  const actions = useCardActions(card?.membershipNumber ?? '');

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="mx-auto h-[400px] w-[340px]" />
      </div>
    );
  }

  if (isError || !card) {
    return (
      <EmptyState
        title="No membership card yet"
        hint="Your official card appears here once your registration is linked to your account."
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="My Membership Card"
        description="Your official digital identity — anyone can verify it by scanning the QR code."
      />
      <div className="flex flex-col items-center gap-6">
        <DigitalIdCard ref={actions.ref} card={card} />
        <div className="no-print flex flex-wrap justify-center gap-2">
          <Button variant="outline" onClick={actions.copy}>
            {actions.copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {actions.copied ? 'Copied!' : 'Copy registration number'}
          </Button>
          <Button variant="outline" onClick={actions.download} disabled={actions.downloading}>
            <Download className="h-4 w-4" /> {actions.downloading ? 'Preparing…' : 'Download PNG'}
          </Button>
          <Button onClick={actions.print}><Printer className="h-4 w-4" /> Print card</Button>
        </div>
      </div>
    </div>
  );
}