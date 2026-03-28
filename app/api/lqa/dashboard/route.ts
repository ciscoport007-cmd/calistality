import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const currentYear = new Date().getFullYear();
  const startOfYear = new Date(`${currentYear}-01-01`);

  const [
    totalAudits,
    completedAudits,
    inProgressAudits,
    recentAudits,
    categoryScores,
    targets,
    monthlyTrend,
  ] = await Promise.all([
    prisma.lQAAudit.count({ where: { auditDate: { gte: startOfYear } } }),
    prisma.lQAAudit.count({ where: { status: 'TAMAMLANDI', auditDate: { gte: startOfYear } } }),
    prisma.lQAAudit.count({ where: { status: 'DEVAM_EDIYOR' } }),
    prisma.lQAAudit.findMany({
      where: { status: 'TAMAMLANDI' },
      orderBy: { auditDate: 'desc' },
      take: 5,
      include: { auditor: { select: { name: true } } },
    }),
    prisma.lQAAuditScore.groupBy({
      by: ['categoryId'],
      _avg: { score: true },
      where: { audit: { auditDate: { gte: startOfYear }, status: 'TAMAMLANDI' } },
    }),
    prisma.lQATarget.findMany({
      where: { year: currentYear },
      include: { category: true },
    }),
    // Monthly trend: last 6 months
    prisma.lQAAudit.findMany({
      where: {
        status: 'TAMAMLANDI',
        overallScore: { not: null },
        auditDate: {
          gte: new Date(new Date().setMonth(new Date().getMonth() - 6)),
        },
      },
      select: { auditDate: true, overallScore: true },
      orderBy: { auditDate: 'asc' },
    }),
  ]);

  // Get category details for scores
  const categories = await prisma.lQACategory.findMany({ orderBy: { order: 'asc' } });
  const categoryScoreMap = categoryScores.reduce((acc, s) => {
    acc[s.categoryId] = s._avg.score || 0;
    return acc;
  }, {} as Record<string, number>);

  const categoryData = categories.map((cat) => ({
    ...cat,
    avgScore: categoryScoreMap[cat.id] || 0,
  }));

  // Average overall score
  const avgOverall = completedAudits > 0
    ? (await prisma.lQAAudit.aggregate({
        where: { status: 'TAMAMLANDI', auditDate: { gte: startOfYear } },
        _avg: { overallScore: true },
      }))._avg.overallScore || 0
    : 0;

  return NextResponse.json({
    stats: { totalAudits, completedAudits, inProgressAudits, avgOverall },
    recentAudits,
    categoryData,
    targets,
    monthlyTrend,
  });
}
