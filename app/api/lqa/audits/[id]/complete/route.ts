import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const audit = await prisma.lQAAudit.findUnique({
    where: { id: params.id },
    include: {
      items: { include: { criteria: true, category: true } },
    },
  });

  if (!audit) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Group items by category and calculate scores
  const categoryMap = new Map<string, { earned: number; total: number; categoryId: string }>();

  for (const item of audit.items) {
    const key = item.categoryId;
    if (!categoryMap.has(key)) {
      categoryMap.set(key, { earned: 0, total: 0, categoryId: item.categoryId });
    }
    const entry = categoryMap.get(key)!;
    entry.total += item.criteria.weight;
    if (item.result === 'EVET') {
      entry.earned += item.criteria.weight;
    }
  }

  // Delete existing scores and recreate
  await prisma.lQAAuditScore.deleteMany({ where: { auditId: params.id } });

  let totalEarned = 0;
  let totalPoints = 0;

  for (const [, val] of categoryMap) {
    const score = val.total > 0 ? (val.earned / val.total) * 100 : 0;
    await prisma.lQAAuditScore.create({
      data: {
        auditId: params.id,
        categoryId: val.categoryId,
        totalPoints: val.total,
        earnedPoints: val.earned,
        score,
      },
    });
    totalEarned += val.earned;
    totalPoints += val.total;
  }

  const overallScore = totalPoints > 0 ? (totalEarned / totalPoints) * 100 : 0;

  // Update audit status and overall score
  const updated = await prisma.lQAAudit.update({
    where: { id: params.id },
    data: {
      status: 'TAMAMLANDI',
      overallScore,
    },
  });

  // Auto-create CAPAs for failed critical criteria
  const failedCritical = audit.items.filter(
    (item) => item.result === 'HAYIR' && item.criteria.isCritical
  );

  for (const failed of failedCritical) {
    const capaCount = await prisma.cAPA.count();
    const capaCode = `DÖF.${new Date().getFullYear()}.${String(capaCount + 1).padStart(4, '0')}`;

    await prisma.cAPA.create({
      data: {
        code: capaCode,
        title: `LQA Denetim Bulgusu: ${failed.criteria.description}`,
        description: `LQA Denetimi (${audit.code}) sırasında başarısız olan kritik kriter: ${failed.criteria.description}`,
        type: 'DUZELTICI',
        source: 'DENETIM',
        status: 'ACIK',
        priority: 'YUKSEK',
        createdById: session.user.id,
      },
    });
  }

  return NextResponse.json({ audit: updated, overallScore, failedCriticalCount: failedCritical.length });
}
