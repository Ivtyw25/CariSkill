'use client';

import { SkillLanguageProvider } from '@/components/SkillLanguageProvider';

export default function ExploreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SkillLanguageProvider roadmapId="">
      {children}
    </SkillLanguageProvider>
  );
}
