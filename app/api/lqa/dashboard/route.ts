import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const currentYear = new Date().getFullYear();
  const startOfYear = new Date(`${currentYear}-01-01`);
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const [
    totalAudits,
    completedAudits,
    inProgressAudits,
    recentAuditsRaw,
    categoryScoresRaw,
    targets,
    monthlyAuditsRaw,
    avgResult,
  ] = await Promise.all([
    prisma.lQAAudit.count({ where: { auditDate: { gte: startOfYear } } }),
    prisma.lQAAudit.count({ where: { status: 'TAMAMLANDI', auditDate: { gte: startOfYear } } }),
    prisma.lQAAudit.count({ where: { status: 'DEVAM_EDIYOR' } }),
    prisma.lQAAudit.findMany({
      where: { status: 'TAMAMLANDI' },
      orderBy: { auditDate: 'desc' },
      take: 5,
      select: {
        id: true,
        code: true,
        title: true,
        auditType: true,
        auditDate: true,
        overallScore: true,
        status: true,
        auditor: { select: { id: true, name: true } },
      },
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
    prisma.lQAAudit.findMany({
      where: {
        status: 'TAMAMLANDI',
        overallScore: { not: null },
        auditDate: { gte: sixMonthsAgo },
      },
      select: { auditDate: true, overallScore: true },
      orderBy: { auditDate: 'asc' },
    }),
    completedAudits > 0
      ? prisma.lQAAudit.aggregate({
          where: { status: 'TAMAMLANDI', auditDate: { gte: startOfYear } },
          _avg: { overallScore: true },
        })
      : Promise.resolve({ _avg: { overallScore: null } }),
  ]);

  // Build category scores with names
  const categories = await prisma.lQACategory.findMany({ orderBy: { order: 'asc' } });
  const scoreMap = categoryScoresRaw.reduce((acc, s) => {
    acc[s.categoryId] = s._avg.score ?? 0;
    return acc;
  }, {} as Record<string, number>);

  // Build target score map by categoryId
  const targetMap = targets.reduce((acc, t) => {
    if (t.categoryId) acc[t.categoryId] = t.score;
    return acc;
  }, {} as Record<string, number>);

  const categoryScores = categories.map((cat) => ({
    category: cat.name,
    score: Math.round((scoreMap[cat.id] ?? 0) * 10) / 10,
    target: targetMap[cat.id] ?? 90,
  }));

  // Build target comparisons
  const targetComparisons = targets.map((t) => ({
    category: t.category ? t.category.name : t.targetName,
    target: t.score,
    actual: t.categoryId ? (scoreMap[t.categoryId] !== undefined ? Math.round((scoreMap[t.categoryId]) * 10) / 10 : null) : null,
  }));

  // Build monthly trend: group by month
  const monthMap = new Map<string, { total: number; count: number }>();
  for (const audit of monthlyAuditsRaw) {
    const month = new Date(audit.auditDate).toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' });
    const entry = monthMap.get(month) ?? { total: 0, count: 0 };
    entry.total += audit.overallScore ?? 0;
    entry.count += 1;
    monthMap.set(month, entry);
  }
  const monthlyTrend = Array.from(monthMap.entries()).map(([month, val]) => ({
    month,
    score: Math.round((val.total / val.count) * 10) / 10,
    count: val.count,
  }));

  // Normalize recent audits shape
  const recentAudits = recentAuditsRaw.map((a) => ({
    id: a.id,
    code: a.code,
    title: a.title,
    type: a.auditType,
    auditDate: a.auditDate,
    auditor: a.auditor ? { name: a.auditor.name, surname: '' } : null,
    totalScore: a.overallScore,
    status: a.status,
  }));

  return NextResponse.json({
    stats: {
      totalAudits,
      completedAudits,
      inProgressAudits,
      averageScore: avgResult._avg.overallScore !== null
        ? Math.round((avgResult._avg.overallScore ?? 0) * 10) / 10
        : null,
    },
    categoryScores,
    recentAudits,
    monthlyTrend,
    targetComparisons,
  });
}
