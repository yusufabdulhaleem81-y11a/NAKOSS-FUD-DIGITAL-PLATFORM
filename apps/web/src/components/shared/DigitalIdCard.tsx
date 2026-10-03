import { forwardRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { BRAND } from '@/lib/brand';
import { cn } from '@/lib/utils';
import type { MembershipCardData } from '@/services/card.service';

function initialsOf(name: string): string {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

function statusBadgeClass(status: string): string {
  if (status === 'verified' || status === 'active') return 'bg-emerald-400/25 text-emerald-100';
  if (status === 'pending') return 'bg-amber-400/25 text-amber-100';
  return 'bg-red-400/25 text-red-100';
}

/**
 * The official NAKOSS card — membership card AND EXCO ID in one component.
 * Officer mode activates automatically when `position` is present (data-driven,
 * never hardcoded). Shows BOTH logos: NAKOSS (left) + FUD (right).
 */
export const DigitalIdCard = forwardRef<HTMLDivElement, { card: MembershipCardData; className?: string }>(
  function DigitalIdCard({ card, className }, ref) {
    const isOfficer = !!card.position;
    const verifyUrl = `${window.location.origin}/verify/${card.membershipNumber}`;

    return (
      <div
        ref={ref}
        className={cn(
          'print-area relative w-[340px] overflow-hidden rounded-2xl p-5 text-white shadow-xl',
          'bg-gradient-to-br from-[#0b3d23] via-[hsl(160,74%,26%)] to-[#0f4d2b]',
          className,
        )}
      >
        {isOfficer && <div className="absolute inset-x-0 top-0 h-1.5 bg-accent" />}

        {/* Header — NAKOSS logo | titles | FUD logo */}
        <div className="flex items-center justify-between">
          <img src={BRAND.logoUrl} alt="NAKOSS" className="h-11 w-11 rounded-full bg-white/95 object-contain p-1" />
          <div className="text-center leading-tight">
            <p className="text-[15px] font-extrabold tracking-wide">{BRAND.associationName}</p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/70">{BRAND.chapter}</p>
            <p className="mt-0.5 text-[9px] uppercase tracking-widest text-white/50">
              {isOfficer ? 'Executive Council' : 'Membership'}
            </p>
          </div>
          <img src={BRAND.fudLogoUrl} alt="FUD" className="h-11 w-11 rounded-full bg-white/95 object-contain p-1" />
        </div>

        {/* Officer banner */}
        {isOfficer && (
          <div className="mt-3 rounded-lg bg-accent px-3 py-1.5 text-center text-[11px] font-bold uppercase tracking-wider text-accent-foreground">
            ✓ Verified Officer — {card.position}
          </div>
        )}

        {/* Photo + details */}
        <div className="mt-4 flex items-center gap-4">
          {card.photoUrl ? (
            <img src={card.photoUrl} alt={card.fullName} className="h-16 w-16 rounded-full border-2 border-white/40 object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/40 bg-white/10 text-lg font-bold">
              {initialsOf(card.fullName)}
            </div>
          )}
          <div className="min-w-0 flex-1 space-y-1 text-[11px]">
            <div>
              <p className="text-[9px] uppercase tracking-wider text-white/50">Name</p>
              <p className="truncate text-[13px] font-bold">{card.fullName}</p>
            </div>
            {card.matricNumber && (
              <div className="flex gap-4">
                <div><p className="text-[9px] uppercase tracking-wider text-white/50">Matric No</p><p className="font-semibold">{card.matricNumber}</p></div>
                {card.level && <div><p className="text-[9px] uppercase tracking-wider text-white/50">Level</p><p className="font-semibold">{card.level}</p></div>}
              </div>
            )}
            {card.department && (
              <div><p className="text-[9px] uppercase tracking-wider text-white/50">Faculty</p><p className="truncate font-semibold">{card.department}</p></div>
            )}
          </div>
        </div>

        {/* Bottom — number/session/status + QR */}
        <div className="mt-4 flex items-end justify-between gap-3 border-t border-white/15 pt-3">
          <div className="min-w-0 space-y-1.5">
            <div>
              <p className="text-[9px] uppercase tracking-wider text-white/50">Membership No</p>
              <p className="font-mono text-[13px] font-bold tracking-wide text-accent">{card.membershipNumber}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/70">{card.session}</span>
              <span className={cn('rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider', statusBadgeClass(card.status))}>
                {card.status}
              </span>
            </div>
          </div>
          <div className="shrink-0 rounded-md bg-white p-1.5">
            <QRCodeSVG value={verifyUrl} size={68} />
          </div>
        </div>

        <p className="mt-2 text-center text-[9px] text-white/50">Scan to verify · {BRAND.platformName}</p>
      </div>
    );
  },
);