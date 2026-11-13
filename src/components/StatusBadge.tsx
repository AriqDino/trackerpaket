import { AlertTriangle, CheckCircle2, Clock, Truck } from 'lucide-react';
import type { PackageStatus } from '../../shared/types';
import { PACKAGE_STATUS_META } from '../utils/statusConfig';

interface StatusBadgeProps {
  status: PackageStatus;
  size?: 'sm' | 'md';
}

export function StatusIcon({
  status,
  className = 'w-3.5 h-3.5',
}: {
  status: PackageStatus;
  className?: string;
}) {
  switch (status) {
    case 'waiting':
      return <Clock className={className} aria-hidden="true" />;
    case 'in_transit':
      return <Truck className={className} aria-hidden="true" />;
    case 'delivered':
      return <CheckCircle2 className={className} aria-hidden="true" />;
    case 'issue':
      return <AlertTriangle className={className} aria-hidden="true" />;
  }
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const meta = PACKAGE_STATUS_META[status];
  const sizeClasses =
    size === 'md' ? 'px-2.5 py-1 text-xs gap-1.5' : 'px-2 py-0.5 text-xs gap-1';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-md whitespace-nowrap shrink-0 ${sizeClasses} ${meta.badgeClasses}`}
    >
      <StatusIcon status={status} className={size === 'md' ? 'w-3.5 h-3.5' : 'w-3 h-3'} />
      <span>{meta.label}</span>
    </span>
  );
}
