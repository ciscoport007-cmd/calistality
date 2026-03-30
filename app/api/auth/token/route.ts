import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { rateLimit, getClientIp, AUTH_RATE_LIMIT } from '@/lib/rate-limit';
import { apiError, apiTooManyRequests } from '@/lib/api-response';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/token
 *
 * NextAuth'un tarayıcı tabanlı redirect akışı yerine JSON tabanlı kimlik doğrulama.
 * API istemcileri ve test araçları için tasarlanmıştır.
 *
 * İstek gövdesi: { email: string; password: string }
 * Başarılı yanıt: { success: true, data: { token: string, user: {...} } }
 * Token kullanımı: Authorization: Bearer <token>
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(`token:${ip}`, AUTH_RATE_LIMIT.limit, AUTH_RATE_LIMIT.windowMs);

  if (!rl.success) {
    const res = apiTooManyRequests();
    res.headers.set('X-RateLimit-Limit', String(rl.limit));
    res.headers.set('X-RateLimit-Remaining', '0');
    res.headers.set('X-RateLimit-Reset', String(rl.reset));
    return res;
  }

  try {
    const body = await req.json().catch(() => null);

    if (!body || typeof body.email !== 'string' || typeof body.password !== 'string') {
      return apiError('Email ve şifre gereklidir', 400);
    }

    const { email, password } = body;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { role: true, department: true, position: true },
    });

    // Kullanıcı bulunamadı veya pasif — aynı hata mesajı (bilgi sızıntısını önler)
    if (!user || !user.isActive) {
      return apiError('Geçersiz kimlik bilgileri', 401);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return apiError('Geçersiz kimlik bilgileri', 401);
    }

    const secret = process.env.NEXTAUTH_SECRET;
    if (!secret) {
      throw new Error('NEXTAUTH_SECRET yapılandırılmamış');
    }

    const payload = {
      id: user.id,
      email: user.email,
      name: `${user.name} ${user.surname ?? ''}`.trim(),
      role: user.role?.name ?? null,
      roleId: user.roleId ?? null,
      department: user.department?.name ?? null,
      departmentId: user.departmentId ?? null,
      position: user.position?.name ?? null,
    };

    const token = jwt.sign(payload, secret, { expiresIn: '8h' });

    const res = NextResponse.json({
      success: true,
      data: {
        token,
        expiresIn: 8 * 60 * 60,
        user: {
          id: payload.id,
          email: payload.email,
          name: payload.name,
          role: payload.role,
          department: payload.department,
        },
      },
    });

    res.headers.set('X-RateLimit-Limit', String(rl.limit));
    res.headers.set('X-RateLimit-Remaining', String(rl.remaining));
    res.headers.set('X-RateLimit-Reset', String(rl.reset));

    return res;
  } catch (error) {
    return apiError('Sunucu hatası oluştu', 500);
  }
}
