import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET - Komite üye hiyerarşisi
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Üyeleri ve hiyerarşi bilgilerini getir
    const members = await prisma.committeeMember.findMany({
      where: { committeeId: id, isActive: true },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            surname: true,
            email: true,
            position: { select: { id: true, name: true } },
            department: { select: { id: true, name: true } },
          },
        },
        hierarchyAsChild: {
          select: {
            id: true,
            parentMemberId: true,
            sortOrder: true,
          },
        },
      },
      orderBy: [
        { role: 'asc' },
        { user: { name: 'asc' } },
      ],
    });

    // Üyeleri hiyerarşik yapıya dönüştür
    const hierarchyMap: Record<string, any> = {};
    members.forEach((member: any) => {
      const hierarchy = member.hierarchyAsChild?.[0];
      hierarchyMap[member.id] = {
        id: member.id,
        userId: member.userId,
        user: member.user,
        role: member.role,
        parentId: hierarchy?.parentMemberId || null,
        sortOrder: hierarchy?.sortOrder || 0,
        children: [],
      };
    });

    // Ağaç yapısını oluştur
    const rootNodes: any[] = [];
    Object.values(hierarchyMap).forEach((node: any) => {
      if (node.parentId && hierarchyMap[node.parentId]) {
        hierarchyMap[node.parentId].children.push(node);
      } else {
        rootNodes.push(node);
      }
    });

    // Her seviyede sortOrder'a göre sırala
    const sortChildren = (nodes: any[]) => {
      nodes.sort((a, b) => a.sortOrder - b.sortOrder);
      nodes.forEach((node: any) => sortChildren(node.children));
    };
    sortChildren(rootNodes);

    return NextResponse.json({
      members,
      hierarchy: rootNodes,
    });
  } catch (error) {
    console.error('Committee hierarchy fetch error:', error);
    return NextResponse.json(
      { error: 'Hiyerarşi bilgileri getirilirken hata oluştu' },
      { status: 500 }
    );
  }
}

// POST - Hiyerarşi güncelle (sürükle-bırak)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { memberId, parentMemberId, sortOrder } = body;

    if (!memberId) {
      return NextResponse.json(
        { error: 'Üye ID zorunludur' },
        { status: 400 }
      );
    }

    // Mevcut hiyerarşi kaydını kontrol et
    const existing = await prisma.committeeMemberHierarchy.findUnique({
      where: {
        committeeId_memberId: {
          committeeId: id,
          memberId,
        },
      },
    });

    if (existing) {
      // Güncelle
      await prisma.committeeMemberHierarchy.update({
        where: { id: existing.id },
        data: {
          parentMemberId: parentMemberId || null,
          sortOrder: sortOrder ?? 0,
        },
      });
    } else {
      // Yeni kayıt oluştur
      await prisma.committeeMemberHierarchy.create({
        data: {
          committeeId: id,
          memberId,
          parentMemberId: parentMemberId || null,
          sortOrder: sortOrder ?? 0,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Committee hierarchy update error:', error);
    return NextResponse.json(
      { error: 'Hiyerarşi güncellenirken hata oluştu' },
      { status: 500 }
    );
  }
}

// PUT - Toplu hiyerarşi güncelleme
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { hierarchyData } = body;

    if (!hierarchyData || !Array.isArray(hierarchyData)) {
      return NextResponse.json(
        { error: 'Hiyerarşi verisi zorunludur' },
        { status: 400 }
      );
    }

    // Transaction ile tüm hiyerarşiyi güncelle
    await prisma.$transaction(async (tx) => {
      // Önce mevcut hiyerarşileri temizle
      await tx.committeeMemberHierarchy.deleteMany({
        where: { committeeId: id },
      });

      // Yeni hiyerarşileri oluştur
      for (const item of hierarchyData) {
        await tx.committeeMemberHierarchy.create({
          data: {
            committeeId: id,
            memberId: item.memberId,
            parentMemberId: item.parentMemberId || null,
            sortOrder: item.sortOrder ?? 0,
          },
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Committee hierarchy bulk update error:', error);
    return NextResponse.json(
      { error: 'Hiyerarşi toplu güncellenirken hata oluştu' },
      { status: 500 }
    );
  }
}
