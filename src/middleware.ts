import { getToken } from 'next-auth/jwt'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl

    // Allow auth-related and static paths through
    if (
        pathname.startsWith('/login') ||
        pathname.startsWith('/api/auth') ||
        pathname.startsWith('/_next') ||
        pathname === '/favicon.ico'
    ) {
        return NextResponse.next()
    }

    // Cron endpoints require CRON_SECRET via Authorization header (handled in route handler)
    // They intentionally have no session cookie, so we allow them through here.
    if (pathname.startsWith('/api/cron')) {
        return NextResponse.next()
    }

    // Validate the JWT token cryptographically (not just cookie presence)
    const token = await getToken({
        req,
        secret: process.env.NEXTAUTH_SECRET,
    })

    if (!token) {
        const loginUrl = new URL('/login', req.url)
        return NextResponse.redirect(loginUrl)
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
}
