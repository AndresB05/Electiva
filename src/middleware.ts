import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware({
  // A list of all locales that are supported
  locales: ['es-ES', 'en-US', 'es-CO'],

  // Used when no locale matches
  defaultLocale: 'es-ES'
});

export default function middleware(request: NextRequest) {
  // Handle root path redirection to /es-ES/chat
  if (request.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/es-ES/chat', request.url));
  }

  // Handle other internationalization routing
  return intlMiddleware(request);
}

export const config = {
  // Match all paths for proper redirection and internationalization
  matcher: ['/', '/(es-ES|en-US|es-CO)/:path*']
};