import { useRef, useState } from 'react';
import { toPng } from 'html-to-image';

/** Shared card actions: Copy number · Download PNG · Print (print CSS shows only the card). */
export function useCardActions(membershipNumber: string) {
  const ref = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(membershipNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const download = async () => {
    if (!ref.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(ref.current, { pixelRatio: 3 });
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `NAKOSS-card-${membershipNumber}.png`;
      link.click();
    } finally {
      setDownloading(false);
    }
  };

  const print = () => window.print();

  return { ref, copied, downloading, copy, download, print };
}