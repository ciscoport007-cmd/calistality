import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Public API endpoint'leri — kimlik doğrulaması gerektirmez
const PUBLIC_API_PATHS = [
  '/api/auth/',   // NextAuth handler'ları
  '/api/signup',  // Kullanıcı kaydı
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public API path'lerini atla
  if (PUBLIC_API_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // /api/* rotaları: redirect yerine 401 JSON döndür
  if (pathname.startsWith('/api/')) {
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Oturum açmanız gerekiyor' },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // /dashboard/* rotaları: giriş sayfasına yönlendir
  if (pathname.startsWith('/dashboard/')) {
    if (!token) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('callbackUrl', req.url);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/:path*',
  ],
};
