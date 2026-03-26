'use client';

import DailyReviewTab from './DailyReviewTab';

interface DailyReviewDropdownProps {
  initialFact: any;
  initialDueCount: number;
  onClose: () => void;
  onRefresh?: () => void;
}

export default function DailyReviewDropdown({ initialFact, initialDueCount, onClose, onRefresh }: DailyReviewDropdownProps) {
  return (
    <div className="animate-in fade-in slide-in-from-top-2 duration-200">
      <DailyReviewTab 
        initialFact={initialFact} 
        initialDueCount={initialDueCount} 
        onClose={onClose} 
        onRefresh={onRefresh}
        isFullPage={false}
      />
    </div>
  );
}
