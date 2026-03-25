import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';

// BSC Strateji Haritası - Strategy Map
export async function GET(
  request: NextRequest,
  { params }: { params: { periodId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const periodId = params.periodId;

    // Get strategy period
    const period = await prisma.strategyPeriod.findUnique({
      where: { id: periodId },
      include: {
        mission: true,
        vision: true,
      },
    });

    if (!period) {
      return NextResponse.json(
        { error: 'Strateji dönemi bulunamadı' },
        { status: 404 }
      );
    }

    // Get BSC Perspectives with objectives and relationships
    const perspectives = await prisma.bSCPerspective.findMany({
      where: { periodId: periodId, isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        objectives: {
          where: { isActive: true },
          include: {
            owner: { select: { id: true, name: true, surname: true } },
            department: { select: { id: true, name: true, code: true } },
            goals: {
              where: { isActive: true },
              select: {
                id: true,
                code: true,
                name: true,
                status: true,
                progress: true,
              },
            },
          },
        },
      },
    });

    // Build cause-effect relationships
    // Financial perspective is typically the outcome (top)
    // Customer satisfaction drives financial performance
    // Internal processes drive customer satisfaction
    // Learning & Growth enables internal processes
    const perspectiveOrder = ['OGR', 'SUR', 'MUS', 'FIN']; // Bottom to top

    // Create nodes (objectives)
    const nodes = perspectives.flatMap((perspective: any) =>
      perspective.objectives.map((obj: any) => ({
        id: obj.id,
        code: obj.code,
        name: obj.name,
        status: obj.status,
        progress: obj.progress || 0,
        riskLevel: obj.riskLevel,
        perspectiveId: perspective.id,
        perspectiveCode: perspective.code,
        perspectiveName: perspective.name,
        perspectiveColor: perspective.color,
        owner: obj.owner
          ? `${obj.owner.name} ${obj.owner.surname || ''}`
          : null,
        department: obj.department?.name,
        goalsCount: obj.goals.length,
        weight: obj.weight,
      }))
    );

    // Generate suggested links based on BSC theory
    // Links flow from lower perspectives to higher ones
    const suggestedLinks: Array<{
      sourceId: string;
      targetId: string;
      type: string;
    }> = [];

    for (let i = 0; i < perspectiveOrder.length - 1; i++) {
      const lowerPCode = perspectiveOrder[i];
      const upperPCode = perspectiveOrder[i + 1];

      const lowerObjectives = nodes.filter(
        (n: any) => n.perspectiveCode === lowerPCode
      );
      const upperObjectives = nodes.filter(
        (n: any) => n.perspectiveCode === upperPCode
      );

      // Create potential links (in real app, these would be stored in DB)
      lowerObjectives.forEach((lower: any) => {
        upperObjectives.forEach((upper: any) => {
          suggestedLinks.push({
            sourceId: lower.id,
            targetId: upper.id,
            type: 'ENABLES', // lower enables/drives upper
          });
        });
      });
    }

    // Organize by perspective for visualization
    const perspectiveLayers = perspectives.map((perspective: any) => {
      const perspectiveObjectives = nodes.filter(
        (n: any) => n.perspectiveId === perspective.id
      );
      const totalProgress =
        perspectiveObjectives.length > 0
          ? Math.round(
              perspectiveObjectives.reduce((sum: number, o: any) => sum + o.progress, 0) /
                perspectiveObjectives.length
            )
          : 0;

      return {
        id: perspective.id,
        code: perspective.code,
        name: perspective.name,
        color: perspective.color,
        sortOrder: perspective.sortOrder,
        objectives: perspectiveObjectives,
        avgProgress: totalProgress,
        objectivesCount: perspectiveObjectives.length,
      };
    });

    // Sort by BSC order (Financial at top)
    perspectiveLayers.sort((a: any, b: any) => {
      const aIndex = perspectiveOrder.indexOf(a.code);
      const bIndex = perspectiveOrder.indexOf(b.code);
      return bIndex - aIndex; // Reverse for top-down
    });

    return NextResponse.json({
      success: true,
      data: {
        period: {
          id: period.id,
          name: period.name,
          status: period.status,
          startDate: period.startDate,
          endDate: period.endDate,
          mission: period.mission?.content,
          vision: period.vision?.content,
        },
        perspectives: perspectiveLayers,
        nodes,
        links: suggestedLinks, // These would ideally be stored relationships
        statistics: {
          totalObjectives: nodes.length,
          avgProgress:
            nodes.length > 0
              ? Math.round(
                  nodes.reduce((sum: number, n: any) => sum + n.progress, 0) / nodes.length
                )
              : 0,
          completedObjectives: nodes.filter((n: any) => n.status === 'TAMAMLANDI')
            .length,
          atRiskObjectives: nodes.filter(
            (n: any) => n.riskLevel === 'YUKSEK' || n.riskLevel === 'COK_YUKSEK'
          ).length,
        },
      },
    });
  } catch (error) {
    console.error('Strategy map error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
