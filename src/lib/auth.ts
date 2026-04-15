import { prisma } from '@/lib/prisma'
import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'

// In-memory rate limiter for login attempts.
// Keyed by username; stores { count, resetAt }.
// Limits: max 5 failed attempts per 15-minute window.
const loginAttempts = new Map<string, { count: number; resetAt: number }>()
const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 minutes

function checkRateLimit(name: string): { allowed: boolean; remainingMs?: number } {
    const now = Date.now()
    const entry = loginAttempts.get(name)

    if (!entry || now >= entry.resetAt) {
        // No record or window expired — reset
        loginAttempts.set(name, { count: 0, resetAt: now + WINDOW_MS })
        return { allowed: true }
    }

    if (entry.count >= MAX_ATTEMPTS) {
        return { allowed: false, remainingMs: entry.resetAt - now }
    }

    return { allowed: true }
}

function recordFailedAttempt(name: string) {
    const now = Date.now()
    const entry = loginAttempts.get(name)

    if (!entry || now >= entry.resetAt) {
        loginAttempts.set(name, { count: 1, resetAt: now + WINDOW_MS })
    } else {
        entry.count += 1
    }
}

function clearAttempts(name: string) {
    loginAttempts.delete(name)
}


export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: 'credentials',
            credentials: {
                name: { label: '이름', type: 'text' },
                pin: { label: 'PIN', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.name || !credentials?.pin) return null

                const { allowed, remainingMs } = checkRateLimit(credentials.name)
                if (!allowed) {
                    const minutes = Math.ceil((remainingMs ?? 0) / 60000)
                    throw new Error(`로그인 시도 횟수를 초과했습니다. ${minutes}분 후 다시 시도해 주세요.`)
                }

                const employee = await prisma.employee.findUnique({
                    where: { name: credentials.name },
                })
                if (!employee) {
                    // Don't reveal whether user exists; still record attempt
                    recordFailedAttempt(credentials.name)
                    return null
                }

                const isValid = await bcrypt.compare(credentials.pin, employee.hashedPin)
                if (!isValid) {
                    recordFailedAttempt(credentials.name)
                    return null
                }

                // Success — clear failed attempt counter
                clearAttempts(credentials.name)
                return { id: employee.id.toString(), name: employee.name }
            },
        }),
    ],
    session: { strategy: 'jwt' },
    pages: { signIn: '/login' },
    callbacks: {
        async jwt({ token, user }) {
            if (user) token.name = user.name
            return token
        },
        async session({ session, token }) {
            if (token.name) session.user = { name: token.name as string }
            return session
        },
    },
}
