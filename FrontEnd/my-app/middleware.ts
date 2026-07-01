import { NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from '@/lib/i18n/config';
import crypto from 'crypto';
import { cspHeaders } from './next.config.csp';

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localeDetection: true,
  localePrefix: 'always',
});

export function middleware(request) {
  // Generate nonce per request
  const nonce = crypto.randomBytes(16).toString('base64');

  // Run intl middleware first
  const intlResponse = intlMiddleware(request);

  // Determine CSP header key based on environment
  const isDev = process.env.NODE_ENV !== 'production';
  const headerKey = isDev ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy';

  // Build CSP headers with nonce replacing unsafe-inline
  const modifiedHeaders = cspHeaders.map(h => {
    if (h.key === 'Content-Security-Policy') {
      const value = h.value.replace(/'unsafe-inline'/g, `'nonce-${nonce}'`);
      return { key: headerKey, value };
    }
    return h;
  });

  // Prepare response object
  const response = intlResponse instanceof NextResponse ? intlResponse : NextResponse.next();

  // Set CSP headers
  modifiedHeaders.forEach(h => {
    response.headers.set(h.key, h.value);
  });
  // Expose nonce to client if needed
  response.headers.set('X-Content-Nonce', nonce);

  return response;
}

export const config = {
  matcher: ['/', '/(es|en)/:path*', '/((?!api|_next|_static|.*\\..*).*)'],
};
