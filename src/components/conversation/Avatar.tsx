'use client'

import React, { useMemo } from 'react'

/** Canonical emotions → GIF paths */
const GIFS = {
    neutral: '/avatar/neutral.gif',
    happy: '/avatar/happy.gif',
    confused: '/avatar/confused.gif',
    curious: '/avatar/curious.gif',
} as const

type Canonical = keyof typeof GIFS

const THEMES = {
    mall: '/theme/mall.png',
    market: '/theme/market.png',
    restaurant: '/theme/restaurant.png',
    temple: '/theme/temple.png',
} as const
type CanonicalTheme = keyof typeof THEMES

function toCanonicalEmotion(input: string): Canonical {
    const e = (input || '').toLowerCase().trim()
    if (e === 'neutral' || e === 'happy' || e === 'confused' || e === 'curious') return e
    if (e === 'thinking' || e === 'interested') return 'curious'
    if (e === 'surprised') return 'confused'
    if (e === 'sad' || e === 'angry' || e === 'speaking') return 'neutral'
    return 'neutral'
}

function toCanonicalTheme(input?: string): CanonicalTheme {
    const t = (input || '').toLowerCase().trim()
    if (t === 'mall' || t === 'market' || t === 'restaurant' || t === 'temple') return t
    return 'mall'
}

export default function Avatar({
    emotion,
    theme,
}: {
    emotion: string
    theme?: string
}) {
    const key = useMemo(() => toCanonicalEmotion(emotion), [emotion])
    const src = GIFS[key]
    const themeKey = useMemo(() => toCanonicalTheme(theme), [theme])
    const bg = THEMES[themeKey]

    return (
        <div className="p-2 w-1/2 flex h-full items-center justify-center" style={{ backgroundImage: `url(${bg})` }}
            aria-label={`${themeKey} background`}>
            <img
                key={src} // restart GIF when emotion changes
                src={src}
                alt={`${key} avatar`}
                draggable={false}
                loading="eager"
                className="w-full object-cover h-full mt-85 mr-100"
            />
        </div>
    )
}
