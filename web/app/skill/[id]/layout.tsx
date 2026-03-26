import { SkillLanguageProvider } from '@/components/SkillLanguageProvider';

export default async function SkillLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  return (
    <SkillLanguageProvider roadmapId={resolvedParams.id}>
      {children}
    </SkillLanguageProvider>
  );
}
