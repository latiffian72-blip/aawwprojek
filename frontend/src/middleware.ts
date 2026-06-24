import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Hanya jalankan middleware ini pada root dan rute yang butuh proteksi
  const isLoginPage = request.nextUrl.pathname.startsWith('/login');
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/');
  const isStaticFile = request.nextUrl.pathname.match(/\.(.*)$/);

  // Abaikan proteksi untuk API, file statis (gambar, css, dll)
  if (isApiRoute || isStaticFile) return NextResponse.next();

  const session = request.cookies.get('asap_session')?.value;

  // Jika belum login dan tidak di halaman login, redirect ke /login
  if (!session && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Jika sudah login tapi mengakses halaman /login, redirect ke dashboard
  if (session && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

// Tentukan rute mana saja yang dikenakan middleware
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
