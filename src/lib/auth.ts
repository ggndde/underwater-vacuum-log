import { prisma } from '@/lib/prisma'
import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'


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

                const employee = await prisma.employee.findUnique({
                    where: { name: credentials.name },
                })
                if (!employee) return null

                const isValid = await bcrypt.compare(credentials.pin, employee.hashedPin)
                if (!isValid) return null

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
