import React from 'react';

export type StatusType = 'APPROVED' | 'PENDING' | 'REJECTED' | 'UNDER_REVIEW' | 'ELIGIBLE' | 'INELIGIBLE' | 'UP' | 'DOWN';

interface StatusBadgeProps {
  status: StatusType | string;
  pulse?: boolean;
}

export default function StatusBadge({ status, pulse }: StatusBadgeProps) {
  const getBadgeClass = (s: string) => {
    switch (s.toUpperCase()) {
      case 'APPROVED': return 'badge-approved';
      case 'PENDING': return 'badge-pending';
      case 'REJECTED': return 'badge-rejected';
      case 'UNDER_REVIEW': return 'badge-review';
      case 'ELIGIBLE': return 'badge-eligible';
      case 'INELIGIBLE': return 'badge-ineligible';
      case 'UP': return 'badge-up';
      case 'DOWN': return 'badge-down';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getDotClass = (s: string) => {
    switch (s.toUpperCase()) {
      case 'UP': return 'dot-green';
      case 'APPROVED': return 'dot-green';
      case 'PENDING': return 'dot-amber';
      case 'DOWN': return 'dot-red';
      case 'REJECTED': return 'dot-red';
      default: return '';
    }
  };

  const formattedStatus = status.replace(/_/g, ' ');

  return (
    <span className={`badge ${getBadgeClass(status)}`}>
      {pulse && <span className={`dot-pulse ${getDotClass(status)}`} />}
      {formattedStatus}
    </span>
  );
}