import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { NavBar } from "@/app/NavBar"
import { Providers } from "@/app/Providers"
import { ThemeProvider } from "@/app/ThemeProvider"
import NextTopLoader from 'nextjs-toploader';

const inter = Inter({ subsets: ["latin"] })

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
    title: "Rosin Systech CO., LTD",
    description: "Underwater Vacuum Cleaner Service Log",
    icons: {
        apple: "/apple-touch-icon.png",
    },
}

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    const session = await getServerSession(authOptions)
    const userName = session?.user?.name ?? ''

    return (
        <html lang="ko" suppressHydrationWarning>
            <body className={`${inter.className} bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors`}>
                <NextTopLoader color="#3b82f6" showSpinner={false} speed={200} shadow="0 0 10px #3b82f6,0 0 5px #3b82f6" />
                <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                    <Providers>
                        {userName && <NavBar userName={userName} />}
                        <main className="min-h-screen border-box text-inherit bg-inherit pb-16 sm:pb-0">
                            {children}
                        </main>
                    </Providers>
                </ThemeProvider>
            </body>
        </html>
    )
}
