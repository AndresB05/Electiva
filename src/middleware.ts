import createMiddleware from 'next-intl/middleware';

export default createMiddleware({
  // A list of all locales that are supported
  locales: ['es-ES'],

  // Used when no locale matches
  defaultLocale: 'es-ES'
});

export const config = {
  // Match only internationalized pathnames
  matcher: ['/', '/(es-ES)/:path*']
};