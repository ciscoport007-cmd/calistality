import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { updateSubGoalProgress } from '@/lib/progress-calculator';

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
    const progress = await updateSubGoalProgress(id);

    return NextResponse.json({ success: true, progress });
  } catch (error) {
    console.error('Error recalculating sub-goal progress:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
