import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'philosophy-app-secret-key-2024');

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: '邮箱和密码必填' }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ error: '用户不存在' }, { status: 401 });

    const bcrypt = await import('bcryptjs');
    if (!bcrypt.compareSync(password, user.passwordHash)) {
      return NextResponse.json({ error: '密码错误' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return NextResponse.json({ error: '无管理员权限' }, { status: 403 });
    }

    const token = await new SignJWT({ userId: user.id, email: user.email, role: 'admin' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(JWT_SECRET);

    const response = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role, plan: user.plan },
      token,
    });

    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json({ error: '登录失败' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('admin_token')?.value;
    if (!token) return NextResponse.json({ authenticated: false }, { status: 401 });

    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.role !== 'admin') {
      return NextResponse.json({ authenticated: false }, { status: 403 });
    }

    const user = await db.user.findUnique({ where: { id: payload.userId as string } });
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ authenticated: false }, { status: 403 });
    }

    return NextResponse.json({
      authenticated: true,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, plan: user.plan },
    });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
