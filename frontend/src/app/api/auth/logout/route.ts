import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  // Hapus cookie sesi
  cookies().delete('asap_session');
  
  return NextResponse.json({ success: true }, { status: 200 });
}
