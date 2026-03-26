import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { recalculateAllProgressForPeriod } from '@/lib/progress-calculator';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await recalculateAllProgressForPeriod(id);

    return NextResponse.json({ success: true, message: 'Tüm hedef ilerlemeleri yeniden hesaplandı' });
  } catch (error) {
    console.error('Error recalculating period progress:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
