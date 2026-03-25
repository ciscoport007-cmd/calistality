import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { isAdmin } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const settings = await prisma.appSettings.findMany();
    
    // Convert to key-value object
    const settingsMap: Record<string, string | null> = {};
    settings.forEach(s => {
      settingsMap[s.key] = s.value;
    });

    return NextResponse.json(settingsMap);
  } catch (error) {
    console.error('Error fetching app settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can update settings
    if (!isAdmin(session.user?.role)) {
      return NextResponse.json({ error: 'Bu işlem için yönetici yetkisi gereklidir' }, { status: 403 });
    }

    const body = await request.json();
    const { key, value } = body;

    if (!key) {
      return NextResponse.json({ error: 'Key gereklidir' }, { status: 400 });
    }

    // Upsert the setting
    const setting = await prisma.appSettings.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    return NextResponse.json(setting);
  } catch (error) {
    console.error('Error updating app setting:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can update settings
    if (!isAdmin(session.user?.role)) {
      return NextResponse.json({ error: 'Bu işlem için yönetici yetkisi gereklidir' }, { status: 403 });
    }

    const body = await request.json();
    // Body is an object with multiple key-value pairs
    const updates: Record<string, string> = body;

    for (const [key, value] of Object.entries(updates)) {
      await prisma.appSettings.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating app settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
