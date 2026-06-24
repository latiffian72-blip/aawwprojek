import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    // Validasi static credential (admin / asapmonitor123)
    if (username === 'admin' && password === 'asapmonitor123') {
      // Set cookie dengan umur 1 hari
      cookies().set({
        name: 'asap_session',
        value: 'authenticated_user',
        httpOnly: true,
        path: '/',
        secure: false, // Set true hanya jika sudah pakai HTTPS
        sameSite: 'lax',
        maxAge: 60 * 60 * 24, // 1 hari
      });

      return NextResponse.json({ success: true }, { status: 200 });
    }

    return NextResponse.json(
      { success: false, message: 'Username atau password salah!' },
      { status: 401 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
