import { NextResponse } from 'next/server';

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get('origin') || '';
  const isAllowedOrigin = origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1') || origin.startsWith('http://10.0.2.2');

  // Handle preflight OPTIONS requests
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 });
    if (isAllowedOrigin) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    } else {
      response.headers.set('Access-Control-Allow-Origin', '*');
    }
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie, Set-Cookie');
    response.headers.set('Access-Control-Max-Age', '86400');
    return response;
  }

  // Handle normal route/API middleware
  const response = await handleRequest(request);

  // Apply CORS headers to response if it's an allowed origin
  if (isAllowedOrigin && response) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie, Set-Cookie');
  }

  return response;
}

async function handleRequest(request) {
  const { pathname } = request.nextUrl;

  // 1. Bypass static resources and non-page requests
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/sw.js') ||
    pathname.startsWith('/manifest.json') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // 2. Admin Portal Interceptions
  if (pathname.startsWith('/admin')) {
    const adminToken = request.cookies.get('admin_session_token')?.value;

    if (pathname === '/admin/login') {
      if (adminToken) {
        try {
          const verifyRes = await fetch(new URL('/api/auth/verify-admin', request.url), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: adminToken }),
          });

          if (verifyRes.ok) {
            return NextResponse.redirect(new URL('/admin', request.url));
          }
        } catch (err) {
          console.error('Middleware check active admin session error:', err);
        }
      }
      return NextResponse.next();
    }

    if (!adminToken) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    try {
      const verifyRes = await fetch(new URL('/api/auth/verify-admin', request.url), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: adminToken }),
      });

      if (!verifyRes.ok) {
        const res = NextResponse.redirect(new URL('/admin/login', request.url));
        res.cookies.delete('admin_session_token');
        return res;
      }
    } catch (err) {
      console.error('Middleware admin session verification error:', err);
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    return NextResponse.next();
  }

  // 3. Public Landing and Authentication Routes
  const userToken = request.cookies.get('session_token')?.value;

  if (pathname === '/' || pathname === '/login' || pathname === '/signup') {
    if (userToken) {
      try {
        const verifyRes = await fetch(new URL('/api/auth/verify-user', request.url), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: userToken }),
        });

        if (verifyRes.ok) {
          return NextResponse.redirect(new URL('/dashboard', request.url));
        }
      } catch (err) {
        console.error('Middleware check active user session error:', err);
      }
    }
    return NextResponse.next();
  }

  // 4. Secure User App Routes
  const secureRoutes = ['/dashboard', '/transactions', '/reports', '/settings', '/assistant', '/stocks', '/mcp', '/sips', '/notifications'];
  const isSecureRoute = secureRoutes.some(route => pathname.startsWith(route));

  if (isSecureRoute) {
    if (!userToken) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
      const verifyRes = await fetch(new URL('/api/auth/verify-user', request.url), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: userToken }),
      });

      if (!verifyRes.ok) {
        const res = NextResponse.redirect(new URL('/login', request.url));
        res.cookies.delete('session_token');
        return res;
      }
    } catch (err) {
      console.error('Middleware user session verification error:', err);
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}
