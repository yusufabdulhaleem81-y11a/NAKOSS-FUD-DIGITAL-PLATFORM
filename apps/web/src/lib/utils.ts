import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, isBefore } from 'date-fns';

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

export function formatDate(iso: string) { return format(new Date(iso), 'd MMM yyyy'); }
export function timeAgo(iso: string) { return formatDistanceToNow(new Date(iso), { addSuffix: true }); }