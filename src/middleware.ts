import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

const publicRoutes = ['/api/admin/auth/login', '/admin/login', '/api/admin/setup'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminRoute = pathname.startsWith('/admin');
  const isAdminApiRoute = pathname.startsWith('/api/admin');

  // Only protect admin routes
  if (!isAdminRoute && !isAdminApiRoute) {
    return NextResponse.next();
  }

  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // DEMO MODE BYPASS
  if (process.env.DEMO_MODE === 'true') {
    const response = NextResponse.next();
    response.headers.set('x-admin-id', 'demo-admin-id');
    response.headers.set('x-admin-role', 'admin');
    return response;
  }

  const token = request.cookies.get('admin_token')?.value;

  if (!token) {
    return handleUnauthorized(request, isAdminApiRoute);
  }

  const payload = await verifyToken(token);

  if (!payload) {
    return handleUnauthorized(request, isAdminApiRoute);
  }

  const response = NextResponse.next();
  response.headers.set('x-admin-id', payload.adminId);
  response.headers.set('x-admin-role', payload.role);
  
  return response;
}

function handleUnauthorized(request: NextRequest, isApiRoute: boolean) {
  if (isApiRoute) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  } else {
    const loginUrl = new URL('/admin/login', request.url);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
