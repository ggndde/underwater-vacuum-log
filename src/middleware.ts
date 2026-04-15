import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl

    // Allow auth-related, static paths, and cron endpoints through
    if (
        pathname.startsWith('/login') ||
        pathname.startsWith('/api/auth') ||
        pathname.startsWith('/api/cron') ||
        pathname.startsWith('/_next') ||
        pathname === '/favicon.ico'
    ) {
        return NextResponse.next()
    }

    // next-auth stores JWT in "next-auth.session-token" cookie (dev)
    // or "__Secure-next-auth.session-token" cookie (prod/https)
    const token =
        req.cookies.get('next-auth.session-token')?.value ||
        req.cookies.get('__Secure-next-auth.session-token')?.value

    if (!token) {
        const loginUrl = new URL('/login', req.url)
        return NextResponse.redirect(loginUrl)
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
}
