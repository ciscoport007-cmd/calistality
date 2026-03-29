import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db';
import { authOptions } from '@/lib/auth-options';
import { createNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

const CATEGORY_LABELS: Record<string, string> = {
  MISAFIR_DENEYIMI: 'Misafir Deneyimi',
  OPERASYONEL_VERIMLILIK: 'Operasyonel Verimlilik',
  SURDURULEBILIRLIK: 'Sürdürülebilirlik',
  TEKNOLOJI: 'Teknoloji',
  PERSONEL_REFAHI: 'Personel Refahı',
  MALIYET_AZALTMA: 'Maliyet Azaltma',
  GELIR_ARTIRMA: 'Gelir Artırma',
};

async function generateIdeaCode(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INO-${year}-`;
  const last = await prisma.innovationIdea.findFirst({
    where: { code: { startsWith: prefix } },
    orderBy: { code: 'desc' },
  });
  const next = last ? parseInt(last.code.replace(prefix, '')) + 1 : 1;
  return `${prefix}${String(next).padStart(4, '0')}`;
}

// GET - Fikir listesi
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const departmentId = searchParams.get('departmentId');
    const search = searchParams.get('search');
    const sort = searchParams.get('sort') || 'createdAt';

    const where: any = { isActive: true };
    if (status) where.status = status;
    if (category) where.category = category;
    if (departmentId) where.departmentId = departmentId;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const orderBy: any =
      sort === 'score'
        ? { score: 'desc' }
        : sort === 'votes'
        ? { upVotes: 'desc' }
        : { createdAt: 'desc' };

    const ideas = await prisma.innovationIdea.findMany({
      where,
      include: {
        createdBy: { select: { id: true, name: true, surname: true } },
        department: { select: { id: true, name: true } },
        strategicGoal: { select: { id: true, name: true, code: true } },
        project: { select: { id: true, code: true, name: true, status: true } },
        _count: { select: { votes: true, comments: true, attachments: true } },
      },
      orderBy,
    });

    // Anonim fikirlerde yaratıcı bilgisini gizle
    const result = ideas.map((idea) => ({
      ...idea,
      createdBy: idea.isAnonymous ? null : idea.createdBy,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Fikir listesi hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// POST - Yeni fikir oluştur
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      category,
      isAnonymous,
      departmentId,
      strategicGoalId,
      maturity,
      costSavingEstimate,
      revenueEstimate,
      guestSatisfactionImpact,
      employeeSatisfactionImpact,
    } = body;

    if (!title || !description || !category) {
      return NextResponse.json({ error: 'Başlık, açıklama ve kategori zorunludur' }, { status: 400 });
    }

    const code = await generateIdeaCode();

    const idea = await prisma.innovationIdea.create({
      data: {
        code,
        title,
        description,
        category,
        isAnonymous: isAnonymous ?? false,
        maturity: maturity ?? 'HAM_FIKIR',
        departmentId: departmentId || null,
        strategicGoalId: strategicGoalId || null,
        costSavingEstimate: costSavingEstimate ? parseFloat(costSavingEstimate) : null,
        revenueEstimate: revenueEstimate ? parseFloat(revenueEstimate) : null,
        guestSatisfactionImpact: guestSatisfactionImpact || null,
        employeeSatisfactionImpact: employeeSatisfactionImpact || null,
        createdById: session.user.id,
      },
      include: {
        createdBy: { select: { id: true, name: true, surname: true } },
        department: { select: { id: true, name: true } },
      },
    });

    // Yöneticilere bildirim gönder
    const managers = await prisma.user.findMany({
      where: {
        role: { name: { in: ['Admin', 'Yönetici'] } },
        id: { not: session.user.id },
        isActive: true,
      },
      select: { id: true },
    });

    await Promise.all(
      managers.map((m) =>
        createNotification({
          userId: m.id,
          title: 'Yeni İnovasyon Fikri',
          message: `${idea.code} kodlu "${idea.title}" başlıklı yeni bir fikir gönderildi (${CATEGORY_LABELS[idea.category] ?? idea.category}).`,
          type: 'BILGI',
          link: `/dashboard/innovation/${idea.id}`,
        })
      )
    );

    return NextResponse.json(idea, { status: 201 });
  } catch (error) {
    console.error('Fikir oluşturma hatası:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}
