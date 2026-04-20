'use client'
import { useEffect } from 'react'

export function NavHeightSetter() {
    useEffect(() => {
        const nav = document.getElementById('main-nav')
        if (!nav) return
        const set = () => {
            document.documentElement.style.setProperty('--nav-h', `${nav.offsetHeight}px`)
        }
        set()
        const ro = new ResizeObserver(set)
        ro.observe(nav)
        return () => ro.disconnect()
    }, [])
    return null
}
